/*
 *
 *  Copyright 2019 InfAI (CC SES)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {DeviceInstancesModel} from '../shared/device-instances.model';
import {ResponsiveService} from '../../../../core/services/responsive.service';
import {DeviceInstancesService} from '../shared/device-instances.service';
import {PermissionsDialogService} from '../../../permissions/shared/permissions-dialog.service';
import {DialogsService} from '../../../../core/services/dialogs.service';
import {MatSnackBar} from '@angular/material';
import {DeviceInstancesUpdateModel} from '../shared/device-instances-update.model';
import {KeycloakService} from 'keycloak-angular';

const grids = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-device-instances-grid',
    templateUrl: './device-instances-grid.component.html',
    styleUrls: ['./device-instances-grid.component.css']
})
export class DeviceInstancesGridComponent implements OnInit {



    @Input() deviceInstances: DeviceInstancesModel[] = [];
    @Input() ready = false;
    @Output() tag =  new EventEmitter<{tag: string, tagType: string}>();
    @Output() itemDeleted =  new EventEmitter<boolean>();
    gridCols = 0;
    userID: string;

    constructor(private responsiveService: ResponsiveService,
                private deviceInstancesService: DeviceInstancesService,
                private keycloakService: KeycloakService,
                private permissionsDialogService: PermissionsDialogService,
                private dialogsService: DialogsService,
                private snackBar: MatSnackBar) {
        this.userID = this.keycloakService.getKeycloakInstance().subject || '';
    }

    ngOnInit() {
        this.initGridCols();
    }

    service(deviceTypeId: string): void {
        this.deviceInstancesService.openDeviceServiceDialog(deviceTypeId);
    }

    edit(device: DeviceInstancesModel): void {
        this.deviceInstancesService.openDeviceEditDialog(device);
    }

    delete(device: DeviceInstancesModel): void {
        this.dialogsService.openDeleteDialog('device').afterClosed().subscribe((deviceDelete: boolean) => {
            if (deviceDelete) {
                this.deviceInstancesService.deleteDeviceInstance(device.id).subscribe((resp: DeviceInstancesUpdateModel | null) => {
                    if (resp !== null) {
                        this.deviceInstances.splice(this.deviceInstances.indexOf(device), 1);
                        this.snackBar.open('Device deleted successfully.', '', {duration: 2000});
                        this.emitItemDeleted();
                    } else {
                        this.snackBar.open('Error while deleting device!', '', {duration: 2000});
                    }
                });
            }
        });
    }

    permission(device: DeviceInstancesModel): void {
        this.permissionsDialogService.openPermissionDialog('devices', device.id, device.name);
    }

    emitTag(tag: string, tagType: string) {
        this.tag.emit({tag: tag, tagType: tagType});
    }

    emitItemDeleted() {
        this.itemDeleted.emit(true);
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
    }

}
