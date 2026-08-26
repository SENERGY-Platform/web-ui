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

import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ProfileSource } from '../../shared/environments.model';
import { profileChartOptions, ProfileChartOptions } from '../../shared/environments-profile-preview';

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
})
export class EnvironmentsProfileEditorComponent implements OnChanges {
    @Input() profile: ProfileSource | undefined;
    @Input() todayWeekday = 0;
    @Output() profileChange = new EventEmitter<void>();

    chart: ProfileChartOptions | undefined;
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
        this.chart = this.profile ? profileChartOptions(this.profile, this.todayWeekday) : undefined;
    }
}
