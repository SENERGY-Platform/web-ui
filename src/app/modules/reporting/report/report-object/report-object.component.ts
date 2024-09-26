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

import {Component, Input, OnInit, SimpleChanges} from '@angular/core';
import {ReportObjectModel} from '../../shared/reporting.model';
import {QueriesRequestTimeModel} from '../../../../widgets/shared/export-data.model';
import {DeviceTypeService} from '../../../metadata/device-types-overview/shared/device-type.service';
import {DeviceInstancesModel} from '../../../devices/device-instances/shared/device-instances.model';
import {
    DeviceTypeContentModel,
    DeviceTypeContentVariableModel,
    DeviceTypeModel,
    DeviceTypeServiceModel
} from '../../../metadata/device-types-overview/shared/device-type.model';
import {ExportDataService} from '../../../../widgets/shared/export-data.service';
import {MatDialog} from '@angular/material/dialog';
import {QueryPreviewDialogComponent} from './query-preview/query-preview-dialog.component';
import { map, Observable, of } from 'rxjs';

@Component({
    selector: 'senergy-reporting-object',
    templateUrl: './report-object.component.html',
    styleUrls: ['./report-object.component.css'],
})
export class ReportObjectComponent implements OnInit{

    @Input() name = '';
    @Input() data: ReportObjectModel | undefined;
    @Input() requestObject: Map<string, any> = new Map<string, any>();
    inputType = 'value';
    origData: ReportObjectModel = {} as ReportObjectModel;
    @Input() allDevices: DeviceInstancesModel[] = [];
    devices: DeviceInstancesModel[][][] = [[[]]];
    queryDevice: DeviceInstancesModel = {} as DeviceInstancesModel;
    queryService: DeviceTypeServiceModel = {} as DeviceTypeServiceModel;
    queryServicePaths: string[] = [];
    queryDeviceType: DeviceTypeModel = {} as DeviceTypeModel;
    queryPreview = '';
    fieldGroupTypes = ['mean', 'sum', 'count', 'median', 'min', 'max', 'first', 'last', 'difference-first', 'difference-last', 'difference-min', 'difference-max', 'difference-count', 'difference-mean', 'difference-sum', 'difference-median', 'time-weighted-mean-linear', 'time-weighted-mean-locf'];
    groupingTime = {number: '12', unit: 'months'};
    timeUnits = ['ms', 's','months','m','h','d','w','y'];
    timeframe = {number: '1', unit: 'months'};

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
                            })  
                        });
                    }
                })
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
            }
        }
    }

    queryDeviceChanged(device: DeviceInstancesModel): Observable<DeviceTypeModel | null>  {
        if (this.data !== undefined && this.data.query !== undefined) {
            this.data.query.deviceId = device.id;
            return this.deviceTypeService.getDeviceType(device.device_type.id).pipe(map((resp: DeviceTypeModel | null) => {
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
            this.exportDataService.queryTimescaleV2([this.data.query]).subscribe((resp) => {
                if (resp !== undefined) {
                    const response: any = [];
                    resp[0].data[0].forEach(value => {
                        response.push(value[1]);
                    });
                    this.queryPreview = JSON.stringify(response, undefined, 4).replace(/ /g, ' ').replace(/\n/g, '<br/>');
                    this.dialog.open(QueryPreviewDialogComponent, {
                        data: {dataString: this.queryPreview, dataCount: response.length},
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
            this.data.query.groupTime = this.groupingTime.number + this.groupingTime.unit;
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
            this.data.query.time.last = this.timeframe.number + this.timeframe.unit;
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

}
