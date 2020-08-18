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
import {HttpClient} from '@angular/common/http';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {DeviceInstancesModel} from './device-instances.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DeviceInstancesServiceDialogComponent} from '../dialogs/device-instances-service-dialog.component';
import {DeviceTypeModel} from '../../device-types-overview/shared/device-type.model';
import {DeviceTypeService} from '../../device-types-overview/shared/device-type.service';
import {DeviceInstancesEditDialogComponent} from '../dialogs/device-instances-edit-dialog.component';
import {DeviceInstancesUpdateModel} from './device-instances-update.model';
import {DeviceTypePermSearchModel} from '../../device-types-overview/shared/device-type-perm-search.model';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DeviceInstancesService} from './device-instances.service';


@Injectable({
    providedIn: 'root'
})
export class DeviceInstancesDialogService {

    constructor(private dialog: MatDialog,
                private http: HttpClient,
                private errorHandlerService: ErrorHandlerService,
                private deviceTypeService: DeviceTypeService,
                private snackBar: MatSnackBar,
                private deviceInstancesService: DeviceInstancesService) {
    }

    openDeviceServiceDialog(deviceTypeId: string): void {

        this.deviceTypeService.getDeviceType(deviceTypeId).subscribe((deviceType: DeviceTypeModel | null) => {
            const dialogConfig = new MatDialogConfig();
            dialogConfig.disableClose = false;
            if (deviceType) {
                dialogConfig.data = {
                    services: deviceType.services,
                };
            }
            this.dialog.open(DeviceInstancesServiceDialogComponent, dialogConfig);
        });
    }

    openDeviceEditDialog(device: DeviceInstancesModel): void {

        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            device: JSON.parse(JSON.stringify(device))         // create copy of object
        };

        const editDialogRef = this.dialog.open(DeviceInstancesEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((deviceOut: DeviceInstancesModel) => {
            if (deviceOut !== undefined) {
                this.deviceInstancesService.updateDeviceInstance(this.convertDeviceInstance(deviceOut)).subscribe(
                    (deviceResp: DeviceInstancesUpdateModel | null) => {
                        if (deviceResp === null) {
                            this.snackBar.open('Error while updating the device instance!', undefined, {duration: 2000});
                        } else {
                            Object.assign(device, deviceOut);
                            this.snackBar.open('Device instance updated successfully.', undefined, {duration: 2000});
                        }
                    });
            }
        });
    }

    openDeviceCreateDialog(deviceType: DeviceTypePermSearchModel): void {

        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            device: {device_type: JSON.parse(JSON.stringify(deviceType))} as DeviceInstancesModel
        };

        const editDialogRef = this.dialog.open(DeviceInstancesEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((deviceOut: DeviceInstancesModel) => {
            if (deviceOut !== undefined) {
                this.deviceInstancesService.saveDeviceInstance(this.convertDeviceInstance(deviceOut)).subscribe(
                    (deviceResp: DeviceInstancesUpdateModel | null) => {
                        if (deviceResp === null) {
                            this.snackBar.open('Error while saving the device instance!', undefined, {duration: 2000});
                        } else {
                            this.snackBar.open('Device instance saved successfully.', undefined, {duration: 2000});
                        }
                    });
            }
        });
    }

    private convertDeviceInstance(deviceOut: DeviceInstancesModel): DeviceInstancesUpdateModel {
        return {
            id: deviceOut.id,
            local_id: deviceOut.local_id,
            name: deviceOut.name,
            device_type_id: deviceOut.device_type.id,
        };
    }
}
