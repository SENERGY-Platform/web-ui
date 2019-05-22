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
import {MatDialog, MatDialogConfig, MatDialogRef} from '@angular/material';
import {SelectDeviceTypeAndServiceDialogComponent} from '../dialogs/select-device-type-and-service-dialog.component';
import {DeviceTypeModel} from './device-type.model';
import {DeviceTypesDialogComponent} from '../dialogs/device-types-dialog.component';
import {DeviceTypeService} from './device-type.service';
import {Observable} from 'rxjs';
import {DeleteDialogComponent} from '../../../../core/dialogs/delete-dialog.component';

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

    openDeviceTypeDialog(deviceType: DeviceTypeModel, editable: boolean): MatDialogRef<DeviceTypesDialogComponent> {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            deviceType: deviceType,
            editable: editable,
        };
        return this.dialog.open(DeviceTypesDialogComponent, dialogConfig);
    }
}
