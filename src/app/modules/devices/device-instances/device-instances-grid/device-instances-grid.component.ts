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

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DeviceInstancesModel } from '../shared/device-instances.model';
import { ResponsiveService } from '../../../../core/services/responsive.service';
import { DeviceInstancesService } from '../shared/device-instances.service';
import { PermissionsDialogService } from '../../../permissions/shared/permissions-dialog.service';
import { DialogsService } from '../../../../core/services/dialogs.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DeviceInstancesUpdateModel } from '../shared/device-instances-update.model';
import { KeycloakService } from 'keycloak-angular';
import { DeviceTypeDeviceClassModel, DeviceTypeModel } from '../../../metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from '../../../metadata/device-types-overview/shared/device-type.service';
import { ExportService } from '../../../exports/shared/export.service';
import { ExportModel } from '../../../exports/shared/export.model';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DeviceInstancesExportDialogComponent } from '../dialogs/device-instances-export-dialog.component';
import { DeviceInstancesDialogService } from '../shared/device-instances-dialog.service';

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
    styleUrls: ['./device-instances-grid.component.css'],
})
export class DeviceInstancesGridComponent implements OnInit {
    @Input() deviceInstances: DeviceInstancesModel[] = [];
    @Input() ready = false;
    @Output() tag = new EventEmitter<{ tag: string; tagType: string }>();
    @Output() itemDeleted = new EventEmitter<boolean>();
    gridCols = 0;
    userID: string;
    deviceClasses: DeviceTypeDeviceClassModel[] = [];

    constructor(
        private responsiveService: ResponsiveService,
        private deviceInstancesService: DeviceInstancesService,
        private keycloakService: KeycloakService,
        private permissionsDialogService: PermissionsDialogService,
        private dialogsService: DialogsService,
        private deviceTypeService: DeviceTypeService,
        private exportService: ExportService,
        private snackBar: MatSnackBar,
        private dialog: MatDialog,
        private deviceInstancesDialogService: DeviceInstancesDialogService,
    ) {
        this.userID = this.keycloakService.getKeycloakInstance().subject || '';
    }

    ngOnInit() {
        this.loadDeviceClasses();
        this.initGridCols();
    }

    service(deviceTypeId: string, deviceId: string): void {
        this.deviceInstancesDialogService.openDeviceServiceDialog(deviceTypeId, deviceId);
    }

    edit(device: DeviceInstancesModel): void {
        this.deviceInstancesDialogService.openDeviceEditDialog(device);
    }

    duplicate(device: DeviceInstancesModel): void {
        this.deviceInstancesDialogService.openDeviceCreateDialog(undefined, device);
    }

    delete(device: DeviceInstancesModel): void {
        this.dialogsService
            .openDeleteDialog('device')
            .afterClosed()
            .subscribe((deviceDelete: boolean) => {
                if (deviceDelete) {
                    this.deviceInstancesService.deleteDeviceInstance(device.id).subscribe((resp: DeviceInstancesUpdateModel | null) => {
                        if (resp !== null) {
                            this.deviceInstances.splice(this.deviceInstances.indexOf(device), 1);
                            this.snackBar.open('Device deleted successfully.', '', { duration: 2000 });
                            this.emitItemDeleted();
                        } else {
                            this.snackBar.open('Error while deleting device!', '', { duration: 2000 });
                        }
                    });
                }
            });
    }

    permission(device: DeviceInstancesModel): void {
        this.permissionsDialogService.openPermissionDialog('devices', device.id, device.name);
    }

    emitTag(tag: string, tagType: string) {
        this.tag.emit({ tag, tagType });
    }

    emitItemDeleted() {
        this.itemDeleted.emit(true);
    }

    export(device: DeviceInstancesModel) {
        this.deviceTypeService.getDeviceType(device.device_type.id).subscribe((deviceType: DeviceTypeModel | null) => {
            if (deviceType !== null) {
                const exports: ExportModel[] = [];
                deviceType.services.forEach((service) => {
                    const newExports = this.exportService.prepareDeviceServiceExport(device, service);
                    newExports.forEach((singleExport) => {
                        singleExport.Description = 'Created at device overview';
                        singleExport.Generated = false;
                    });
                    exports.push(...newExports);
                });
                if (exports.length > 0) {
                    const dialogConfig = new MatDialogConfig();
                    dialogConfig.minWidth = '375px';
                    dialogConfig.data = {
                        exports,
                    };
                    this.dialog.open(DeviceInstancesExportDialogComponent, dialogConfig);
                } else {
                    this.snackBar.open('Device type has no output services!', '', { duration: 2000 });
                }
            } else {
                this.snackBar.open('Could not read device type!', '', { duration: 2000 });
            }
        });
    }

    getImage(deviceClassId: string): string {
        let image = '';
        this.deviceClasses.forEach((deviceClass: DeviceTypeDeviceClassModel) => {
            if (deviceClass.id === deviceClassId) {
                image = deviceClass.image;
            }
        });
        return image;
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
    }

    private loadDeviceClasses(): void {
        this.deviceTypeService.getDeviceClasses().subscribe((deviceClasses: DeviceTypeDeviceClassModel[]) => {
            this.deviceClasses = deviceClasses;
        });
    }
}
