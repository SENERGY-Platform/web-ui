/*
 * Copyright 2024 InfAI (CC SES)
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

import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {ReportObjectModel, ReportObjectModelQueryOptions} from '../../shared/reporting.model';
import {QueriesRequestTimeModel} from '../../../../widgets/shared/export-data.model';
import {DeviceTypeService} from '../../../metadata/device-types-overview/shared/device-type.service';
import {DeviceInstanceModel} from '../../../devices/device-instances/shared/device-instances.model';
import {
    DeviceTypeContentModel,
    DeviceTypeContentVariableModel,
    DeviceTypeModel,
    DeviceTypeServiceModel
} from '../../../metadata/device-types-overview/shared/device-type.model';
import {ExportDataService} from '../../../../widgets/shared/export-data.service';
import {MatDialog} from '@angular/material/dialog';
import {QueryPreviewDialogComponent} from './query-preview/query-preview-dialog.component';
import {map, Observable, of} from 'rxjs';

class TimeUnit {
    constructor(unit: string, desc: string) {
        this.unit = unit;
        this.desc = desc;
    }

    unit: string;
    desc: string;
}

@Component({
    selector: 'senergy-reporting-object',
    templateUrl: './report-object.component.html',
    styleUrls: ['./report-object.component.css'],
})


export class ReportObjectComponent implements OnInit, OnChanges {

    @Input() name = '';
    @Input() data: ReportObjectModel | undefined;
    @Input() requestObject: Map<string, any> = new Map<string, any>();
    inputType = 'value';
    origData: ReportObjectModel = {} as ReportObjectModel;
    @Input() allDevices: DeviceInstanceModel[] = [];
    devices: DeviceInstanceModel[][][] = [[[]]];
    queryDevice: DeviceInstanceModel = {} as DeviceInstanceModel;
    queryService: DeviceTypeServiceModel = {} as DeviceTypeServiceModel;
    queryServicePaths: string[] = [];
    queryDeviceType: DeviceTypeModel = {} as DeviceTypeModel;
    fieldGroupTypes = ['mean', 'sum', 'count', 'median', 'min', 'max', 'first', 'last', 'difference-first', 'difference-last', 'difference-min', 'difference-max', 'difference-count', 'difference-mean', 'difference-sum', 'difference-median', 'time-weighted-mean-linear', 'time-weighted-mean-locf'];
    sortTypes = ['asc', 'desc'];
    groupingTime = {number: '', unit: ''};
    timeUnits = [
        new TimeUnit('ms', 'Milliseconds'),
        new TimeUnit('s', 'Seconds'),
        new TimeUnit('m', 'Minutes'),
        new TimeUnit('h', 'Hours'),
        new TimeUnit('d', 'Days'),
        new TimeUnit('w', 'Weeks'),
        new TimeUnit('months', 'Months'),
        new TimeUnit('y', 'Years'),
    ];
    resultObjectTypes=['','key','array'];
    timeframe = {number: '', unit: ''};

    constructor(
        private deviceTypeService: DeviceTypeService,
        private exportDataService: ExportDataService,
        private dialog: MatDialog) {
    }

    ngOnInit() {
        if (this.data?.query !== undefined) {
            this.inputType = 'query';
            this.getGroupingTime();
            this.getTimeframe();
            if (this.data?.queryOptions === undefined) {
                this.data.queryOptions = {} as ReportObjectModelQueryOptions;
            }
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['allDevices']) {
            if (this.data?.query?.deviceId !== undefined) {
                this.allDevices.forEach(device => {
                    if (device.id === this.data?.query?.deviceId) {
                        this.queryDevice = device;
                        this.queryDeviceChanged(device).subscribe(() => {
                            this.queryDeviceType.services.forEach(service => {
                                if (service.id === this.data?.query?.serviceId) {
                                    this.queryService = service;
                                    this.queryServiceChanged(service);
                                }
                            });
                        });
                    }
                });
            }
        }
    }

    changeInputType() {
        if (this.data !== undefined) {
            if (this.inputType === 'query') {
                if (this.data?.value !== undefined) {
                    this.origData.value = this.data.value;
                }
                if (this.data?.children !== undefined) {
                    this.origData.children = this.data.children;
                }
                if (this.data?.fields !== undefined) {
                    this.origData.fields = this.data.fields;
                }
                if (this.data?.length !== undefined) {
                    this.origData.length = this.data.length;
                }
                delete this.data?.value;
                delete this.data?.children;
                delete this.data?.fields;
                delete this.data?.length;
                this.data.query = {
                    columns: [{name: 'energy.value', groupType: 'difference-last'}],
                    time: {last: '12months'} as QueriesRequestTimeModel,
                    groupTime: '1months',
                    deviceId: '',
                    serviceId: ''
                };
                this.data.queryOptions = {} as ReportObjectModelQueryOptions;
                this.getGroupingTime();
                this.getTimeframe();
            } else {
                if (this.origData.value !== undefined) {
                    this.data.value = this.origData.value;
                }
                if (this.origData.children !== undefined) {
                    this.data.children = this.origData.children;
                }
                if (this.origData.fields !== undefined) {
                    this.data.fields = this.origData.fields;
                }
                if (this.origData.length !== undefined) {
                    this.data.length = this.origData.length;
                }
                delete this.data.query;
                delete this.data.queryOptions;
            }
        }
    }

    queryDeviceChanged(device: DeviceInstanceModel): Observable<DeviceTypeModel | null> {
        if (this.data !== undefined && this.data.query !== undefined) {
            this.data.query.deviceId = device.id;
            return this.deviceTypeService.getDeviceType(device.device_type_id).pipe(map((resp: DeviceTypeModel | null) => {
                if (resp !== null) {
                    this.queryDeviceType = resp;
                }
                return this.queryDeviceType;
            }));
        }
        return of(null);
    }

    queryServiceChanged(service: DeviceTypeServiceModel) {
        if (this.data !== undefined && this.data.query !== undefined) {
            this.data.query.serviceId = service.id;
            const pathString = '';
            this.queryServicePaths = [];
            service.outputs.forEach((out: DeviceTypeContentModel) => {
                this.traverseDataStructure(pathString, out.content_variable, false);
            });
        }
    }

    previewQuery() {
        if (this.data !== undefined && this.data.query !== undefined) {
            const query = this.data.query;
            const now = new Date(Date.now());
            const month = now.getMonth();
            const year = now.getFullYear();
            switch (this.data.queryOptions?.rollingStartDate) {
            case 'month':
                if (query.time?.start !== undefined) {
                    let startDate = new Date(query.time?.start);
                    startDate = new Date(startDate.setMonth(month));
                    query.time.start = startDate.toISOString();
                }
                break;
            case 'year':
                if (query.time?.start !== undefined) {
                    let startDate = new Date(query.time?.start);
                    startDate = new Date(startDate.setFullYear(year));
                    query.time.start = startDate.toISOString();
                }
                break;
            }
            switch (this.data.queryOptions?.rollingEndDate) {
            case 'month':
                if (query.time?.end !== undefined) {
                    let endDate = new Date(query.time?.end);
                    endDate = new Date(endDate.setMonth(month));
                    query.time.end = endDate.toISOString();
                }
                break;
            case 'year':
                if (query.time?.end !== undefined) {
                    let endDate = new Date(query.time?.end);
                    endDate = new Date(endDate.setFullYear(year));
                    query.time.end = endDate.toISOString();
                }
                break;
            }
            this.exportDataService.queryTimescaleV2([query]).subscribe((resp) => {
                if (resp !== undefined) {
                    const response: any = {};
                    // eslint-disable-next-line guard-for-in
                    for (const key in resp[0].data[0]) {
                        const value = resp[0].data[0][key];
                        // eslint-disable-next-line guard-for-in
                        for (const keyInner in value) {
                            if (key === '0') {
                                response['Key ' + keyInner] = [];
                            }
                            response['Key ' + keyInner].push(value[keyInner]);
                        }
                    }
                    this.dialog.open(QueryPreviewDialogComponent, {
                        data: {jsonData: response, dataCount: response['Key ' + 0].length},
                    });
                }
            });
        }
    }

    private traverseDataStructure(pathString: string, field: DeviceTypeContentVariableModel, isLocal: boolean) {
        if (field.type === 'https://schema.org/StructuredValue' && field.type !== undefined && field.type !== null) {
            if (pathString !== '') {
                pathString += '.' + field.name;
            } else {
                if (field.name !== undefined) {
                    pathString = field.name;
                }
            }
            if (field.sub_content_variables !== undefined) {
                field.sub_content_variables.forEach((innerField: DeviceTypeContentVariableModel) => {
                    this.traverseDataStructure(pathString, innerField, isLocal);
                });
            }
        } else {
            let out = pathString + '.' + field.name;
            if (isLocal) {
                out = (pathString + '.' + field.name).split(/\.(.+)/)[1];
            }
            this.queryServicePaths.push(out);
        }
    }

    setGroupingTime() {
        if (this.data?.query !== undefined) {
            if (this.groupingTime.number === '') {
                delete this.data.query.groupTime;
                this.getGroupingTime();
            } else {
                this.data.query.groupTime = this.groupingTime.number + this.groupingTime.unit;
            }
        }
    }

    getGroupingTime() {
        let splitString;
        if (this.data?.query?.groupTime !== undefined) {
            splitString = this.data.query.groupTime.split(/(\d+)/);
            this.groupingTime.number = splitString[1];
            this.groupingTime.unit = splitString[2];
        }
    }

    setTimeframe() {
        if (this.data?.query?.time !== undefined) {
            if(this.timeframe.number === ''){
                delete this.data.query.time.last;
                this.getTimeframe();
            } else {
                this.data.query.time.last = this.timeframe.number + this.timeframe.unit;
            }
        }
    }

    getTimeframe() {
        let splitString;
        if (this.data?.query?.time?.last !== undefined) {
            splitString = this.data?.query?.time?.last.split(/(\d+)/);
            this.timeframe.number = splitString[1];
            this.timeframe.unit = splitString[2];
        }
    }

    getDeviceName(device: DeviceInstanceModel) {
        return device.display_name || device.name;
    }

    setStartOffset(){
        if (this.data?.query?.time?.start !== undefined) {
            const date = new Date(this.data?.query?.time?.start);
            if (this.data?.queryOptions !== undefined) {
                this.data.queryOptions.startOffset = date.getTimezoneOffset();
            }
        }
    }

    setEndOffset(){
        if (this.data?.query?.time?.end !== undefined) {
            const date = new Date(this.data?.query?.time?.end);
            if (this.data?.queryOptions !== undefined) {
                this.data.queryOptions.endOffset = date.getTimezoneOffset();
            }
        }
    }
}
