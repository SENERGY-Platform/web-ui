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

import { Component, Inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Source } from '../../shared/environments.model';
import { clonePresetSource, CONTEXT_PRESETS, ContextPreset } from '../../shared/environments-context-presets';
import { mondayStartWeekday, profilePreview } from '../../shared/environments-profile-preview';
import { profileChartConfig, ProfileChartConfig } from '../../shared/environments-profile-chartjs';
import { crosshairPlugin } from 'src/app/core/charts/chart-look';

export interface AddContextDialogData {
    /** Every context key already in use, static and driven alike -- a duplicate key would silently shadow one of them. */
    existingKeys: string[];
}

export interface AddContextDialogResult {
    key: string;
    source: Source;
}

/**
 * "Add context": picks a curated preset (or a blank starting point) and a key. Returns the
 * chosen key and a fresh, independent copy of the preset's source for the caller to store --
 * this dialog never touches the environment document itself.
 */
@Component({
    selector: 'senergy-environments-add-context-dialog',
    templateUrl: './environments-add-context-dialog.component.html',
    styleUrls: ['./environments-add-context-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class EnvironmentsAddContextDialogComponent implements OnInit {
    presets = CONTEXT_PRESETS;
    selected: ContextPreset = CONTEXT_PRESETS[0];
    key = '';
    readonly todayWeekday = mondayStartWeekday(new Date());
    chart: ProfileChartConfig | undefined;
    readonly chartPlugins = [crosshairPlugin];

    constructor(
        private dialogRef: MatDialogRef<EnvironmentsAddContextDialogComponent>,
        @Inject(MAT_DIALOG_DATA) private data: AddContextDialogData,
    ) {}

    ngOnInit(): void {
        this.selectPreset(this.presets[0]);
    }

    selectPreset(preset: ContextPreset): void {
        this.selected = preset;
        this.key = preset.key;
        this.chart = preset.source.kind === 'profile' && preset.source.profile ? profileChartConfig(profilePreview(preset.source.profile, this.todayWeekday)) : undefined;
    }

    /** undefined = valid; shown as the key field's error otherwise. */
    get keyError(): string | undefined {
        const trimmed = this.key.trim();
        if (!trimmed) {
            return 'A context key is required.';
        }
        if (this.data.existingKeys.includes(trimmed)) {
            return 'This key is already used.';
        }
        return undefined;
    }

    cancel(): void {
        this.dialogRef.close();
    }

    add(): void {
        if (this.keyError) {
            return;
        }
        const result: AddContextDialogResult = { key: this.key.trim(), source: clonePresetSource(this.selected.source) };
        this.dialogRef.close(result);
    }
}
