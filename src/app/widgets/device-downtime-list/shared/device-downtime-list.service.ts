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
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { DeviceDowntimeListEditDialogComponent } from '../dialogs/device-downtime-list-edit-dialog.component';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { DashboardManipulationEnum } from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import { Observable } from 'rxjs';
import { DeviceInstancesService } from '../../../modules/devices/device-instances/shared/device-instances.service';
import { Attribute, OfflineSinceModel } from 'src/app/modules/devices/device-instances/shared/device-instances.model';
import { DevicesDowntimeListPropertiesModel } from './device-downtime-list.model';

@Injectable({
    providedIn: 'root',
})
export class DeviceDowntimeListService {
    constructor(
        private dialog: MatDialog,
        private dashboardService: DashboardService,
        private deviceInstancesService: DeviceInstancesService,
    ) {
    }

    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean, userHasUpdatePropertiesAuthorization: boolean): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization,
            userHasUpdatePropertiesAuthorization
        };
        const editDialogRef = this.dialog.open(DeviceDowntimeListEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getDevicesDowntime(properties: DevicesDowntimeListPropertiesModel): Observable<OfflineSinceModel[]> {
        let ids = undefined;
        if (properties?.deviceDowntimeList?.location?.id !== undefined) {
            ids = [properties.deviceDowntimeList.location.id];
        }
         let filter: Attribute[] | undefined = undefined;
        if (properties?.deviceDowntimeList?.filter_inactive === true) {
            filter = [{ key: 'inactive', value: 'true', origin: 'web-ui' }];
        }
        return this.deviceInstancesService.getDeviceOfflineSince(ids, filter);
    }
}
