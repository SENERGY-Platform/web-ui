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

import { UntypedFormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { ChartsService } from './charts.service';
import { WidgetModel, WidgetPropertiesModels } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { ChartsExportEditDialogComponent } from '../export/dialog/charts-export-edit-dialog.component';

describe('ChartsService', () => {
    const service = new ChartsService();
    const drillKeys = ['_modifiedvAxes', '_drillStack', '_chooseColors', '_stacked'];
    const zoomKeys = ['_groupTime', '_hAxisFormat', '_from', '_to'];
    const id = 'w1';

    const before = (): WidgetPropertiesModels => ({
        chartType: 'ColumnChart',
        stacked: false,
        vAxes: [{ exportName: 'A', valueName: 'A', valueType: 'float', math: '', color: '#000' }],
        group: { time: '1months', type: 'difference-last' },
        time: { last: '24months' },
        timeRangeType: 'relative',
        hAxisFormat: 'MM.yyyy',
    } as WidgetPropertiesModels);

    function stored(): string[] {
        return [...drillKeys, ...zoomKeys].filter(k => localStorage.getItem(id + k) !== null);
    }

    beforeEach(() => {
        localStorage.clear();
        [...drillKeys, ...zoomKeys].forEach(k => localStorage.setItem(id + k, 'x'));
        localStorage.setItem('w10_modifiedvAxes', 'other widget');
    });

    afterEach(() => localStorage.clear());

    describe('cleanupStaleViewState', () => {
        it('keeps the view state when the properties did not change', () => {
            service.cleanupStaleViewState(id, before(), before());
            expect(stored()).toEqual([...drillKeys, ...zoomKeys]);
        });

        it('drops the drill state when the axes changed', () => {
            const after = before();
            after.vAxes![0].color = '#fff';
            service.cleanupStaleViewState(id, before(), after);
            expect(stored()).toEqual(zoomKeys);
        });

        it('drops the drill state when stacking changed', () => {
            service.cleanupStaleViewState(id, before(), { ...before(), stacked: true });
            expect(stored()).toEqual(zoomKeys);
        });

        it('drops the zoom state when grouping, time range, axis format or chart type changed', () => {
            const edits: Partial<WidgetPropertiesModels>[] = [
                { group: { time: '1d', type: 'difference-last' } },
                { time: { last: '12months' } as any },
                { timeRangeType: 'absolute' },
                { hAxisFormat: 'MM' },
                { chartType: 'LineChart' },
            ];
            edits.forEach(edit => {
                [...drillKeys, ...zoomKeys].forEach(k => localStorage.setItem(id + k, 'x'));
                service.cleanupStaleViewState(id, before(), { ...before(), ...edit } as WidgetPropertiesModels);
                expect(stored()).withContext(JSON.stringify(edit)).toEqual(drillKeys);
            });
        });

        it('leaves the state of other widgets alone', () => {
            service.cleanupStaleViewState(id, before(), { ...before(), stacked: true, hAxisFormat: 'MM' });
            expect(stored()).toEqual([]);
            expect(localStorage.getItem('w10_modifiedvAxes')).toBe('other widget');
        });
    });
    describe('cleanupStaleViewState with the value the edit dialog saves', () => {
        // as the server stores the monthly consumption widget: keys sorted, no stacked, empty strings in time
        const serverWidget = (): WidgetModel => ({
            id,
            name: 'Verbrauch je Monat',
            type: 'charts_export',
            properties: {
                break: false,
                breakInterval: null,
                calculateIntervals: null,
                chartType: 'ColumnChart',
                curvedFunction: null,
                exports: [{ device_type_id: 'dt-1', display_name: 'IOMeter', id: 'dev-1', name: 'IOMeter' }],
                group: { time: '1months', type: 'difference-last' },
                hAxisFormat: 'MM.yyyy',
                hAxisLabel: '',
                secondVAxisLabel: '',
                time: { ahead: '', end: '', last: '24months', start: '' },
                timeRangeType: 'relative',
                vAxes: [{ color: '#5a8bcb', deviceId: 'dev-1', displayOnSecondVAxis: false, exportName: 'IOMeter', math: '', serviceId: 'svc-1', tagSelection: [], valueAlias: 'kWh', valueName: 'total', valuePath: 'total', valueType: 'float' }],
                vAxisLabel: 'kWh',
                zoomTimeFactor: 2,
            } as any,
        });

        /** Opens the real edit dialog on a server copy, applies the edit and returns the widget it closes with. */
        function save(edit: (dialog: ChartsExportEditDialogComponent) => void): WidgetModel {
            let closed: WidgetModel | undefined;
            const dialog = new ChartsExportEditDialogComponent(
                { close: (w: WidgetModel) => closed = w } as any,
                {} as any,
                {
                    getWidget: () => of(serverWidget()),
                    updateWidgetName: () => of({ message: 'OK' }),
                    updateWidgetProperty: () => of({ message: 'OK' }),
                } as any,
                {} as any,
                new UntypedFormBuilder(),
                { dashboardId: 'd', widgetId: id, userHasUpdateNameAuthorization: true, userHasUpdatePropertiesAuthorization: true },
            );
            dialog.ngOnInit();
            edit(dialog);
            dialog.save();
            expect(closed).withContext('dialog closed with a widget').toBeDefined();
            return closed as WidgetModel;
        }

        it('keeps all state when only the name was edited', () => {
            const saved = save(d => d.formGroupController.get('name')?.setValue('Monatsverbrauch'));
            service.cleanupStaleViewState(id, serverWidget().properties, saved.properties);
            expect(stored()).toEqual([...drillKeys, ...zoomKeys]);
        });

        it('drops the zoom state and keeps the drill state when the time range was edited', () => {
            const saved = save(d => d.formGroupController.get('properties.time.last')?.setValue('12months'));
            service.cleanupStaleViewState(id, serverWidget().properties, saved.properties);
            expect(stored()).toEqual(drillKeys);
        });

        it('drops the zoom state when the grouping was edited', () => {
            const saved = save(d => d.formGroupController.get('properties.group.time')?.setValue('1d'));
            service.cleanupStaleViewState(id, serverWidget().properties, saved.properties);
            expect(stored()).toEqual(drillKeys);
        });

        it('drops the drill state and keeps the zoom state when an axis was edited', () => {
            const saved = save(d => d.dataSource.data = [{ ...d.dataSource.data[0], color: '#ff0000' }]);
            service.cleanupStaleViewState(id, serverWidget().properties, saved.properties);
            expect(stored()).toEqual(zoomKeys);
        });

        it('drops the drill state when stacking was switched on', () => {
            const saved = save(d => d.formGroupController.get('properties.stacked')?.setValue(true));
            service.cleanupStaleViewState(id, serverWidget().properties, saved.properties);
            expect(stored()).toEqual(zoomKeys);
        });
    });
});
