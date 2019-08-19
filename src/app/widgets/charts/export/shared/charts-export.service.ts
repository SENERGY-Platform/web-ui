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
import {catchError, map} from 'rxjs/internal/operators';
import {DeploymentsService} from '../../../../modules/processes/deployments/shared/deployments.service';
import {environment} from '../../../../../environments/environment';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {ChartsExportModel} from './charts-export.model';
import {ChartDataTableModel} from '../../../../core/components/chart/chart-data-table.model';
import {MatDialog, MatDialogConfig} from '@angular/material';
import {DashboardService} from '../../../../modules/dashboard/shared/dashboard.service';
import {ChartsExportEditDialogComponent} from '../dialog/charts-export-edit-dialog.component';
import {WidgetModel} from '../../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {ExportValueModel} from '../../../../modules/data/export/shared/export.model';

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

    getData(id: string, limit: number | undefined): Observable<ChartsExportModel> {
        return this.http.get<ChartsExportModel>(environment.influxAPIURL + '/measurement/' + id + '?limit=' + limit).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getData', {} as ChartsExportModel))
        );
    }


    getChartData(widget: WidgetModel): Observable<ChartsModel> {
        return new Observable<ChartsModel>((observer) => {
            this.getData(widget.properties.measurement ? widget.properties.measurement.id : '', widget.properties.interval).
            subscribe((resp: ChartsExportModel) => {
                let vAxisIndex = 1;
                if (widget.properties.vAxis) {
                    vAxisIndex = resp.results[0].series[0].columns.indexOf(widget.properties.vAxis.Name);
                }
                observer.next(this.setProcessInstancesStatusValues(
                    widget.id,
                    widget.properties.hAxisLabel || '',
                    widget.properties.vAxisLabel || '',
                    this.setData(widget.properties.vAxis, resp.results[0].series[0].values, vAxisIndex)));
                observer.complete();
            });
        });
    }

    private setData(vAxis: ExportValueModel | undefined, exportData: (string | number)[][], vAxisIndex: number): ChartDataTableModel {
        const dataTable = new ChartDataTableModel([['time', vAxis ? vAxis.Name : '']]);
        exportData.forEach((item: (string | number)[]) => {
                const date = new Date(<string>item[0]);
                dataTable.data.push([date, item[vAxisIndex]]);
            }
        );
        return dataTable;
    }

    private setProcessInstancesStatusValues(widgetId: string, hAxisLabel: string, vAxisLabel: string, dataTable: ChartDataTableModel): ChartsModel {

        const element = this.elementSizeService.getHeightAndWidthByElementId(widgetId, 5);

        return new ChartsModel(
            'LineChart',
            dataTable.data,
            {
                chartArea: {width: element.widthPercentage, height: element.heightPercentage},
                colors: [customColor],
                hAxis: {title: hAxisLabel, gridlines: {count: -1}},
                height: element.height,
                width: element.width,
                legend: 'none',
                vAxis: {title: vAxisLabel},
            });
    }
}

