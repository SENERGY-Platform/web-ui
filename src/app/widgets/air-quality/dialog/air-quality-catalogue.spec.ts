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
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';
import { AirQualityEditDialogComponent } from './air-quality-edit-dialog.component';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { ExportModel } from '../../../modules/exports/shared/export.model';
import { ImportInstancesService } from '../../../modules/imports/import-instances/shared/import-instances.service';
import { ImportInstancesModel } from '../../../modules/imports/import-instances/shared/import-instances.model';
import { ImportTypesService } from '../../../modules/imports/import-types/shared/import-types.service';
import { ImportTypeModel } from '../../../modules/imports/import-types/shared/import-types.model';
import { environment } from '../../../../environments/environment';
import { AirQualityExternalProvider, MeasurementModel } from '../shared/air-quality.model';
import { createMeasurementCatalogue, createPollenCatalogue } from '../shared/air-quality-catalogue';

type Bounds = [number, number, number, number]; // warn lower, warn upper, critical lower, critical upper

function entry(
    nameHtml: string,
    shortName: string,
    descriptionHtml: string | undefined,
    unitHtml: string,
    b: Bounds,
    web?: boolean,
): MeasurementModel {
    const empty = () => ({ column: { InstanceID: '', Name: '', Path: '', Type: '' }, value: NaN });
    const m: MeasurementModel = {
        name_html: nameHtml,
        short_name: shortName,
        unit_html: unitHtml,
        data: empty(),
        outsideData: empty(),
        has_outside: false,
        boundaries: { warn: { lower: b[0], upper: b[1] }, critical: { lower: b[2], upper: b[3] } },
    };
    if (descriptionHtml !== undefined) {
        m.description_html = descriptionHtml;
    }
    if (web) {
        m.can_web = true;
        m.provider = AirQualityExternalProvider.Yr;
    }
    return m;
}

const UG = 'μg/m<sup>3</sup>';

const EXPECTED_MEASUREMENTS: MeasurementModel[] = [
    entry('PM10', 'PM10', 'Particulate matter up to 10μm', UG, [0, 40, 0, 50]),
    entry('PM2.5', 'PM2.5', 'Particulate matter up to 2.5μm', UG, [0, 25, 0, 30]),
    entry('PM1', 'PM1', 'Particulate matter up to 1μm', UG, [0, 0, 0, 0]),
    entry('CO<sub>2</sub>', 'CO2', 'Carbon Dioxide', 'ppm', [0, 1000, 0, 5000]),
    entry('O<sub>2</sub>', 'O2', 'Oxygen', '%', [19, 21, 18, 25]),
    entry('SO<sub>2</sub>', 'SO2', 'Sulfur Dioxide', UG, [0, 0, 1, 0]),
    entry('CH<sub>4</sub>', 'CH4', 'Methane', '%', [0, 0, 1, 0]),
    entry('NO<sub>2</sub>', 'NO2', 'Nitrogen Dioxide', UG, [0, 40, 0, 200]),
    entry('CO', 'CO', 'Carbon Monoxide', UG, [0, 8, 0, 35]),
    entry('O<sub>3</sub>', 'O3', 'Ozone', UG, [0, 0, 0, 180]),
    entry('Rn', 'Rn', 'Radon', 'Bq/m<sup>3</sup>', [0, 250, 0, 1000]),
    entry('Hum.', 'Hum.', 'relative Humidity', '%', [40, 50, 30, 70], true),
    entry('Temp.', 'Temp.', 'Temperature', '°C', [20, 22, 18, 26], true),
    entry('Noise', 'Noise', undefined, 'dB', [0, 40, 0, 65]),
    entry('VOC', 'VOC', 'Volatile Organic Compounds', 'mg/m<sup>3</sup>', [0, 1, 0, 10]),
    entry('Pressure', 'Pressure', 'Barometric Air Pressure', 'hPa', [0, 1100, 0, 1100], true),
    entry('Precipitation (1 h)', 'Precipitation', 'Precipitation within the next hour', 'mm', [0, 0, 0, 1], true),
];

const EXPECTED_POLLEN: MeasurementModel[] = ['Ambrosia', 'Birke', 'Erle', 'Hasel', 'Beifuss', 'Esche', 'Roggen', 'Graeser'].map((name) => {
    const m = entry(name, name, undefined, 'Level', [0, 1, 0, 3]);
    delete m.has_outside; // pollen entries carry no has_outside flag
    return m;
});

describe('air-quality catalogue of the edit dialog', () => {
    let component: AirQualityEditDialogComponent;
    let dashboardServiceSpy: Spy<DashboardService>;
    let exportServiceSpy: Spy<ExportService>;
    let importInstancesServiceSpy: Spy<ImportInstancesService>;
    let importTypesServiceSpy: Spy<ImportTypesService>;
    let calls: string[];
    const savedTypeIds = {
        uba: environment.importTypeIdUbaStation,
        dwd: environment.importTypeIdDwdPollen,
        yr: environment.importTypeIdYrForecast,
    };

    // the default environment uses one placeholder for all three, which hides the order of the steps
    beforeEach(() => {
        environment.importTypeIdUbaStation = 'type-uba';
        environment.importTypeIdDwdPollen = 'type-dwd';
        environment.importTypeIdYrForecast = 'type-yr';
        calls = [];
        dashboardServiceSpy = createSpyFromClass(DashboardService);
        exportServiceSpy = createSpyFromClass(ExportService);
        importInstancesServiceSpy = createSpyFromClass(ImportInstancesService);
        importTypesServiceSpy = createSpyFromClass(ImportTypesService);
        const dialogRefSpy = createSpyFromClass<MatDialogRef<AirQualityEditDialogComponent>>(MatDialogRef);

        dashboardServiceSpy.updateWidgetProperty.and.callFake(() => {
            calls.push('save widget');
            return of({ message: 'OK' });
        });
        importInstancesServiceSpy.saveImportInstance.and.callFake((i: ImportInstancesModel) => {
            calls.push('import instance ' + i.import_type_id);
            return of({ id: 'instance:' + i.import_type_id, name: 'instance', kafka_topic: 'topic' } as ImportInstancesModel);
        });
        importTypesServiceSpy.getImportType.and.callFake((typeId: string) => {
            calls.push('import type ' + typeId);
            return of({ name: 'type' } as ImportTypeModel);
        });
        importTypesServiceSpy.parseImportTypeExportValues.and.returnValue([]);
        exportServiceSpy.startPipeline.and.callFake((exp: ExportModel) => {
            calls.push('export for ' + exp.Filter);
            return of({ ID: 'export:' + exp.Filter, Values: [] } as unknown as ExportModel);
        });

        TestBed.configureTestingModule({
            providers: [
                { provide: DashboardService, useValue: dashboardServiceSpy },
                { provide: ExportService, useValue: exportServiceSpy },
                { provide: ImportInstancesService, useValue: importInstancesServiceSpy },
                { provide: ImportTypesService, useValue: importTypesServiceSpy },
                { provide: MatDialogRef, useValue: dialogRefSpy },
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {
                        dashboardId: 'dashboard1',
                        widgetId: 'widget1',
                        userHasUpdateNameAuthorization: false,
                        userHasUpdatePropertiesAuthorization: true,
                    },
                },
                provideHttpClient(withXhr(), withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        component = TestBed.createComponent(AirQualityEditDialogComponent).componentInstance;
        component.widget = { id: 'widget1', properties: {} } as any;
        component.ready = true;
    });

    afterEach(() => {
        environment.importTypeIdUbaStation = savedTypeIds.uba;
        environment.importTypeIdDwdPollen = savedTypeIds.dwd;
        environment.importTypeIdYrForecast = savedTypeIds.yr;
    });

    it('offers the measurement catalogue with these fields in this order', () => {
        expect(component.allMeasurements).toEqual(EXPECTED_MEASUREMENTS);
    });

    it('offers the pollen catalogue with these fields in this order', () => {
        expect(component.pollen).toEqual(EXPECTED_POLLEN);
    });

    it('gives the Yr measurements a provider and leaves the others without', () => {
        const withProvider = component.allMeasurements.filter((m) => m.provider !== undefined).map((m) => m.short_name);
        expect(withProvider).toEqual(['Hum.', 'Temp.', 'Pressure', 'Precipitation']);
    });

    it('builds the factories to the same content', () => {
        expect(createMeasurementCatalogue()).toEqual(EXPECTED_MEASUREMENTS);
        expect(createPollenCatalogue()).toEqual(EXPECTED_POLLEN);
    });

    it('hands out a fresh catalogue per call', () => {
        const first = createMeasurementCatalogue();
        first[0].is_enabled = true;
        first[0].data.value = 7;
        const second = createMeasurementCatalogue();
        expect(second[0]).not.toBe(first[0]);
        expect(second[0].is_enabled).toBeUndefined();
        expect(second[0].data.value).toBeNaN();
        expect(createPollenCatalogue()[0]).not.toBe(createPollenCatalogue()[0]);
        expect(component.pollen).not.toBe(TestBed.createComponent(AirQualityEditDialogComponent).componentInstance.pollen);
    });

    it('does not share state between measurement entries', () => {
        component.allMeasurements[0].data.value = 1;
        component.allMeasurements[0].data.column!.Name = 'x';
        expect(component.allMeasurements[1].data.value).toBeNaN();
        expect(component.allMeasurements[1].data.column!.Name).toBe('');
        expect(component.allMeasurements[0].data).not.toBe(component.allMeasurements[0].outsideData);
    });

    it('creates the provisioning steps in the order DWD, UBA, Yr and saves the widget last', () => {
        component.ubaStationSelected = { station_id: 5, station_longitude: 1, station_latitude: 1, station_name: 'station' };
        component.pollen[0].is_enabled = true;

        component.save();

        const uba = environment.importTypeIdUbaStation;
        const dwd = environment.importTypeIdDwdPollen;
        const yr = environment.importTypeIdYrForecast;
        expect(calls).toEqual([
            'import instance ' + dwd,
            'import type ' + dwd,
            'export for instance:' + dwd,
            'import instance ' + uba,
            'import type ' + uba,
            'export for instance:' + uba,
            'import instance ' + yr,
            'import type ' + yr,
            'export for instance:' + yr,
            'save widget',
        ]);
    });
});
