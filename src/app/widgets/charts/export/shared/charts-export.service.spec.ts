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
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { ChartsExportService } from './charts-export.service';
import { ChartsExportDeviceGroupMergingStrategy, ChartsExportMeasurementModel, ChartsExportPropertiesModel, ChartsExportVAxesModel } from './charts-export-properties.model';
import { ExportDataService } from '../../../shared/export-data.service';
import { QueriesRequestV2ElementTimescaleModel } from '../../../shared/export-data.model';
import { LadonService } from '../../../../modules/admin/permissions/shared/services/ladom.service';
import { ElementSizeService } from '../../../../core/services/element-size.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { DashboardService } from '../../../../modules/dashboard/shared/dashboard.service';
import { DeviceInstancesService } from '../../../../modules/devices/device-instances/shared/device-instances.service';
import { environment } from '../../../../../environments/environment';
import { ChartsExportChart } from './charts-export-table';
import { WidgetModel } from '../../../../modules/dashboard/shared/dashboard-widget.model';

class MockLadonService {
    getUserAuthorizationsForURI(_uri: string): any {
        return undefined;
    }
}

describe('ChartsExportService', () => {
    let service: ChartsExportService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ChartsExportService,
                ExportDataService,
                { provide: LadonService, useClass: MockLadonService },
                ElementSizeService,
                ErrorHandlerService,
                { provide: MatSnackBar, useValue: {} },
                { provide: MatDialog, useValue: {} },
                { provide: DashboardService, useValue: {} },
                {
                    provide: DeviceInstancesService, useValue: {
                        getDeviceInstancesWithDeviceType: (o: { deviceIds: string[] }) => of({
                            result: o.deviceIds.map(id => ({ id, name: 'name of ' + id, display_name: 'Device ' + id, device_type: { services: [] } })),
                            total: o.deviceIds.length,
                        }),
                    },
                },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        service = TestBed.inject(ChartsExportService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    // The DWD weather export carries many series in one table, told apart only by a tag
    // column (station_id) -- the bug turned that tag filter's column into the value column
    // as soon as it went through the Timescale branch, so a station filter silently matched
    // the value instead.
    function timescaleExport(): ChartsExportMeasurementModel {
        return { id: 'export-1', name: 'weather', values: [], exportDatabaseId: environment.exportDatabaseIdInternalTimescaleDb };
    }

    function expectTimescaleRequest(): QueriesRequestV2ElementTimescaleModel {
        const req = httpMock.expectOne(environment.timescaleAPIURL + '/queries/v2');
        expect(req.request.method).toBe('POST');
        req.flush([{ requestIndex: 0, data: [] }]);
        return req.request.body[0];
    }

    it('keeps a tag filter on its own tag column in the Timescale branch', (done) => {
        const properties: ChartsExportPropertiesModel = {
            exports: [timescaleExport()],
            vAxes: [{
                instanceId: 'export-1',
                exportName: 'weather',
                valueName: 'global_irradiance_wm2',
                valueType: 'number',
                math: '',
                color: '',
                tagSelection: ['station_id!02932'],
            }],
        };

        service.getData(properties as any).subscribe(() => done());
        const element = expectTimescaleRequest();

        expect(element.filters).toEqual([{ column: 'station_id', type: '=', value: '02932' }]);
    });

    it('points the value filter at the value column in the Timescale branch', (done) => {
        const properties: ChartsExportPropertiesModel = {
            exports: [timescaleExport()],
            vAxes: [{
                instanceId: 'export-1',
                exportName: 'weather',
                valueName: 'global_irradiance_wm2',
                valueType: 'number',
                math: '',
                color: '',
                filterType: '>',
                filterValue: 5,
            }],
        };

        service.getData(properties as any).subscribe(() => done());
        const element = expectTimescaleRequest();

        expect(element.filters).toEqual([{ column: 'global_irradiance_wm2', type: '>', value: 5 }]);
    });

    it('applies both filters correctly together', (done) => {
        const properties: ChartsExportPropertiesModel = {
            exports: [timescaleExport()],
            vAxes: [{
                instanceId: 'export-1',
                exportName: 'weather',
                valueName: 'global_irradiance_wm2',
                valueType: 'number',
                math: '',
                color: '',
                tagSelection: ['station_id!02932'],
                filterType: '>',
                filterValue: 5,
            }],
        };

        service.getData(properties as any).subscribe(() => done());
        const element = expectTimescaleRequest();

        expect(element.filters).toEqual([
            { column: 'station_id', type: '=', value: '02932' },
            { column: 'global_irradiance_wm2', type: '>', value: 5 },
        ]);
    });

    describe('time zone of the Timescale query', () => {
        const properties = (group?: ChartsExportPropertiesModel['group']): ChartsExportPropertiesModel => ({
            exports: [timescaleExport()],
            vAxes: [{ instanceId: 'export-1', exportName: 'weather', valueName: 'v', valueType: 'number', math: '', color: '' }],
            group,
        });
        const forcedTz = () => {
            const req = httpMock.expectOne(r => r.url === environment.timescaleAPIURL + '/queries/v2');
            req.flush([{ requestIndex: 0, data: [] }]);
            return req.request.params.get('force_tz');
        };

        it('sends the browser zone when the request groups by time', (done) => {
            service.getData(properties({ time: '1h', type: 'mean' }) as any).subscribe(() => done());
            expect(forcedTz()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
        });

        it('sends none when the request does not group by time', (done) => {
            service.getData(properties() as any).subscribe(() => done());
            expect(forcedTz()).toBeNull();
        });
    });

    describe('grouping per axis', () => {
        const axis = (valueName: string, extra: Partial<ChartsExportVAxesModel> = {}): ChartsExportVAxesModel => ({
            instanceId: 'export-1', exportName: 'weather', valueName, valueType: 'number', math: '', color: '', ...extra,
        });
        const properties = (vAxes: ChartsExportVAxesModel[], extra: Partial<ChartsExportPropertiesModel> = {}): ChartsExportPropertiesModel => ({
            chartType: 'LineChart',
            exports: [timescaleExport()],
            vAxes,
            group: { time: '15m', type: 'mean' },
            timeRangeType: 'relative',
            time: { last: '1d' } as any,
            ...extra,
        });
        /** The elements as they go over the wire, where undefined fields are left out. */
        const wireElements = (props: ChartsExportPropertiesModel, groupInterval?: string): any[] => {
            service.getData(props as any, groupInterval === undefined ? undefined : '2026-10-05T00:00:00Z', groupInterval === undefined ? undefined : '2026-10-06T00:00:00Z', groupInterval).subscribe();
            const req = httpMock.expectOne(r => r.url === environment.timescaleAPIURL + '/queries/v2');
            req.flush((props.vAxes || []).map((_, requestIndex) => ({ requestIndex, data: [] })));
            return JSON.parse(JSON.stringify(req.request.body));
        };
        const columnOf = (element: any) => element.columns[0];

        it('sends the widget grouping for axes without an own one, as before', () => {
            const elements = wireElements(properties([axis('a'), axis('b', { math: '*2' })]));
            const element = (name: string, math?: string) => ({
                columns: [{ name, groupType: 'mean', ...(math === undefined ? {} : { math }) }],
                groupTime: '15m',
                time: { last: '1d' },
                orderDirection: 'desc',
                exportId: 'export-1',
                orderColumnIndex: 0,
            });
            expect(elements).toEqual([element('a'), element('b', '*2')]);
        });

        it('drops a stale Math from an axis whose own grouping is a difference', () => {
            const elements = wireElements(properties([
                axis('own', { math: '*2', ownGroup: { type: 'difference-last', time: '1d' } }),
                axis('widget', { math: '*2' }),
            ]));
            expect('math' in columnOf(elements[0])).toBeFalse();
            expect(columnOf(elements[1]).math).toBe('*2');
        });

        it('sends a raw axis without groupType and groupTime next to grouped ones', () => {
            const elements = wireElements(properties([
                axis('widget'),
                axis('raw', { ownGroup: { type: '', time: '' } }),
                axis('median', { ownGroup: { type: 'median', time: '1h' } }),
            ]));
            expect(elements[0].groupTime).toBe('15m');
            expect(columnOf(elements[0]).groupType).toBe('mean');
            expect('groupTime' in elements[1]).toBeFalse();
            expect('groupType' in columnOf(elements[1])).toBeFalse();
            expect(columnOf(elements[2]).groupType).toBe('median');
            expect(elements[2].groupTime).toBe('1h');
        });

        it('keeps the time of an own grouping when the zoom changes the interval', () => {
            const elements = wireElements(properties([
                axis('widget'),
                axis('median', { ownGroup: { type: 'median', time: '1d' } }),
            ]), '1h');
            expect(elements.map(e => e.groupTime)).toEqual(['1h', '1d']);
            expect(elements.map(e => e.time.start)).toEqual(['2026-10-05T00:00:00.000Z', '2026-10-05T00:00:00.000Z']);
        });

        it('lets an own grouping stand when the widget has none', () => {
            const elements = wireElements(properties([axis('raw'), axis('median', { ownGroup: { type: 'median', time: '1h' } })], { group: { time: '', type: '' } }));
            expect('groupTime' in elements[0]).toBeFalse();
            expect(elements[1].groupTime).toBe('1h');
        });

        it('ignores an own grouping on a chart that is not a line chart', () => {
            const elements = wireElements(properties([axis('raw', { ownGroup: { type: '', time: '' } }), axis('median', { ownGroup: { type: 'median', time: '1d' } })], { chartType: 'ColumnChart' }));
            expect(elements.map(columnOf).map(c => c.groupType)).toEqual(['mean', 'mean']);
            expect(elements.map(e => e.groupTime)).toEqual(['15m', '15m']);
        });

        it('falls back to the widget when an own type has no valid time', () => {
            const elements = wireElements(properties([axis('median', { ownGroup: { type: 'median', time: '' } })]));
            expect(columnOf(elements[0]).groupType).toBe('mean');
            expect(elements[0].groupTime).toBe('15m');
        });
    });

    describe('chart data of a column chart', () => {
        const axis = (alias: string, extra: Partial<ChartsExportVAxesModel> = {}): ChartsExportVAxesModel => ({
            deviceId: 'dev-' + alias,
            serviceId: 'svc-' + alias,
            exportName: alias,
            valueName: alias,
            valueAlias: alias,
            valueType: 'float',
            valuePath: 'value',
            math: '',
            color: '#00000' + alias.length,
            ...extra,
        });
        const separate = (alias: string): ChartsExportVAxesModel => axis(alias, {
            deviceId: undefined,
            deviceGroupId: 'group-' + alias,
            deviceGroupMergingStrategy: ChartsExportDeviceGroupMergingStrategy.Separate,
        });

        function widgetWith(vAxes: ChartsExportVAxesModel[]): WidgetModel {
            return {
                id: 'w', name: 'w', type: 'charts_export',
                properties: { chartType: 'ColumnChart', vAxes, group: { time: '1months', type: 'difference-last' }, timeRangeType: 'relative', time: { last: '24months' } } as any,
            };
        }

        /** One answer element per device: [requestIndex, deviceId, rows]. */
        function load(widget: WidgetModel, answer: [number, string, [string, number | null][]][], chooseColors = false): ChartsExportChart {
            let chart: ChartsExportChart | undefined;
            service.getChartData(widget, undefined, undefined, '1months', undefined, undefined, chooseColors).subscribe(c => chart = c as ChartsExportChart);
            httpMock.expectOne(r => r.url === environment.timescaleAPIURL + '/queries/v2').flush(answer.map(([requestIndex, deviceId, rows]) => ({
                requestIndex, deviceId, serviceId: 'svc', columnNames: ['value'], data: [rows],
            })));
            expect(chart).withContext('chart').toBeDefined();
            return chart as ChartsExportChart;
        }

        const t = (month: number) => new Date(2026, month - 1, 1).toISOString();

        it('hands the source axis of every column on with the chart', () => {
            const chart = load(widgetWith([separate('G'), axis('B')]), [[0, 'd1', [[t(10), 1]]], [0, 'd2', [[t(10), 2]]], [1, 'dev-B', [[t(10), 3]]]]);
            expect(chart.dataTable[0]).toEqual(['time', 'G - Device d1', 'G - Device d2', 'B']);
            expect(chart.columnAxes).toEqual([0, 0, 1]);
        });

        it('chooses different colours for the devices of a separate group axis that follows other axes', () => {
            const chart = load(widgetWith([axis('A'), axis('B'), separate('G')]),
                [[0, 'dev-A', [[t(10), 5]]], [1, 'dev-B', [[t(10), 6]]], [2, 'd1', [[t(10), 1]]], [2, 'd2', [[t(10), 2]]]], true);
            expect(chart.colors.length).toBe(4);
            expect(chart.colors[2]).not.toBe(chart.colors[3]);
        });
    });
});
