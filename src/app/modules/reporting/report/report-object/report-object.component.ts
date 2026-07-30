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

import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { DeviceQueryModel, ReportObjectModel, ReportObjectModelQueryOptions } from '../../shared/reporting.model';
import {
    QueriesRequestTimeModel,
    QueriesRequestV2ElementTimescaleModel
} from '../../../../widgets/shared/export-data.model';
import { DeviceTypeService } from '../../../metadata/device-types-overview/shared/device-type.service';
import { DeviceInstanceModel } from '../../../devices/device-instances/shared/device-instances.model';
import {
    DeviceTypeContentModel,
    DeviceTypeContentVariableModel,
    DeviceTypeModel,
    DeviceTypeServiceModel
} from '../../../metadata/device-types-overview/shared/device-type.model';
import { ExportDataService } from '../../../../widgets/shared/export-data.service';
import { MatDialog } from '@angular/material/dialog';
import { QueryPreviewDialogComponent } from './query-preview/query-preview-dialog.component';
import { Subject, map, Observable, of, takeUntil } from 'rxjs';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { AddTagFn } from '@ng-matero/extensions/select';

interface TimeUnit {
    unit: string;
    desc: string;
}

@Component({
    selector: 'senergy-reporting-object',
    templateUrl: './report-object.component.html',
    styleUrls: ['./report-object.component.css'],
})
export class ReportObjectComponent implements OnInit, OnChanges, OnDestroy {

    @Input() name = '';
    @Input() dynamic = false;
    @Input() data: ReportObjectModel | undefined;
    @Input() allDevices: DeviceInstanceModel[] = [];
    @Output() removeItemEmitter: EventEmitter<string> = new EventEmitter();
    @Output() copyItemEmitter: EventEmitter<string> = new EventEmitter();

    inputType = 'value';
    origData: ReportObjectModel = {} as ReportObjectModel;
    queryDevice: DeviceInstanceModel = {} as DeviceInstanceModel;
    queryService: DeviceTypeServiceModel = {} as DeviceTypeServiceModel;
    queryServicePaths: string[] = [];
    queryDeviceType: DeviceTypeModel = { services: [] } as unknown as DeviceTypeModel;
    fieldGroupTypes = [null, 'mean', 'sum', 'count', 'median', 'min', 'max', 'first', 'last', 'difference-first', 'difference-last', 'difference-min', 'difference-max', 'difference-count', 'difference-mean', 'difference-sum', 'difference-median', 'time-weighted-mean-linear', 'time-weighted-mean-locf'];
    sortTypes = ['asc', 'desc'];
    groupingTime = { number: '', unit: '' };
    timeUnits: TimeUnit[] = [
        { unit: 'ms', desc: 'Milliseconds' },
        { unit: 's', desc: 'Seconds' },
        { unit: 'm', desc: 'Minutes' },
        { unit: 'h', desc: 'Hours' },
        { unit: 'd', desc: 'Days' },
        { unit: 'w', desc: 'Weeks' },
        { unit: 'months', desc: 'Months' },
        { unit: 'y', desc: 'Years' },
    ];
    resultObjectTypes = ['', 'key', 'array'];
    timeframe = { number: '', unit: '' };
    deviceQueryLastValues = ['2d', '7d', '30d'];
    previewRunning = false;

    private destroy = new Subject<void>();
    private queryRestored = false;

    constructor(
        private deviceTypeService: DeviceTypeService,
        private exportDataService: ExportDataService,
        private errorService: ErrorHandlerService,
        private dialog: MatDialog) {
    }

    ngOnInit() {
        if (this.data?.query !== undefined) {
            this.inputType = 'query';
            this.ensureQueryDefaults();
            this.getGroupingTime();
            this.getTimeframe();
        }
        if (this.data?.deviceQuery !== undefined) {
            this.inputType = 'devices';
            this.addKnownDeviceQueryLastValue(this.data.deviceQuery.last);
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['allDevices'] === undefined || this.queryRestored) {
            return;
        }
        const deviceId = this.data?.query?.deviceId;
        if (deviceId === undefined || deviceId === '') {
            return;
        }
        const device = this.allDevices.find((d: DeviceInstanceModel) => d.id === deviceId);
        if (device === undefined) {
            return;
        }
        this.queryRestored = true;
        this.queryDevice = device;
        this.queryDeviceChanged(device, false).pipe(takeUntil(this.destroy)).subscribe((deviceType: DeviceTypeModel | null) => {
            const service = deviceType?.services?.find((s: DeviceTypeServiceModel) => s.id === this.data?.query?.serviceId);
            if (service !== undefined) {
                this.queryService = service;
                this.queryServiceChanged(service, false);
            }
        });
    }

    ngOnDestroy() {
        this.destroy.next();
        this.destroy.complete();
    }

    changeInputType() {
        if (this.data === undefined) {
            return;
        }
        switch (this.inputType) {
        case 'query':
            this.resetValueFields();
            if (this.data.deviceQuery !== undefined) {
                this.origData.deviceQuery = this.data.deviceQuery;
            }
            delete this.data.deviceQuery;
            this.data.query = this.origData.query !== undefined ? this.origData.query : {
                columns: [{ name: '', groupType: undefined }],
                time: { last: undefined } as QueriesRequestTimeModel,
                groupTime: undefined,
                deviceId: '',
                serviceId: ''
            };
            this.data.queryOptions = this.origData.queryOptions !== undefined
                ? this.origData.queryOptions
                : {} as ReportObjectModelQueryOptions;
            this.ensureQueryDefaults();
            this.getGroupingTime();
            this.getTimeframe();
            break;
        case 'devices':
            this.resetValueFields();
            this.resetQueryFields();
            if (this.origData.deviceQuery !== undefined) {
                this.data.deviceQuery = this.origData.deviceQuery;
            } else {
                this.data.deviceQuery = {} as DeviceQueryModel;
            }
            break;
        case 'value':
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
            if (this.data.deviceQuery !== undefined) {
                this.origData.deviceQuery = this.data.deviceQuery;
            }
            delete this.data.deviceQuery;
            this.resetQueryFields();
        }
    }

    onQueryDeviceChanged(device: DeviceInstanceModel) {
        this.queryDeviceChanged(device).pipe(takeUntil(this.destroy)).subscribe();
    }

    trackByKey(_: number, item: { key: string }) {
        return item.key;
    }

    queryDeviceChanged(device: DeviceInstanceModel, resetService = true): Observable<DeviceTypeModel | null> {
        if (this.data?.query === undefined) {
            return of(null);
        }
        this.data.query.deviceId = device.id;
        if (resetService) {
            this.queryService = {} as DeviceTypeServiceModel;
            this.queryServicePaths = [];
            this.data.query.serviceId = '';
            this.setColumnName(undefined);
        }
        return this.deviceTypeService.getDeviceType(device.device_type_id).pipe(map((resp: DeviceTypeModel | null) => {
            this.queryDeviceType = resp !== null ? resp : { services: [] } as unknown as DeviceTypeModel;
            return this.queryDeviceType;
        }));
    }

    /**
     * Collects the selectable paths of the given service. The currently selected path is only kept if the new service
     * provides it as well.
     */
    queryServiceChanged(service: DeviceTypeServiceModel, resetUnknownPath = true) {
        if (this.data?.query === undefined) {
            return;
        }
        this.data.query.serviceId = service.id;
        this.queryServicePaths = [];
        (service.outputs || []).forEach((out: DeviceTypeContentModel) => {
            this.traverseDataStructure('', out.content_variable, false);
        });
        const path = this.getColumnName();
        if (resetUnknownPath && path !== undefined && path !== '' && this.queryServicePaths.indexOf(path) === -1) {
            this.setColumnName(undefined);
        }
    }

    previewQuery() {
        if (this.data?.query === undefined) {
            return;
        }
        this.previewRunning = true;
        this.exportDataService.queryTimescaleV2([this.buildPreviewQuery(this.data.query)]).subscribe({
            next: (resp) => {
                this.previewRunning = false;
                const rows = resp?.[0]?.data?.[0];
                if (!Array.isArray(rows) || rows.length === 0) {
                    this.errorService.showErrorInSnackBar('Preview: query returned no data');
                    return;
                }
                this.dialog.open(QueryPreviewDialogComponent, {
                    data: { jsonData: this.groupRowsByColumn(rows), dataCount: rows.length },
                });
            },
            error: (error) => {
                this.previewRunning = false;
                this.errorService.showErrorInSnackBar('Preview Error: ' + (error?.error || error?.message || 'unknown'));
            }
        });
    }

    setGroupingTime() {
        if (this.data?.query === undefined) {
            return;
        }
        if (this.groupingTime.number === '') {
            delete this.data.query.groupTime;
            this.getGroupingTime();
        } else {
            this.data.query.groupTime = this.groupingTime.number + this.groupingTime.unit;
        }
    }

    getGroupingTime() {
        this.groupingTime = this.splitTimeString(this.data?.query?.groupTime);
    }

    setTimeframe() {
        if (this.data?.query?.time === undefined) {
            return;
        }
        if (this.timeframe.number === '') {
            delete this.data.query.time.last;
            this.getTimeframe();
        } else {
            this.data.query.time.last = this.timeframe.number + this.timeframe.unit;
        }
    }

    getTimeframe() {
        this.timeframe = this.splitTimeString(this.data?.query?.time?.last);
    }

    getDeviceName(device: DeviceInstanceModel) {
        return device.display_name || device.name;
    }

    setStartOffset() {
        if (this.data?.query?.time?.start === undefined || this.data.queryOptions === undefined) {
            return;
        }
        this.data.queryOptions.startOffset = new Date(this.data.query.time.start).getTimezoneOffset();
    }

    setEndOffset() {
        if (this.data?.query?.time?.end === undefined || this.data.queryOptions === undefined) {
            return;
        }
        this.data.queryOptions.endOffset = new Date(this.data.query.time.end).getTimezoneOffset();
    }

    emitRemoveItem($event: Event) {
        $event.stopPropagation();
        this.removeItemEmitter.emit(this.name);
    }

    emitCopyItem($event: Event) {
        $event.stopPropagation();
        this.copyItemEmitter.emit(this.name);
    }

    removeItem(evt: string) {
        if (this.data?.children === undefined) {
            return;
        }
        delete this.data.children[evt];
        this.data.length = Object.keys(this.data.children).length;
    }

    addItem(evt: string) {
        if (this.data?.children === undefined || this.data.children[evt] === undefined) {
            return;
        }
        const keys = Object.keys(this.data.children).map(Number).filter((key: number) => !isNaN(key));
        const nextKey = keys.length === 0 ? 0 : Math.max(...keys) + 1;
        this.data.children[nextKey.toString()] = JSON.parse(JSON.stringify(this.data.children[evt]));
        this.data.length = Object.keys(this.data.children).length;
    }

    addDeviceQueryLastValue(): AddTagFn {
        return (text: string) => {
            this.addKnownDeviceQueryLastValue(text);
            return text;
        };
    }

    private addKnownDeviceQueryLastValue(value: string | undefined) {
        if (value === undefined || value === '' || this.deviceQueryLastValues.indexOf(value) !== -1) {
            return;
        }
        this.deviceQueryLastValues = this.deviceQueryLastValues.concat(value);
    }

    /**
     * Returns a copy of the query with the configured rolling start and end date applied, so that a preview never
     * modifies the stored report configuration.
     */
    private buildPreviewQuery(query: QueriesRequestV2ElementTimescaleModel): QueriesRequestV2ElementTimescaleModel {
        const preview: QueriesRequestV2ElementTimescaleModel = JSON.parse(JSON.stringify(query));
        const now = new Date();
        if (preview.time?.start !== undefined) {
            preview.time.start = this.applyRollingDate(preview.time.start, this.data?.queryOptions?.rollingStartDate, now);
        }
        if (preview.time?.end !== undefined) {
            preview.time.end = this.applyRollingDate(preview.time.end, this.data?.queryOptions?.rollingEndDate, now);
        }
        return preview;
    }

    private applyRollingDate(value: string, rolling: string | undefined, now: Date): string {
        const date = new Date(value);
        switch (rolling) {
        case 'month':
            date.setMonth(now.getMonth());
            break;
        case 'year':
            date.setFullYear(now.getFullYear());
            break;
        default:
            return value;
        }
        return date.toISOString();
    }

    private groupRowsByColumn(rows: any[]): { [key: string]: any[] } {
        const columns: { [key: string]: any[] } = {};
        rows.forEach((row: any) => {
            (row || []).forEach((cell: any, index: number) => {
                const key = 'Key ' + index;
                if (columns[key] === undefined) {
                    columns[key] = [];
                }
                columns[key].push(cell);
            });
        });
        return columns;
    }

    private splitTimeString(value: string | undefined): { number: string; unit: string } {
        const match = /^(\d+)(.*)$/.exec(value || '');
        if (match === null) {
            return { number: '', unit: '' };
        }
        return { number: match[1], unit: match[2] };
    }

    /**
     * Makes sure that the query of a report object can be edited without null checks in the template.
     */
    private ensureQueryDefaults() {
        if (this.data?.query === undefined) {
            return;
        }
        if (this.data.query.columns === undefined || this.data.query.columns.length === 0) {
            this.data.query.columns = [{ name: '', groupType: undefined }];
        }
        if (this.data.query.time === undefined) {
            this.data.query.time = { last: undefined } as QueriesRequestTimeModel;
        }
        if (this.data.queryOptions === undefined) {
            this.data.queryOptions = {} as ReportObjectModelQueryOptions;
        }
    }

    private getColumnName(): string | undefined {
        return this.data?.query?.columns?.[0]?.name;
    }

    private setColumnName(name: string | undefined) {
        const column = this.data?.query?.columns?.[0];
        if (column !== undefined) {
            column.name = name;
        }
    }

    private resetQueryFields() {
        if (this.data?.query !== undefined) {
            this.origData.query = this.data.query;
        }
        if (this.data?.queryOptions !== undefined) {
            this.origData.queryOptions = this.data.queryOptions;
        }
        delete this.data?.query;
        delete this.data?.queryOptions;
    }

    private resetValueFields() {
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
    }

    private traverseDataStructure(pathString: string, field: DeviceTypeContentVariableModel, isLocal: boolean) {
        if (field.type === 'https://schema.org/StructuredValue') {
            if (pathString !== '') {
                pathString += '.' + field.name;
            } else if (field.name !== undefined) {
                pathString = field.name;
            }
            (field.sub_content_variables || []).forEach((innerField: DeviceTypeContentVariableModel) => {
                this.traverseDataStructure(pathString, innerField, isLocal);
            });
        } else {
            let out = pathString + '.' + field.name;
            if (isLocal) {
                out = (pathString + '.' + field.name).split(/\.(.+)/)[1];
            }
            this.queryServicePaths.push(out);
        }
    }
}
