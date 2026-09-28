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

import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject, map, of, switchMap, takeUntil } from 'rxjs';
import { DeviceInstanceModel } from '../../../../devices/device-instances/shared/device-instances.model';
import {
    DeviceTypeAspectNodeModel,
    DeviceTypeContentModel,
    DeviceTypeContentVariableModel,
    DeviceTypeDeviceClassModel,
    DeviceTypeFunctionModel,
    DeviceTypeModel,
    DeviceTypeServiceModel
} from '../../../../metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from '../../../../metadata/device-types-overview/shared/device-type.service';
import { DeviceGroupCriteriaModel, DeviceGroupDisplayModel } from '../../../../devices/device-groups/shared/device-groups.model';
import { DeviceGroupsService } from '../../../../devices/device-groups/shared/device-groups.service';
import { FunctionsService } from '../../../../metadata/functions/shared/functions.service';
import { ErrorHandlerService } from '../../../../../core/services/error-handler.service';
import { ExportDataService } from '../../../../../widgets/shared/export-data.service';
import { QueriesRequestV2ElementTimescaleModel } from '../../../../../widgets/shared/export-data.model';
import {
    DynamicFormGroup,
    QuerySource,
    applyQuerySource,
    joinDuration,
    queryFromForm
} from '../../../shared/report-object-form';
import { QueryPreviewData, QueryPreviewDialogComponent } from '../query-preview/query-preview-dialog.component';

interface TimeUnit {
    unit: string;
    desc: string;
}

const EMPTY_DEVICE_TYPE = { services: [] } as unknown as DeviceTypeModel;

/** Fields that are only needed for special cases and are therefore collapsed by default. */
const ADVANCED_FIELDS = [
    'orderColumnIndex', 'orderDirection', 'resultObject', 'resultKey', 'groupingTimeNumber', 'groupingTimeUnit', 'limit'
];

/** DeviceGroupCriteriaModel is gaining this field elsewhere; read defensively until it lands there. */
interface DeviceGroupCriteriaWithAspects extends DeviceGroupCriteriaModel {
    aspect_ids?: string[];
}

/**
 * Keeps only the criteria the timescale-wrapper accepts for a group query: exactly one aspect, as aspect_id. A lone
 * aspect_ids entry is folded into aspect_id, and criteria that end up identical are offered once.
 */
export function foldSingleAspectCriteria(criteria: DeviceGroupCriteriaModel[]): DeviceGroupCriteriaModel[] {
    const folded = (criteria as DeviceGroupCriteriaWithAspects[])
        .filter((c: DeviceGroupCriteriaWithAspects) => (c.aspect_ids?.length ?? 0) <= 1)
        .map((c: DeviceGroupCriteriaWithAspects) => ({
            interaction: c.interaction,
            function_id: c.function_id,
            device_class_id: c.device_class_id,
            aspect_id: c.aspect_id !== '' ? c.aspect_id : (c.aspect_ids?.[0] ?? c.aspect_id),
        }))
        .filter((c: DeviceGroupCriteriaModel) => c.aspect_id !== undefined && c.aspect_id !== '');
    return folded.filter((c: DeviceGroupCriteriaModel, i: number) => folded.findIndex((o: DeviceGroupCriteriaModel) =>
        o.function_id === c.function_id && o.aspect_id === c.aspect_id
        && o.device_class_id === c.device_class_id && o.interaction === c.interaction) === i);
}

/**
 * Combines the rows of every response element of a device group query in aggregate mode into the single series the
 * report will contain: the reporting-service sums or averages the value column (row[1]) across devices, aligned by
 * timestamp (row[0]) when a grouping time is set, or by row position when the query is limited to the latest value
 * (limit 1, no grouping time). A row where every element is nil at that alignment stays null, nil values are
 * otherwise ignored. Rows are returned as [time, value].
 */
export function combineAggregatedRows(
    elementRows: any[][][],
    aggregation: 'sum' | 'mean',
    hasGroupTime: boolean,
    limit: number | null | undefined,
    orderDirection: string | null | undefined
): any[][] {
    return hasGroupTime
        ? combineByTimestamp(elementRows, aggregation, limit, orderDirection)
        : combineByPosition(elementRows, aggregation);
}

function combineByTimestamp(
    elementRows: any[][][],
    aggregation: 'sum' | 'mean',
    limit: number | null | undefined,
    orderDirection: string | null | undefined
): any[][] {
    const timeOf = new Map<string, any>();
    const valuesOf = new Map<string, number[]>();
    elementRows.forEach((rows: any[][]) => rows.forEach((row: any[]) => {
        const key = String(row[0]);
        if (!valuesOf.has(key)) {
            timeOf.set(key, row[0]);
            valuesOf.set(key, []);
        }
        if (row[1] !== null && row[1] !== undefined) {
            valuesOf.get(key)!.push(row[1]);
        }
    }));
    let result = Array.from(timeOf.keys()).map((key: string) => [timeOf.get(key), combine(valuesOf.get(key)!, aggregation)]);
    result.sort((a: any[], b: any[]) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    if (orderDirection === 'desc') {
        result.reverse();
    }
    if (limit !== null && limit !== undefined) {
        result = result.slice(0, limit);
    }
    return result;
}

function combineByPosition(elementRows: any[][][], aggregation: 'sum' | 'mean'): any[][] {
    const rowCount = elementRows.reduce((max: number, rows: any[][]) => Math.max(max, rows.length), 0);
    const result: any[][] = [];
    for (let i = 0; i < rowCount; i++) {
        let time: any;
        const values: number[] = [];
        elementRows.forEach((rows: any[][]) => {
            const row = rows[i];
            if (row === undefined) {
                return;
            }
            if (time === undefined && row[0] !== null && row[0] !== undefined) {
                time = row[0];
            }
            if (row[1] !== null && row[1] !== undefined) {
                values.push(row[1]);
            }
        });
        result.push([time, combine(values, aggregation)]);
    }
    return result;
}

function combine(values: number[], aggregation: 'sum' | 'mean'): number | null {
    if (values.length === 0) {
        return null;
    }
    const sum = values.reduce((a: number, b: number) => a + b, 0);
    return aggregation === 'mean' ? sum / values.length : sum;
}

@Component({
    selector: 'senergy-reporting-query-editor',
    templateUrl: './query-editor.component.html',
    styleUrls: ['./query-editor.component.css'],
})
export class QueryEditorComponent implements OnInit, OnChanges, OnDestroy {

    @Input() form!: DynamicFormGroup;
    @Input() allDevices: DeviceInstanceModel[] = [];
    @Input() allDeviceGroups: DeviceGroupDisplayModel[] = [];
    /** The value type of the report object this query belongs to, e.g. 'array'; controls whether per-device mode is offered. */
    @Input() valueType = '';

    deviceType: DeviceTypeModel = EMPTY_DEVICE_TYPE;
    servicePaths: string[] = [];
    /** Criteria of the selected device group, in the order the group defines them. */
    groupCriteria: DeviceGroupCriteriaModel[] = [];
    previewRunning = false;
    showAdvanced = false;

    fieldGroupTypes = [null, 'mean', 'sum', 'count', 'median', 'min', 'max', 'first', 'last', 'difference-first', 'difference-last', 'difference-min', 'difference-max', 'difference-count', 'difference-mean', 'difference-sum', 'difference-median', 'time-weighted-mean-linear', 'time-weighted-mean-locf'];
    sortTypes = ['asc', 'desc'];
    resultObjectTypes = ['', 'key', 'array'];
    deviceGroupModes: { value: 'aggregate' | 'per_device'; label: string }[] = [
        { value: 'aggregate', label: 'Aggregated' },
        { value: 'per_device', label: 'Per Device' },
    ];
    aggregationTypes: { value: 'sum' | 'mean'; label: string }[] = [
        { value: 'sum', label: 'Sum' },
        { value: 'mean', label: 'Mean' },
    ];
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

    private functions: DeviceTypeFunctionModel[] = [];
    private aspects: DeviceTypeAspectNodeModel[] = [];
    private deviceClasses: DeviceTypeDeviceClassModel[] = [];

    private formChange = new Subject<void>();

    constructor(
        private deviceTypeService: DeviceTypeService,
        private deviceGroupsService: DeviceGroupsService,
        private functionsService: FunctionsService,
        private exportDataService: ExportDataService,
        private errorService: ErrorHandlerService,
        private dialog: MatDialog) {
    }

    ngOnInit() {
        // Reference data for the criteria labels, shared by every device group and therefore loaded only once.
        this.functionsService.getFunctions('', 9999, 0, 'name', 'asc')
            .subscribe((resp) => this.functions = resp.result);
        this.bindForm();
    }

    // Selecting another report object keeps this component and only swaps the form, so it has to be watched anew.
    ngOnChanges(changes: SimpleChanges) {
        if (changes['form'] !== undefined && !changes['form'].firstChange) {
            this.bindForm();
        } else if (changes['allDeviceGroups'] !== undefined && !changes['allDeviceGroups'].firstChange) {
            // the groups load asynchronously, so a restored group may only find its criteria now
            this.updateGroupCriteria(false);
        }
    }

    ngOnDestroy() {
        this.formChange.next();
        this.formChange.complete();
    }

    private bindForm() {
        this.formChange.next();
        this.deviceType = EMPTY_DEVICE_TYPE;
        this.servicePaths = [];
        this.groupCriteria = [];
        // takeUntil comes last so that a device type still loading for the previous form is cancelled too
        this.control('device').valueChanges.pipe(
            switchMap((deviceId: string | null) => {
                this.deviceType = EMPTY_DEVICE_TYPE;
                this.control('service').setValue(null);
                return this.loadDeviceType(deviceId);
            }),
            takeUntil(this.formChange)
        ).subscribe(() => this.updateServicePaths(true));

        this.control('service').valueChanges.pipe(takeUntil(this.formChange))
            .subscribe(() => this.updateServicePaths(true));

        this.loadDeviceType(this.control('device').value)
            .pipe(takeUntil(this.formChange))
            .subscribe(() => this.updateServicePaths(false));

        this.control('source').valueChanges.pipe(takeUntil(this.formChange)).subscribe((source: QuerySource) => {
            applyQuerySource(this.form);
            // Switching the source keeps the form of the type that is no longer shown from holding a stale value.
            if (source === 'group') {
                this.control('device').setValue(null);
                this.control('service').setValue(null);
                this.control('path').setValue(null);
            } else {
                this.control('deviceGroupId').setValue(null);
                this.control('criteria').setValue(null);
            }
        });

        this.control('deviceGroupId').valueChanges.pipe(takeUntil(this.formChange))
            .subscribe(() => this.updateGroupCriteria(true));
        this.updateGroupCriteria(false);

        // The grouping time and limit that resolve this error live in the collapsed advanced section, so it is
        // expanded once the error appears instead of leaving the user to search for it. Never re-collapsed here.
        this.form.statusChanges.pipe(takeUntil(this.formChange)).subscribe(() => this.expandOnAggregateGroupingError());
        this.expandOnAggregateGroupingError();
    }

    private expandOnAggregateGroupingError() {
        if (this.form.errors?.['aggregateGrouping'] !== undefined) {
            this.showAdvanced = true;
        }
    }

    control(name: string): AbstractControl {
        return this.form.controls[name];
    }

    get source(): QuerySource {
        return this.control('source').value;
    }

    /** A group aggregate is ordered by time only, so the sorting index is neither shown nor sent. */
    get orderColumnIndexHidden(): boolean {
        return this.source === 'group' && this.control('deviceGroupMode').value === 'aggregate';
    }

    /**
     * Whether the report object this query belongs to can hold a result per device, which only an array object can.
     */
    get supportsPerDevice(): boolean {
        return this.valueType === 'array';
    }

    compareCriteria(a: DeviceGroupCriteriaModel | null, b: DeviceGroupCriteriaModel | null): boolean {
        return a !== null && b !== null
            && a.function_id === b.function_id
            && a.aspect_id === b.aspect_id
            && a.device_class_id === b.device_class_id
            && a.interaction === b.interaction;
    }

    describeCriteria(criteria: DeviceGroupCriteriaModel): string {
        const func = this.functions.find((f: DeviceTypeFunctionModel) => f.id === criteria.function_id);
        const deviceClass = criteria.device_class_id !== ''
            ? this.deviceClasses.find((d: DeviceTypeDeviceClassModel) => d.id === criteria.device_class_id)?.name
            : undefined;
        const aspect = criteria.aspect_id !== ''
            ? this.aspects.find((a: DeviceTypeAspectNodeModel) => a.id === criteria.aspect_id)?.name
            : undefined;
        return [func?.display_name || func?.name || criteria.function_id, deviceClass, aspect]
            .filter((part: string | undefined) => part !== undefined && part !== '')
            .join(' ');
    }

    /**
     * Collects the criteria of the selected device group and the aspects/device classes their labels need. The
     * selected criteria is only dropped if the new group does not offer it, so that reloading a report keeps it.
     */
    private updateGroupCriteria(dropUnknownCriteria: boolean) {
        const groupId = this.control('deviceGroupId').value;
        const group = this.allDeviceGroups.find((g: DeviceGroupDisplayModel) => g.id === groupId);
        this.groupCriteria = foldSingleAspectCriteria(group?.criteria || []);
        this.loadCriteriaLabels(this.groupCriteria);
        const criteria = this.control('criteria').value;
        const known = criteria !== null
            && this.groupCriteria.some((c: DeviceGroupCriteriaModel) => this.compareCriteria(c, criteria));
        if (dropUnknownCriteria && !known) {
            this.control('criteria').setValue(null);
        }
    }

    private loadCriteriaLabels(criteria: DeviceGroupCriteriaModel[]) {
        const aspectIds = criteria
            .map((c: DeviceGroupCriteriaModel) => c.aspect_id)
            .filter((id: string) => id !== '' && this.aspects.every((a: DeviceTypeAspectNodeModel) => a.id !== id));
        const deviceClassIds = criteria
            .map((c: DeviceGroupCriteriaModel) => c.device_class_id)
            .filter((id: string) => id !== '' && this.deviceClasses.every((d: DeviceTypeDeviceClassModel) => d.id !== id));
        if (aspectIds.length > 0) {
            this.deviceGroupsService.getAspectListByIds(aspectIds).pipe(takeUntil(this.formChange))
                .subscribe((aspects: DeviceTypeAspectNodeModel[]) => this.aspects = this.aspects.concat(aspects));
        }
        if (deviceClassIds.length > 0) {
            this.deviceGroupsService.getDeviceClassListByIds(deviceClassIds).pipe(takeUntil(this.formChange))
                .subscribe((deviceClasses: DeviceTypeDeviceClassModel[]) => this.deviceClasses = this.deviceClasses.concat(deviceClasses));
        }
    }

    /**
     * Number of advanced fields that are in use. Shown next to the toggle, so that the collapsed fields never hide a
     * configured value silently.
     */
    get advancedCount(): number {
        return ADVANCED_FIELDS.filter((name: string) => {
            if (name === 'orderColumnIndex' && this.orderColumnIndexHidden) {
                return false;
            }
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
                const rows = this.collectPreviewRows(resp || []);
                if (rows.length === 0) {
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

    /**
     * Rows of the preview. A device group query answers with one response element per device, each prepended with
     * the device so the rows of different devices stay distinguishable; a single-device query keeps its one element.
     */
    private collectPreviewRows(resp: { deviceId?: string; data: any[][][] }[]): any[][] {
        if (this.source !== 'group') {
            return resp?.[0]?.data?.[0] || [];
        }
        if (this.control('deviceGroupMode').value === 'aggregate') {
            const elementRows = resp.map((element: { data: any[][][] }) => element.data?.[0] || []);
            const hasGroupTime = joinDuration(
                this.control('groupingTimeNumber').value, this.control('groupingTimeUnit').value
            ) !== undefined;
            return combineAggregatedRows(
                elementRows,
                this.control('aggregation').value,
                hasGroupTime,
                this.control('limit').value,
                this.control('orderDirection').value
            );
        }
        return resp.flatMap((element: { deviceId?: string; data: any[][][] }) =>
            (element.data?.[0] || []).map((row: any[]) => [this.deviceLabel(element.deviceId), ...row]));
    }

    private deviceLabel(deviceId: string | undefined): string {
        const device = this.allDevices.find((d: DeviceInstanceModel) => d.id === deviceId);
        return device !== undefined ? this.getDeviceName(device) : (deviceId || '');
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
