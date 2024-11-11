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

import {Component, EventEmitter, Inject, Input, LOCALE_ID, OnInit, Output} from '@angular/core';
import {UntypedFormControl, Validators} from '@angular/forms';
import {rangeValidator} from "../../../../../core/validators/range.validator";

@Component({
    selector: 'senergy-date-time-event-config',
    templateUrl: './date-time-event-config.component.html',
    styleUrls: ['./date-time-event-config.component.css'],
})
export class DateTimeEventConfigComponent implements OnInit {
    @Input() initial = '';
    @Output() update = new EventEmitter<{ iso: string; text: string }>();

    date = new UntypedFormControl(new Date(), Validators.required);
    hour = new UntypedFormControl(0, [rangeValidator(0, 23)]);
    minute = new UntypedFormControl(0, [rangeValidator(0, 59)]);

    constructor(@Inject(LOCALE_ID) private localeId: string) {}

    ngOnInit() {
        this.date.valueChanges.subscribe((value) => {
            if (value) {
                this.update.emit(this.getResult());
            }
        });

        this.hour.valueChanges.subscribe(() => {
            if (this.date.value) {
                this.update.emit(this.getResult());
            }
        });

        this.minute.valueChanges.subscribe(() => {
            if (this.date.value) {
                this.update.emit(this.getResult());
            }
        });

        if (this.initial) {
            const date = new Date(this.initial);
            this.date.setValue(date);
            this.hour.setValue(date.getHours());
            this.minute.setValue(date.getMinutes());
        } else {
            this.date.setValue(new Date());
        }
    }

    private getResult(): { iso: string; text: string } {
        const date = this.date.value as Date;
        date.setHours(this.hour.value);
        date.setMinutes(this.minute.value);
        return { iso: date.toISOString(), text: date.toLocaleString(this.localeId) };
    }
}
