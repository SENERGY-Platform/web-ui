/*
 * Copyright 2020 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, softwareb
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DeviceInstancesService } from '../../../modules/devices/device-instances/shared/device-instances.service';
import { DevicesStateModel, DevicesStatePropertiesModel } from './devices-state.model';
import { MatDialog } from '@angular/material/dialog';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { openWidgetEditDialog } from '../../../modules/dashboard/shared/open-widget-edit-dialog';
import { DevicesStateEditDialogComponent } from '../dialog/devices-state-edit-dialog.component';
import { map } from 'rxjs/operators';
import { Attribute } from 'src/app/modules/devices/device-instances/shared/device-instances.model';

@Injectable({
    providedIn: 'root',
})
export class DevicesStateService {
    private dialog = inject(MatDialog);
    private dashboardService = inject(DashboardService);
    private deviceInstancesService = inject(DeviceInstancesService);


    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean, userHasUpdatePropertiesAuthorization: boolean): void {
        openWidgetEditDialog(this.dialog, this.dashboardService, DevicesStateEditDialogComponent, {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization,
            userHasUpdatePropertiesAuthorization
        });
    }

    getDevicesStatus(properties?: DevicesStatePropertiesModel): Observable<DevicesStateModel> {
        let ids = undefined;
        if (properties?.deviceState?.location?.id !== undefined) {
            ids = [properties.deviceState.location.id];
        }
        let filter: Attribute[] | undefined = undefined;
        if (properties?.deviceState?.filter_inactive) {
            filter = [{ key: 'inactive', value: 'true', origin: 'web-ui' }];
        }
        return this.deviceInstancesService.getCurrentDeviceConnectionStatusMap(ids, filter).pipe(
            map(history => {
                 const devicesStatus: DevicesStateModel = { connected: 0, count: 0, disconnected: 0, unknown: 0 };
                 history.forEach((logStates) => { 
                    logStates.forEach(state => {
                        if (state) { 
                            devicesStatus.connected++; 
                        } else {
                            devicesStatus.disconnected++;
                        }
                        devicesStatus.count++;
                 });
                 if (logStates.length === 0) {
                     devicesStatus.unknown++;
                     devicesStatus.count++;
                 }
                 });
                 return devicesStatus;
            }),
        );
    }
}
