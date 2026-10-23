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

import { Component, ElementRef, NgZone, OnDestroy, OnInit, ChangeDetectionStrategy, afterNextRender, inject, viewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
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
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { DeviceInstanceModel } from '../shared/device-instances.model';
import { DeviceInstancesService } from '../shared/device-instances.service';
import { ChartsExportVAxesModel } from 'src/app/widgets/charts/export/shared/charts-export-properties.model';
import { detectAndMergeFlapping } from '../shared/flapping.function';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatPrefix, MatError } from '@angular/material/form-field';
import { MatTooltip } from '@angular/material/tooltip';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { TimelineComponent } from '../../../../widgets/charts/shared/chart-types/timeline/timeline.component';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { MatDateRangeInput, MatStartDate, MatEndDate, MatDatepickerToggle, MatDateRangePicker } from '@angular/material/datepicker';
import { DialogHeaderComponent } from '../../../../core/components/dialog-header/dialog-header.component';

/** What the opener knows about one output path: whether its content variable has an aspect, and the names to label it with. */
export interface ValueMeta {
    hasAspect: boolean;
    aspectName: string;
    characteristicName: string;
    /** Display name of the measuring function without the "Get-" prefix; empty without a function. */
    functionName?: string;
    /** The value is a point in time (a "Timestamp ..." characteristic), which the tile grid leaves out. */
    isTimestamp?: boolean;
}

/** A last value in the value grid; only values with an aspect that are not timestamps get one. */
export interface ValueTile {
    serviceIndex: number;
    label: string;
    path: string;
    serviceName: string;
    showService: boolean;
    value: TimeValuePairModel['value'];
    unit: string;
    time: string | null;
}

/** One row of a service's value table; aspect rows carry the label of their tile. */
export interface ServiceRow {
    label: string;
    path: string;
    value: TimeValuePairModel['value'];
    unit: string;
}

/**
 * The value table of one service: rows with a value (aspect group, then the rest in path order) and the
 * rows without one, which the dialog shows only when it does not hide empty fields.
 */
export interface ServiceTable {
    aspectRows: ServiceRow[];
    otherRows: ServiceRow[];
    emptyRows: ServiceRow[];
    /** The newest time among the service's values. */
    time: string | null;
}

@Component({
    templateUrl: './device-instances-service-dialog.component.html',
    styleUrls: ['./device-instances-service-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [DialogHeaderComponent, MatIconButton, MatIcon, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, MatFormField, MatLabel, MatTooltip, MatError, MatErrorMessagesDirective, TimelineComponent, MtxSelect, ReactiveFormsModule, MtxOption, MatDateRangeInput, MatStartDate, MatEndDate, MatDatepickerToggle, MatDateRangePicker, MatPrefix, MatDialogActions, MatButton, DatePipe, NgTemplateOutlet]
})
export class DeviceInstancesServiceDialogComponent implements OnInit, OnDestroy {
    private dialogRef = inject<MatDialogRef<DeviceInstancesServiceDialogComponent>>(MatDialogRef);
    private exportDataService = inject(ExportDataService);
    private fb = inject(FormBuilder);
    private errorHandlerService = inject(ErrorHandlerService);
    private authorizationService = inject(AuthorizationService);
    private deviceInstancesService = inject(DeviceInstancesService);
    private zone = inject(NgZone);

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
    /** Display unit per output path, parallel to `descriptions`; empty where the characteristic gives none. */
    units: string[][];
    /** Aspect and characteristic info per output path, parallel to `descriptions`. */
    valueMeta: ValueMeta[][];
    /** The last values that have an aspect, as one flat list for the value grid. */
    tiles: ValueTile[] = [];
    /** One table per service, parallel to `services`. */
    serviceTables: ServiceTable[] = [];
    availability: { serviceId: string; from?: Date; to?: Date; groupType?: string; groupTime?: string }[] = [];
    availabilityControl = new FormControl<{
        groupType?: string;
        groupTime?: string;
    }>({});

    valuesLoaded = false;
    errorOccured = false;
    errorMessage = '';

    connectionHistory: any[][][] = [];
    userCanLoadConnectionHistory = false;
    connectionHistoryLoaded = false;
    clipboardTooltip = 'Copy to Clipboard';
    /** Key of the value whose copy button shows the check mark for two seconds. */
    copiedKey: string | undefined;
    private copiedTimeout: number | undefined;
    userIsDeveloper = false;
    canEdit = false;

    /** Hides the fields without a value in every service's table. */
    hideEmpty = true;
    /** Fields without an aspect stay folded under the aspect rows until asked for; a service without aspect rows shows them directly. */
    showOthers = false;
    readonly formatValue = formatValue;

    /** Index of the service whose download options are open, at most one. */
    downloadIndex: number | undefined;

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

    /** Height of the connection history chart in pixels. */
    readonly historyHeight = 100;
    /** Width of the connection history box; the timeline chart needs it in pixels. */
    historyWidth = 400;
    private historyBox = viewChild<ElementRef<HTMLElement>>('historyBox');
    private resizeObserver: ResizeObserver | undefined;

    constructor() {
        const data = inject<{
            device: DeviceInstanceModel;
            services: DeviceTypeServiceModel[];
            lastValueElements: LastValuesRequestElementTimescaleModel[];
            deviceType: DeviceTypeModel;
            serviceOutputCounts: number[];
            descriptions: string[][];
            units?: string[][];
            valueMeta?: ValueMeta[][];
            canEdit?: boolean;
        }>(MAT_DIALOG_DATA);

        this.services = data.services;
        this.lastValueElements = data.lastValueElements;
        this.deviceType = data.deviceType;
        this.serviceOutputCounts = data.serviceOutputCounts;
        this.device = data.device;
        this.descriptions = data.descriptions;
        this.units = data.units ?? [];
        this.valueMeta = data.valueMeta ?? [];
        this.canEdit = data.canEdit === true;
        this.userCanLoadConnectionHistory = this.deviceInstancesService.userHasReadAuthorizationConnectionLog();
        this.userIsDeveloper = this.authorizationService.userIsDeveloper();
        afterNextRender(() => this.observeHistoryBox());
    }

    ngOnInit() {
        this.refresh();
    }

    ngOnDestroy() {
        this.resizeObserver?.disconnect();
        window.clearTimeout(this.copiedTimeout);
    }

    /** The timeline chart takes its width in pixels, so the box that holds it is observed. */
    private observeHistoryBox(): void {
        const box = this.historyBox()?.nativeElement;
        if (box === undefined) {
            return;
        }
        this.resizeObserver = new ResizeObserver(() => this.zone.run(() => this.historyWidth = Math.max(box.clientWidth, 1)));
        this.resizeObserver.observe(box);
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
                this.tiles = this.buildTiles();
                this.serviceTables = this.buildServiceTables();
                this.valuesLoaded = true;
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
                this.connectionHistoryLoaded = true;
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

    /** Closes with 'edit'; whoever opened the dialog opens the edit dialog. */
    edit(): void {
        this.dialogRef.close('edit');
    }

    get hasConnectionHistory(): boolean {
        return (this.connectionHistory[0]?.[0]?.length ?? 0) > 0;
    }

    /** The state shown in the header chip, with the classes of the device list: inactive is neither online nor offline. */
    get connectionState(): { label: string; cssClass: string } {
        if (this.device.attributes?.some(a => a.key === 'inactive' && a.value === 'true')) {
            return { label: 'Inactive', cssClass: 'hollow muted' };
        }
        switch (this.device.connection_state) {
            case 'online': return { label: 'Online', cssClass: 'online' };
            case 'offline': return { label: 'Offline', cssClass: 'failed' };
            default: return { label: 'Unknown', cssClass: 'muted' };
        }
    }

    /** The grid shows values whose content variable has an aspect; without any, the area is left out. */
    get showValues(): boolean {
        return !this.valuesLoaded || this.errorOccured || this.tiles.length > 0;
    }

    /** The time all tiles share, shown once above the grid; null when they differ, then each tile shows its own. */
    get tilesTime(): string | null {
        const times = new Set(this.tiles.map(t => t.time));
        return times.size === 1 ? [...times][0] : null;
    }

    /**
     * Function name, else aspect name, else characteristic name, else the last path segment. A device type often puts
     * every value under one aspect (e.g. "Air"), so the function says what is measured. Equal labels get the aspect
     * added when that tells them apart, else the last path segment.
     */
    private buildTiles(): ValueTile[] {
        const tiles: ValueTile[] = [];
        const aspectOf = new Map<ValueTile, string>();
        this.lastValueArray.forEach((service, serviceIndex) => service.forEach((v, valueIndex) => {
            const meta = this.valueMeta[serviceIndex]?.[valueIndex];
            if (meta?.hasAspect !== true || meta.isTimestamp === true) {
                return;
            }
            const path = v.request.columnName;
            const label = meta.functionName || meta.aspectName || meta.characteristicName || lastSegment(path);
            tiles.push({
                serviceIndex,
                label,
                path,
                serviceName: this.services[serviceIndex]?.name ?? '',
                showService: false,
                value: v.response.value,
                unit: this.units[serviceIndex]?.[valueIndex] ?? '',
                time: v.response.time,
            });
            if (meta.functionName && meta.aspectName) {
                aspectOf.set(tiles[tiles.length - 1], meta.aspectName);
            }
        }));
        const byLabel = new Map<string, ValueTile[]>();
        tiles.forEach(t => byLabel.set(t.label, [...(byLabel.get(t.label) ?? []), t]));
        byLabel.forEach(group => {
            if (group.length < 2) {
                return;
            }
            const aspects = group.map(t => aspectOf.get(t));
            const aspectsDiffer = aspects.every(a => !!a) && new Set(aspects).size === group.length;
            group.forEach(t => t.label += ' (' + (aspectsDiffer ? aspectOf.get(t) : lastSegment(t.path)) + ')');
        });
        const fullLabelCount = new Map<string, number>();
        tiles.forEach(t => fullLabelCount.set(t.label, (fullLabelCount.get(t.label) ?? 0) + 1));
        tiles.forEach(t => t.showService = (fullLabelCount.get(t.label) ?? 0) > 1);
        return tiles;
    }

    /** Per service: fields with an aspect first, labelled like the tiles, then the others by their path without the shared prefix. */
    private buildServiceTables(): ServiceTable[] {
        return this.lastValueArray.map((service, serviceIndex) => {
            const prefix = commonPrefixLength(service.map(v => v.request.columnName.split('.')));
            const aspectRows: ServiceRow[] = [];
            const otherRows: ServiceRow[] = [];
            const emptyAspect: ServiceRow[] = [];
            const emptyOther: ServiceRow[] = [];
            service.forEach((v, valueIndex) => {
                const path = v.request.columnName;
                const tile = this.tiles.find(t => t.serviceIndex === serviceIndex && t.path === path);
                const row: ServiceRow = {
                    label: tile?.label ?? path.split('.').slice(prefix).join('.'),
                    path,
                    value: v.response.value,
                    unit: this.units[serviceIndex]?.[valueIndex] ?? '',
                };
                const empty = row.value === null;
                (tile ? (empty ? emptyAspect : aspectRows) : (empty ? emptyOther : otherRows)).push(row);
            });
            const times = service.map(v => v.response.time).filter((t): t is string => !!t);
            return {
                aspectRows,
                otherRows,
                emptyRows: [...emptyAspect, ...emptyOther],
                time: times.length > 0 ? times.reduce((a, b) => new Date(a) >= new Date(b) ? a : b) : null,
            };
        });
    }


    /** Whether a service has anything to list under the current setting of the toggle. */
    tableHasRows(table: ServiceTable): boolean {
        return table.aspectRows.length + table.otherRows.length > 0 || (!this.hideEmpty && table.emptyRows.length > 0);
    }

    /** Opens the download options of one service; the format starts at raw data because the formats differ per service. */
    toggleDownload(i: number): void {
        if (this.downloadIndex === i) {
            this.downloadIndex = undefined;
            return;
        }
        this.downloadIndex = i;
        this.availabilityControl.setValue({});
    }

    async getDownloadUrl(i: number): Promise<string> {
        const fromIso = this.timeControl.get('from')?.value.toISOString();
        const toIso = new Date((this.timeControl.get('to')?.value as Date).valueOf() + 86400000).toISOString();
        const columns: QueriesRequestColumnModel[] = [];
        this.lastValueArray[i].forEach(c => columns.push({ name: c.request.columnName, groupType: this.availabilityControl.value?.groupType }));

        const token = await this.authorizationService.getToken();
        const f = await fetch(environment.timescaleAPIURL + '/prepare-download', {
            headers: {
                Authorization: token,
                'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify({
                serviceId: this.services[i].id,
                deviceId: this.device.id,
                columns,
                time: {
                    start: fromIso,
                    end: toIso,
                },
                groupTime: this.availabilityControl.value?.groupTime,
            })
        });
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

    copyToClipboard(key: string, text: string) {
        navigator.clipboard.writeText(text);
        this.copiedKey = key;
        window.clearTimeout(this.copiedTimeout);
        this.copiedTimeout = window.setTimeout(() => this.copiedKey = undefined, 2000);
    }
}

/** Numbers with a fraction to two decimals, below 1 to three significant digits; everything else unchanged. */
export function formatValue(value: TimeValuePairModel['value']): string {
    if (typeof value !== 'number' || Number.isInteger(value)) {
        return String(value);
    }
    const rounded = Math.abs(value) >= 1 ? Math.round(value * 100) / 100 : Number(value.toPrecision(3));
    return String(rounded);
}

function lastSegment(path: string): string {
    const segments = path.split('.');
    return segments[segments.length - 1];
}

/** Number of leading segments all paths share, keeping at least the last segment of each. */
function commonPrefixLength(paths: string[][]): number {
    if (paths.length === 0) {
        return 0;
    }
    const maxLength = Math.min(...paths.map(p => p.length - 1));
    let n = 0;
    while (n < maxLength && paths.every(p => p[n] === paths[0][n])) {
        n++;
    }
    return n;
}
