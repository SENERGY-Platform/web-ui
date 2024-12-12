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

import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { ChartsModel } from '../../shared/charts.model';
import { ElementSizeService } from '../../../../core/services/element-size.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { ChartDataTableModel } from '../../../../core/model/chart/chart-data-table.model';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DashboardService } from '../../../../modules/dashboard/shared/dashboard.service';
import { ChartsExportEditDialogComponent } from '../dialog/charts-export-edit-dialog.component';
import { WidgetModel, WidgetPropertiesModels } from '../../../../modules/dashboard/shared/dashboard-widget.model';
import { DashboardManipulationEnum } from '../../../../modules/dashboard/shared/dashboard-manipulation.enum';
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
import { catchError, concatMap, map } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { DeviceInstancesTotalModel, DeviceInstancesWithDeviceTypeTotalModel, DeviceInstanceWithDeviceTypeModel } from 'src/app/modules/devices/device-instances/shared/device-instances.model';
import { DeviceInstancesService } from 'src/app/modules/devices/device-instances/shared/device-instances.service';
import { hashCode } from 'src/app/core/services/util.service';

const customColor = '#4484ce'; // /* cc */

@Injectable({
    providedIn: 'root',
})
export class ChartsExportService {
    constructor(
        private exportDataService: ExportDataService,
        private elementSizeService: ElementSizeService,
        private errorHandlerService: ErrorHandlerService,
        private dialog: MatDialog,
        private dashboardService: DashboardService,
        private deviceInstancesService: DeviceInstancesService,
    ) {
    }

    devices = new Map<string, DeviceInstanceWithDeviceTypeModel>();

    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean, userHasUpdatePropertiesAuthorization: boolean): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.minWidth = '600px';
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization,
            userHasUpdatePropertiesAuthorization
        };
        const editDialogRef = this.dialog.open(ChartsExportEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getData(properties: WidgetPropertiesModels, from?: string, to?: string, groupInterval?: string, lastOverride?: string): Observable<{ data: any[][][][] | null | ErrorModel; metadata: { exportId?: string; deviceId?: string; serviceId?: string; columnName?: string }[][] }> {
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

        if (from !== undefined && to !== undefined && groupInterval !== undefined) {
            time.start = new Date(from).toISOString();
            time.end = new Date(to).toISOString();
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
            if (vAxis.filterType !== undefined) {
                filters.push({
                    column: vAxis.valueName,
                    type: vAxis.filterType,
                    value: vAxis.valueType === 'string' ? vAxis.filterValue : Number(vAxis.filterValue),
                });
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
                    filters.forEach(f => f.column = vAxis.valuePath || vAxis.valueName || '');
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
                                //preserve individual rows
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


    getChartData(widget: WidgetModel, from?: string, to?: string, groupInterval?: string, hAxisFormat?: string, lastOverride?: string, chooseColors = false): Observable<ChartsModel | ErrorModel> {
        return new Observable<ChartsModel | ErrorModel>((observer) => {
            this.getData(widget.properties, from, to, groupInterval, lastOverride).pipe(concatMap(r => {
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
            })).subscribe(r => {
                const resp = r.data;
                if (resp === null) {
                    // no data
                    observer.next(this.setProcessInstancesStatusValues(widget, new ChartDataTableModel([[]])));
                } else if (this.errorHandlerService.checkIfErrorExists(resp)) {
                    observer.next(resp as ErrorModel);
                } else {
                    const tableData = this.setData(resp, widget.properties, r.metadata);
                    if (chooseColors) {
                        tableData.colors = tableData.table.data[0].slice(1).map(title =>
                            '#' + Math.abs(hashCode(JSON.stringify(title))).toString(16).slice(0, 6)); // semi-random color that is always the same for the same title
                    }
                    observer.next(this.setProcessInstancesStatusValues(widget, tableData.table, tableData.colors, hAxisFormat));
                }
                observer.complete();
            });
        });
    }

    private setData(data: any[][][][], properties: WidgetPropertiesModels, metadata: { exportId?: string; deviceId?: string; serviceId?: string; columnName?: string }[][]): {
        table: ChartDataTableModel;
        colors?: string[];
    } {
        // data[] -> requests/vAxis
        // data[][] -> number of columns within request
        // data[][][] -> rows
        // data[][][][] -> values per column

        const repeats: number[] = [];
        const table: any[][] = [];
        let columns = 1; // time column
        data.forEach(s => {
            columns += s.length;
            repeats.push(s.length);
        });

        const columnHasData = Array(columns).fill(false);
        let offset = 1;
        data.forEach(req => {
            req.forEach((series, seriesIndex) => {
                let previousColumnsWithoutData = 0;
                for (let i = 1; i < seriesIndex; i++) { //skip time column
                    if (!columnHasData[i]) {
                        previousColumnsWithoutData++;
                    }
                }
                series.forEach(row => {
                    if (row[1] === null || row[1] === undefined) {
                        return;
                    }
                    const tableRow: any[] = [row[0]]; // using timestamp, duplicate timestamps are ok for Google charts
                    while (offset + seriesIndex > tableRow.length - previousColumnsWithoutData) {
                        tableRow.push(null); // insert leading null column values
                    }
                    tableRow.push(row[1]); // actual data
                    table.push(tableRow);
                    columnHasData[offset + seriesIndex] = true;
                });
            });
            offset += req.length;
        });

        const maxColumns = table.reduce((p, m) => {
            if (m.length > p.length) {
                return m;
            }
            return p;
        }).length;

        table.forEach(row => {
            while (row.length < maxColumns) {
                row.push(null);  // insert trailing null column values
            }
        });


        const vAxes = properties.vAxes || [];
        const indices: {
            index: number;
            conversions: { from: any; to: any }[];
            conversionDefault?: number;
            type: string;
        }[] = [];
        const header: string[] = ['time'];
        let colors = this.getColorArray(vAxes);
        if (vAxes) {
            const colors2: string[] = [];
            vAxes.forEach((vAxis: ChartsExportVAxesModel, index) => {
                let offset2 = 0;
                for (let i = 0; i < index; i++) {
                    offset2 += repeats[i];
                }
                for (let i = 0; i < repeats[index]; i++) {
                    if (columnHasData[offset2 + i + 1]) {
                        indices.push({
                            index: offset2 + i + 1,
                            conversions: vAxis.conversions || [],
                            conversionDefault: vAxis.conversionDefault,
                            type: vAxis.valueType,
                        });
                        const metadataIndex = offset2 + i;
                        let head = vAxis.valueAlias || vAxis.valueName;

                        if (repeats[index] > 0) {
                            // distinction required
                            if (metadata.length > index && metadata[index].length > metadataIndex
                                && metadata[index][metadataIndex].deviceId !== undefined) {

                                const deviceId = metadata[index][metadataIndex].deviceId || ''; // just checked above
                                const device = this.devices.get(deviceId);
                                head += ' - ' + device?.display_name || device?.name;

                                if (metadata[index].filter(m => m.deviceId === deviceId).length > 1 && metadata[index][metadataIndex].serviceId !== undefined) {
                                    // distinction on service level required
                                    head += ' - ' + device?.device_type.services.find(s => s.id === metadata[index][metadataIndex].serviceId)?.name;

                                    if (metadata[index].filter(m => m.deviceId === deviceId && m.serviceId === metadata[index][metadataIndex].serviceId).length > 1 && metadata[index][metadataIndex].columnName !== undefined) {
                                        head += ' - ' + metadata[index][metadataIndex].columnName;
                                    }
                                }
                            }
                        }
                        header.push(head);
                        colors2.push(colors[index]);
                    }
                }
            });
            colors = colors2;
        }
        const dataTable = new ChartDataTableModel([header]);
        let series2: any = [];
        if (table.length > 0 && table[0].length > 2 && properties.chartType === 'ColumnChart') {
            /* Grouped Column -> all values for on x tick value need to be in one list
            series = [
                ["2023-07-18T00:00:00Z", 2.7930317029043543, 5, 3]
            ]
            */
            const tmp: any = {};
            table.forEach((item: any[]) => {
                const date: string = item[0];
                item.slice(1).forEach((element, index) => {
                    if (element !== null && element !== undefined) {
                        if (!tmp[date]) {
                            tmp[date] = [];
                        }
                        tmp[date][index] = element;
                    }
                });
            });


            for (const [date, list] of Object.entries(tmp)) {
                series2.push([date].concat(list as any[]));
            }

        } else {
            series2 = table;
        }

        series2.forEach((item: (string | number | boolean)[]) => {
            const dataPoint: (Date | number | string | null)[] = [new Date(item[0] as string)];
            indices.forEach((resp) => {
                let value = item[resp.index] as any;
                if (value === null || value === undefined) {
                    dataPoint.push(null);
                    return;
                }
                const matchingRule = resp.conversions.find((rule) => rule.from === value);
                if (matchingRule !== undefined) {
                    value = JSON.parse(matchingRule.to);
                } else if (resp.type === 'string' || resp.type === 'boolean' && resp.conversionDefault !== undefined) {
                    value = resp.conversionDefault;
                }
                dataPoint.push(value);
            });
            dataTable.data.push(dataPoint);
        });

        if (properties.chartType === 'PieChart') {
            if (properties.calculateIntervals !== true) {
                const transposed: any[] = [['', '']];
                dataTable.data.slice(1).forEach((row, i) => {
                    transposed.push([header[i + 1], row.slice(1).find(x => x != null)]);
                });
                dataTable.data = transposed;
            } else {
                const res = this.transformTableForTimeline(dataTable.data, properties.vAxes || []);
                dataTable.data = [['', '']];
                res.table.slice(1).forEach(r => {
                    const val = (r[3] as Date).valueOf() - (r[2] as Date).valueOf();
                    const i = dataTable.data.findIndex(s => s[0] === r[1]);
                    if (i !== -1) {
                        (dataTable.data[i][1] as number) += val;
                    } else {
                        dataTable.data.push([r[1], val]);
                    }
                });
                return { table: dataTable, colors: res.colors.slice(1) };
            }
        } else if (properties.chartType === 'Timeline') {
            let breakInterval = -1;
            let breakValue = 0;
            let breakUnit = '';
            if (properties.breakInterval?.endsWith('m')) {
                breakUnit = 'm';
                breakInterval = 1000 * 60;
            }
            if (properties.breakInterval?.endsWith('h')) {
                breakUnit = 'h';
                breakInterval = 1000 * 60 * 60;
            }
            if (properties.breakInterval?.endsWith('d')) {
                breakUnit = 'd';
                breakInterval = 1000 * 60 * 60 * 24;
            }
            if (breakInterval !== -1) {
                breakValue = Number(properties.breakInterval?.split(breakUnit)[0]);
                breakInterval *= breakValue;
            }
            const res = this.transformTableForTimeline(dataTable.data, properties.vAxes || [], breakInterval, breakValue, breakUnit);
            dataTable.data = res.table;
            return { table: dataTable, colors: res.colors };
        }
        return { table: dataTable, colors };
    }

    private setProcessInstancesStatusValues(widget: WidgetModel, dataTable: ChartDataTableModel, colorOverride?: string[], hAxisFormat?: string): ChartsModel {
        const element = this.elementSizeService.getHeightAndWidthByElementId(widget.id, 5);

        // Remove all elements from color array that are missing in the dataTable
        const colors = colorOverride || this.getColorArray(widget.properties.vAxes || []);
        if (widget.properties.vAxes && dataTable.data.length > 0 && widget.properties.chartType !== 'PieChart' && dataTable.data[0].length !== colors.length + 1) {
            const deleteColorIndices: number[] = [];
            widget.properties.vAxes.forEach((vAxes, index) => {
                if (dataTable.data[0].indexOf(vAxes.valueAlias || vAxes.valueName) === -1) {
                    deleteColorIndices.push(index);
                }
            });
            for (let i = deleteColorIndices.length - 1; i >= 0; i--) {
                // reverse transition ensures valid indices
                colors.splice(deleteColorIndices[i], 1);
            }
        }
        const chartModel = new ChartsModel(
            widget.properties.chartType === undefined || widget.properties.chartType === '' ? 'LineChart' : widget.properties.chartType,
            dataTable.data,
            {
                chartArea: { width: element.widthPercentage, height: element.heightPercentage },
                colors: colors.length > 0 ? colors : undefined,
                hAxis: {
                    title: widget.properties.hAxisLabel,
                    gridlines: { count: -1 },
                    format: hAxisFormat || widget.properties.hAxisFormat,
                    ticks: widget.properties.chartType === 'ColumnChart' ? dataTable.data.slice(1).map((x) => x[0] as Date) : undefined,
                },
                height: element.height,
                width: element.width,
                curveType: widget.properties.curvedFunction ? 'function' : '',
                vAxis: {
                    viewWindowMode:
                        widget.properties.chartType !== 'ColumnChart' ? (element.height > 200 ? 'pretty' : 'maximized') : undefined,
                    viewWindow: {},
                },
                vAxes: {
                    0: { title: widget.properties.vAxisLabel },
                },
                explorer: widget.properties.chartType === 'PieChart' ? undefined : {
                    actions: ['dragToZoom', 'rightClickToReset'],
                    axis: 'horizontal',
                    keepInBounds: true,
                    maxZoomIn: 0.001,
                },
                interpolateNulls: true,
                legend: widget.properties.chartType !== 'PieChart' ? 'none' : {
                    position: 'labeled',
                },
                timeline: { groupByRowLabel: false },
                pieSliceText: widget.properties.chartType !== 'PieChart' ? undefined : 'none',
                sliceVisibilityThreshold: widget.properties.chartType !== 'PieChart' || dataTable.data.length > 5 ? undefined : 0,
                isStacked: widget.properties.chartType !== 'ColumnChart' ? undefined : widget.properties.stacked,
            },
        );
        if (
            widget.properties.chartType === 'ColumnChart' &&
            dataTable.data.slice(1).findIndex((column) => column.slice(1).findIndex((val) => val || 0 < 0) !== -1) === -1 && // all values >= 0 ?
            chartModel.options?.vAxis?.viewWindow !== undefined
        ) {
            chartModel.options.vAxis.viewWindow.min = 0;
        }
        const firstAxesSeries: number[] = [];
        const secondAxisSeries: number[] = [];
        widget.properties.vAxes?.forEach((v, idx) =>
            v.displayOnSecondVAxis === true ? secondAxisSeries.push(idx) : firstAxesSeries.push(idx),
        );
        if (chartModel.options?.vAxes !== undefined && secondAxisSeries.length > 0) {
            chartModel.options.vAxes['1'] = { title: widget.properties.secondVAxisLabel };
            chartModel.options.series = {};
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            firstAxesSeries.forEach((i) => (chartModel.options!.series[i] = { targetAxisIndex: 0 }));
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            secondAxisSeries.forEach((i) => (chartModel.options!.series[i] = { targetAxisIndex: 1 }));
        }
        return chartModel;
    }

    private getColorArray(vAxes?: ChartsExportVAxesModel[]): string[] {
        const array: string[] = [];
        vAxes?.forEach((vAxis: ChartsExportVAxesModel) => {
            array.push(vAxis.color ? vAxis.color : customColor);
        });
        return array;
    }

    private transformTableForTimeline(dat: any[][], vAxes: ChartsExportVAxesModel[], breakInterval: number = -1, breakValue: number = 0, breakUnit: string = ''): {
        table: any[][];
        colors: string[];
    } {
        const allSlices: any[][] = [];
        const offset = 60 * 1000 * (new Date(0).getTimezoneOffset());
        const colors: string[] = [customColor];
        const header = dat[0];
        header.slice(1).forEach((head, j) => {
            const slices: any[][] = [[]];
            let end: any;
            let value: string | undefined;
            const filteredRows = dat.filter(r => r[j + 1] !== null);
            for (let i = 1; i < filteredRows.length; i++) {
                const slice = slices[slices.length - 1];
                let title = head;
                if (breakInterval !== -1 && slices.indexOf(slice) > 0) {
                    title += ' -' + (slices.indexOf(slice) * breakValue) + breakUnit;
                }
                if (filteredRows[i][j + 1] != null) {
                    if (value === undefined) {
                        end = filteredRows[i][0];
                        value = '' + filteredRows[i][j + 1];
                    } else if ('' + filteredRows[i][j + 1] !== value || i === filteredRows.length - 1) {
                        let start = filteredRows[i][0] as Date;
                        if (breakInterval > -1) {
                            if (Math.floor(end / breakInterval) > Math.floor(start.valueOf() / breakInterval) && i === filteredRows.length - 1) {
                                start = new Date(offset);
                            } else {
                                start = new Date(start.valueOf() % breakInterval);
                            }
                            end = new Date((end) % breakInterval);
                            if (end.valueOf() >= breakInterval + offset) {
                                end = new Date(breakInterval + offset - 1);
                            }
                            if (start.valueOf() > end.valueOf()) {
                                start = new Date(start.valueOf() - breakInterval);
                            }
                        }
                        if (slice.findIndex((s: any[]) => s[1] === value) === -1 && allSlices.findIndex(s => s[1] === value) === -1 && slices.findIndex(s => s.findIndex(sub => sub[1] === value) !== -1) === -1) {
                            colors.push(vAxes?.[j].conversions?.find(c => c.to === value)?.color || vAxes?.[j].color || customColor);
                        }
                        slice.push([title, value, start, end]);
                        value = '' + filteredRows[i][j + 1];
                        end = filteredRows[i][0];
                    } else if (breakInterval > -1 && Math.floor((slice.length > 0 ? slice[0][0].valueOf() : end) / breakInterval) > Math.floor((filteredRows[i][0] as Date).valueOf() / breakInterval)) {
                        if (slice.findIndex((s: any[]) => s[1] === value) === -1 && allSlices.findIndex(s => s[1] === value) === -1 && slices.findIndex(s => s.findIndex(sub => sub[1] === value) !== -1) === -1) {
                            colors.push(vAxes?.[j].conversions?.find(c => c.to === value)?.color || vAxes?.[j].color || customColor);
                        }
                        slice.push([title, value, new Date(offset), new Date(breakInterval + offset - 1)]);
                        end = filteredRows[i][0];
                        slices.push([]);
                    }
                }
            }
            allSlices.push(...slices.filter(s => s.length > 0));
        });
        const table = [['', '', '', '']];
        allSlices.forEach(s => table.push(...s));
        return { table, colors };
    }
}
