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

import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
    ANCHOR_MODES,
    anchorModeHint,
    anchorModeLabel,
    DatasetColumn,
    DatasetFilter,
    DatasetMeta,
    DatasetSource,
    DATASET_ORIGINS,
    datasetGapProblems,
    datasetOriginLabel,
    followProblem,
    isRemoteOrigin,
    RESAMPLE_MODES,
    resampleModeHint,
    resampleModeLabel,
} from '../../shared/environments.model';
import { DeviceTypeModel } from '../../../metadata/device-types-overview/shared/device-type.model';
import { ExportModel, ExportValueModel } from '../../../exports/shared/export.model';

const NUMERIC_EXPORT_VALUE_TYPES = new Set(['https://schema.org/Float', 'https://schema.org/Integer', 'https://schema.org/Number']);

/** A text or boolean export column saves cleanly but the wrapper hands back no numbers at runtime, so only a numeric, non-tag column is offered. */
function isNumericExportColumn(value: ExportValueModel): boolean {
    if (value.Tag) {
        return false;
    }
    if (NUMERIC_EXPORT_VALUE_TYPES.has(value.Type)) {
        return true;
    }
    const lastSegment = value.Type?.split('/').pop();
    return lastSegment === 'Float' || lastSegment === 'Integer' || lastSegment === 'Number';
}

/**
 * The dataset source editor: origin, dataset/column (uploaded), device/service/column/window
 * (platform), export/column/window (platform export), resample/anchor/scale/cumulative/follow,
 * max_gap, filters (export only) and fallback (export only, needs max_gap). Used both for a
 * channel's dataset source and for a "driven" context source's dataset -- the
 * source's own interval_seconds (required for a context source, absent for a channel one) is a
 * sibling of `dataset` on the caller's document, not part of it, so it stays outside this
 * editor either way.
 *
 * The platform device picker and the resulting device/service lookups stay with the caller
 * (selectDevice output, serviceOptions/columnOptions/platformDeviceName inputs): they need
 * DeviceInstancesService and the platform DeviceTypeService, which every place embedding this
 * editor already has, and duplicating that lookup machinery here would just be a second cache
 * of the same data.
 *
 * `datasetRestructured` is the narrower signal for filter/fallback row add/remove and the
 * fallback toggle -- the same convention as the faults and timeline editors' own …Restructured
 * output, which the parent needs to drop stale index-based problems (afterStructuralChange in
 * environment-detail.component.ts).
 */
@Component({
    selector: 'senergy-environments-dataset-editor',
    templateUrl: './environments-dataset-editor.component.html',
    styleUrls: ['./environments-dataset-editor.component.css'],
})
export class EnvironmentsDatasetEditorComponent {
    @Input() dataset: DatasetSource | undefined;
    @Input() datasets: DatasetMeta[] = [];
    @Input() exports: ExportModel[] = [];
    @Input() platformDeviceName: string | undefined;
    @Input() serviceOptions: DeviceTypeModel['services'] = [];
    @Input() columnOptions: string[] = [];
    @Output() datasetChange = new EventEmitter<void>();
    @Output() selectDevice = new EventEmitter<void>();
    /** Fires on filter/fallback row add/remove and fallback toggle only, not on a field edit -- see the class comment. */
    @Output() datasetRestructured = new EventEmitter<void>();

    DATASET_ORIGINS = DATASET_ORIGINS;
    datasetOriginLabel = datasetOriginLabel;
    RESAMPLE_MODES = RESAMPLE_MODES;
    resampleModeLabel = resampleModeLabel;
    resampleModeHint = resampleModeHint;
    ANCHOR_MODES = ANCHOR_MODES;
    anchorModeLabel = anchorModeLabel;
    anchorModeHint = anchorModeHint;
    isRemoteOrigin = isRemoteOrigin;
    followProblem = followProblem;
    datasetGapProblems = datasetGapProblems;

    onFieldChange(): void {
        this.datasetChange.emit();
    }

    /**
     * ngModelChange handler for the Origin select: every field below is specific to the old
     * origin (a device id is not an export id, a platform column path is not an export column
     * name), so switching origin invalidates all of them. max_gap, filters and fallback are left
     * alone -- they apply to every origin or stay meaningful once the origin is export again, and
     * datasetGapProblems surfaces it in the meantime if the current origin cannot use them, the
     * same way followProblem does for follow on a file origin.
     */
    onOriginChange(): void {
        const dataset = this.dataset;
        if (!dataset) {
            return;
        }
        dataset.ref = undefined;
        dataset.column = undefined;
        dataset.service_ref = undefined;
        dataset.window = undefined;
        dataset.follow = undefined;
        dataset.follow_every = undefined;
        this.onFieldChange();
    }

    /** ngModelChange handler for the Follow checkbox: the server refuses follow_every without follow, and the field is hidden once follow is off, so unchecking has to clear it too. */
    onFollowChange(): void {
        const dataset = this.dataset;
        if (!dataset) {
            return;
        }
        if (!dataset.follow) {
            dataset.follow = undefined;
            dataset.follow_every = undefined;
        }
        this.onFieldChange();
    }

    columnsForDataset(datasetId: string | undefined): DatasetColumn[] {
        return this.datasets.find((d) => d.id === datasetId)?.columns || [];
    }

    columnsForExport(exportId: string | undefined): ExportValueModel[] {
        return (this.exports.find((e) => e.ID === exportId)?.Values || []).filter(isNumericExportColumn);
    }

    trackByFilter(_index: number, filter: DatasetFilter): DatasetFilter {
        return filter;
    }

    /** Adding a row shifts every server problem indexed at or past it, the same as a fault or timeline row -- see datasetRestructured. */
    addFilter(): void {
        const dataset = this.dataset;
        if (!dataset) {
            return;
        }
        (dataset.filters ??= []).push({ column: '', value: '' });
        this.onFieldChange();
        this.datasetRestructured.emit();
    }

    /** Drops the key entirely once the list is empty again, the way an unset filters field reads (server omitempty). */
    removeFilter(index: number): void {
        const dataset = this.dataset;
        if (!dataset?.filters) {
            return;
        }
        dataset.filters.splice(index, 1);
        if (dataset.filters.length === 0) {
            delete dataset.filters;
        }
        this.onFieldChange();
        this.datasetRestructured.emit();
    }

    /** ngModelChange handler for the Fallback checkbox: creates a fallback with one empty filter row, or drops the field entirely. */
    onFallbackToggle(checked: boolean): void {
        const dataset = this.dataset;
        if (!dataset) {
            return;
        }
        if (checked) {
            dataset.fallback = { filters: [{ column: '', value: '' }] };
        } else {
            delete dataset.fallback;
        }
        this.onFieldChange();
        this.datasetRestructured.emit();
    }

    addFallbackFilter(): void {
        const fallback = this.dataset?.fallback;
        if (!fallback) {
            return;
        }
        fallback.filters.push({ column: '', value: '' });
        this.onFieldChange();
        this.datasetRestructured.emit();
    }

    /** Unlike removeFilter, an empty list is kept rather than dropped: fallback.filters is mandatory, so the "must name the filters" problem has to keep showing. */
    removeFallbackFilter(index: number): void {
        const fallback = this.dataset?.fallback;
        if (!fallback) {
            return;
        }
        fallback.filters.splice(index, 1);
        this.onFieldChange();
        this.datasetRestructured.emit();
    }
}
