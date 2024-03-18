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
import {Attribute, DeviceInstancesModel} from './device-instances.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DeviceInstancesServiceDialogComponent} from '../dialogs/device-instances-service-dialog.component';
import {
    DeviceTypeAspectModel, DeviceTypeAspectNodeModel, DeviceTypeCharacteristicsModel,
    DeviceTypeFunctionModel,
    DeviceTypeModel
} from '../../../metadata/device-types-overview/shared/device-type.model';
import {DeviceTypeService} from '../../../metadata/device-types-overview/shared/device-type.service';
import {DeviceInstancesEditDialogComponent} from '../dialogs/device-instances-edit-dialog.component';
import {DeviceInstancesUpdateModel} from './device-instances-update.model';
import {DeviceTypePermSearchModel} from '../../../metadata/device-types-overview/shared/device-type-perm-search.model';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DeviceInstancesService} from './device-instances.service';
import {DeviceInstancesSelectDialogComponent} from '../dialogs/device-instances-select-dialog.component';
import {forkJoin, mergeMap, Observable, of} from 'rxjs';
import {LastValuesRequestElementTimescaleModel, TimeValuePairModel} from '../../../../widgets/shared/export-data.model';
import {ExportDataService} from '../../../../widgets/shared/export-data.service';
import {environment} from '../../../../../environments/environment';
import {defaultIfEmpty, map, concatMap} from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class DeviceInstancesDialogService {
    constructor(
        private dialog: MatDialog,
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private deviceTypeService: DeviceTypeService,
        private snackBar: MatSnackBar,
        private deviceInstancesService: DeviceInstancesService,
        private exportDataService: ExportDataService,
    ) {
    }

    openDeviceSelectDialog(): Observable<string[] | null | undefined> {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        const editDialogRef = this.dialog.open(DeviceInstancesSelectDialogComponent, dialogConfig);
        return editDialogRef.afterClosed();
    }

    openDeviceServiceDialog(deviceTypeId: string, deviceId: string): void {
        const obs: Observable<any>[] = [];
        obs.push(this.deviceTypeService.getMeasuringFunctions());
        obs.push(this.deviceTypeService.getAspectNodesWithMeasuringFunction());
        obs.push(this.deviceTypeService.getLeafCharacteristics());
        obs.push(this.deviceTypeService.getDeviceType(deviceTypeId));

        forkJoin(obs).subscribe((results) => {
            const functions: DeviceTypeFunctionModel[] = results[0]; // forkJoin preserves order
            const aspects: DeviceTypeAspectNodeModel[] = results[1];
            const characteristics: DeviceTypeCharacteristicsModel[] = results[2];
            const deviceType: DeviceTypeModel | null = results[3];

            const lastValueElements: LastValuesRequestElementTimescaleModel[] = [];
            const serviceOutputCounts: number[] = [];
            const descriptions: string[][] = [];
            deviceType?.services.forEach((service, serviceIndex) => {
                serviceOutputCounts[serviceIndex] = 0;
                const serviceDescriptions: string[] = [];
                service.outputs?.forEach(output => {
                    const paths = this.deviceTypeService.getValuePathsAndContentVariables(output.content_variable);
                    paths.forEach((path) => {
                        lastValueElements.push({
                            deviceId,
                            serviceId: service.id,
                            columnName: path.path,
                        });
                        let description = '';
                        if (path.contentVariable.aspect_id !== undefined && path.contentVariable.aspect_id.length > 0 && paths.filter(p => p.contentVariable.function_id === path.contentVariable.function_id).length > 1) {
                            description += aspects.find(a => a.id === path.contentVariable.aspect_id)?.name;
                        }
                        if (path.contentVariable.function_id !== undefined && path.contentVariable.function_id.length > 0) {
                            if (description.length > 0) {
                                description += ', ';
                            }
                            description += functions.find(a => a.id === path.contentVariable.function_id)?.display_name;
                        }
                        if (path.contentVariable.characteristic_id !== undefined && path.contentVariable.characteristic_id.length > 0) {
                            if (description.length > 0) {
                                description += ', ';
                            }
                            description += characteristics.find(a => a.id === path.contentVariable.characteristic_id)?.name;
                        }
                        serviceDescriptions.push(description);
                        if (serviceOutputCounts.length <= serviceIndex) {
                            serviceOutputCounts.push(0);
                        }
                        serviceOutputCounts[serviceIndex]++;
                    });
                });
                descriptions.push(serviceDescriptions);
            });
            const dialogConfig = new MatDialogConfig();
            dialogConfig.disableClose = false;
            dialogConfig.minWidth = '650px';
            if (deviceType) {
                dialogConfig.data = {
                    deviceId,
                    services: deviceType.services,
                    lastValueElements,
                    deviceType,
                    serviceOutputCounts,
                    descriptions,
                };
            }
            this.dialog.open(DeviceInstancesServiceDialogComponent, dialogConfig);
        });
    }

    openDeviceEditDialog(device: DeviceInstancesModel, userHasUpdateDisplayNameAuthorization: boolean, userHasUpdateAttributesAuthorization: boolean) {
        interface editDeviceResponse {
            attributes: Attribute[];
            display_name: string;
        }
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            device: JSON.parse(JSON.stringify(device)), // create copy of object
            userHasUpdateAttributesAuthorization,
            userHasUpdateDisplayNameAuthorization
        };

        const editDialogRef = this.dialog.open(DeviceInstancesEditDialogComponent, dialogConfig);

        return editDialogRef.afterClosed().pipe(
            concatMap((editResponse: editDeviceResponse) => {
                const obs: Observable<any>[] = [];
                if (editResponse.attributes !== undefined && userHasUpdateAttributesAuthorization) {
                    obs.push(this.deviceInstancesService.updateDeviceInstanceAttributes(device.id, editResponse.attributes));
                }

                if(editResponse.display_name != null && userHasUpdateDisplayNameAuthorization) {
                    obs.push(this.deviceInstancesService.updateDeviceInstanceDisplayName(device.id, editResponse.display_name));
                }
                return forkJoin(obs).pipe(
                    defaultIfEmpty([]),
                    map((resp: (DeviceInstancesUpdateModel | null)[]) => {
                        let errorOccured = false;
                        resp.forEach(updateResp => {
                            if(updateResp === null) {
                                errorOccured = true;
                            }
                        });
                        if(errorOccured) {
                            this.snackBar.open('Error while updating the device instance!', 'close', { panelClass: 'snack-bar-error' });
                            return device;
                        }
                        this.snackBar.open('Device instance updated successfully.', undefined, {duration: 2000});
                        device.display_name = editResponse.display_name;
                        device.attributes = editResponse.attributes;
                        return device;

                    })
                );
            })
        );
    }

    openDeviceCreateDialog(deviceType?: DeviceTypePermSearchModel, device?: DeviceInstancesModel): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        if (device === undefined) {
            device = {device_type: JSON.parse(JSON.stringify(deviceType))} as DeviceInstancesModel;
        } else {
            device = JSON.parse(JSON.stringify(device)) as DeviceInstancesModel;
            device.id = '';
        }
        dialogConfig.data = {
            device,
        };

        const editDialogRef = this.dialog.open(DeviceInstancesEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((deviceOut: DeviceInstancesModel) => {
            if (deviceOut !== undefined) {
                this.deviceInstancesService
                    .saveDeviceInstance(this.convertDeviceInstance(deviceOut))
                    .subscribe((deviceResp: DeviceInstancesUpdateModel | null) => {
                        if (deviceResp === null) {
                            this.snackBar.open('Error while saving the device instance!', 'close', { panelClass: 'snack-bar-error' });
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
            attributes: deviceOut.attributes,
        };
    }
}
