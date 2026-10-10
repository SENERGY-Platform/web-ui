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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { Chart } from 'chart.js';
import { Subject, of } from 'rxjs';
import { ChartsExportComponent } from './charts-export.component';
import { ChartsExportService } from './shared/charts-export.service';
import { ExportDataService } from '../../shared/export-data.service';
import { LadonService } from '../../../modules/admin/permissions/shared/services/ladom.service';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { DeviceInstancesService } from '../../../modules/devices/device-instances/shared/device-instances.service';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { ChartsExportDeviceGroupMergingStrategy, ChartsExportVAxesModel } from './shared/charts-export-properties.model';
import { environment } from '../../../../environments/environment';
import { findLabel, getLabelHitBoxes } from './chartjs-axis-click';
import { WidgetNoDataComponent } from '../../../core/components/widget-no-data/widget-no-data.component';

const QUERIES = environment.timescaleAPIURL + '/queries/v2';
const IOMETER = 'urn:infai:ses:device:342bbd67-919e-4a0d-ba57-d7ac59fbe296';
const IOMETER_SERVICE = 'urn:infai:ses:service:5dbfb0cd-5caa-5896-bce8-2ef3704a74ee';
const FAN = 'urn:infai:ses:device:0c5f92f6-9341-459e-b898-e8a217547e09';
const FAN_SERVICE = 'urn:infai:ses:service:81db5f2c-8d25-4cd8-a90c-12c390e2fee0';

class MockLadonService {
    getUserAuthorizationsForURI(_uri: string): any {
        return undefined;
    }
}

/** The monthly consumption widget from the report, reduced to what the request depends on. */
function monthlyWidget(): WidgetModel {
    return {
        id: 'widget-monthly',
        name: 'Verbrauch je Monat (kWh, 24 Monate)',
        type: 'charts_export',
        properties: {
            break: false,
            chartType: 'ColumnChart',
            exports: [
                { id: IOMETER, name: 'IOMeter', values: [] },
                { id: FAN, name: 'Badlüfter', values: [] },
            ],
            group: { time: '1months', type: 'difference-last' },
            hAxisFormat: 'MM.yyyy',
            stacked: false,
            time: { ahead: '', end: '', last: '24months', start: '' },
            timeRangeType: 'relative',
            vAxes: [{
                color: '#5a8bcb',
                deviceId: IOMETER,
                serviceId: IOMETER_SERVICE,
                displayOnSecondVAxis: false,
                exportName: 'IOMeter',
                math: '',
                tagSelection: [],
                valueAlias: 'Verbrauch kWh',
                valueName: 'decrypted: root.total_energy_consumption_kwh',
                valuePath: 'root.total_energy_consumption_kwh',
                valueType: 'float',
                subAxes: [{
                    color: '#5a8bcb',
                    deviceId: FAN,
                    serviceId: FAN_SERVICE,
                    displayOnSecondVAxis: false,
                    exportName: 'Badlüfter',
                    math: '/1000',
                    tagSelection: [],
                    valueAlias: 'Badlüfter kWh',
                    valueName: 'Get Energy Consumption: root.aenergy.total',
                    valuePath: 'root.aenergy.total',
                    valueType: 'float',
                }],
            }],
            vAxisLabel: 'kWh',
            zoomTimeFactor: 2,
        } as any,
    };
}

describe('ChartsExportComponent', () => {
    let fixture: ComponentFixture<ChartsExportComponent>;
    let component: ChartsExportComponent;
    let httpMock: HttpTestingController;
    let initWidget: Subject<string>;
    let widget: WidgetModel;

    beforeEach(() => {
        initWidget = new Subject<string>();
        widget = monthlyWidget();
        localStorage.clear();
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [ChartsExportComponent, WidgetNoDataComponent],
            imports: [BaseChartDirective],
            providers: [
                provideCharts(withDefaultRegisterables()),
                ChartsExportService,
                ExportDataService,
                DatePipe,
                { provide: LadonService, useClass: MockLadonService },
                { provide: MatDialog, useValue: {} },
                { provide: MatSnackBar, useValue: {} },
                { provide: DashboardService, useValue: { initWidgetObservable: initWidget.asObservable() } },
                {
                    provide: DeviceInstancesService, useValue: {
                        getDeviceInstancesWithDeviceType: (o: { deviceIds: string[] }) => of({
                            result: o.deviceIds.map(id => ({ id, name: id, display_name: 'Device ' + id, device_type: { services: [] } })),
                            total: o.deviceIds.length,
                        }),
                    },
                },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        httpMock = TestBed.inject(HttpTestingController);
        fixture = TestBed.createComponent(ChartsExportComponent);
        component = fixture.componentInstance;
        component.widget = widget;
        (fixture.nativeElement as HTMLElement).style.display = 'block';
        (fixture.nativeElement as HTMLElement).style.width = '800px';
        (fixture.nativeElement as HTMLElement).style.height = '400px';
        fixture.detectChanges();
    });

    afterEach(() => {
        Chart.getChart('chartjs-' + widget.id)?.destroy();
        httpMock.verify();
        localStorage.clear();
    });

    function chart(): Chart {
        const c = Chart.getChart('chartjs-' + widget.id);
        if (c === undefined) {
            throw new Error('chart not rendered');
        }
        return c;
    }

    /** Sets the canvas size and lays the chart out, as the resize observer would do in the browser. */
    function layout() {
        fixture.detectChanges();
        const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
        (canvas.parentNode as HTMLElement).style.width = '800px';
        (canvas.parentNode as HTMLElement).style.height = '400px';
        chart().resize(800, 400);
        chart().update();
    }

    /**
     * Clicks the centre of the given x-axis label through the DOM, the way a user does. Chart.js
     * handles DOM events on the next animation frame, hence the wait.
     */
    async function clickXLabel(index: number) {
        const boxes = getLabelHitBoxes(chart().scales['x']);
        const box = boxes[index];
        const localX = (box.bounds.left + box.bounds.right) / 2;
        const localY = (box.bounds.top + box.bounds.bottom) / 2;
        const x = box.pivot.x + localX * Math.cos(box.rotation) - localY * Math.sin(box.rotation);
        const y = box.pivot.y + localX * Math.sin(box.rotation) + localY * Math.cos(box.rotation);
        expect(findLabel(boxes, { x, y })[1]?.index).toBe(index);
        const canvas = chart().canvas;
        const rect = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new MouseEvent('click', { clientX: rect.left + x, clientY: rect.top + y, bubbles: true }));
        await new Promise(resolve => requestAnimationFrame(resolve));
    }

    function respond(body: any[]) {
        const req = httpMock.expectOne(QUERIES);
        req.flush(body);
        return req.request.body;
    }

    /** Answers the pending query with one series per request, rows as [ISO time, value]. */
    function respondSeries(series: { rows: [string, number | null][]; deviceId?: string; serviceId?: string }[]) {
        return respond(series.map((s, i) => ({
            requestIndex: i,
            data: [s.rows],
            deviceId: s.deviceId || IOMETER,
            serviceId: s.serviceId || IOMETER_SERVICE,
            columnNames: ['value'],
        })));
    }

    function ticks(): number[] {
        return chart().scales['x'].ticks.map(t => t.value);
    }

    /** Clicks the label of the tick at the given time and returns the request the zoom sends. */
    async function zoomAt(time: Date): Promise<any> {
        const index = ticks().indexOf(time.valueOf());
        expect(index).withContext('tick at ' + time.toISOString() + ' in ' + JSON.stringify(ticks().map(t => new Date(t).toISOString()))).not.toBe(-1);
        await clickXLabel(index);
        const req = httpMock.expectOne(QUERIES);
        req.flush([{ requestIndex: 0, data: [[]] }]);
        return req.request.body;
    }

    const local = (y: number, m: number, d = 1, h = 0) => new Date(y, m - 1, d, h);

    // the bucket starts at local midnight in whatever zone the spec runs in, as the backend's buckets do
    const october = { rows: [[local(2026, 10).toISOString(), 67]] as [string, number][] };

    describe('x-axis label zoom', () => {

        it('asks for the widget range on first load', () => {
            initWidget.next(widget.id);
            const body = respondSeries([october]);
            expect(body.length).toBe(1);
            expect(body[0].time).toEqual({ last: '24months' });
            expect(body[0].groupTime).toBe('1months');
        });

        // A single bucket gives Chart.js a zero-width range; it pads it by a millisecond on each side
        // and labels all three ticks, so the bar carries the middle label.
        it('labels a single month bucket with three ticks a millisecond apart', () => {
            initWidget.next(widget.id);
            respondSeries([october]);
            layout();
            const bucket = local(2026, 10).valueOf();
            expect(ticks()).toEqual([bucket - 1, bucket, bucket + 1]);
            expect(getLabelHitBoxes(chart().scales['x']).map(b => b.label)).toEqual(['09.2026', '10.2026', '10.2026']);
        });

        // the padding ticks lie 1 ms beside the only bucket, so every label of a single bucket means that bucket
        [-1, 0, 1].forEach(offset => {
            it('zooms the label ' + offset + ' ms from a single month bucket into the days of that month', async () => {
                initWidget.next(widget.id);
                respondSeries([october]);
                layout();
                const body = await zoomAt(new Date(local(2026, 10).valueOf() + offset));
                expect(body[0].groupTime).toBe('1d');
                expect(body[0].time).toEqual({ start: local(2026, 10).toISOString(), end: local(2026, 11).toISOString() });
            });
        });

        it('zooms from the clicked tick to the next one on a chart without grouping, as before', async () => {
            widget.properties.group = { time: '', type: '' };
            initWidget.next(widget.id);
            const body0 = respondSeries([{ rows: [8, 9, 10].map(m => [local(2026, m).toISOString(), m] as [string, number]) }]);
            expect(body0[0].groupTime).toBeUndefined();
            layout();
            const t = ticks();
            expect(t.length).toBeGreaterThan(1);
            const body = await zoomAt(new Date(t[0]));
            expect(body[0].time).toEqual({ start: new Date(t[0]).toISOString(), end: new Date(t[1]).toISOString() });
            expect(localStorage.getItem(widget.id + '_groupTime')).toBe('1y');
        });

        it('zooms a month between two others into its days and switches the axis format', async () => {
            initWidget.next(widget.id);
            respondSeries([{ rows: [[local(2026, 8).toISOString(), 1], [local(2026, 9).toISOString(), 2], [local(2026, 10).toISOString(), 3]] }]);
            layout();
            const body = await zoomAt(local(2026, 9));
            expect(body[0].groupTime).toBe('1d');
            expect(body[0].time).toEqual({ start: local(2026, 9).toISOString(), end: local(2026, 10).toISOString() });
            expect(localStorage.getItem(widget.id + '_groupTime')).toBe('1d');
            expect(localStorage.getItem(widget.id + '_hAxisFormat')).toBe('dd.MM.');
        });

        it('zooms the month before a missing month into that month only', async () => {
            initWidget.next(widget.id);
            respondSeries([{ rows: [[local(2026, 6).toISOString(), 1], [local(2026, 7).toISOString(), 1], [local(2026, 10).toISOString(), 3]] }]);
            layout();
            const body = await zoomAt(local(2026, 7));
            expect(body[0].time).toEqual({ start: local(2026, 7).toISOString(), end: local(2026, 8).toISOString() });
        });

        it('zooms the last month into that month only', async () => {
            initWidget.next(widget.id);
            respondSeries([{ rows: [[local(2026, 8).toISOString(), 1], [local(2026, 9).toISOString(), 2], [local(2026, 10).toISOString(), 3]] }]);
            layout();
            const body = await zoomAt(local(2026, 10));
            expect(body[0].time).toEqual({ start: local(2026, 10).toISOString(), end: local(2026, 11).toISOString() });
        });

        it('zooms a week into the days of that week', async () => {
            widget.properties.group = { time: '1w', type: 'difference-last' };
            widget.properties.hAxisFormat = 'dd.MM.';
            initWidget.next(widget.id);
            respondSeries([{ rows: [28, 35, 42].map(d => [local(2026, 9, d).toISOString(), d] as [string, number]) }]);
            layout();
            const body = await zoomAt(local(2026, 10, 5));
            expect(body[0].groupTime).toBe('1d');
            expect(body[0].time).toEqual({ start: local(2026, 10, 5).toISOString(), end: local(2026, 10, 12).toISOString() });
            expect(localStorage.getItem(widget.id + '_hAxisFormat')).toBe('dd.MM.');
        });

        it('keeps zooming from tick to tick on a chart without grouping, click after click', async () => {
            widget.properties.group = { time: '', type: '' };
            initWidget.next(widget.id);
            respondSeries([{ rows: [8, 9, 10].map(m => [local(2026, m).toISOString(), m] as [string, number]) }]);
            layout();
            const answers = [
                [1, 2, 3].map(d => local(2026, 8, d)),
                [1, 2, 3].map(h => local(2026, 8, 1, h)),
            ];
            const expectedGroupTimes = ['1y', '1months', '1d'];
            for (let click = 0; click < 3; click++) {
                const t = ticks();
                expect(t.length).withContext('ticks before click ' + (click + 1)).toBeGreaterThan(1);
                await clickXLabel(0);
                const req = httpMock.expectOne(QUERIES);
                expect(req.request.body[0].time).withContext('click ' + (click + 1)).toEqual({ start: new Date(t[0]).toISOString(), end: new Date(t[1]).toISOString() });
                expect(localStorage.getItem(widget.id + '_groupTime')).withContext('click ' + (click + 1)).toBe(expectedGroupTimes[click]);
                req.flush([{ requestIndex: 0, deviceId: IOMETER, serviceId: IOMETER_SERVICE, columnNames: ['value'], data: [(answers[click] || []).map((d, i) => [d.toISOString(), i + 1])] }]);
                if (click < 2) {
                    layout();
                }
            }
        });

        it('zooms a week of an export whose week buckets start on Thursday at midnight UTC into exactly that bucket', async () => {
            widget.properties.group = { time: '1w', type: 'difference-last' };
            widget.properties.hAxisFormat = 'dd.MM.';
            initWidget.next(widget.id);
            respondSeries([{ rows: [2, 9, 16].map(d => [new Date(Date.UTC(2026, 6, d)).toISOString(), d] as [string, number]) }]);
            layout();
            const body = await zoomAt(new Date(Date.UTC(2026, 6, 9)));
            expect(body[0].groupTime).toBe('1d');
            expect(body[0].time).toEqual({ start: '2026-07-09T00:00:00.000Z', end: '2026-07-16T00:00:00.000Z' });
        });

        it('zooms a week of a device whose week buckets start on Monday at local midnight into exactly that bucket', async () => {
            widget.properties.group = { time: '1w', type: 'difference-last' };
            widget.properties.hAxisFormat = 'dd.MM.';
            initWidget.next(widget.id);
            respondSeries([{ rows: [6, 13, 20].map(d => [local(2026, 7, d).toISOString(), d] as [string, number]) }]);
            layout();
            const body = await zoomAt(local(2026, 7, 13));
            expect(body[0].time).toEqual({ start: local(2026, 7, 13).toISOString(), end: local(2026, 7, 20).toISOString() });
        });

        // an export with UTC-aligned day buckets, on the days daylight saving starts and ends in Central Europe
        [[2, 29], [9, 25]].forEach(([month, day]) => {
            it('zooms a UTC-aligned day bucket on ' + (month + 1) + '/' + day + ' up to the next bucket the backend returned', async () => {
                widget.properties.group = { time: '1d', type: 'difference-last' };
                widget.properties.hAxisFormat = 'dd.MM.';
                initWidget.next(widget.id);
                respondSeries([{ rows: [day - 1, day, day + 1].map(d => [new Date(Date.UTC(2026, month, d)).toISOString(), d] as [string, number]) }]);
                layout();
                const body = await zoomAt(new Date(Date.UTC(2026, month, day)));
                expect(body[0].groupTime).toBe('1h');
                expect(body[0].time).toEqual({ start: new Date(Date.UTC(2026, month, day)).toISOString(), end: new Date(Date.UTC(2026, month, day + 1)).toISOString() });
            });
        });

        it('zooms a day into its hours by the calendar, also on the day daylight saving ends', async () => {
            widget.properties.group = { time: '1d', type: 'difference-last' };
            widget.properties.hAxisFormat = 'dd.MM.';
            initWidget.next(widget.id);
            respondSeries([{ rows: [24, 25, 26].map(d => [local(2026, 10, d).toISOString(), d] as [string, number]) }]);
            layout();
            const body = await zoomAt(local(2026, 10, 25));
            expect(body[0].groupTime).toBe('1h');
            expect(body[0].time).toEqual({ start: local(2026, 10, 25).toISOString(), end: local(2026, 10, 26).toISOString() });
        });
    });

    describe('zoom out', () => {
        function zoomedTo(groupTime: string, from: Date, to: Date) {
            localStorage.setItem(widget.id + '_groupTime', groupTime);
            localStorage.setItem(widget.id + '_from', from.toISOString());
            localStorage.setItem(widget.id + '_to', to.toISOString());
        }

        function zoomOut(): any {
            component.zoomOutTime();
            const req = httpMock.expectOne(QUERIES);
            req.flush([{ requestIndex: 0, data: [[]] }]);
            return req.request.body;
        }

        it('zooms the months of a year out to all years', () => {
            zoomedTo('1months', local(2026, 1), local(2027, 1));
            const body = zoomOut();
            expect(body[0].groupTime).toBe('1y');
            expect(body[0].time).toEqual({ start: new Date(0).toISOString(), end: '2999-01-01T00:00:00.000Z' });
        });

        it('zooms the days of a month out to the months of its year', () => {
            zoomedTo('1d', local(2026, 10), local(2026, 11));
            const body = zoomOut();
            expect(body[0].groupTime).toBe('1months');
            expect(body[0].time).toEqual({ start: local(2026, 1).toISOString(), end: local(2027, 1).toISOString() });
        });

        it('zooms the days of a week out to the months of its year', () => {
            zoomedTo('1w', local(2026, 10, 5), local(2026, 10, 12));
            const body = zoomOut();
            expect(body[0].groupTime).toBe('1months');
            expect(body[0].time).toEqual({ start: local(2026, 1).toISOString(), end: local(2027, 1).toISOString() });
        });

        it('zooms the hours of a day out to the days of its month', () => {
            zoomedTo('1h', local(2026, 10, 25), local(2026, 10, 26));
            const body = zoomOut();
            expect(body[0].groupTime).toBe('1d');
            expect(body[0].time).toEqual({ start: local(2026, 10).toISOString(), end: local(2026, 11).toISOString() });
        });

        it('zooms the hours of the last day of January out to January', () => {
            zoomedTo('1h', local(2026, 1, 31), local(2026, 2, 1));
            const body = zoomOut();
            expect(body[0].time).toEqual({ start: local(2026, 1).toISOString(), end: local(2026, 2).toISOString() });
        });

        it('zooms the minutes of an hour out to the hours of its day', () => {
            zoomedTo('1m', local(2026, 10, 25, 14), local(2026, 10, 25, 15));
            const body = zoomOut();
            expect(body[0].groupTime).toBe('1h');
            expect(body[0].time).toEqual({ start: local(2026, 10, 25).toISOString(), end: local(2026, 10, 26).toISOString() });
        });
    });
    describe('column drill', () => {
        const axis = (alias: string, extra: Partial<ChartsExportVAxesModel> = {}): ChartsExportVAxesModel => ({
            deviceId: 'dev-' + alias,
            serviceId: 'svc-' + alias,
            exportName: alias,
            valueName: alias,
            valueAlias: alias,
            valueType: 'float',
            valuePath: 'value',
            math: '',
            color: '#5a8bcb',
            ...extra,
        });
        const separate = (alias: string, extra: Partial<ChartsExportVAxesModel> = {}): ChartsExportVAxesModel => axis(alias, {
            deviceId: undefined,
            deviceGroupId: 'group-' + alias,
            deviceGroupMergingStrategy: ChartsExportDeviceGroupMergingStrategy.Separate,
            ...extra,
        });
        const subAxes = [axis('Sub')];
        const t = (year: number) => local(year, 10).toISOString();

        /** One answer element per device: [requestIndex, deviceId, rows]. */
        function render(vAxes: ChartsExportVAxesModel[], answer: [number, string, [string, number | null][]][], extra: any = {}) {
            widget.properties.vAxes = vAxes;
            Object.assign(widget.properties, extra);
            initWidget.next(widget.id);
            respond(answer.map(([requestIndex, deviceId, rows]) => ({ requestIndex, deviceId, serviceId: 'svc', columnNames: ['value'], data: [rows] })));
            fixture.detectChanges();
        }

        function datasetIndex(label: string): number {
            const labels = (component.chartjs.data?.datasets || []).map(d => d.label);
            const i = labels.indexOf(label);
            expect(i).withContext(label + ' in ' + JSON.stringify(labels)).not.toBe(-1);
            return i;
        }

        /** Drills into the dataset and returns the device ids the drilled request asks for. */
        function drill(label: string): string[] {
            component.drillDown(datasetIndex(label));
            const req = httpMock.expectOne(QUERIES);
            req.flush([{ requestIndex: 0, data: [[]] }]);
            return req.request.body.map((e: any) => e.deviceId);
        }

        it('drills the consumption column of the monthly widget into its sub axis', () => {
            initWidget.next(widget.id);
            respondSeries([october]);
            fixture.detectChanges();
            expect(component.drillable(0)).toBeTrue();
            component.drillDown(0);
            const req = httpMock.expectOne(QUERIES);
            // compared as sent on the wire, where undefined fields are left out
            expect(JSON.parse(JSON.stringify(req.request.body))).toEqual([{
                columns: [{ name: 'root.aenergy.total', math: '/1000', groupType: 'difference-last' }],
                groupTime: '1months',
                time: { last: '24months' },
                orderDirection: 'desc',
                serviceId: FAN_SERVICE,
                deviceId: FAN,
                orderColumnIndex: 0,
            }]);
            req.flush([{ requestIndex: 0, data: [[]], deviceId: FAN, serviceId: FAN_SERVICE, columnNames: ['root.aenergy.total'] }]);
            fixture.detectChanges();
            // the backend has no previous month to take a difference from, so there is nothing to show
            expect(component.errorHasOccured).toBeFalse();
            expect(component.chartjs.data).toBeUndefined();
            expect(fixture.nativeElement.querySelector('senergy-no-data')).not.toBeNull();
        });

        it('drills the column of the second axis when the first axis has no data', () => {
            render([axis('A'), axis('B', { subAxes })], [[0, 'dev-A', []], [1, 'dev-B', [[t(2026), 5]]]]);
            expect(component.drillable(datasetIndex('B'))).toBeTrue();
            expect(drill('B')).toEqual(['dev-Sub']);
        });

        it('drills the axis after a separate group axis, not a device of the group', () => {
            render([separate('G'), axis('B', { subAxes })], [[0, 'd1', [[t(2026), 1]]], [0, 'd2', [[t(2026), 2]]], [1, 'dev-B', [[t(2026), 3]]]]);
            expect(component.drillable(datasetIndex('G - Device d1'))).toBeFalse();
            expect(component.drillable(datasetIndex('G - Device d2'))).toBeFalse();
            expect(component.drillable(datasetIndex('B'))).toBeTrue();
            expect(drill('B')).toEqual(['dev-Sub']);
        });

        it('drills the axis a broken column comes from after the columns were sorted', () => {
            render([axis('A', { subAxes }), axis('B')], [
                [0, 'dev-A', [[t(2026), 1], [t(2025), 2]]],
                [1, 'dev-B', [[t(2026), 3], [t(2025), 4]]],
            ], { break: true });
            expect(component.drillable(datasetIndex('B -1y'))).toBeFalse();
            expect(component.drillable(datasetIndex('B'))).toBeFalse();
            expect(component.drillable(datasetIndex('A -1y'))).toBeTrue();
            expect(drill('A -1y')).toEqual(['dev-Sub']);
        });

        it('puts every device of a drilled group on the second y axis of the group axis', () => {
            render([axis('G', { deviceId: undefined, deviceGroupId: 'group-G', deviceGroupMergingStrategy: ChartsExportDeviceGroupMergingStrategy.Sum, displayOnSecondVAxis: true })],
                [[0, 'group', [[t(2026), 3]]]]);
            component.drillDown(0);
            respond([[0, 'd1', [[t(2026), 1]]], [0, 'd2', [[t(2026), 2]]]].map(([requestIndex, deviceId, rows]) => ({ requestIndex, deviceId, serviceId: 'svc', columnNames: ['value'], data: [rows] })));
            fixture.detectChanges();
            expect((component.chartjs.data?.datasets || []).map(d => (d as any).yAxisID)).toEqual(['y2', 'y2']);
        });

        it('puts each column on the y axis of the axis it comes from', () => {
            render([separate('G'), axis('B', { displayOnSecondVAxis: true })], [[0, 'd1', [[t(2026), 1]]], [0, 'd2', [[t(2026), 2]]], [1, 'dev-B', [[t(2026), 3]]]]);
            const yAxes = (component.chartjs.data?.datasets || []).map(d => [d.label, (d as any).yAxisID]);
            expect(yAxes).toEqual([['G - Device d1', 'y'], ['G - Device d2', 'y'], ['B', 'y2']]);
        });
    });
    describe('drill state', () => {
        const sub = { deviceId: 'dev-Sub', serviceId: 'svc-Sub', exportName: 'Sub', valueName: 'Sub', valueAlias: 'Sub', valueType: 'float', valuePath: 'value', math: '', color: '#5a8bcb' };
        const twoYears = (): [string, number][] => [[local(2026, 10).toISOString(), 1], [local(2025, 10).toISOString(), 2]];
        const labels = () => (component.chartjs.data?.datasets || []).map(d => d.label);

        function breakingWidget() {
            widget.properties.break = true;
            widget.properties.vAxes = [{ ...sub, deviceId: 'dev-A', serviceId: 'svc-A', valueAlias: 'A', valueName: 'A', exportName: 'A', subAxes: [sub] }];
        }

        function answer(deviceId: string) {
            respond([{ requestIndex: 0, deviceId, serviceId: 'svc', columnNames: ['value'], data: [twoYears()] }]);
            fixture.detectChanges();
        }

        function drilledIntoSub() {
            breakingWidget();
            initWidget.next(widget.id);
            answer('dev-A');
            expect(labels()).toEqual(['A -1y', 'A']);
            component.drillDown(0);
            answer('dev-Sub');
        }

        it('shows a drilled axis without breaking', () => {
            drilledIntoSub();
            expect(labels()).toEqual(['Sub']);
        });

        it('keeps breaking off for a drilled axis after a reload', () => {
            drilledIntoSub();
            fixture.destroy();
            fixture = TestBed.createComponent(ChartsExportComponent);
            component = fixture.componentInstance;
            component.widget = widget;
            fixture.detectChanges();

            initWidget.next(widget.id);
            answer('dev-Sub');
            expect(labels()).toEqual(['Sub']);
        });

        it('breaks the widget axes again after a reset', async () => {
            drilledIntoSub();
            component.customEvent({ index: 0, icon: 'undo' });
            await new Promise(resolve => setTimeout(resolve, 1100));
            answer('dev-A');
            expect(labels()).toEqual(['A -1y', 'A']);
        });

        it('breaks the widget axes again after drilling up', () => {
            drilledIntoSub();
            component.drillUp();
            answer('dev-A');
            expect(labels()).toEqual(['A -1y', 'A']);
        });
    });
    describe('no-data message', () => {
        const noDataText = () => (fixture.nativeElement.querySelector('senergy-no-data') as HTMLElement | null)?.textContent?.trim();

        function answerNothing(groupType: string) {
            widget.properties.group = { time: groupType === '' ? '' : '1months', type: groupType };
            initWidget.next(widget.id);
            respond([{ requestIndex: 0, data: [[]], deviceId: IOMETER, serviceId: IOMETER_SERVICE, columnNames: ['value'] }]);
            fixture.detectChanges();
        }

        it('explains an empty answer of a difference grouping', () => {
            answerNothing('difference-last');
            expect(noDataText()).toBe('No data. A difference also needs a value in the interval before.');
        });

        it('explains it for every difference grouping', () => {
            answerNothing('difference-first');
            expect(noDataText()).toBe('No data. A difference also needs a value in the interval before.');
        });

        it('keeps the plain text for an empty answer of another grouping', () => {
            answerNothing('mean');
            expect(noDataText()).toBe('No data');
        });

        it('keeps the plain text for an empty answer without grouping', () => {
            answerNothing('');
            expect(noDataText()).toBe('No data');
        });
    });
    describe('maximized view', () => {
        /** Renders the grid widget, then maximizes it the way the dashboard does: the grid instance is destroyed. */
        async function maximize(rows: [string, number][]) {
            initWidget.next(widget.id);
            respondSeries([{ rows }]);
            fixture.detectChanges();
            const initialWidgetData = component.getChartData();
            fixture.destroy();
            fixture = TestBed.createComponent(ChartsExportComponent);
            component = fixture.componentInstance;
            component.widget = widget;
            component.zoom = true;
            component.initialWidgetData = initialWidgetData;
            (fixture.nativeElement as HTMLElement).style.display = 'block';
            (fixture.nativeElement as HTMLElement).style.width = '800px';
            (fixture.nativeElement as HTMLElement).style.height = '400px';
            fixture.detectChanges();
            await new Promise(resolve => setTimeout(resolve));
            layout();
        }

        const months = [8, 9, 10].map(m => [local(2026, m).toISOString(), m] as [string, number]);

        it('zooms a label click on the maximized chart itself', async () => {
            await maximize(months);
            const maximized = component;
            await clickXLabel(ticks().indexOf(local(2026, 9).valueOf()));
            expect(maximized.ready).withContext('spinner while loading').toBeFalse();
            const req = httpMock.expectOne(QUERIES);
            expect(req.request.body[0].time).toEqual({ start: local(2026, 9).toISOString(), end: local(2026, 10).toISOString() });
            req.flush([{ requestIndex: 0, deviceId: IOMETER, serviceId: IOMETER_SERVICE, columnNames: ['value'], data: [[1, 2, 3].map(d => [local(2026, 9, d).toISOString(), d])] }]);
            fixture.detectChanges();
            expect(maximized.ready).toBeTrue();
            expect(maximized.chartjs.data?.datasets[0].data.length).toBe(3);
        });

        it('drills a column click on the maximized chart itself after a label zoom there', async () => {
            await maximize(months);
            const maximized = component;
            await clickXLabel(ticks().indexOf(local(2026, 9).valueOf()));
            httpMock.expectOne(QUERIES).flush([{ requestIndex: 0, deviceId: IOMETER, serviceId: IOMETER_SERVICE, columnNames: ['value'], data: [[1, 2, 3].map(d => [local(2026, 9, d).toISOString(), d])] }]);
            fixture.detectChanges();
            layout();
            (chart().options.onClick as any)(null, [{ datasetIndex: 0 }], chart());
            expect(maximized.ready).withContext('spinner while loading').toBeFalse();
            const req = httpMock.expectOne(QUERIES);
            expect(req.request.body.map((e: any) => e.deviceId)).toEqual([FAN]);
            req.flush([{ requestIndex: 0, data: [[]] }]);
        });

        it('drills a column of the maximized chart', async () => {
            await maximize(months);
            expect(component.drillable(0)).toBeTrue();
            component.drillDown(0);
            const req = httpMock.expectOne(QUERIES);
            expect(req.request.body.map((e: any) => e.deviceId)).toEqual([FAN]);
            req.flush([{ requestIndex: 0, deviceId: FAN, serviceId: FAN_SERVICE, columnNames: ['value'], data: [months] }]);
            fixture.detectChanges();
            expect(component.chartjs.data?.datasets.map(d => d.label)).toEqual(['Badlüfter kWh']);
        });
    });
});
