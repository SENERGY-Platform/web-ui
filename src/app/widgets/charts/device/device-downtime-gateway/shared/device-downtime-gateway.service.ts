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
import { Observable } from 'rxjs';
import { ChartsModel } from '../../../shared/charts.model';
import { MonitorService } from '../../../../../modules/processes/monitor/shared/monitor.service';
import { ElementSizeService } from '../../../../../core/services/element-size.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DashboardService } from '../../../../../modules/dashboard/shared/dashboard.service';
import { WidgetModel } from '../../../../../modules/dashboard/shared/dashboard-widget.model';
import { DashboardManipulationEnum } from '../../../../../modules/dashboard/shared/dashboard-manipulation.enum';
import { ChartDataTableModel } from '../../../../../core/model/chart/chart-data-table.model';
import { DeviceDowntimeGatewayEditDialogComponent } from '../dialogs/device-downtime-gateway-edit-dialog.component';
import { NetworksService } from '../../../../../modules/devices/networks/shared/networks.service';
import { NetworksHistoryModel } from '../../../../../modules/devices/networks/shared/networks-history.model';
import { downtimePerGateway, downtimePerGatewayChart, downtimePerGatewayTable } from './device-downtime-gateway-chart';

const today = new Date();

@Injectable({
    providedIn: 'root',
})
export class DeviceDowntimeGatewayService {
    constructor(
        private monitorService: MonitorService,
        private elementSizeService: ElementSizeService,
        private dialog: MatDialog,
        private dashboardService: DashboardService,
        private networksService: NetworksService,
    ) {}

    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean, userHasUpdatePropertiesAuthorization: boolean): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization,
            userHasUpdatePropertiesAuthorization
        };
        const editDialogRef = this.dialog.open(DeviceDowntimeGatewayEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getDevicesDowntimePerGateway(widget: WidgetModel): Observable<ChartsModel> {
        return new Observable<ChartsModel>((observer) => {
            this.networksService.getNetworksHistory('168h').subscribe((gateways) => {
                if (gateways.length === 0) {
                    observer.next(this.setDevicesDowntimePerGatewayChartValues(widget.id, new ChartDataTableModel([[]])));
                } else {
                    observer.next(
                        this.setDevicesDowntimePerGatewayChartValues(
                            widget.id,
                            this.getGatewayDowntimeDataTableArray(widget.properties.hideZeroPercentage || false, gateways),
                        ),
                    );
                }
                observer.complete();
            });
        });
    }

    private setDevicesDowntimePerGatewayChartValues(widgetId: string, dataTable: ChartDataTableModel): ChartsModel {
        return downtimePerGatewayChart(dataTable, this.elementSizeService.getHeightAndWidthByElementId(widgetId, 10));
    }

    private getGatewayDowntimeDataTableArray(hideZeroPercentage: boolean, gateways: NetworksHistoryModel[]): ChartDataTableModel {
        return downtimePerGatewayTable(downtimePerGateway(gateways, hideZeroPercentage, today));
    }
}
