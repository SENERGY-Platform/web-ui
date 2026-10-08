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

import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { ProfileSource } from '../../shared/environments.model';
import { profilePreview } from '../../shared/environments-profile-preview';
import { profileChartConfig, ProfileChartConfig } from '../../shared/environments-profile-chartjs';
import { crosshairPlugin } from 'src/app/core/charts/chart-look';
import { BaseChartDirective } from 'ng2-charts';
import { MatFormField, MatLabel, MatHint, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatCheckbox } from '@angular/material/checkbox';
import { EnvironmentsFactorBarsComponent } from '../factor-bars/environments-factor-bars.component';

/**
 * The profile source editor: base/spread/cumulative, hour/weekday factors and the 24-hour
 * preview curve. Used both for a channel's own profile source and for a "driven" context
 * source's profile, so it takes the ProfileSource directly rather than reaching into a
 * channel -- the caller owns where the profile lives and how the change gets persisted.
 *
 * Mutates `profile` in place (same convention as the key-value editor's rows): the caller
 * passes the actual object from the document, and `profileChange` is only a "something in
 * here changed, mark dirty" signal, not a replacement value.
 */
@Component({
    selector: 'senergy-environments-profile-editor',
    templateUrl: './environments-profile-editor.component.html',
    styleUrls: ['./environments-profile-editor.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [BaseChartDirective, MatFormField, MatLabel, MatInput, FormsModule, MatHint, MatIcon, MatSuffix, MatTooltip, MatCheckbox, EnvironmentsFactorBarsComponent]
})
export class EnvironmentsProfileEditorComponent implements OnChanges {
    @Input() profile: ProfileSource | undefined;
    @Input() todayWeekday = 0;
    @Output() profileChange = new EventEmitter<void>();

    chart: ProfileChartConfig | undefined;
    readonly chartPlugins = [crosshairPlugin];
    readonly hourIndexes = Array.from({ length: 24 }, (_, i) => i);
    readonly weekdayIndexes = Array.from({ length: 7 }, (_, i) => i);
    readonly hourLabels = this.hourIndexes.map(String);
    readonly weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['profile'] || changes['todayWeekday']) {
            this.refreshChart();
        }
    }

    /** Bound to every profile field that is not the hour/weekday factor bars (those go through setHourFactors/setWeekdayFactors). */
    onFieldChange(): void {
        this.refreshChart();
        this.profileChange.emit();
    }

    setHourFactors(values: number[]): void {
        if (!this.profile) {
            return;
        }
        this.profile.hour_factors = values;
        this.onFieldChange();
    }

    setWeekdayFactors(values: number[]): void {
        if (!this.profile) {
            return;
        }
        this.profile.weekday_factors = values;
        this.onFieldChange();
    }

    private refreshChart(): void {
        this.chart = this.profile ? profileChartConfig(profilePreview(this.profile, this.todayWeekday)) : undefined;
    }
}
