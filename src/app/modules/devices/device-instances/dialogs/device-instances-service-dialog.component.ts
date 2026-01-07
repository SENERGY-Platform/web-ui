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

import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
    DeviceTypeModel,
    DeviceTypeServiceModel
} from '../../../metadata/device-types-overview/shared/device-type.model';
import {
    LastValuesRequestElementTimescaleModel,
    QueriesRequestColumnModel,
    TimeValuePairModel
} from '../../../../widgets/shared/export-data.model';
import { ExportDataService } from '../../../../widgets/shared/export-data.service';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { DeviceInstanceModel } from '../shared/device-instances.model';
import { DeviceInstancesService } from '../shared/device-instances.service';
import { ChartsExportVAxesModel } from 'src/app/widgets/charts/export/shared/charts-export-properties.model';
import { MatExpansionPanel } from '@angular/material/expansion';
import { detectAndMergeFlapping } from '../shared/flapping.function';

@Component({
    templateUrl: './device-instances-service-dialog.component.html',
    styleUrls: ['./device-instances-service-dialog.component.css'],
})
export class DeviceInstancesServiceDialogComponent implements OnInit {
    services: DeviceTypeServiceModel[] = [];
    lastValueElements: LastValuesRequestElementTimescaleModel[] = [];
    lastValueArray: {
        request: LastValuesRequestElementTimescaleModel;
        response: TimeValuePairModel;
        description?: string;
    }[][] = [];
    deviceType: DeviceTypeModel;
    serviceOutputCounts: number[] = [];
    timeControl: FormGroup = this.fb.group({
        from: [{ value: new Date(new Date().setHours(new Date().getTimezoneOffset() / -60, 0, 0, 0)), disabled: true }],
        to: [{ value: new Date(new Date().setHours(new Date().getTimezoneOffset() / -60, 0, 0, 0)), disabled: true }],
    });
    device: DeviceInstanceModel;
    descriptions: string[][];
    availability: { serviceId: string; from?: Date; to?: Date; groupType?: string; groupTime?: string }[] = [];
    availabilityControl = new FormControl<{
        groupType?: string;
        groupTime?: string;
    }>({});

    errorOccured = false;
    errorMessage = '';

    connectionHistory: any[][][] = [];
    userCanLoadConnectionHistory = false;
    clipboardTooltip = 'Copy to Clipboard';
    clipboardTooltipTimeout: unknown[] = [];
    userIsDeveloper = false;

    timelineAxes: ChartsExportVAxesModel[] = [
        // @ts-expect-error other values are not required
        {
            exportName: ' ',
            valueAlias: 'Period',
            conversions: [
                { from: true, to: true, alias: 'Online', color: '#097969' },
                { from: false, to: false, alias: 'Offline', color: '#C41E3A' },
                { from: 'flapping', to: 'flapping', alias: 'Flapping', color: '#FFA500' },
            ],

        }
    ];

    @ViewChild('connectionHistoryPanel') connectionHistoryPanel: MatExpansionPanel | undefined;

    constructor(
        private dialogRef: MatDialogRef<DeviceInstancesServiceDialogComponent>,
        @Inject(MAT_DIALOG_DATA) data: {
            device: DeviceInstanceModel;
            services: DeviceTypeServiceModel[];
            lastValueElements: LastValuesRequestElementTimescaleModel[];
            deviceType: DeviceTypeModel;
            serviceOutputCounts: number[];
            descriptions: string[][];
        },
        private exportDataService: ExportDataService,
        private fb: FormBuilder,
        private errorHandlerService: ErrorHandlerService,
        private authorizationService: AuthorizationService,
        private deviceInstancesService: DeviceInstancesService
    ) {
        this.services = data.services;
        this.lastValueElements = data.lastValueElements;
        this.deviceType = data.deviceType;
        this.serviceOutputCounts = data.serviceOutputCounts;
        this.device = data.device;
        this.descriptions = data.descriptions;
        this.userCanLoadConnectionHistory = this.deviceInstancesService.userHasReadAuthorizationConnectionLog();
        this.userIsDeveloper = this.authorizationService.userIsDeveloper();
    }

    ngOnInit() {
        this.refresh();
    }

    refresh() {
        this.exportDataService.getLastValuesTimescale(this.lastValueElements).subscribe({
            next: (lastValues) => {
                this.lastValueArray = [];
                let counter = 0;
                this.deviceType.services.forEach((_, serviceIndex) => {
                    const subArray: {
                        request: LastValuesRequestElementTimescaleModel;
                        response: TimeValuePairModel;
                        description?: string;
                    }[] = [];
                    lastValues.slice(counter, counter + this.serviceOutputCounts[serviceIndex]).forEach((response, responseIndex) => {
                        subArray.push({
                            request: this.lastValueElements[counter + responseIndex],
                            response,
                            description: this.descriptions[serviceIndex][responseIndex]
                        });
                    });
                    this.lastValueArray.push(subArray);
                    counter += this.serviceOutputCounts[serviceIndex];
                });
            },
            error: (_) => {
                this.errorOccured = true;
                this.errorMessage = 'Could not retrieve device data';
            }
        });
        this.exportDataService.getTimescaleDataAvailability(this.device.id).subscribe(availability => {
            this.availability = availability;
        });
        if (this.userCanLoadConnectionHistory) {
            this.deviceInstancesService.getDeviceHistoryV2({ id: this.device.id, range: '168h' }).subscribe(history => {
                this.connectionHistory = [[[]]];
                if (history?.prev_state) {
                    this.connectionHistory[0][0].push([history.prev_state.time, history.prev_state.connected]);
                }
                if (history?.states) {
                    this.connectionHistory[0][0].push(...(history.states.map(s => [s.time, s.connected])));
                }
                if (this.connectionHistory[0][0].length > 0) {
                    // continue last state to current
                    this.connectionHistory[0][0].push([new Date().toISOString(), this.connectionHistory[0][0][this.connectionHistory[0][0].length - 1][1]]);
                } 
                this.connectionHistory[0][0] = detectAndMergeFlapping(this.connectionHistory[0][0], 3, 300);
                this.connectionHistory[0][0].reverse();
            });
        }
    }

    close(): void {
        this.dialogRef.close();
    }

    async getDownloadUrl(i: number): Promise<string> {
        const fromIso = this.timeControl.get('from')?.value.toISOString();
        const toIso = new Date((this.timeControl.get('to')?.value as Date).valueOf() + 86400000).toISOString();
        const columns: QueriesRequestColumnModel[] = [];
        this.lastValueArray[i].forEach(c => columns.push({ name: c.request.columnName, groupType: this.availabilityControl.value?.groupType }));

        const token = await this.authorizationService.getToken();
        const f = await fetch(environment.timescaleAPIURL + '/prepare-download?query=' + JSON.stringify({
            serviceId: this.services[i].id,
            deviceId: this.device.id,
            columns,
            time: {
                start: fromIso,
                end: toIso,
            },
            groupTime: this.availabilityControl.value?.groupTime,
        }), { headers: { Authorization: token } });
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
        } catch (_) {
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

    getMin(i: number, groupType?: string, groupTime?: string): Date | undefined {
        return this.availability.find(a => a.serviceId === this.services[i].id && a.groupType === groupType && a.groupTime === groupTime)?.from;
    }

    getMax(i: number, groupType?: string, groupTime?: string): Date | undefined {
        return this.availability.find(a => a.serviceId === this.services[i].id && a.groupType === groupType && a.groupTime === groupTime)?.to;
    }

    filterAvailability(i: number) {
        return this.availability.filter(a => a.serviceId === this.services[i].id);
    }

    formatAvailability(a: {
        serviceId: string;
        from?: Date;
        to?: Date;
        groupType?: string;
        groupTime?: string;
    }): string {
        if (a.groupType === undefined) {
            return 'Raw Data';
        }
        return a.groupType + ' (' + a.groupTime + ')';
    }

    valueAvailability(a: {
        serviceId: string;
        from?: Date;
        to?: Date;
        groupType?: string;
        groupTime?: string;
    }) {
        return {
            groupType: a.groupType,
            groupTime: a.groupTime
        };
    }

    compareAvailabilityValue(a: {
        groupType?: string;
        groupTime?: string;
    }, b: {
        groupType?: string;
        groupTime?: string;
    }): boolean {
        return a.groupTime === b.groupTime && a.groupType === b.groupType;
    }

    getShortId(id: string): string {
        return this.deviceInstancesService.convertToShortId(id);
    }

    get connectionHistoryPanelWidth(): number {
        if (this.connectionHistoryPanel === undefined) {
            return 400;
        }
        return this.connectionHistoryPanel._body.nativeElement.offsetWidth;
    }

    copyToClipboard(id: number, text: string) {
        navigator.clipboard.writeText(text);
        this.clipboardTooltipTimeout[id] = setTimeout(() => this.clipboardTooltipTimeout[id] = undefined, 2000);
    }
}
