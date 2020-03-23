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
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {DeviceDowntimeListEditDialogComponent} from '../dialogs/device-downtime-list-edit-dialog.component';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {DeviceDowntimeListModel} from './device-downtime-list.model';
import {DeviceInstancesService} from '../../../modules/devices/device-instances/shared/device-instances.service';
import {DeviceInstancesHistoryModel} from '../../../modules/devices/device-instances/shared/device-instances-history.model';

const stateConnected = 'connected';
const stateDisconnected = 'disconnected';
const stateTrue = true;
const stateFalse = false;
const dayInMs = 86400000;
const failureTimeInMs = dayInMs * 7;
const today = new Date();

@Injectable({
    providedIn: 'root'
})
export class DeviceDowntimeListService {

    constructor(private dialog: MatDialog,
                private dashboardService: DashboardService,
                private http: HttpClient,
                private errorHandlerService: ErrorHandlerService,
                private deviceInstancesService: DeviceInstancesService) {
    }

    openEditDialog(dashboardId: string, widgetId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId: widgetId,
            dashboardId: dashboardId,
        };
        const editDialogRef = this.dialog.open(DeviceDowntimeListEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getDevicesDowntime(): Observable<DeviceDowntimeListModel[]> {
        return new Observable<DeviceDowntimeListModel[]>((observer) => {
            this.deviceInstancesService.getDeviceHistory7d().subscribe((devices: DeviceInstancesHistoryModel[]) => {
                observer.next(this.calcDevicesConnectionTime(devices));
                observer.complete();
            });
        });
    }

    private calcDevicesConnectionTime(devices: DeviceInstancesHistoryModel[]): DeviceDowntimeListModel[] {
        const deviceArray: DeviceDowntimeListModel[] = [];
        if (devices !== null) {
            devices.forEach(device => {
                deviceArray.push(this.calcDisconnectedTime(device));
            });
            deviceArray.sort((a, b) => {
                return b.timeDisconnectedInMs - (a.timeDisconnectedInMs || b.failureRate - a.failureRate);
            });
        }
        return deviceArray.slice(0, 50);
    }

    private calcDisconnectedTime(item: DeviceInstancesHistoryModel): DeviceDowntimeListModel {

        const itemStatus = new DeviceDowntimeListModel(0, 0, 0, 0, 0, 0, item.name, '', '');
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
            /** calculate delta from last index time till now */
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
        itemStatus.failureRatio = itemStatus.timeDisconnectedInMs / (itemStatus.timeDisconnectedInMs + itemStatus.timeConnectedInMs);

        if (itemStatus.timeDisconnectedInMin >= 2880) {
            itemStatus.color = 'red';
            itemStatus.icon = 'sentiment_very_dissatisfied';
        } else {
            if (itemStatus.timeDisconnectedInMin < 60) {
                itemStatus.color = 'green';
                itemStatus.icon = 'sentiment_very_satisfied';
            } else {
                itemStatus.color = 'yellow';
                itemStatus.icon = 'sentiment_neutral';
            }
        }

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

