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

import { Component, EventEmitter, Input, LOCALE_ID, OnInit, Output, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DurationIso, DurationResult } from '../../shared/designer.model';
import { duration as toDuration, durationParts, durationToIsoString } from '../../../../../core/time/iso-duration';
import { humanizeDuration } from '../../../../../core/time/humanize-duration';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../../../core/directives/matError.directive';

@Component({
    selector: 'senergy-duration-event-config',
    templateUrl: './duration-event-config.component.html',
    styleUrls: ['./duration-event-config.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormsModule, MatFormField, MatInput, ReactiveFormsModule, MatLabel, MatError, MatErrorMessagesDirective]
})
export class DurationEventConfigComponent implements OnInit {
    private localeId = inject(LOCALE_ID);
    private destroyRef = inject(DestroyRef);

    @Input() initial = '';
    @Output() update = new EventEmitter<DurationResult>();

    year = new FormControl(0, Validators.min(0));
    month = new FormControl(0, Validators.min(0));
    day = new FormControl(0, Validators.min(0));
    hour = new FormControl(0, Validators.min(0));
    minute = new FormControl(0, Validators.min(0));
    second = new FormControl(0, Validators.min(0));

    ngOnInit() {
        if (this.initial) {
            const parts = durationParts(toDuration(this.initial));
            this.year.setValue(parts.years);
            this.month.setValue(parts.months);
            this.day.setValue(parts.days);
            this.hour.setValue(parts.hours);
            this.minute.setValue(parts.minutes);
            this.second.setValue(parts.seconds);
        }
        this.year.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.updateResult());
        this.month.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.updateResult());
        this.day.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.updateResult());
        this.hour.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.updateResult());
        this.minute.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.updateResult());
        this.second.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.updateResult());
    }

    private updateResult() {
        this.update.emit(this.getResult());
    }

    private getResult(): DurationResult {
        return this.setDurationNaturalText({
            iso: this.getDurationIsoResult(),
            text: '',
        });
    }

    private getDurationIsoResult(): DurationIso {
        return this.setIsoString({
            string: '',
            year: this.year.value as number,
            month: this.month.value as number,
            day: this.day.value as number,
            hour: this.hour.value as number,
            minute: this.minute.value as number,
            second: this.second.value as number,
        });
    }

    private setDurationNaturalText(duration: DurationResult): DurationResult {
        duration.text = humanizeDuration(toDuration(JSON.parse(JSON.stringify(duration.iso))), this.localeId);
        return duration;
    }

    private setIsoString(duration: DurationIso): DurationIso {
        duration.string = durationToIsoString(toDuration(JSON.parse(JSON.stringify(duration))));
        return duration;
    }
}
