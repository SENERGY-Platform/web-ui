/*
 * Copyright 2026 InfAI (CC SES)
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

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject, map, of, switchMap, takeUntil } from 'rxjs';
import { DeviceInstanceModel } from '../../../../devices/device-instances/shared/device-instances.model';
import {
    DeviceTypeContentModel,
    DeviceTypeContentVariableModel,
    DeviceTypeModel,
    DeviceTypeServiceModel
} from '../../../../metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from '../../../../metadata/device-types-overview/shared/device-type.service';
import { ErrorHandlerService } from '../../../../../core/services/error-handler.service';
import { ExportDataService } from '../../../../../widgets/shared/export-data.service';
import { QueriesRequestV2ElementTimescaleModel } from '../../../../../widgets/shared/export-data.model';
import { DynamicFormGroup, queryFromForm } from '../../../shared/report-object-form';
import { QueryPreviewData, QueryPreviewDialogComponent } from '../query-preview/query-preview-dialog.component';

interface TimeUnit {
    unit: string;
    desc: string;
}

const EMPTY_DEVICE_TYPE = { services: [] } as unknown as DeviceTypeModel;

/** Fields that are only needed for special cases and are therefore collapsed by default. */
const ADVANCED_FIELDS = [
    'orderColumnIndex', 'orderDirection', 'resultObject', 'resultKey', 'groupingTimeNumber', 'groupingTimeUnit'
];

@Component({
    selector: 'senergy-reporting-query-editor',
    templateUrl: './query-editor.component.html',
    styleUrls: ['./query-editor.component.css'],
})
export class QueryEditorComponent implements OnInit, OnDestroy {

    @Input() form!: DynamicFormGroup;
    @Input() allDevices: DeviceInstanceModel[] = [];

    deviceType: DeviceTypeModel = EMPTY_DEVICE_TYPE;
    servicePaths: string[] = [];
    previewRunning = false;
    showAdvanced = false;

    fieldGroupTypes = [null, 'mean', 'sum', 'count', 'median', 'min', 'max', 'first', 'last', 'difference-first', 'difference-last', 'difference-min', 'difference-max', 'difference-count', 'difference-mean', 'difference-sum', 'difference-median', 'time-weighted-mean-linear', 'time-weighted-mean-locf'];
    sortTypes = ['asc', 'desc'];
    resultObjectTypes = ['', 'key', 'array'];
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

    private destroy = new Subject<void>();

    constructor(
        private deviceTypeService: DeviceTypeService,
        private exportDataService: ExportDataService,
        private errorService: ErrorHandlerService,
        private dialog: MatDialog) {
    }

    ngOnInit() {
        this.control('device').valueChanges.pipe(
            takeUntil(this.destroy),
            switchMap((deviceId: string | null) => {
                this.deviceType = EMPTY_DEVICE_TYPE;
                this.control('service').setValue(null);
                return this.loadDeviceType(deviceId);
            })
        ).subscribe(() => this.updateServicePaths(true));

        this.control('service').valueChanges.pipe(takeUntil(this.destroy))
            .subscribe(() => this.updateServicePaths(true));

        this.loadDeviceType(this.control('device').value)
            .pipe(takeUntil(this.destroy))
            .subscribe(() => this.updateServicePaths(false));

    }

    ngOnDestroy() {
        this.destroy.next();
        this.destroy.complete();
    }

    control(name: string): AbstractControl {
        return this.form.controls[name];
    }

    /**
     * Number of advanced fields that are in use. Shown next to the toggle, so that the collapsed fields never hide a
     * configured value silently.
     */
    get advancedCount(): number {
        return ADVANCED_FIELDS.filter((name: string) => {
            const value = this.form.controls[name]?.value;
            return value !== null && value !== undefined && value !== '';
        }).length;
    }

    /**
     * Runs the query with the configured rolling dates applied. The values are read from the form, so a preview never
     * changes the stored report.
     */
    previewQuery() {
        this.previewRunning = true;
        this.exportDataService.queryTimescaleV2([this.buildPreviewQuery()]).subscribe({
            next: (resp) => {
                this.previewRunning = false;
                const rows = resp?.[0]?.data?.[0];
                if (!Array.isArray(rows) || rows.length === 0) {
                    this.errorService.showErrorInSnackBar('Preview: query returned no data');
                    return;
                }
                this.dialog.open(QueryPreviewDialogComponent, {
                    width: '900px',
                    maxWidth: '95vw',
                    data: { rows } as QueryPreviewData,
                });
            },
            error: (error) => {
                this.previewRunning = false;
                this.errorService.showErrorInSnackBar('Preview Error: ' + (error?.error || error?.message || 'unknown'));
            }
        });
    }

    getDeviceName(device: DeviceInstanceModel): string {
        return device.display_name || device.name;
    }

    private buildPreviewQuery(): QueriesRequestV2ElementTimescaleModel {
        const query = queryFromForm(this.form);
        const now = new Date();
        if (query.time?.start !== undefined) {
            query.time.start = applyRollingDate(query.time.start, this.control('rollingStartDate').value, now);
        }
        if (query.time?.end !== undefined) {
            query.time.end = applyRollingDate(query.time.end, this.control('rollingEndDate').value, now);
        }
        return query;
    }

    private loadDeviceType(deviceId: string | null): Observable<DeviceTypeModel> {
        const device = this.allDevices.find((d: DeviceInstanceModel) => d.id === deviceId);
        if (device === undefined) {
            return of(EMPTY_DEVICE_TYPE);
        }
        return this.deviceTypeService.getDeviceType(device.device_type_id).pipe(
            map((resp: DeviceTypeModel | null) => {
                this.deviceType = resp !== null ? resp : EMPTY_DEVICE_TYPE;
                return this.deviceType;
            })
        );
    }

    /**
     * Collects the selectable paths of the selected service. The selected path is only dropped if the service does not
     * provide it, so that reloading a report keeps its path.
     */
    private updateServicePaths(dropUnknownPath: boolean) {
        const serviceId = this.control('service').value;
        const service = (this.deviceType.services || [])
            .find((s: DeviceTypeServiceModel) => s.id === serviceId);
        this.servicePaths = [];
        (service?.outputs || []).forEach((out: DeviceTypeContentModel) => {
            this.servicePaths = this.servicePaths.concat(collectPaths('', out.content_variable));
        });
        const path = this.control('path').value;
        if (dropUnknownPath && path !== null && path !== '' && this.servicePaths.indexOf(path) === -1) {
            this.control('path').setValue(null);
        }
    }
}

function applyRollingDate(value: string, rolling: string | null, now: Date): string {
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

function collectPaths(pathString: string, field: DeviceTypeContentVariableModel): string[] {
    if (field.type !== 'https://schema.org/StructuredValue') {
        return [pathString + '.' + field.name];
    }
    let path = pathString;
    if (path !== '') {
        path += '.' + field.name;
    } else if (field.name !== undefined) {
        path = field.name;
    }
    return (field.sub_content_variables || [])
        .flatMap((innerField: DeviceTypeContentVariableModel) => collectPaths(path, innerField));
}
