/*
 * Copyright 2026 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { fakeAsync, flush, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AirQualityEditDialogComponent } from './air-quality-edit-dialog.component';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { environment } from '../../../../environments/environment';
import { createMeasurementCatalogue, createPollenCatalogue } from '../shared/air-quality-catalogue';
import { AirQualityPropertiesModel, MeasurementModel } from '../shared/air-quality.model';
import { ExportModel, ExportValueModel } from '../../../modules/exports/shared/export.model';
import { AirQualityDialogSpies, configureAirQualityDialogTestBed, EXPORTS } from './air-quality-dialog-testbed.mock';

/**
 * The properties the dialog sends are read by the air quality widget on every dashboard, and the provisioning
 * requests create the imports and exports it reads from. These specs pin both against the whole request.
 */
describe('AirQualityEditDialogComponent saved widget', () => {
    let component: AirQualityEditDialogComponent;
    let spies: AirQualityDialogSpies;

    const location = { latitude: 51.5, longitude: 12.25 };
    const address = 'Leipzig, SN, DE';
    const originalTypeIds = { ...environment };
    const uba = 'type-uba';
    const dwd = 'type-dwd';
    const yr = 'type-yr';

    /** What the created exports offer: the Yr paths the widget reads and one UBA path. */
    const yrPaths: Record<string, string> = {
        'Temp.': 'value.instant_air_temperature',
        Pressure: 'value.instant_air_pressure_at_sea_level',
        'Hum.': 'value.instant_relative_humidity',
        Precipitation: 'value.1_hours_precipitation_amount',
    };
    const exportValues: ExportValueModel[] = [
        ...Object.values(yrPaths).map((path) => ({ InstanceID: 'created', Name: path, Path: path, Type: 'float' })),
        { InstanceID: 'created', Name: 'PM10', Path: 'value.measurements.PM10.PM10_value', Type: 'float' },
    ];
    const created = (type: string): ExportModel =>
        ({ ID: 'export-of-instance-' + type, ExportDatabaseID: 'database', Values: exportValues }) as ExportModel;

    /** A save fills the outside export of every Yr measurement without an outside source of its own. */
    function filledByYr(list: MeasurementModel[]): MeasurementModel[] {
        return list.map((m) =>
            m.short_name in yrPaths && !m.has_outside
                ? { ...m, outsideExport: created(yr), outsideData: { ...m.outsideData, column: exportValues.find((v) => v.Path === yrPaths[m.short_name]) } }
                : m,
        );
    }

    /** A widget as the dialog stored it: the whole catalogue, some entries enabled and edited. */
    function storedProperties(): AirQualityPropertiesModel {
        const measurements = createMeasurementCatalogue();
        measurements[0] = { ...measurements[0], is_enabled: true, math: '*2', export: EXPORTS[0], data: { value: NaN, column: EXPORTS[0].Values[1] } };
        measurements[3] = { ...measurements[3], is_enabled: true, insideDeviceId: 'device-1', insideServiceId: 'service-1', insideDeviceValuePath: 'co2' };
        const pollen = createPollenCatalogue();
        pollen[1] = { ...pollen[1], is_enabled: true, boundaries: { warn: { lower: 0, upper: 3 }, critical: { lower: 0, upper: 6 } } };
        return { measurements, pollen, location, formatted_address: address, version: 4 };
    }

    function open(properties: AirQualityPropertiesModel): void {
        const widget = { id: 'widget1', name: 'Air', type: 'air_quality', properties: structuredClone(properties) } as unknown as WidgetModel;
        spies.dashboard.getWidget.and.returnValue(of(widget));
        const fixture = TestBed.createComponent(AirQualityEditDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        flush();
    }

    function sent(): AirQualityPropertiesModel {
        expect(spies.dashboard.updateWidgetProperty.calls.count()).toBe(1);
        const [dashboardId, widgetId, path, properties] = spies.dashboard.updateWidgetProperty.calls.mostRecent().args;
        expect([dashboardId, widgetId, path]).toEqual(['dashboardId-1', 'widget1', []]);
        return properties as AirQualityPropertiesModel;
    }

    /** Enables the measurements the way the measurement picker does. */
    function enable(list: MeasurementModel[], ...shortNames: string[]): void {
        list.filter((m) => shortNames.includes(m.short_name)).forEach((m) => (m.is_enabled = true));
    }

    beforeEach(() => {
        spies = configureAirQualityDialogTestBed();
        spies.importTypes.parseImportTypeExportValues.and.returnValue(exportValues);
        Object.assign(environment, { importTypeIdUbaStation: uba, importTypeIdDwdPollen: dwd, importTypeIdYrForecast: yr });
    });

    afterEach(() => Object.assign(environment, originalTypeIds));

    it('sends an untouched stored widget back as it loaded, with the version and the provisioning info added', fakeAsync(() => {
        const stored = storedProperties();
        open(stored);

        component.save();

        const body = sent();
        expect(body.measurements).toEqual(filledByYr(stored.measurements!));
        expect(body.pollen).toEqual(stored.pollen!);
        expect(body.location).toEqual(location);
        expect(body.formatted_address).toBe(address);
        expect(body.version).toBe(4);
        expect(Object.keys(body).sort()).toEqual(['dwdPollenInfo', 'formatted_address', 'location', 'measurements', 'pollen', 'version', 'yrInfo']);
        expect(spies.dashboard.updateWidgetName.calls.mostRecent().args).toEqual(['dashboardId-1', 'widget1', 'Air']);
        expect(spies.dialogRef.close.calls.mostRecent().args[0].properties).toBe(body);
    }));

    it('adds the catalogue entries a stored widget does not know and keeps the order of the known ones', fakeAsync(() => {
        const stored = storedProperties();
        stored.measurements = stored.measurements!.slice(0, 2).reverse();
        open(stored);

        component.save();

        const catalogue = createMeasurementCatalogue();
        expect(sent().measurements).toEqual(filledByYr([stored.measurements[0], stored.measurements[1], ...catalogue.slice(2)]));
    }));

    it('sends a new widget with the whole catalogue, disabled', fakeAsync(() => {
        open({ location, formatted_address: address });

        component.save();

        const body = sent();
        expect(body.measurements).toEqual(filledByYr(createMeasurementCatalogue()));
        expect(body.pollen).toEqual(createPollenCatalogue());
        expect(body.version).toBe(4);
    }));

    it('sends an inside measurement with export, value and math, an outside one with device, service and value, and the thresholds', fakeAsync(() => {
        open({ location, formatted_address: address });
        const [pm10, pm25] = component.measurements;
        pm10.is_enabled = true;
        pm10.export = EXPORTS[0];
        pm10.data.column = EXPORTS[0].Values[1];
        pm10.math = '/10';
        pm10.boundaries = { warn: { lower: 1, upper: 35 }, critical: { lower: 2, upper: 45 } };
        pm25.is_enabled = true;
        pm25.has_outside = true;
        pm25.insideDeviceId = 'device-in';
        pm25.insideServiceId = 'service-in';
        pm25.insideDeviceValuePath = 'value.in';
        pm25.outsideDeviceId = 'device-out';
        pm25.outsideServiceId = 'service-out';
        pm25.outsideDeviceValuePath = 'value.out';
        pm25.outsideMath = '+1';

        component.save();

        const catalogue = createMeasurementCatalogue();
        expect(sent().measurements!.slice(0, 3)).toEqual([
            {
                ...catalogue[0],
                is_enabled: true,
                export: EXPORTS[0],
                data: { value: NaN, column: { InstanceID: 'inst-1', Name: 'pm10', Path: 'value.pm10', Type: 'float' } },
                math: '/10',
                boundaries: { warn: { lower: 1, upper: 35 }, critical: { lower: 2, upper: 45 } },
            },
            {
                ...catalogue[1],
                is_enabled: true,
                has_outside: true,
                insideDeviceId: 'device-in',
                insideServiceId: 'service-in',
                insideDeviceValuePath: 'value.in',
                outsideDeviceId: 'device-out',
                outsideServiceId: 'service-out',
                outsideDeviceValuePath: 'value.out',
                outsideMath: '+1',
            },
            catalogue[2],
        ]);
    }));

    it('sends the selected pollen entries with their warning and critical level', fakeAsync(() => {
        open({ location, formatted_address: address });
        enable(component.pollen, 'Birke', 'Hasel');
        component.pollen[1].boundaries.warn.upper = 3;
        component.pollen[1].boundaries.critical.upper = 6;
        component.pollen[3].boundaries.warn.upper = 2;
        component.pollen[3].boundaries.critical.upper = 7;

        component.save();

        const catalogue = createPollenCatalogue();
        const pollen = sent().pollen!;
        expect(pollen.length).toBe(catalogue.length);
        expect(pollen[1]).toEqual({ ...catalogue[1], is_enabled: true, boundaries: { warn: { lower: 0, upper: 3 }, critical: { lower: 0, upper: 6 } } });
        expect(pollen[3]).toEqual({ ...catalogue[3], is_enabled: true, boundaries: { warn: { lower: 0, upper: 2 }, critical: { lower: 0, upper: 7 } } });
        expect(pollen.filter((p) => p.is_enabled).map((p) => p.short_name)).toEqual(['Birke', 'Hasel']);
        expect(pollen.filter((p) => !p.is_enabled)).toEqual(catalogue.filter((p) => !['Birke', 'Hasel'].includes(p.short_name)));
    }));

    it('creates an import instance and an export per provider with these bodies and stores the references', fakeAsync(() => {
        open({ location, formatted_address: address });
        component.ubaStationSelected = { station_id: 5, station_longitude: 1, station_latitude: 1, station_name: 'station' };
        enable(component.pollen, 'Birke', 'Hasel');

        component.save();

        expect(spies.importInstances.saveImportInstance.calls.allArgs().map((a) => a[0])).toEqual([
            {
                name: 'AirQuality Widget: Air (lat: 51.5, long: 12.25)',
                configs: [{ name: 'lat', value: 51.5 }, { name: 'long', value: 12.25 }, { name: 'FilterPollen', value: ['Birke', 'Hasel'] }],
                import_type_id: dwd,
                generated: true,
            },
            {
                name: 'AirQuality Widget: Air (station 5)',
                configs: [{ name: 'FilterStationIds', value: ['5'] }],
                import_type_id: uba,
                generated: true,
            },
            {
                name: 'AirQuality Widget: Air (lat: 51.5, long: 12.25)',
                configs: [{ name: 'lat', value: 51.5 }, { name: 'long', value: 12.25 }, { name: 'max_forecasts', value: 1 }],
                import_type_id: yr,
                generated: true,
            },
        ] as never);
        const exportBody = (type: string) => ({
            Offset: 'smallest',
            Name: 'AirQuality Widget: Air',
            Filter: 'instance-' + type,
            FilterType: 'import_id',
            ServiceName: 'type ' + type,
            Values: exportValues,
            EntityName: 'AirQuality Widget: Air (' + (type === uba ? 'station 5' : 'lat: 51.5, long: 12.25') + ')',
            Topic: 'topic-' + type,
            TimePath: 'time',
            ExportDatabaseID: environment.exportDatabaseIdInternalTimescaleDb,
            TimestampFormat: '%Y-%m-%dT%H:%M:%SZ',
            Generated: true,
        });
        expect(spies.exportService.startPipeline.calls.allArgs().map((a) => a[0])).toEqual([exportBody(dwd), exportBody(uba), exportBody(yr)] as never);
        const info = (type: string, extra: object = {}) => ({
            importInstanceId: 'instance-' + type,
            importGenerated: true,
            exportId: 'export-of-instance-' + type,
            exportGenerated: true,
            exportDatabaseId: 'database',
            ...extra,
        });
        const body = sent();
        expect(body.ubaInfo).toEqual(info(uba, { stationId: '5' }));
        expect(body.dwdPollenInfo).toEqual(info(dwd));
        expect(body.yrInfo).toEqual(info(yr));
    }));
});
