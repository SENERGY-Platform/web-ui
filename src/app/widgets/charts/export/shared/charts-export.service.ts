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

import {Injectable} from '@angular/core';
import {forkJoin, Observable} from 'rxjs';
import {ChartsModel} from '../../shared/charts.model';
import {ElementSizeService} from '../../../../core/services/element-size.service';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {ChartDataTableModel} from '../../../../core/components/chart/chart-data-table.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DashboardService} from '../../../../modules/dashboard/shared/dashboard.service';
import {ChartsExportEditDialogComponent} from '../dialog/charts-export-edit-dialog.component';
import {WidgetModel, WidgetPropertiesModels} from '../../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {ErrorModel} from '../../../../core/model/error.model';
import {
    ChartsExportMeasurementModel,
    ChartsExportPropertiesModel,
    ChartsExportVAxesModel
} from './charts-export-properties.model';
import {ChartsExportRequestPayloadGroupModel} from './charts-export-request-payload.model';
import {ChartsExportRangeTimeTypeEnum} from './charts-export-range-time-type.enum';
import {ExportDataService} from '../../../shared/export-data.service';
import {
    QueriesRequestElementInfluxModel,
    QueriesRequestElementTimescaleModel,
    QueriesRequestFilterModel,
    QueriesRequestTimeModel,
} from '../../../shared/export-data.model';
import {map} from 'rxjs/internal/operators';
import {environment} from '../../../../../environments/environment';

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
    ) {
    }

    openEditDialog(dashboardId: string, widgetId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.minWidth = '600px';
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId,
            dashboardId,
        };
        const editDialogRef = this.dialog.open(ChartsExportEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getData(properties: WidgetPropertiesModels): Observable<any[][] | null> {
        const widgetProperties = properties as ChartsExportPropertiesModel;
        const time: QueriesRequestTimeModel = {};
        const limit = properties.chartType === 'PieChart' ? 1 : undefined;
        let group: ChartsExportRequestPayloadGroupModel | undefined;

        if (widgetProperties.timeRangeType === ChartsExportRangeTimeTypeEnum.Relative && widgetProperties.time) {
            time.last = widgetProperties.time.last;
        }

        if (widgetProperties.timeRangeType === ChartsExportRangeTimeTypeEnum.Absolute && widgetProperties.time) {
            time.start = new Date(widgetProperties.time.start as string).toISOString();
            time.end = new Date(widgetProperties.time.end as string).toISOString();
        }

        if (widgetProperties.group && widgetProperties.group.type !== undefined && widgetProperties.group.type !== '') {
            group = widgetProperties.group;
        }
        const influxElements: QueriesRequestElementInfluxModel[] = [];
        const timescaleElements: QueriesRequestElementTimescaleModel[] = [];
        const influxResultMapper: number[] = [];
        const timescaleResultMapper: number[] = [];

        widgetProperties.vAxes?.forEach((vAxis: ChartsExportVAxesModel, index) => {
            const newField: QueriesRequestElementInfluxModel | QueriesRequestElementTimescaleModel = {
                columns: [
                    {
                        name: vAxis.valueName,
                        math: vAxis.math !== '' ? vAxis.math : undefined,
                        groupType: group?.type !== null ? group?.type : undefined,
                    },
                ],
                groupTime: group?.time !== '' ? group?.time : undefined,
                limit,
                time,
            };
            const filters: QueriesRequestFilterModel[] = [];
            vAxis.tagSelection?.forEach((tagFilter) => {
                filters.push({column: tagFilter.split('!')[0], type: '=', value: tagFilter.split('!')[1]});
            });
            if (vAxis.filterType !== undefined) {
                filters.push({
                    column: vAxis.valueName,
                    type: vAxis.filterType,
                    value: vAxis.valueType === 'string' ? vAxis.filterValue : Number(vAxis.filterValue),
                });
            }
            if (filters.length > 0) {
                newField.filters = filters;
            }

            const exp = widgetProperties.exports?.find(x => x.id === vAxis.instanceId);
            if (exp !== undefined &&
                ((exp as ChartsExportMeasurementModel).exportDatabaseId === undefined || (exp as ChartsExportMeasurementModel).exportDatabaseId === environment.exportDatabaseIdInternalInfluxDb)) {
                (newField as QueriesRequestElementInfluxModel).measurement = vAxis.instanceId;
                influxElements.push(newField);
                influxResultMapper.push(index);
            } else {
                (newField as QueriesRequestElementTimescaleModel).exportId = vAxis.instanceId;
                (newField as QueriesRequestElementTimescaleModel).serviceId = vAxis.serviceId;
                (newField as QueriesRequestElementTimescaleModel).deviceId = vAxis.deviceId;
                newField.columns[0].name = vAxis.valuePath || '';
                timescaleElements.push(newField);
                timescaleResultMapper.push(index);
            }
        });

        const obs: Observable<{ source: string; res: any[][][] }>[] = [];

        if (influxElements.length > 0) {
            obs.push(this.exportDataService.queryInflux(influxElements).pipe(map(res => ({
                source: 'influx',
                res: res || []
            }))));
        }

        if (timescaleElements.length > 0) {
            obs.push(this.exportDataService.queryTimescale(timescaleElements).pipe(map(res => ({
                source: 'timescale',
                res: res || []
            }))));
        }

        return forkJoin(obs).pipe(map(res => {
            const table: any[][] = [];
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
                r.res.forEach((series, index) => {
                    series?.forEach(row => {
                        const tableRow: any[] = [row[0]]; // using timestamp, duplicate timestamps are ok for Google charts
                        while (mapper[index] > tableRow.length - 1) {
                            tableRow.push(null);
                        }
                        tableRow[mapper[index] + 1] = row[1]; // +1 for time
                        table.push(tableRow);
                    });
                });
            });

            const columns = timescaleResultMapper.length + influxResultMapper.length + 1; // +1 for time
            // insert trailing null column values
            table.forEach((_, idx) => {
                while (table[idx].length < columns) {
                    table[idx].push(null);
                }
            });
            return table.length === 0 ? null : table;
        }));
    }

    getChartData(widget: WidgetModel): Observable<ChartsModel | ErrorModel> {
        return new Observable<ChartsModel | ErrorModel>((observer) => {
            this.getData(widget.properties).subscribe((resp: any[][] | null) => {
                if (resp === null) {
                    // no data
                    observer.next(this.setProcessInstancesStatusValues(widget, new ChartDataTableModel([[]])));
                } else {
                    observer.next(this.setProcessInstancesStatusValues(widget, this.setData(resp, widget.properties)));
                }
                observer.complete();
            });
        });
    }

    private setData(series: any[][], properties: WidgetPropertiesModels): ChartDataTableModel {
        const vAxes = properties.vAxes || [];
        const indices: { index: number; conversions: { from: string; to: number }[]; conversionDefault?: number; type: string }[] = [];
        const header: string[] = ['time'];
        if (vAxes) {
            vAxes.forEach((vAxis: ChartsExportVAxesModel, index) => {
                if (series.findIndex((a) => a[index + 1] !== null) !== -1) {
                    indices.push({
                        index: index + 1,
                        conversions: vAxis.conversions || [],
                        conversionDefault: vAxis.conversionDefault,
                        type: vAxis.valueType,
                    });
                    header.push(vAxis.valueAlias || vAxis.valueName);
                }
            });
        }
        const dataTable = new ChartDataTableModel([header]);

        series.forEach((item: (string | number | boolean)[]) => {
            const dataPoint: (Date | number | null)[] = [new Date(item[0] as string)];
            indices.forEach((resp) => {
                let value = item[resp.index];
                if (value === null || value === undefined) {
                    dataPoint.push(null);
                    return;
                }
                const matchingRule = resp.conversions.find((rule) => rule.from === value);
                if (matchingRule !== undefined) {
                    value = matchingRule.to;
                } else if (resp.type === 'string' && resp.conversionDefault !== undefined) {
                    value = resp.conversionDefault;
                }
                dataPoint.push(Math.fround(value as number));
            });
            dataTable.data.push(dataPoint);
        });
        if (properties.chartType === 'PieChart') {
            const transposed: any[] = [['', '']];
            dataTable.data.slice(1).forEach((row, i) => {
                transposed.push([header[i + 1], row.slice(1).find(x => x != null)]);
            });
            dataTable.data = transposed;
        }
        return dataTable;
    }

    private setProcessInstancesStatusValues(widget: WidgetModel, dataTable: ChartDataTableModel): ChartsModel {
        const element = this.elementSizeService.getHeightAndWidthByElementId(widget.id, 5);

        // Remove all elements from color array that are missing in the dataTable
        const colors = this.getColorArray(widget.properties.vAxes || []);
        if (widget.properties.vAxes && dataTable.data.length > 0 && widget.properties.chartType !== 'PieChart') {
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
                chartArea: {width: element.widthPercentage, height: element.heightPercentage},
                colors,
                hAxis: {
                    title: widget.properties.hAxisLabel,
                    gridlines: {count: -1},
                    format: widget.properties.hAxisFormat,
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
                    0: {title: widget.properties.vAxisLabel},
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
                pieSliceText: widget.properties.chartType !== 'PieChart' ? undefined : 'none',
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
            chartModel.options.vAxes['1'] = {title: widget.properties.secondVAxisLabel};
            chartModel.options.series = {};
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            firstAxesSeries.forEach((i) => (chartModel.options!.series[i] = {targetAxisIndex: 0}));
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            secondAxisSeries.forEach((i) => (chartModel.options!.series[i] = {targetAxisIndex: 1}));
        }
        return chartModel;
    }

    private getColorArray(vAxes: ChartsExportVAxesModel[]): string[] {
        const array: string[] = [];
        vAxes.forEach((vAxis: ChartsExportVAxesModel) => {
            array.push(vAxis.color ? vAxis.color : customColor);
        });
        return array;
    }
}
