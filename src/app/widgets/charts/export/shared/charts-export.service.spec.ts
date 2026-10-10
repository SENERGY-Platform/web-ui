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
import { ChartsModel } from '../../shared/charts.model';
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
        const subAxes = [axis('Sub')];

        function widgetWith(vAxes: ChartsExportVAxesModel[], extra: Partial<ChartsExportPropertiesModel> = {}): WidgetModel {
            return {
                id: 'w', name: 'w', type: 'charts_export',
                properties: { chartType: 'ColumnChart', vAxes, group: { time: '1months', type: 'difference-last' }, timeRangeType: 'relative', time: { last: '24months' }, ...extra } as any,
            };
        }

        /** One answer element per device: [requestIndex, deviceId, rows]. */
        function load(widget: WidgetModel, answer: [number, string, [string, number | null][]][], chooseColors = false): ChartsModel {
            let model: ChartsModel | undefined;
            service.getChartData(widget, undefined, undefined, '1months', undefined, undefined, chooseColors).subscribe(m => model = m as ChartsModel);
            httpMock.expectOne(environment.timescaleAPIURL + '/queries/v2').flush(answer.map(([requestIndex, deviceId, rows]) => ({
                requestIndex, deviceId, serviceId: 'svc', columnNames: ['value'], data: [rows],
            })));
            expect(model).withContext('chart model').toBeDefined();
            return model as ChartsModel;
        }

        const t = (month: number, year = 2026) => new Date(year, month - 1, 1).toISOString();
        const values = (m: ChartsModel): any[][] => m.dataTable.slice(1).map(r => [(r[0] as Date).toISOString(), ...r.slice(1)]);

        it('drops the column of an axis without data', () => {
            const m = load(widgetWith([axis('A'), axis('B', { subAxes })]), [[0, 'dev-A', []], [1, 'dev-B', [[t(10), 5]]]]);
            expect(m.dataTable[0]).toEqual(['time', 'B']);
            expect(values(m)).toEqual([[t(10), 5]]);
        });

        it('names the source axis of the remaining column', () => {
            const m = load(widgetWith([axis('A'), axis('B', { subAxes })]), [[0, 'dev-A', []], [1, 'dev-B', [[t(10), 5]]]]);
            expect(m.columnAxes).toEqual([1]);
        });

        it('splits a separate group axis into one column per device', () => {
            const m = load(widgetWith([separate('G'), axis('B', { subAxes })]),
                [[0, 'd1', [[t(10), 1]]], [0, 'd2', [[t(10), 2]]], [1, 'dev-B', [[t(10), 3]]]]);
            expect(m.dataTable[0]).toEqual(['time', 'G - Device d1', 'G - Device d2', 'B']);
            expect(values(m)).toEqual([[t(10), 1, 2, 3]]);
        });

        it('names the source axis of every device column', () => {
            const m = load(widgetWith([separate('G'), axis('B', { subAxes })]),
                [[0, 'd1', [[t(10), 1]]], [0, 'd2', [[t(10), 2]]], [1, 'dev-B', [[t(10), 3]]]]);
            expect(m.columnAxes).toEqual([0, 0, 1]);
        });

        const byTime = (rows: any[][]) => rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

        it('keeps every device on its own values when an earlier device reported only nulls', () => {
            const m = load(widgetWith([separate('G')]),
                [[0, 'd1', [[t(10), null]]], [0, 'd2', [[t(10), 2]]], [0, 'd3', [[t(10), 3]]], [0, 'd4', [[t(9), 4]]]]);
            expect(m.dataTable[0]).toEqual(['time', 'G - Device d2', 'G - Device d3', 'G - Device d4']);
            expect(byTime(values(m))).toEqual([[t(9), null, null, 4], [t(10), 2, 3, null]]);
        });

        it('keeps every device on its own values after an axis that reported only nulls', () => {
            const m = load(widgetWith([axis('A'), separate('G')]),
                [[0, 'dev-A', [[t(10), null]]], [1, 'd1', [[t(10), 1]]], [1, 'd2', [[t(10), 2]]], [1, 'd3', [[t(10), 3]]]]);
            expect(values(m)).toEqual([[t(10), 1, 2, 3]]);
        });

        it('names the devices of a separate group axis that follows another axis', () => {
            const m = load(widgetWith([axis('A'), separate('G')]),
                [[0, 'dev-A', [[t(10), 5]]], [1, 'd1', [[t(10), 1]]], [1, 'd2', [[t(10), 2]]]]);
            expect(m.dataTable[0]).toEqual(['time', 'A', 'G - Device d1', 'G - Device d2']);
        });

        it('chooses different colours for the devices of a separate group axis that follows other axes', () => {
            const m = load(widgetWith([axis('A'), axis('B'), separate('G')]),
                [[0, 'dev-A', [[t(10), 5]]], [1, 'dev-B', [[t(10), 6]]], [2, 'd1', [[t(10), 1]]], [2, 'd2', [[t(10), 2]]]], true);
            const colors = m.options?.colors || [];
            expect(colors.length).toBe(4);
            expect(colors[2]).not.toBe(colors[3]);
        });

        describe('with breaking', () => {
            const broken = () => widgetWith([axis('A', { subAxes }), axis('B')], { break: true });
            const answer: [number, string, [string, number | null][]][] = [
                [0, 'dev-A', [[t(10), 1], [t(10, 2025), 2]]],
                [1, 'dev-B', [[t(10), 3], [t(10, 2025), 4]]],
            ];

            it('adds a column per earlier year and sorts the columns by name, descending', () => {
                const m = load(broken(), answer);
                expect(m.dataTable[0]).toEqual(['time', 'B -1y', 'B', 'A -1y', 'A']);
                expect(values(m)).toEqual([[t(10), undefined, 3, undefined, 1], [t(10), 4, null, 2, null]]);
            });

            it('keeps the source axis with every column through the sort', () => {
                const m = load(broken(), answer);
                expect(m.columnAxes).toEqual([1, 1, 0, 0]);
            });
        });
    });
});
