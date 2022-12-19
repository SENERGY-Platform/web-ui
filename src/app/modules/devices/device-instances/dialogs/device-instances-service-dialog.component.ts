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
import {MatSnackBar} from '@angular/material/snack-bar';

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
        from: new Date(new Date().setHours(new Date().getTimezoneOffset() / -60, 0, 0, 0)),
        to: new Date(new Date().setHours(new Date().getTimezoneOffset() / -60, 0, 0, 0))
    });
    downloading = false;
    deviceId = '';


    constructor(
        private dialogRef: MatDialogRef<DeviceInstancesServiceDialogComponent>,
        @Inject(MAT_DIALOG_DATA) data: {
            deviceId: string;
            services: DeviceTypeServiceModel[]; lastValueElements: LastValuesRequestElementTimescaleModel[]; deviceType: DeviceTypeModel; serviceOutputCounts: number[];
        },
        private exportDataService: ExportDataService,
        private fb: FormBuilder,
        private snackBar: MatSnackBar,
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
                const subArray: { request: LastValuesRequestElementTimescaleModel; response: TimeValuePairModel }[] = [];
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

    download(i: number) {
        const fromIso = this.timeControl.get('from')?.value.toISOString();
        const toIso = new Date((this.timeControl.get('to')?.value as Date).valueOf() + 86400000).toISOString();
        this.downloading = true;
        const columns: QueriesRequestColumnModel[] = [];
        this.lastValueArray[i].forEach(c => columns.push({name: c.request.columnName}));

        this.exportDataService.queryTimescaleCsv([{
            serviceId: this.services[i].id,
            deviceId: this.deviceId,
            columns,
            time: {
                start: fromIso,
                end: toIso,
            }
        }]).subscribe(res => {
            const dlink: HTMLAnchorElement = document.createElement('a');
            dlink.download = (this.services[i].name + '-' + fromIso + '-' + toIso + '.csv').replace(/ /g, '_');
            dlink.href = 'data:text/csv;,' + res;
            dlink.click(); // this will trigger the dialog window
            dlink.remove();
            this.downloading = false;
        }, (_) => {
            this.downloading = false;
            this.snackBar.open('Error downloading data!', 'close', {panelClass: 'snack-bar-error'});
        });
    }
}
