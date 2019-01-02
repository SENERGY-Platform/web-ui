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
import {ChartsModel} from '../../../shared/charts.model';
import {MonitorService} from '../../../../../modules/processes/monitor/shared/monitor.service';
import {ElementSizeService} from '../../../../../core/services/element-size.service';
import {MatDialog, MatDialogConfig} from '@angular/material';
import {DashboardService} from '../../../../../modules/dashboard/shared/dashboard.service';
import {WidgetModel} from '../../../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {ChartDataTableModel} from '../../../../../core/components/chart/chart-data-table.model';
import {DeviceDowntimeGatewayEditDialogComponent} from '../dialogs/device-downtime-gateway-edit-dialog.component';
import {StartDeviceModel} from '../../../../../modules/start/shared/start-device.model';
import {environment} from '../../../../../../environments/environment';
import {catchError, map} from 'rxjs/operators';
import {ErrorHandlerService} from '../../../../../core/services/error-handler.service';
import {StartGatewayModel} from '../../../../../modules/start/shared/start-gateway.model';
import {StartItemStatusModel} from '../../../../../modules/start/shared/start-item-status.model';

const stateConnected = 'connected';
const stateDisconnected = 'disconnected';
const stateTrue = true;
const stateFalse = false;
const dayInMs = 86400000;
const failureTimeInMs = dayInMs * 7;
const today = new Date();
const customColor = '#4484ce'; // /* cc */

@Injectable({
    providedIn: 'root'
})
export class DeviceDowntimeGatewayService {

    constructor(private http: HttpClient,
                private monitorService: MonitorService,
                private elementSizeService: ElementSizeService,
                private dialog: MatDialog,
                private dashboardService: DashboardService,
                private errorHandlerService: ErrorHandlerService) {
    }

    openEditDialog(dashboardId: string, widgetId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId: widgetId,
            dashboardId: dashboardId,
        };
        const editDialogRef = this.dialog.open(DeviceDowntimeGatewayEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getDevicesDowntimePerGateway(widgetId: string): Observable<ChartsModel> {
        return new Observable<ChartsModel>((observer) => {
            this.getGatewayHistory('7d').subscribe((gateways) => {
                observer.next(this.setDevicesDowntimePerGatewayChartValues(widgetId, this.getGatewayDowntimeDataTableArray(gateways)));
                observer.complete();
            });

        });
    }

   private getGatewayHistory(duration: string): Observable<StartGatewayModel[]> {
        return this.http.get<StartGatewayModel[]>(environment.apiAggregatorUrl + '/history/gateways/' + duration).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceDowntimeGatewayService.name, 'getGatewayHistory', []))
        );
    }

    private setDevicesDowntimePerGatewayChartValues(widgetId: string, dataTable: ChartDataTableModel): ChartsModel {

        const element = this.elementSizeService.getHeightAndWidthByElementId(widgetId, 10);
        return new ChartsModel(
            'ColumnChart',
            dataTable.data,
            {
                chartArea: {width: element.widthPercentage, height: element.heightPercentage},
                width: element.width,
                height: element.height,
                legend: 'none',
                vAxis: {format: '#.## %'},
                tooltip: {trigger: 'none'}
            }
        );
    }

    private getGatewayDowntimeDataTableArray(gateways: StartGatewayModel[]): ChartDataTableModel {
        const dataTable = new ChartDataTableModel([['Name', 'Percentage', {role: 'annotation'}, {role: 'style'}]]);
        gateways.forEach((gateway) => {
            const time = this.calcDisconnectedTime(gateway).failureRatio;
            const text = Math.round(time * 10000) / 100 + '%';
            dataTable.data.push([gateway.name, time, text, customColor]);
        });
        return dataTable;
    }

    private calcDisconnectedTime(item: StartDeviceModel | StartGatewayModel): StartItemStatusModel {

        const itemStatus = new StartItemStatusModel(0, 0, 0, 0, 0, 0, item.name);
        if (item.log_history.values === null) {
            switch (item.log_state) {
                case stateConnected: {
                    addTimeConnected(failureTimeInMs);
                    break;
                }
                case stateDisconnected: {
                    addTimeDisconnected(failureTimeInMs);
                    break;
                }
            }
        } else {
            /** calculate delta from last index time till now*/
            const lastIndex: number = item.log_history.values.length - 1;
            const diffToday = today.getTime() - new Date(item.log_history.values[lastIndex]['0'] * 1000).getTime();
            addTimeToConnectionStatus(item.log_history.values[lastIndex]['1'], diffToday);


            for (let x = lastIndex; x >= 1; x--) {
                const diff = (item.log_history.values[x]['0'] - item.log_history.values[x - 1]['0']) * 1000;
                addTimeToConnectionStatus(item.log_history.values[x - 1]['1'], diff);
            }

            /** check if input object existed before first index of log history */
            if (item.log_edge !== null) {
                const timeDiff = failureTimeInMs - itemStatus.timeDisconnectedInMs - itemStatus.timeConnectedInMs;
                addTimeToConnectionStatus((item.log_edge[1] === true), timeDiff);
            }
        }
        itemStatus.timeConnectedInS = Math.round(itemStatus.timeConnectedInMs / 60000);
        itemStatus.timeDisconnectedInMin = Math.round(itemStatus.timeDisconnectedInMs / 60000);
        itemStatus.failureRatio =
            itemStatus.timeDisconnectedInMs / (itemStatus.timeDisconnectedInMs + itemStatus.timeConnectedInMs);

        return itemStatus;

        function addTimeConnected(time: number) {
            itemStatus.timeConnectedInMs += time;
        }

        function addTimeDisconnected(time: number) {
            itemStatus.timeDisconnectedInMs += time;
            itemStatus.failureRate++;
        }

        function addTimeToConnectionStatus(status: boolean, time: number) {
            switch (status) {
                case stateTrue: {
                    addTimeConnected(time);
                    break;
                }
                case stateFalse: {
                    addTimeDisconnected(time);
                    break;
                }
                default: {
                    throw new Error('Unknown state.');
                }
            }
        }

    }


}

