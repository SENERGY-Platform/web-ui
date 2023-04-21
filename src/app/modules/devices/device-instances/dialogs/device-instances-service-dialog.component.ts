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

import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {
    DeviceTypeModel,
    DeviceTypeServiceModel
} from '../../../metadata/device-types-overview/shared/device-type.model';
import {
    LastValuesRequestElementTimescaleModel,
    QueriesRequestColumnModel,
    TimeValuePairModel
} from '../../../../widgets/shared/export-data.model';
import {ExportDataService} from '../../../../widgets/shared/export-data.service';
import {FormBuilder, FormGroup} from '@angular/forms';
import {environment} from '../../../../../environments/environment';
import {AuthorizationService} from '../../../../core/services/authorization.service';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';

@Component({
    templateUrl: './device-instances-service-dialog.component.html',
    styleUrls: ['./device-instances-service-dialog.component.css'],
})
export class DeviceInstancesServiceDialogComponent implements OnInit {
    services: DeviceTypeServiceModel[] = [];
    lastValueElements: LastValuesRequestElementTimescaleModel[] = [];
    lastValueArray: { request: LastValuesRequestElementTimescaleModel; response: TimeValuePairModel }[][] = [];
    deviceType: DeviceTypeModel;
    serviceOutputCounts: number[] = [];
    timeControl: FormGroup = this.fb.group({
        from: [{value: new Date(new Date().setHours(new Date().getTimezoneOffset() / -60, 0, 0, 0)), disabled: true}],
        to: [{value: new Date(new Date().setHours(new Date().getTimezoneOffset() / -60, 0, 0, 0)), disabled: true}],
    });
    deviceId = '';


    constructor(
        private dialogRef: MatDialogRef<DeviceInstancesServiceDialogComponent>,
        @Inject(MAT_DIALOG_DATA) data: {
            deviceId: string;
            services: DeviceTypeServiceModel[];
            lastValueElements: LastValuesRequestElementTimescaleModel[];
            deviceType: DeviceTypeModel;
            serviceOutputCounts: number[];
        },
        private exportDataService: ExportDataService,
        private fb: FormBuilder,
        private errorHandlerService: ErrorHandlerService,
        private authorizationService: AuthorizationService,
    ) {
        this.services = data.services;
        this.lastValueElements = data.lastValueElements;
        this.deviceType = data.deviceType;
        this.serviceOutputCounts = data.serviceOutputCounts;
        this.deviceId = data.deviceId;
    }

    ngOnInit() {
        this.refresh();
    }

    refresh() {
        this.exportDataService.getLastValuesTimescale(this.lastValueElements).subscribe(lastValues => {
            this.lastValueArray = [];
            let counter = 0;
            this.deviceType.services.forEach((_, serviceIndex) => {
                const subArray: {
                    request: LastValuesRequestElementTimescaleModel;
                    response: TimeValuePairModel;
                }[] = [];
                lastValues.slice(counter, counter + this.serviceOutputCounts[serviceIndex]).forEach((response, responseIndex) => {
                    subArray.push({request: this.lastValueElements[counter + responseIndex], response});
                });
                this.lastValueArray.push(subArray);
                counter += this.serviceOutputCounts[serviceIndex];
            });
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    async getDownloadUrl(i: number): Promise<string> {
        const fromIso = this.timeControl.get('from')?.value.toISOString();
        const toIso = new Date((this.timeControl.get('to')?.value as Date).valueOf() + 86400000).toISOString();
        const columns: QueriesRequestColumnModel[] = [];
        this.lastValueArray[i].forEach(c => columns.push({name: c.request.columnName}));

        const token = await this.authorizationService.getToken();
        const f = await fetch(environment.timescaleAPIURL + '/prepare-download?query=' + JSON.stringify({
            serviceId: this.services[i].id,
            deviceId: this.deviceId,
            columns,
            time: {
                start: fromIso,
                end: toIso,
            }
        }), {headers: {Authorization: token}});
        if (!f.ok) {
            throw f.statusText;
        }
        const secret = await f.text();
        return environment.timescaleAPIDownloadURL + '/download/' + secret;
    }

    async download($event: Event, i: number) {
        $event.stopPropagation();
        let url = '';
        try {
            url = await this.getDownloadUrl(i);
        } catch (e) {
            this.errorHandlerService.handleErrorWithSnackBar('Failed to prepare download', 'DeviceInstancesServiceDialogComponent', 'download', null)(undefined);
            return;
        }
        const dlink: HTMLAnchorElement = document.createElement('a');
        const fromIso = this.timeControl.get('from')?.value.toISOString();
        const toIso = new Date((this.timeControl.get('to')?.value as Date).valueOf() + 86400000).toISOString();
        dlink.download = (this.services[i].name + '-' + fromIso + '-' + toIso + '.csv').replace(/ /g, '_');
        dlink.href = url;
        dlink.click(); // this will trigger the dialog window
        dlink.remove();
        console.log(url);
    }
}
