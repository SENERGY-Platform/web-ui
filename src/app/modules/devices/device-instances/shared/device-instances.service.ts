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
import {MatDialog, MatDialogConfig, MatSnackBar} from '@angular/material';
import {DeviceInstancesServiceDialogComponent} from '../dialogs/device-instances-service-dialog.component';
import {DeviceTypeModel} from '../../device-types-overview/shared/device-type.model';
import {DeviceTypeService} from '../../device-types-overview/shared/device-type.service';
import {DeviceInstancesEditDialogComponent} from '../dialogs/device-instances-edit-dialog.component';
import {DeviceInstancesUpdateModel} from './device-instances-update.model';
import {DeviceTypePermSearchModel} from '../../device-types-overview/shared/device-type-perm-search.model';

​

@Injectable({
    providedIn: 'root'
})
export class DeviceInstancesService {
​
    private getDeviceHistoryObservable7d: Observable<DeviceInstancesHistoryModel[]> | null = null;
    private getDeviceHistoryObservable1h: Observable<DeviceInstancesHistoryModel[]> | null = null;
​

    constructor(private dialog: MatDialog,
                private http: HttpClient,
                private errorHandlerService: ErrorHandlerService,
                private deviceTypeService: DeviceTypeService,
                private snackBar: MatSnackBar) {
    }

    getDeviceInstances(searchText: string, limit: number, offset: number, value: string, order: string): Observable<DeviceInstancesModel[]> {
        return this.http.get<DeviceInstancesModel[]>
        (environment.apiAggregatorUrl + '/devices?limit=' + limit + '&offset=' + offset + '&sort=' + value + '.' + order +
            (searchText === '' ? '' : '&search=' + encodeURIComponent(searchText))).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstances', []))
        );
    }

    getDeviceInstancesByState(searchText: string, state: string, value: string, order: string): Observable<DeviceInstancesModel[]> {
        return this.http.get<DeviceInstancesModel[]>
        (environment.apiAggregatorUrl + '/devices?state=' + state + '&sort=' + value + '.' + order +
            (searchText === '' ? '' : '&search=' + encodeURIComponent(searchText))).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByState: no search', []))
        );
    }

    updateDeviceInstance(device: DeviceInstancesUpdateModel): Observable<DeviceInstancesUpdateModel | null> {
        return this.http.put<DeviceInstancesUpdateModel>
        (environment.deviceManagerUrl + '/devices/' + encodeURIComponent(device.id), device).pipe(
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'updateDeviceInstance', null))
        );
    }

    saveDeviceInstance(device: DeviceInstancesUpdateModel): Observable<DeviceInstancesUpdateModel | null> {
        return this.http.post<DeviceInstancesUpdateModel>
        (environment.deviceManagerUrl + '/devices', device).pipe(
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'saveDeviceInstance', null))
        );
    }

    deleteDeviceInstance(id: string): Observable<DeviceInstancesUpdateModel | null> {
        return this.http.delete<DeviceInstancesUpdateModel>(environment.deviceManagerUrl + '/devices/' + encodeURIComponent(id)).pipe(
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'deleteDeviceInstance', null))
        );
    }

    getDeviceInstancesByTag(tagType: string, tag: string, feature: string, order: string, limit: number, offset: number): Observable<DeviceInstancesModel[]> {
        return this.http.get<DeviceInstancesModel[]>
        (environment.apiAggregatorUrl + '/devices?limit=' + limit + '&offset=' + offset + '&sort=' + feature + '.' + order + '&' + tagType + '=' + tag).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByTag', []))
        );
    }

    getDeviceInstancesByTagAndState(tagType: string, tag: string, feature: string, order: string, state: string): Observable<DeviceInstancesModel[]> {
        return this.http.get<DeviceInstancesModel[]>
        (environment.apiAggregatorUrl + '/devices?sort=' + feature + '.' + order + '&' + tagType + '=' + tag + '&state=' + state).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByTagAndState', []))
        );
    }

    getDeviceInstancesByHubId(limit: number, offset: number, value: string, order: string, id: string): Observable<DeviceInstancesModel[]> {
        return this.http.get<DeviceInstancesModel[]>
        (environment.apiAggregatorUrl + '/hubs/' + encodeURIComponent(id) + '/devices?limit=' + limit + '&offset=' + offset + '&sort=' + value + '.' + order).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceInstancesByHubId', []))
        );
    }


    getDeviceHistory7d(): Observable<DeviceInstancesHistoryModel[]> {
        if (this.getDeviceHistoryObservable7d === null) {
            this.getDeviceHistoryObservable7d = this.http.get<DeviceInstancesHistoryModel[]>(environment.apiAggregatorUrl + '/devices?log=7d').pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceHistory7d', [])),
                share()
            );
        }
        return this.getDeviceHistoryObservable7d;
    }

    getDeviceHistory1h(): Observable<DeviceInstancesHistoryModel[]> {
        if (this.getDeviceHistoryObservable1h === null) {
            this.getDeviceHistoryObservable1h = this.http.get<DeviceInstancesHistoryModel[]>(environment.apiAggregatorUrl + '/devices?log=1h').pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceInstancesService.name, 'getDeviceHistory1h', [])),
                share()
            );
        }
        return this.getDeviceHistoryObservable1h;
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
                this.updateDeviceInstance(this.convertDeviceInstance(deviceOut)).subscribe(
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
                this.saveDeviceInstance(this.convertDeviceInstance(deviceOut)).subscribe(
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
