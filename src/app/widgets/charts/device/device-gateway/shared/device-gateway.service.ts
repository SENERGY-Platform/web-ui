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
import {MonitorService} from '../../../../../modules/processes/monitor/shared/monitor.service';
import {ElementSizeService} from '../../../../../core/services/element-size.service';
import {MatDialog, MatDialogConfig} from '@angular/material';
import {DashboardService} from '../../../../../modules/dashboard/shared/dashboard.service';
import {WidgetModel} from '../../../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {ErrorHandlerService} from '../../../../../core/services/error-handler.service';
import {DeviceGatewayEditDialogComponent} from '../dialogs/device-gateway-edit-dialog.component';
import {Observable} from 'rxjs';
import {ChartDataTableModel} from '../../../../../core/components/chart/chart-data-table.model';
import {ChartsModel} from '../../../shared/charts.model';
import {NetworksService} from '../../../../../modules/devices/networks/shared/networks.service';
import {NetworksHistoryModel} from '../../../../../modules/devices/networks/shared/networks-history.model';

const customColor = '#4484ce'; // /* cc */

@Injectable({
    providedIn: 'root'
})
export class DeviceGatewayService {

    constructor(private http: HttpClient,
                private monitorService: MonitorService,
                private elementSizeService: ElementSizeService,
                private dialog: MatDialog,
                private dashboardService: DashboardService,
                private errorHandlerService: ErrorHandlerService,
                private networksService: NetworksService) {
    }

    openEditDialog(dashboardId: string, widgetId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId: widgetId,
            dashboardId: dashboardId,
        };
        const editDialogRef = this.dialog.open(DeviceGatewayEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getDevicesPerGateway(widgetId: string): Observable<ChartsModel> {
        return new Observable<ChartsModel>((observer) => {
                this.networksService.getNetworksHistory('1h').subscribe((gateways: NetworksHistoryModel[]) => {
                    observer.next(this.setDevicesPerGatewayChartValues(widgetId, this.getGatewayDataTableArray(gateways)));
                    observer.complete();
                });
            }
        );
    }

    private setDevicesPerGatewayChartValues(widgetId: string, dataTable: ChartDataTableModel): ChartsModel {

        const element = this.elementSizeService.getHeightAndWidthByElementId(widgetId, 10);
        return new ChartsModel(
            'ColumnChart',
            dataTable.data,
            {
                chartArea: {width: element.widthPercentage, height: element.heightPercentage},
                width: element.width,
                height: element.height,
                legend: 'none',
                tooltip: {trigger: 'focus'},
                vAxis: {format: 'decimal', gridlines: {count: -1}, viewWindow: {min: 0}},
            }
        );
    }

    private getGatewayDataTableArray(gateways: NetworksHistoryModel[]): ChartDataTableModel {
        const dataTable = new ChartDataTableModel([['Name', 'Count', {role: 'annotation'}, {role: 'style'}]]);
        gateways.forEach((gateway) => {
            const count = gateway.devices === null ? 0 : gateway.devices.length;
            dataTable.data.push([gateway.name, count, count, customColor]);
        });
        return dataTable;
    }

}

