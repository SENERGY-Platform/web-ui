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

import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { Source } from '../../shared/environments.model';
import { clonePresetSource, CONTEXT_PRESETS, ContextPreset } from '../../shared/environments-context-presets';
import { mondayStartWeekday, profilePreview } from '../../shared/environments-profile-preview';
import { profileChartConfig, ProfileChartConfig } from '../../shared/environments-profile-chartjs';
import { crosshairPlugin } from 'src/app/core/charts/chart-look';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { BaseChartDirective } from 'ng2-charts';
import { MatFormField, MatLabel, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';

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
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, BaseChartDirective, MatFormField, MatLabel, MatInput, FormsModule, MatHint, MatDialogActions, MatButton]
})
export class EnvironmentsAddContextDialogComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<EnvironmentsAddContextDialogComponent>>(MatDialogRef);
    private data = inject<AddContextDialogData>(MAT_DIALOG_DATA);

    presets = CONTEXT_PRESETS;
    selected: ContextPreset = CONTEXT_PRESETS[0];
    key = '';
    readonly todayWeekday = mondayStartWeekday(new Date());
    chart: ProfileChartConfig | undefined;
    readonly chartPlugins = [crosshairPlugin];

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
