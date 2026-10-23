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
import { MultiValueEditDialogComponent } from './multi-value-edit-dialog.component';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { ChartsExportMeasurementModel } from '../../charts/export/shared/charts-export-properties.model';
import { ExportValueModel } from '../../../modules/exports/shared/export.model';
import { MultiValueMeasurement, MultiValueOrderEnum } from '../shared/multi-value.model';
import { configureMultiValueDialogTestBed, EXPORTS, MultiValueDialogSpies } from './multi-value-dialog-testbed.mock';

/**
 * The properties the dialog sends are read by the multi value widget on every dashboard. These specs pin the whole
 * request body: the export object, the column objects taken from it and the boundary defaults.
 */
describe('MultiValueEditDialogComponent saved widget', () => {
    let component: MultiValueEditDialogComponent;
    let spies: MultiValueDialogSpies;

    const power: ChartsExportMeasurementModel = { id: 'export-1', name: 'Power meter', values: EXPORTS[0].Values };
    const heatPump: ChartsExportMeasurementModel = { id: 'export-2', name: 'Heat pump', values: EXPORTS[1].Values };
    const column = (exported: ChartsExportMeasurementModel, index: number): ExportValueModel => exported.values[index];

    /** Number with warnings and math. */
    const numeric: MultiValueMeasurement = {
        name: 'Power',
        type: 'Number',
        format: '1.1-1',
        export: power,
        column: column(power, 0),
        unit: 'W',
        math: '*2',
        lowerBoundary: 0.5,
        upperBoundary: 10,
        warning_enabled: true,
        data: 5,
        time: '1700000000',
    };

    /** String: math, unit and warnings do not apply; the boundaries are stored as the number limits. */
    const text: MultiValueMeasurement = {
        name: 'State',
        type: 'String',
        format: '',
        export: power,
        column: column(power, 1),
        unit: '',
        math: '',
        lowerBoundary: Number.MIN_VALUE,
        upperBoundary: Number.MAX_VALUE,
        warning_enabled: false,
    };

    const flag: MultiValueMeasurement = {
        name: 'Running',
        type: 'Boolean',
        format: '',
        export: heatPump,
        column: column(heatPump, 1),
        unit: '',
        math: '',
        lowerBoundary: Number.MIN_VALUE,
        upperBoundary: Number.MAX_VALUE,
        warning_enabled: false,
    };

    /** What the dialog sends for a stored measurement: the display data of the widget (data, time) is not part of it. */
    const sentForm = (measurement: MultiValueMeasurement): MultiValueMeasurement => {
        const { data: _data, time: _time, ...rest } = measurement;
        return rest;
    };

    function stored(measurements: MultiValueMeasurement[] = [numeric, text, flag]): WidgetModel {
        return {
            id: 'widgetId-1',
            name: 'Stored values',
            type: 'multi_value',
            properties: { multivaluemeasurements: structuredClone(measurements), order: MultiValueOrderEnum.ValueDesc, valueAlias: 'Reading', other: 'kept' },
        } as unknown as WidgetModel;
    }

    beforeEach(() => {
        spies = configureMultiValueDialogTestBed();
    });

    function open(widget: WidgetModel = stored()): void {
        spies.dashboard.getWidget.and.returnValue(of(widget));
        const fixture = TestBed.createComponent(MultiValueEditDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        flush();
    }

    function sent(): { multivaluemeasurements: MultiValueMeasurement[]; order: number; valueAlias: string; other: string } {
        expect(spies.dashboard.updateWidgetProperty.calls.count()).toBe(1);
        const [dashboardId, widgetId, path, properties] = spies.dashboard.updateWidgetProperty.calls.mostRecent().args;
        expect([dashboardId, widgetId, path]).toEqual(['dashboardId-1', 'widgetId-1', []]);
        return properties;
    }

    const sentMeasurements = () => sent().multivaluemeasurements;

    it('sends an untouched stored widget back as it loaded, without the display data', fakeAsync(() => {
        open();

        component.save();

        expect(sent()).toEqual({
            multivaluemeasurements: [sentForm(numeric), sentForm(text), sentForm(flag)],
            order: MultiValueOrderEnum.ValueDesc,
            valueAlias: 'Reading',
            other: 'kept',
        });
        expect(spies.dashboard.updateWidgetName.calls.mostRecent().args).toEqual(['dashboardId-1', 'widgetId-1', 'Stored values']);
        expect(spies.dialogRef.close.calls.mostRecent().args[0].properties.multivaluemeasurements).toBe(sentMeasurements());
    }));

    it('sends the export and column objects as the stored widget holds them', fakeAsync(() => {
        open();

        component.save();

        const [first, second] = sentMeasurements();
        expect(first.export).toEqual({ id: 'export-1', name: 'Power meter', values: EXPORTS[0].Values });
        expect(first.column).toEqual({ InstanceID: 'inst-1', Name: 'power', Path: 'value.power', Type: 'float' });
        expect(second.column).toEqual({ InstanceID: 'inst-1', Name: 'state', Path: 'value.state', Type: 'string' });
    }));

    it('sends a lower boundary of 0 as the smallest number, because 0 is falsy', fakeAsync(() => {
        open(stored([{ ...numeric, lowerBoundary: 0, upperBoundary: 0 }]));

        component.save();

        expect(sentMeasurements()[0].lowerBoundary).toBe(Number.MIN_VALUE);
        expect(sentMeasurements()[0].upperBoundary).toBe(Number.MAX_VALUE);
    }));

    it('opens a stored widget without measurements with one empty, invalid measurement', fakeAsync(() => {
        open(stored([]));

        expect(component.getMeasurements().length).toBe(1);
        expect(component.formGroup.valid).toBeFalse();
        expect(component.getMeasurement(0).getRawValue()).toEqual({
            name: '',
            export: {},
            column: {},
            unit: '',
            type: '',
            format: '',
            math: '',
            warnings: { warning_enabled: false, lowerBoundary: undefined, upperBoundary: undefined },
        });
    }));

    it('sends an added measurement with export, value, unit, type, format, math and warnings', fakeAsync(() => {
        open();

        component.addNewMeasurement();
        const added = component.getMeasurement(3);
        added.patchValue({ name: 'Flow', export: component.exports[1], column: component.exports[1].values[0], unit: 'm3/h', format: '1.0-2' });
        added.patchValue({ type: 'Number' });
        added.patchValue({ math: '+1.5' });
        component.getWarningGroup(3).patchValue({ warning_enabled: true });
        component.getWarningGroup(3).patchValue({ lowerBoundary: -1, upperBoundary: 5.5 });
        expect(component.formGroup.valid).toBeTrue();
        component.save();

        expect(sentMeasurements().length).toBe(4);
        expect(sentMeasurements()[3]).toEqual({
            name: 'Flow',
            type: 'Number',
            format: '1.0-2',
            export: { id: 'export-2', name: 'Heat pump', values: EXPORTS[1].Values },
            column: { InstanceID: 'inst-2', Name: 'flow', Path: 'value.flow', Type: 'float' },
            unit: 'm3/h',
            math: '+1.5',
            lowerBoundary: -1,
            upperBoundary: 5.5,
            warning_enabled: true,
        });
        expect(sentMeasurements().slice(0, 3)).toEqual([sentForm(numeric), sentForm(text), sentForm(flag)]);
    }));

    it('names an added measurement after its export and value when the alias is empty', fakeAsync(() => {
        open(stored([]));

        component.getMeasurement(0).patchValue({ export: component.exports[1] });
        component.getMeasurement(0).patchValue({ column: component.exports[1].values[1], type: 'Boolean' });
        component.save();

        expect(sentMeasurements()[0].name).toBe('Heat pump - running');
        expect(sentMeasurements()[0].export).toEqual({ id: 'export-2', name: 'Heat pump', values: EXPORTS[1].Values });
        expect(sentMeasurements()[0].column).toEqual({ InstanceID: 'inst-2', Name: 'running', Path: 'value.running', Type: 'bool' });
    }));

    it('sends an added measurement of type String with its math and warnings off', fakeAsync(() => {
        open(stored([]));

        component.getMeasurement(0).patchValue({ name: 'Label', export: component.exports[0], column: component.exports[0].values[1], type: 'String', format: 'x', unit: 'u' });
        component.save();

        expect(sentMeasurements()).toEqual([
            {
                name: 'Label',
                type: 'String',
                format: 'x',
                export: { id: 'export-1', name: 'Power meter', values: EXPORTS[0].Values },
                column: { InstanceID: 'inst-1', Name: 'state', Path: 'value.state', Type: 'string' },
                unit: 'u',
                math: '',
                lowerBoundary: Number.MIN_VALUE,
                upperBoundary: Number.MAX_VALUE,
                warning_enabled: false,
            },
        ]);
    }));

    it('sends the measurements without the deleted one', fakeAsync(() => {
        open();

        component.removeTab(1);
        component.save();

        expect(sentMeasurements()).toEqual([sentForm(numeric), sentForm(flag)]);
    }));

    it('sends a moved measurement at its new position', fakeAsync(() => {
        open();

        component.moveDown(0);
        component.save();

        expect(sentMeasurements().map((m) => m.name)).toEqual(['State', 'Power', 'Running']);
        expect(sentMeasurements()[1]).toEqual(sentForm(numeric));
    }));

    it('sends a measurement moved up at its new position', fakeAsync(() => {
        open();

        component.moveUp(2);
        component.save();

        expect(sentMeasurements().map((m) => m.name)).toEqual(['Power', 'Running', 'State']);
        expect(sentMeasurements()[1]).toEqual(sentForm(flag));
    }));

    it('sends the changed name, order and alias', fakeAsync(() => {
        open();

        component.formGroup.patchValue({ name: 'Renamed', order: MultiValueOrderEnum.TimeAsc as never, valueAlias: 'Now' });
        component.save();

        expect(spies.dashboard.updateWidgetName.calls.mostRecent().args[2]).toBe('Renamed');
        expect(sent().order).toBe(MultiValueOrderEnum.TimeAsc);
        expect(sent().valueAlias).toBe('Now');
    }));

    it('sends only the name for a user who may only rename', fakeAsync(() => {
        TestBed.resetTestingModule();
        spies = configureMultiValueDialogTestBed({ name: true, properties: false });
        open();

        component.save();

        expect(spies.dashboard.updateWidgetName.calls.count()).toBe(1);
        expect(spies.dashboard.updateWidgetProperty.calls.count()).toBe(0);
    }));

    it('sends only the properties for a user who may not rename', fakeAsync(() => {
        TestBed.resetTestingModule();
        spies = configureMultiValueDialogTestBed({ name: false, properties: true });
        open();

        component.save();

        expect(spies.dashboard.updateWidgetName.calls.count()).toBe(0);
        expect(spies.dashboard.updateWidgetProperty.calls.count()).toBe(1);
    }));
});
