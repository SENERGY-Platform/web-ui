/*
 * Copyright 2019 InfAI (CC SES)
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
import {DeviceTypeSelectionRefModel, DeviceTypeSelectionResultModel} from './device-type-selection.model';
import {MatDialog, MatDialogConfig} from '@angular/material';
import {SelectDeviceTypeAndServiceDialogComponent} from '../dialogs/select-device-type-and-service-dialog.component';
import {DeviceTypeModel} from './device-type.model';
import {DeviceTypesDialogDialogComponent} from '../dialogs/device-types-dialog-dialog.component';
import {DeviceTypeService} from './device-type.service';

@Injectable({
    providedIn: 'root'
})
export class DeviceTypeDialogService {

    constructor(private dialog: MatDialog,
                private deviceTypeService: DeviceTypeService) {
    }

    openSelectDeviceTypeAndServiceDialog(defaultSelection: DeviceTypeSelectionRefModel, callback: (connectorInfo: DeviceTypeSelectionResultModel) => void) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {selection: defaultSelection};
        const editDialogRef = this.dialog.open(SelectDeviceTypeAndServiceDialogComponent, dialogConfig);
        editDialogRef.afterClosed().subscribe((result: DeviceTypeSelectionResultModel) => {
            if (result) {
                callback(result);
            }
        });
    }

    openDeviceTypeDialog(id: string): void {

        this.deviceTypeService.getDeviceType(id).subscribe((deviceType: (DeviceTypeModel | null)) => {
            if (deviceType !== null) {
                const dialogConfig = new MatDialogConfig();
                dialogConfig.disableClose = false;
                dialogConfig.data = {
                    deviceType: deviceType
                };
                const editDialogRef = this.dialog.open(DeviceTypesDialogDialogComponent, dialogConfig);
                editDialogRef.afterClosed().subscribe((deviceTypeResp: DeviceTypeModel) => {
                    if (deviceTypeResp !== undefined) {
                        this.deviceTypeService.updateDeviceType(deviceTypeResp).subscribe((resp) => {
                                // todo: refresh list, snackbar
                        });
                    }
                });
            }
        });
    }
}
