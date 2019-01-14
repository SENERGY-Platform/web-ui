/*
 * Copyright 2018 InfAI (CC SES)
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
import {environment} from '../../../../../environments/environment';
import {catchError, map, share} from 'rxjs/internal/operators';
import {DeviceInstancesModel} from './device-instances.model';
import {Observable} from 'rxjs';
import {DeviceInstancesHistoryModel} from './device-instances-history.model';
import {MatDialog, MatDialogConfig} from '@angular/material';
import {DeviceInstancesServiceDialogComponent} from '../dialogs/device-instances-service-dialog.component';
import {DeviceTypeModel} from '../../device-types/shared/device-type.model';
import {DeviceTypeService} from '../../device-types/shared/device-type.service';
import {PermissionsService} from '../../../permissions/shared/permissions.service';
import {DeviceInstancesEditDialogComponent} from '../dialogs/device-instances-edit-dialog.component';
import {DeviceInstancesUpdateModel} from './device-instances-update.model';

​

@Injectable({
    providedIn: 'root'
})
export class DeviceInstancesService {
​
    private getDeviceHistoryObservable: Observable<DeviceInstancesHistoryModel[]> | null = null;
​

    constructor(private dialog: MatDialog,
                private http: HttpClient,
                private errorHandlerService: ErrorHandlerService,
                private deviceTypeService: DeviceTypeService,
                private permissionsService: PermissionsService) {
    }

    getDeviceInstances(searchText: string, limit: number, offset: number, value: string, order: string): Observable<DeviceInstancesModel[]> {
        if (searchText === '') {
            return this.http.get<DeviceInstancesModel[]>
            (environment.apiAggregatorUrl + '/list/devices/' + limit + '/' + offset + '/' + value + '/' + order).pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstances: no search', []))
            );
        } else {
            return this.http.get<DeviceInstancesModel[]>
            (environment.apiAggregatorUrl + '/search/devices/' + encodeURIComponent(searchText) + '/' + limit + '/' + offset + '/' + value + '/' + order).pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstances: search', []))
            );
        }
    }

    updateDeviceInstance(id: string, device: DeviceInstancesUpdateModel): Observable<DeviceInstancesUpdateModel> {
        return this.http.post<DeviceInstancesUpdateModel>
        (environment.iotRepoUrl + '/deviceInstance/' + encodeURIComponent(id), device).pipe(
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'updateDeviceInstance', {} as DeviceInstancesUpdateModel))
        );
    }

    deleteDeviceInstance(id: string): Observable<DeviceInstancesUpdateModel | null> {
        return this.http.delete<DeviceInstancesUpdateModel>(environment.iotRepoUrl + '/deviceInstance/' + encodeURIComponent(id)).pipe(
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'deleteDeviceInstance', null))
        );
    }

    getDeviceInstancesByTag(tagType: string, tag: string, feature: string, order: string, limit: number, offset: number): Observable<DeviceInstancesModel[]> {
        return this.http.get<DeviceInstancesModel[]>
        (environment.apiAggregatorUrl + '/select/devices/' + tagType + '/' + encodeURIComponent(tag) + '/' + limit + '/' + offset + '/' + feature + '/' + order).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByTag', []))
        );
    }

    getDeviceInstancesByIds(limit: number, offset: number, value: string, order: string, ids: string[]): Observable<DeviceInstancesModel[]> {
        return this.http.post<DeviceInstancesModel[]>
        (environment.apiAggregatorUrl + '/select/devices/ids/' + limit + '/' + offset + '/' + value + '/' + order, ids).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByIds', []))
        );
    }


    getDeviceHistory(duration: string): Observable<DeviceInstancesHistoryModel[]> {
        if (this.getDeviceHistoryObservable === null) {
            this.getDeviceHistoryObservable = this.http.get<DeviceInstancesHistoryModel[]>(environment.apiAggregatorUrl + '/history/devices/' + duration).pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceHistory', [])),
                share()
            );
        }
        return this.getDeviceHistoryObservable;
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
                const deviceUpdate: DeviceInstancesUpdateModel = {
                    device_type: deviceOut.devicetype,
                    id: deviceOut.id,
                    img: deviceOut.img,
                    name: deviceOut.name,
                    tags: deviceOut.tag,
                    uri: deviceOut.uri,
                    user_tags: deviceOut.usertag
                }
                this.updateDeviceInstance(device.id, deviceUpdate).subscribe(() => {
                    Object.assign(device, deviceOut);
                });

            }
        });
    };


}
