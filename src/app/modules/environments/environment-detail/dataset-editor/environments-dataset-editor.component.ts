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
    DatasetMeta,
    DatasetSource,
    DATASET_ORIGINS,
    datasetOriginLabel,
    RESAMPLE_MODES,
    resampleModeHint,
    resampleModeLabel,
} from '../../shared/environments.model';
import { DeviceTypeModel } from '../../../metadata/device-types-overview/shared/device-type.model';

/**
 * The dataset source editor: origin, dataset/column (uploaded) or device/service/column/
 * window (platform), resample/anchor/scale/cumulative. Used both for a channel's dataset
 * source and for a "driven" context source's dataset -- the source's own interval_seconds
 * (required for a context source, absent for a channel one) is a sibling of `dataset` on
 * the caller's document, not part of it, so it stays outside this editor either way.
 *
 * The platform device picker and the resulting device/service lookups stay with the caller
 * (selectDevice output, serviceOptions/columnOptions/platformDeviceName inputs): they need
 * DeviceInstancesService and the platform DeviceTypeService, which every place embedding this
 * editor already has, and duplicating that lookup machinery here would just be a second cache
 * of the same data.
 */
@Component({
    selector: 'senergy-environments-dataset-editor',
    templateUrl: './environments-dataset-editor.component.html',
    styleUrls: ['./environments-dataset-editor.component.css'],
})
export class EnvironmentsDatasetEditorComponent {
    @Input() dataset: DatasetSource | undefined;
    @Input() datasets: DatasetMeta[] = [];
    @Input() platformDeviceName: string | undefined;
    @Input() serviceOptions: DeviceTypeModel['services'] = [];
    @Input() columnOptions: string[] = [];
    @Output() datasetChange = new EventEmitter<void>();
    @Output() selectDevice = new EventEmitter<void>();

    DATASET_ORIGINS = DATASET_ORIGINS;
    datasetOriginLabel = datasetOriginLabel;
    RESAMPLE_MODES = RESAMPLE_MODES;
    resampleModeLabel = resampleModeLabel;
    resampleModeHint = resampleModeHint;
    ANCHOR_MODES = ANCHOR_MODES;
    anchorModeLabel = anchorModeLabel;
    anchorModeHint = anchorModeHint;

    onFieldChange(): void {
        this.datasetChange.emit();
    }

    columnsForDataset(datasetId: string | undefined): DatasetColumn[] {
        return this.datasets.find((d) => d.id === datasetId)?.columns || [];
    }
}
