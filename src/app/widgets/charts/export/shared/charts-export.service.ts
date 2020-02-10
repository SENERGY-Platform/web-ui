/*
 * Copyright 2018 InfAI (CC SES)
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
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {ChartsModel} from '../../shared/charts.model';
import {ElementSizeService} from '../../../../core/services/element-size.service';
import {catchError} from 'rxjs/internal/operators';
import {DeploymentsService} from '../../../../modules/processes/deployments/shared/deployments.service';
import {environment} from '../../../../../environments/environment';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {ChartsExportColumnsModel, ChartsExportModel} from './charts-export.model';
import {ChartDataTableModel} from '../../../../core/components/chart/chart-data-table.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DashboardService} from '../../../../modules/dashboard/shared/dashboard.service';
import {ChartsExportEditDialogComponent} from '../dialog/charts-export-edit-dialog.component';
import {WidgetModel, WidgetPropertiesModels} from '../../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {ErrorModel} from '../../../../core/model/error.model';
import {ChartsExportPropertiesModel, ChartsExportVAxesModel} from './charts-export-properties.model';
import {
    ChartsExportRequestPayloadModel,
    ChartsExportRequestPayloadQueriesModel,
} from './charts-export-request-payload.model';
import {ChartsExportRangeTimeTypeEnum} from './charts-export-range-time-type.enum';

const customColor = '#4484ce'; // /* cc */

@Injectable({
    providedIn: 'root'
})
export class ChartsExportService {

    constructor(private http: HttpClient,
                private elementSizeService: ElementSizeService,
                private errorHandlerService: ErrorHandlerService,
                private dialog: MatDialog,
                private dashboardService: DashboardService) {
    }

    openEditDialog(dashboardId: string, widgetId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId: widgetId,
            dashboardId: dashboardId,
        };
        const editDialogRef = this.dialog.open(ChartsExportEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getData(properties: WidgetPropertiesModels): Observable<ChartsExportModel | { error: string }> {
        const widgetProperties = <ChartsExportPropertiesModel>properties;
        const requestPayload: ChartsExportRequestPayloadModel = {
            time: {
                last: undefined,
                end: undefined,
                start: undefined
            },
            group: {
                type: undefined,
                time: ''
            },
            queries: []
        };

        if (widgetProperties.timeRangeType === ChartsExportRangeTimeTypeEnum.Relative && widgetProperties.time) {
            requestPayload.time.last = widgetProperties.time.last;
        }

        if (widgetProperties.timeRangeType === ChartsExportRangeTimeTypeEnum.Absolute && widgetProperties.time) {
            requestPayload.time.start = new Date(<string>widgetProperties.time.start).toISOString();
            requestPayload.time.end = new Date(<string>widgetProperties.time.end).toISOString();
        }

        if (widgetProperties.group && widgetProperties.group.type !== undefined && widgetProperties.group.type !== '') {
            requestPayload.group = widgetProperties.group;
        }

        if (widgetProperties.vAxes) {
            const array: ChartsExportRequestPayloadQueriesModel[] = [];
            widgetProperties.vAxes.forEach((vAxis: ChartsExportVAxesModel) => {

                if (array.length > 0 && array[array.length - 1].id === vAxis.instanceId) {
                    array[array.length - 1].fields.push({name: vAxis.valueName, math: vAxis.math});
                } else {
                    array.push({id: vAxis.instanceId, fields: [{name: vAxis.valueName, math: vAxis.math}]});
                }
                
            });
            requestPayload.queries = array;
        }

        return this.http.post<ChartsExportModel>((environment.influxAPIURL + '/queries'), requestPayload).pipe(
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getData', {error: 'error'}))
        );
    }

    getChartData(widget: WidgetModel): Observable<ChartsModel | ErrorModel> {
        return new Observable<ChartsModel | ErrorModel>((observer) => {
            this.getData(widget.properties).subscribe((resp: (ChartsExportModel | ErrorModel)) => {
                if (this.errorHandlerService.checkIfErrorExists(resp)) {
                    observer.next(resp);
                } else {
                    if (resp.results[0].series[0].values.length === 0) {
                        // no data
                        observer.next(this.setProcessInstancesStatusValues(
                            widget,
                            new ChartDataTableModel([[]])));
                    } else {
                        observer.next(this.setProcessInstancesStatusValues(
                            widget,
                            this.setData(resp.results[0].series[0], widget.properties.vAxes || [])));
                    }
                }
                observer.complete();
            });
        });
    }

    private setData(series: ChartsExportColumnsModel, vAxes: ChartsExportVAxesModel[]): ChartDataTableModel {
        const indices: { index: number, math: string }[] = [];
        const header: string[] = ['time'];
        if (vAxes) {
            vAxes.forEach((vAxis: ChartsExportVAxesModel) => {
                indices.push({index: series.columns.indexOf(vAxis.instanceId + '.' + vAxis.valueName), math: vAxis.math});
                header.push(vAxis.valueName);
            });
        }
        const dataTable = new ChartDataTableModel([header]);

        series.values.forEach((item: (string | number)[]) => {
                const dataPoint: (Date | number) [] = [new Date(<string>item[0])];
                indices.forEach((resp: { index: number, math: string }) => {
                    dataPoint.push(<number>item[resp.index]);
                });
                dataTable.data.push(dataPoint);
            }
        );
        return dataTable;
    }

    private setProcessInstancesStatusValues(widget: WidgetModel, dataTable: ChartDataTableModel): ChartsModel {

        const element = this.elementSizeService.getHeightAndWidthByElementId(widget.id, 5);

        return new ChartsModel(
            (widget.properties.chartType === undefined || widget.properties.chartType === '') ? 'LineChart' : widget.properties.chartType,
            dataTable.data,
            {
                chartArea: {width: element.widthPercentage, height: element.heightPercentage},
                colors: this.getColorArray(widget.properties.vAxes || []),
                hAxis: {title: widget.properties.hAxisLabel, gridlines: {count: -1}},
                height: element.height,
                width: element.width,
                legend: 'none',
                curveType: widget.properties.curvedFunction ? 'function' : '',
                vAxis: {title: widget.properties.vAxisLabel},
                interpolateNulls: true,
            });
    }

    private getColorArray(vAxes: ChartsExportVAxesModel[]): string[] {
        const array: string[] = [];
        vAxes.forEach((vAxis: ChartsExportVAxesModel) => {
            array.push(vAxis.color ? vAxis.color : customColor);
        });
        return array;
    }

}



