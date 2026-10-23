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
import { config, of } from 'rxjs';
import { SingleValueEditDialogComponent } from './single-value-edit-dialog.component';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { SingleValueAggregations } from '../shared/single-value.model';
import { configureSingleValueDialogTestBed, CONCEPT, DEVICE_GROUP, DEVICE_TYPE, DEVICES, EXPORTS, SingleValueDialogSpies } from './single-value-dialog-testbed.mock';

/**
 * The properties the dialog sends are read by the single value widget on every dashboard. These specs pin the whole
 * request body as it goes over the wire (JSON, so undefined fields are absent) for each source type.
 */
describe('SingleValueEditDialogComponent saved widget', () => {
    let component: SingleValueEditDialogComponent;
    let spies: SingleValueDialogSpies;

    /** Display, timestamp and highlighting settings every source type can carry. */
    const display = {
        type: 'Number',
        format: '1.1-1',
        math: '*2',
        threshold: 64,
        vAxisLabel: 'W',
        group: { type: 'mean', time: '1h' },
        timestampConfig: { showTimestamp: true, highlightTimestamp: true, warningTimeLevel: 'h', warningAge: 2, problemTimeLevel: 'd', problemAge: 3 },
        valueHighlightConfig: { highlight: true, thresholds: [{ threshold: 10, color: '#ff0000', direction: 'above' }, { threshold: 2, color: '#0000ff', direction: 'below' }] },
        other: 'kept',
    };

    const exportProperties = {
        ...display,
        sourceType: 'export',
        measurement: { id: 'export-1', name: 'Power meter', values: EXPORTS[0].Values, exportDatabaseId: 'db-1' },
        vAxis: EXPORTS[0].Values[0],
    };
    const deviceProperties = {
        ...display,
        sourceType: 'device',
        device: DEVICES[0],
        service: DEVICE_TYPE.services[0],
        vAxis: { Name: 'value.power' },
    };
    const groupProperties = {
        ...display,
        sourceType: 'deviceGroup',
        deviceGroupId: 'group-1',
        deviceGroupCriteria: DEVICE_GROUP.criteria?.[0],
        deviceGroupAggregation: SingleValueAggregations.Sum,
        targetCharacteristic: 'char-w',
    };

    beforeEach(() => {
        spies = configureSingleValueDialogTestBed();
        // Picking a device makes the service listener read the cleared service ('') and throw; rxjs rethrows that on a timer.
        config.onUnhandledError = () => undefined;
    });

    afterEach(async () => {
        // the rethrow runs on a timer, so wait for it before the hook goes away
        await new Promise((resolve) => setTimeout(resolve));
        config.onUnhandledError = null;
    });

    function open(properties: object): void {
        const widget = { id: 'widgetId-1', name: 'Stored value', type: 'single_value', properties: structuredClone(properties) } as unknown as WidgetModel;
        spies.dashboard.getWidget.and.returnValue(of(widget));
        const fixture = TestBed.createComponent(SingleValueEditDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    /** The properties request as the backend receives it. */
    function sent(): Record<string, unknown> {
        expect(spies.dashboard.updateWidgetProperty.calls.count()).toBe(1);
        const [dashboardId, widgetId, path, properties] = spies.dashboard.updateWidgetProperty.calls.mostRecent().args;
        expect([dashboardId, widgetId, path]).toEqual(['dashboardId-1', 'widgetId-1', []]);
        return JSON.parse(JSON.stringify(properties));
    }

    it('sends an untouched export widget back as it loaded', () => {
        open(exportProperties);

        component.save();

        expect(sent()).toEqual(JSON.parse(JSON.stringify(exportProperties)));
        expect(spies.dashboard.updateWidgetName.calls.mostRecent().args).toEqual(['dashboardId-1', 'widgetId-1', 'Stored value']);
        expect(spies.dialogRef.close.calls.mostRecent().args[0].properties.measurement.exportDatabaseId).toBe('db-1');
    });

    it('sends an untouched device widget back as it loaded', () => {
        open(deviceProperties);

        component.save();

        // today's code always sends the export field, empty when the widget has none
        expect(sent()).toEqual({ ...JSON.parse(JSON.stringify(deviceProperties)), measurement: {} });
    });

    it('sends an untouched device group widget back as it loaded', () => {
        open(groupProperties);

        component.save();

        expect(sent()).toEqual({ ...JSON.parse(JSON.stringify(groupProperties)), measurement: {} });
    });

    it('sends the form defaults for a stored widget that carries only a name', () => {
        open({});

        component.save();

        // the font size and the aggregation default are overwritten by the stored (absent) values when loading
        expect(sent()).toEqual({
            measurement: {},
            group: {},
            sourceType: 'export',
            timestampConfig: { showTimestamp: false, highlightTimestamp: false, warningTimeLevel: 'd', warningAge: 1, problemTimeLevel: 'd', problemAge: 7 },
            valueHighlightConfig: { highlight: false, thresholds: [] },
        });
    });

    it('sends a newly picked export with its database and the chosen value', () => {
        open({ sourceType: 'export' });

        component.form.patchValue({ measurement: component.exports[1] });
        component.form.patchValue({ vAxis: component.exports[1].values[0], vAxisLabel: 'm3/h', type: 'Number', format: '1.0-2' });
        component.save();

        expect(sent()).toEqual(jasmine.objectContaining({
            sourceType: 'export',
            measurement: { id: 'export-2', name: 'Heat pump', values: EXPORTS[1].Values, exportDatabaseId: 'db-2' },
            vAxis: EXPORTS[1].Values[0],
            vAxisLabel: 'm3/h',
            type: 'Number',
            format: '1.0-2',
        }));
    });

    it('clears the service and the value when another device is picked', () => {
        open(deviceProperties);

        component.form.patchValue({ device: DEVICES[1] });
        component.save();

        const body = sent();
        expect(body['device']).toEqual(JSON.parse(JSON.stringify(DEVICES[1])));
        expect(body['service']).toBeUndefined();
        expect(body['vAxis']).toBeUndefined();
    });

    it('offers only services with one output and sends the picked service and value path', () => {
        open({ sourceType: 'device' });

        component.form.patchValue({ device: DEVICES[1] });
        expect(component.services.map((s) => s.id)).toEqual(['service-1', 'service-2']);
        component.form.patchValue({ service: component.services[1] });
        expect(component.paths).toEqual([{ Name: 'value.status' }, { Name: 'value.status.unit' }]);
        component.form.patchValue({ vAxis: component.paths[1] as never });
        component.save();

        expect(sent()).toEqual(jasmine.objectContaining({
            sourceType: 'device',
            device: JSON.parse(JSON.stringify(DEVICES[1])),
            service: JSON.parse(JSON.stringify(DEVICE_TYPE.services[1])),
            vAxis: { Name: 'value.status.unit' },
        }));
    });

    it('sends the criteria of the picked device group and the characteristic of the picked unit', () => {
        open({ sourceType: 'deviceGroup' });

        component.form.patchValue({ deviceGroupId: 'group-1' });
        component.form.patchValue({ deviceGroupCriteria: component.getCriteria()[0] });
        expect(component.concept).toBe(CONCEPT);
        component.form.patchValue({ vAxisLabel: 'kW', deviceGroupAggregation: SingleValueAggregations.Sum });
        component.save();

        expect(sent()).toEqual(jasmine.objectContaining({
            sourceType: 'deviceGroup',
            deviceGroupId: 'group-1',
            deviceGroupCriteria: DEVICE_GROUP.criteria?.[0],
            deviceGroupAggregation: 'sum',
            vAxisLabel: 'kW',
            targetCharacteristic: 'char-kw',
        }));
    });

    it('keeps the export of the old source when the source type is switched, but not its value', () => {
        open(exportProperties);

        component.form.patchValue({ sourceType: 'device' });
        component.form.patchValue({ device: DEVICES[0] });
        component.save();

        expect(sent()).toEqual(jasmine.objectContaining({
            sourceType: 'device',
            measurement: JSON.parse(JSON.stringify(exportProperties.measurement)),
            device: JSON.parse(JSON.stringify(DEVICES[0])),
        }));
        expect('vAxis' in sent()).toBeFalse();
    });

    it('drops the format of a String value and sends no format', () => {
        open(exportProperties);

        component.form.patchValue({ type: 'String' });
        component.save();

        const body = sent();
        expect(body['type']).toBe('String');
        expect('format' in body).toBeFalse();
    });

    it('sends the thresholds as the threshold list reports them, with highlighting on', () => {
        open({ ...exportProperties, valueHighlightConfig: { highlight: false, thresholds: [] } });

        component.valueHighlightConfigUpdated([{ threshold: 5, color: '#00ff00', direction: 'below' }]);
        component.save();

        expect(sent()['valueHighlightConfig']).toEqual({ highlight: true, thresholds: [{ threshold: 5, color: '#00ff00', direction: 'below' }] });
    });

    it('sends the timestamp settings that were changed, also those hidden by the checkboxes', () => {
        open(exportProperties);

        component.form.controls.timestampConfig.patchValue({ showTimestamp: false, warningAge: 5, problemTimeLevel: 'min' });
        component.save();

        expect(sent()['timestampConfig']).toEqual({ showTimestamp: false, highlightTimestamp: true, warningTimeLevel: 'h', warningAge: 5, problemTimeLevel: 'min', problemAge: 3 });
    });

    it('sends 0 for the font size as no value, because 0 is falsy', () => {
        open(exportProperties);

        component.form.patchValue({ threshold: 0 });
        component.save();

        expect('threshold' in sent()).toBeFalse();
    });

    it('sends only the name without the right to update properties', () => {
        spies = configureSingleValueDialogTestBedFor({ name: true, properties: false });
        open(exportProperties);

        component.form.patchValue({ name: 'Renamed' });
        component.save();

        expect(spies.dashboard.updateWidgetName.calls.mostRecent().args).toEqual(['dashboardId-1', 'widgetId-1', 'Renamed']);
        expect(spies.dashboard.updateWidgetProperty).not.toHaveBeenCalled();
    });

    it('sends only the properties without the right to update the name', () => {
        spies = configureSingleValueDialogTestBedFor({ name: false, properties: true });
        open(exportProperties);

        component.save();

        expect(spies.dashboard.updateWidgetName).not.toHaveBeenCalled();
        expect(spies.dashboard.updateWidgetProperty.calls.count()).toBe(1);
    });

    /** The module is configured once per spec; a different set of rights needs a fresh one. */
    function configureSingleValueDialogTestBedFor(rights: { name: boolean; properties: boolean }): SingleValueDialogSpies {
        TestBed.resetTestingModule();
        return configureSingleValueDialogTestBed(rights);
    }
});
