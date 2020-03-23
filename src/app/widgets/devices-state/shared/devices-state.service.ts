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
import {Observable} from 'rxjs';
import {DeviceInstancesService} from '../../../modules/devices/device-instances/shared/device-instances.service';
import {DeviceInstancesHistoryModel} from '../../../modules/devices/device-instances/shared/device-instances-history.model';
import {DevicesStateModel} from './devices-state.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {DevicesStateEditDialogComponent} from '../dialog/devices-state-edit-dialog.component';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../modules/dashboard/shared/dashboard-manipulation.enum';

@Injectable({
    providedIn: 'root'
})
export class DevicesStateService {

    constructor(private dialog: MatDialog,
                private dashboardService: DashboardService,
                private deviceInstancesService: DeviceInstancesService) {
    }

    openEditDialog(dashboardId: string, widgetId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId: widgetId,
            dashboardId: dashboardId,
        };
        const editDialogRef = this.dialog.open(DevicesStateEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getDevicesStatus(): Observable<DevicesStateModel> {
        return new Observable<DevicesStateModel>((observer) => {
            this.deviceInstancesService.getDeviceHistory1h().subscribe((devices: DeviceInstancesHistoryModel[]) => {
                observer.next(this.sumDevicesStatus(devices));
                observer.complete();
            });
        });
    }

    private sumDevicesStatus(devices: DeviceInstancesHistoryModel[]): DevicesStateModel {
        const devicesStatus: DevicesStateModel = {connected: 0, count: 0, disconnected: 0, unknown: 0};
        devices.forEach(device => {
            switch (device.log_state) {
                case 'connected': {
                    devicesStatus.connected++;
                    break;
                }
                case 'disconnected': {
                    devicesStatus.disconnected++;
                    break;
                }
                default: {
                    devicesStatus.unknown++;
                    break;
                }
            }
            devicesStatus.count++;
        });
        return devicesStatus;
    }

}

