/*
 * Copyright 2020 InfAI (CC SES)
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

import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { ElementSizeService } from '../../../../core/services/element-size.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { ChartDataTableModel } from '../../../../core/model/chart/chart-data-table.model';
import { MatDialog } from '@angular/material/dialog';
import { DashboardService } from '../../../../modules/dashboard/shared/dashboard.service';
import { openWidgetEditDialog } from '../../../../modules/dashboard/shared/open-widget-edit-dialog';
import { ChartsExportEditDialogComponent } from '../dialog/charts-export-edit-dialog.component';
import { WidgetModel, WidgetPropertiesModels } from '../../../../modules/dashboard/shared/dashboard-widget.model';
import { ErrorModel } from '../../../../core/model/error.model';
import {
    ChartsExportDeviceGroupMergingStrategy,
    ChartsExportMeasurementModel,
    ChartsExportPropertiesModel,
    ChartsExportVAxesModel
} from './charts-export-properties.model';
import { ChartsExportRequestPayloadGroupModel } from './charts-export-request-payload.model';
import { ChartsExportRangeTimeTypeEnum } from './charts-export-range-time-type.enum';
import { ExportDataService } from '../../../shared/export-data.service';
import {
    QueriesRequestElementInfluxModel,
    QueriesRequestElementTimescaleModel,
    QueriesRequestFilterModel,
    QueriesRequestTimeModel,
    QueriesRequestV2ElementTimescaleModel,
} from '../../../shared/export-data.model';
import { catchError, concatMap, map, mergeMap } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { DeviceInstancesWithDeviceTypeTotalModel, DeviceInstanceWithDeviceTypeModel } from 'src/app/modules/devices/device-instances/shared/device-instances.model';
import { DeviceInstancesService } from 'src/app/modules/devices/device-instances/shared/device-instances.service';
import Color from 'color';
import { ChartsExportChart, chartsExportChart, chartsExportDefaultColor, chartsExportTable, getRgbDistance, themeColorsForTitles } from './charts-export-table';

@Injectable({
    providedIn: 'root',
})
export class ChartsExportService {
    private exportDataService = inject(ExportDataService);
    private elementSizeService = inject(ElementSizeService);
    private errorHandlerService = inject(ErrorHandlerService);
    private dialog = inject(MatDialog);
    private dashboardService = inject(DashboardService);
    private deviceInstancesService = inject(DeviceInstancesService);


    devices = new Map<string, DeviceInstanceWithDeviceTypeModel>();

    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean, userHasUpdatePropertiesAuthorization: boolean): void {
        openWidgetEditDialog(this.dialog, this.dashboardService, ChartsExportEditDialogComponent, {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization,
            userHasUpdatePropertiesAuthorization
        }, { minWidth: '600px' });
    }

    getData(properties: WidgetPropertiesModels, fromTime?: string, toTime?: string, groupInterval?: string, lastOverride?: string): Observable<{ data: any[][][][] | null | ErrorModel; metadata: { exportId?: string; deviceId?: string; serviceId?: string; columnName?: string }[][] }> {
        const widgetProperties = properties as ChartsExportPropertiesModel;
        const time: QueriesRequestTimeModel = {};
        const limit = properties.chartType === 'PieChart' && properties.calculateIntervals !== true ? 1 : undefined;
        let group: ChartsExportRequestPayloadGroupModel | undefined;

        if (widgetProperties.group && widgetProperties.group.type !== undefined && widgetProperties.group.type !== '') {
            group = {
                time: widgetProperties.group.time,
                type: widgetProperties.group.type,
            };
        }

        if (fromTime !== undefined && toTime !== undefined && groupInterval !== undefined) {
            time.start = new Date(fromTime).toISOString();
            time.end = new Date(toTime).toISOString();
            if (group !== undefined) {
                group.time = groupInterval;
            }
        } else if (widgetProperties.timeRangeType === ChartsExportRangeTimeTypeEnum.Absolute && widgetProperties.time) {
            time.start = new Date(widgetProperties.time.start as string).toISOString();
            time.end = new Date(widgetProperties.time.end as string).toISOString();
        } else if (widgetProperties.timeRangeType === ChartsExportRangeTimeTypeEnum.Relative && widgetProperties.time) {
            time.last = lastOverride || widgetProperties.time.last;
        } else if (widgetProperties.timeRangeType === ChartsExportRangeTimeTypeEnum.RelativeAhead && widgetProperties.time) {
            time.ahead = widgetProperties.time.ahead;
        }

        const influxElements: QueriesRequestElementInfluxModel[] = [];
        const timescaleElements: QueriesRequestElementTimescaleModel[] = [];
        const influxResultMapper: number[] = [];
        const timescaleResultMapper: number[] = [];

        widgetProperties.vAxes?.forEach((vAxis: ChartsExportVAxesModel, index) => {
            const newField: QueriesRequestElementInfluxModel | QueriesRequestV2ElementTimescaleModel = {
                columns: [
                    {
                        name: vAxis.criteria === undefined ? vAxis.valueName : undefined,
                        math: vAxis.math !== '' ? vAxis.math : undefined,
                        groupType: group?.type !== null ? group?.type : undefined,
                        criteria: vAxis.criteria,
                    },
                ],
                groupTime: group?.time !== '' ? group?.time : undefined,
                limit,
                time,
                orderDirection: 'desc',
                deviceGroupId: vAxis.deviceGroupId,
                locationid: vAxis.locationId,
            };
            const filters: QueriesRequestFilterModel[] = [];
            vAxis.tagSelection?.forEach((tagFilter) => {
                filters.push({ column: tagFilter.split('!')[0], type: '=', value: tagFilter.split('!')[1] });
            });
            let valueFilter: QueriesRequestFilterModel | undefined;
            if (vAxis.filterType !== undefined) {
                valueFilter = {
                    column: vAxis.valueName,
                    type: vAxis.filterType,
                    value: vAxis.valueType === 'string' ? vAxis.filterValue : Number(vAxis.filterValue),
                };
                filters.push(valueFilter);
            }
            const exp = widgetProperties.exports?.find(x => x.id === vAxis.instanceId);
            if (exp !== undefined &&
                ((exp as ChartsExportMeasurementModel).exportDatabaseId === undefined || (exp as ChartsExportMeasurementModel).exportDatabaseId === environment.exportDatabaseIdInternalInfluxDb)) {
                (newField as QueriesRequestElementInfluxModel).measurement = vAxis.instanceId;
                (newField as QueriesRequestElementInfluxModel).orderColumnIndex = 1;
                if (filters.length > 0) {
                    newField.filters = filters;
                }
                influxElements.push(newField);
                influxResultMapper.push(index);
            } else {
                (newField as QueriesRequestElementTimescaleModel).exportId = vAxis.instanceId;
                (newField as QueriesRequestElementTimescaleModel).serviceId = vAxis.serviceId;
                (newField as QueriesRequestElementTimescaleModel).deviceId = vAxis.deviceId;
                (newField as QueriesRequestElementInfluxModel).orderColumnIndex = 0;
                newField.columns[0].name = vAxis.criteria === undefined ? (vAxis.valuePath || vAxis.valueName || '') : undefined;
                if (filters.length > 0) {
                    // only the value filter targets the value column here; tag filters keep their tag column
                    if (valueFilter !== undefined) {
                        valueFilter.column = vAxis.valuePath || vAxis.valueName || '';
                    }
                    newField.filters = filters;
                }
                timescaleElements.push(newField);
                timescaleResultMapper.push(index);
            }
        });

        const obs: Observable<{ source: string; res: any[][][][]; metadata: { exportId?: string; deviceId?: string; serviceId?: string; columnName?: string }[][] }>[] = [];

        if (influxElements.length > 0) {
            obs.push(this.exportDataService.queryInflux(influxElements).pipe(
                map(res => {
                    const metadata: { exportId?: string; deviceId?: string; serviceId?: string; columnName?: string }[][] = [];
                    const responseTimescaleFormat: any = [];
                    if (res != null) {
                        res.forEach(responsePerRequest => {
                            responseTimescaleFormat.push([responsePerRequest]);
                            metadata.push([]);
                        });
                    }

                    return {
                        source: 'influx',
                        res: responseTimescaleFormat,
                        metadata,
                    };
                })
            ));
        }

        if (timescaleElements.length > 0) {
            obs.push(this.exportDataService.queryTimescaleV2(timescaleElements).pipe(map(values => {
                const max = values.reduce((p, m) => {
                    if (m.requestIndex > p.requestIndex) {
                        return m;
                    }
                    return p;
                }).requestIndex;
                const res: any[][] = [];
                const metadata: { exportId?: string; deviceId?: string; serviceId?: string; columnName?: string }[][] = [];
                while (res.length < max + 1) {
                    res.push([]);
                    metadata.push([]);
                }
                values.forEach((_, elementIndex) => {
                    const threeD = values[elementIndex].data;
                    const columnNames = values[elementIndex].columnNames;
                    const metadataElem = { exportId: values[elementIndex].exportId, deviceId: values[elementIndex].deviceId, serviceId: values[elementIndex].serviceId, columnName: columnNames !== undefined && columnNames.length === 1 ? columnNames[0] : undefined };
                    if (threeD !== null) {
                        switch ((properties.vAxes || [])[timescaleResultMapper[values[elementIndex].requestIndex]].deviceGroupMergingStrategy) {
                            case ChartsExportDeviceGroupMergingStrategy.Merge:
                                // merge into one table row
                                if (res[values[elementIndex].requestIndex].length === 0) {
                                    res[values[elementIndex].requestIndex].push([]);
                                }
                                threeD.forEach(rows => {
                                    if (rows.length === 0) {
                                        return;
                                    }
                                    if (rows[0].length > 2) {
                                        rows.forEach(row => {
                                            row.slice(1).forEach(r => {
                                                res[values[elementIndex].requestIndex][0].push([row[0], r]);
                                            });
                                        });
                                    } else {
                                        res[values[elementIndex].requestIndex][0].push(...rows);
                                    }
                                });
                                break;
                            case ChartsExportDeviceGroupMergingStrategy.Sum:
                                // sum by timestamp
                                // can only be selected together with a group to ensure identical timestamps
                                if (res[values[elementIndex].requestIndex].length === 0) {
                                    res[values[elementIndex].requestIndex].push([]);
                                }
                                threeD.forEach(rows => {
                                    rows.forEach(row => {
                                        const elem = res[values[elementIndex].requestIndex][0].find((r: any) => r.length > 0 && r[0] === row[0]);
                                        if (elem === undefined) {
                                            res[values[elementIndex].requestIndex][0].push(row);
                                        } else {
                                            let v = (elem[1] as number);
                                            row.slice(1).forEach(n => v += n);
                                            elem[1] = v;
                                        }
                                    });
                                });
                                break;
                            case ChartsExportDeviceGroupMergingStrategy.Separate:
                            default:
                                // preserve individual rows
                                threeD.forEach(rows => {
                                    if (rows.length === 0) {
                                        return;
                                    }
                                    if (rows[0].length > 2) {
                                        const off = res[values[elementIndex].requestIndex].length;
                                        rows.forEach(row => {
                                            row.slice(1).forEach((r, i) => {
                                                while (res[values[elementIndex].requestIndex].length <= off + i) {
                                                    res[values[elementIndex].requestIndex].push([]);
                                                    metadata[values[elementIndex].requestIndex].push({});
                                                }
                                                res[values[elementIndex].requestIndex][off + i].push([row[0], r]);
                                                metadata[values[elementIndex].requestIndex][off + i] = JSON.parse(JSON.stringify(metadataElem));
                                                if (columnNames !== undefined && columnNames.length > i) {
                                                    metadata[values[elementIndex].requestIndex][off + i].columnName = columnNames[i];
                                                }
                                            });
                                        });
                                    } else {
                                        res[values[elementIndex].requestIndex].push(rows);
                                        metadata[values[elementIndex].requestIndex].push(metadataElem);
                                    }
                                });
                                break;
                        }
                    }
                });
                return { source: 'timescale', res, metadata };
            })));
        }

        return forkJoin(obs).pipe(map(res => {
            const table: any[][][][] = [];
            const metadata: { exportId?: string; deviceId?: string; serviceId?: string; columnName?: string }[][] = [];
            for (let i = 0; i < timescaleElements.length + influxElements.length; i++) {
                table.push([]);
                metadata.push([]);
            }
            let mapper: number[] = [];
            res.forEach(r => {
                switch (r.source) {
                    case 'influx':
                        mapper = influxResultMapper;
                        break;
                    case 'timescale':
                        mapper = timescaleResultMapper;
                        break;
                }
                r.res.forEach((req, index) => {
                    table[mapper[index]] = req;
                    if (r.metadata.length > index) {
                        metadata[mapper[index]] = r.metadata[index];
                    }
                });
            });
            for (let i = 0; i < table.length; i++) {
                for (let j = 0; j < table[i].length; j++) {
                    if (table[i][j].length > 0) {
                        return { data: table, metadata };
                    }
                }
            }
            return { data: null, metadata };
        }), catchError(err => {
            const error: ErrorModel = { error: err.message };
            return of({ data: error, metadata: [] });
        }));
    }


    getChartData(widget: WidgetModel, _from?: string, to?: string, groupInterval?: string, hAxisFormat?: string, lastOverride?: string, chooseColors = false, disableBreaking = false): Observable<ChartsExportChart | ErrorModel> {
        return this.getData(widget.properties, _from, to, groupInterval, lastOverride).pipe(concatMap(r => {
            let obs: Observable<DeviceInstancesWithDeviceTypeTotalModel> = of({ result: [], total: 0 });
            const deviceIds: string[] = [];
            r.metadata.forEach(m => {
                m.forEach(subM => {
                    if (subM.deviceId !== undefined && !this.devices.has(subM.deviceId) && deviceIds.indexOf(subM.deviceId) === -1) {
                        deviceIds.push(subM.deviceId);
                    }
                });
            });
            if (deviceIds.length > 0) {
                obs = this.deviceInstancesService.getDeviceInstancesWithDeviceType({
                    limit: deviceIds.length,
                    offset: 0,
                    deviceIds,
                });
            }
            return obs.pipe(map(devices => {
                devices.result.forEach(d => this.devices.set(d.id, d));
                return r;
            }));
        })).pipe(mergeMap(r => {
            const resp = r.data;
            if (resp === null) {
                // no data
                return of(this.setProcessInstancesStatusValues(widget, new ChartDataTableModel([[]])));
            } else if (this.errorHandlerService.checkIfErrorExists(resp)) {
                return of(resp as ErrorModel);
            } else {
                const obs: Observable<any>[] = [of(null)]; // needs at leat one Obserfable for forkJoin
                const tableData = chartsExportTable(resp, widget.properties, r.metadata, this.devices, groupInterval, disableBreaking);
                if (chooseColors) {
                    const titles = tableData.table.data[0].slice(1).map(title => String(title || ''));
                    tableData.colors = this.getThemeColorsForTitles(titles);
                }
                return forkJoin(obs).pipe(map(_ => this.setProcessInstancesStatusValues(widget, tableData.table, tableData.colors, hAxisFormat)));
            }
        }));
    }

    private getThemeColorsForTitles(titles: string[]): string[] {
        return themeColorsForTitles(titles, this.getRuntimeThemePalette());
    }

    private getRuntimeThemePalette(): string[] {
        const hues = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', 'A100', 'A200', 'A400', 'A700'];
        const entries: { className: string; property: 'color' | 'backgroundColor' }[] = [
            { className: 'color-accent', property: 'color' },
            { className: 'color-warn', property: 'color' },
            { className: 'color-sidenav', property: 'color' },
            { className: 'background-color-accent', property: 'backgroundColor' },
            { className: 'background-color-sidenav', property: 'backgroundColor' },
        ];

        ['accent', 'warn', 'sidenav'].forEach(prefix => {
            hues.forEach(hue => entries.push({ className: `color-${prefix}-${hue}`, property: 'color' }));
        });

        const colors = entries
            .map(entry => this.getComputedThemeColor(entry.className, entry.property))
            .filter((value): value is string => value !== undefined);

        const excludedColors = new Set<string>();
        if (typeof document !== 'undefined') {
            const candidates = [
                document.body ? getComputedStyle(document.body).color : undefined,
                document.body ? getComputedStyle(document.body).backgroundColor : undefined,
                document.documentElement ? getComputedStyle(document.documentElement).color : undefined,
                document.documentElement ? getComputedStyle(document.documentElement).backgroundColor : undefined,
                '#ffffff', // transparent page backgrounds render on white canvas
            ];
            candidates.forEach(value => {
                if (!value || value === 'transparent') {
                    return;
                }
                try {
                    const normalized = Color(value);
                    if (normalized.alpha() > 0) {
                        excludedColors.add(normalized.hex());
                    }
                } catch (_) {
                    // ignore unparsable values
                }
            });
        }

        const filteredColors = colors.filter(color => {
            try {
                const c = Color(color);
                for (const excluded of excludedColors) {
                    const e = Color(excluded);
                    if (c.hex() === e.hex() || getRgbDistance(c, e) < 3) {
                        return false;
                    }
                }
            } catch (_) {
                return true;
            }
            return true;
        });

        const unique = [...new Set(filteredColors)];
        return unique.length > 0 ? unique : [chartsExportDefaultColor];
    }

    private setProcessInstancesStatusValues(widget: WidgetModel, dataTable: ChartDataTableModel, colorOverride?: string[], hAxisFormat?: string): ChartsExportChart {
        return chartsExportChart(widget, dataTable, colorOverride, hAxisFormat);
    }

    private getComputedThemeColor(className: string, property: 'color' | 'backgroundColor'): string | undefined {
        if (typeof document === 'undefined' || !document.body) {
            return undefined;
        }
        const element = document.createElement('span');
        element.className = className;
        element.style.display = 'none';
        document.body.appendChild(element);
        const cssValue = getComputedStyle(element)[property];
        document.body.removeChild(element);
        if (!cssValue || cssValue === 'transparent') {
            return undefined;
        }
        try {
            return Color(cssValue).hex();
        } catch (_) {
            return undefined;
        }
    }
}
