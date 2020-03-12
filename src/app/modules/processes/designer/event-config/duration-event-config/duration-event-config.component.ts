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
import {FormControl, Validators} from '@angular/forms';
import {DurationIso, DurationResult} from '../../shared/designer.model';
import * as moment from 'moment';

@Component({
    selector: 'senergy-duration-event-config',
    templateUrl: './duration-event-config.component.html',
    styleUrls: ['./duration-event-config.component.css']
})
export class DurationEventConfigComponent implements OnInit {

    @Input() initial = '';
    @Output() update =  new EventEmitter<DurationResult>();

    year = new FormControl(0, Validators.min(0));
    month = new FormControl(0, Validators.min(0));
    day = new FormControl(0, Validators.min(0));
    hour = new FormControl(0, Validators.min(0));
    minute = new FormControl(0, Validators.min(0));
    second = new FormControl(0, Validators.min(0));

    constructor(@Inject(LOCALE_ID) private localeId: string) {

    }

    ngOnInit() {
        if (this.initial) {
            const duration = moment.duration(this.initial);
            this.year.setValue(duration.years());
            this.month.setValue(duration.months());
            this.day.setValue(duration.days());
            this.hour.setValue(duration.hours());
            this.minute.setValue(duration.minutes());
            this.second.setValue(duration.seconds());
        }
        this.year.valueChanges.subscribe(() => this.updateResult());
        this.month.valueChanges.subscribe(() => this.updateResult());
        this.day.valueChanges.subscribe(() => this.updateResult());
        this.hour.valueChanges.subscribe(() => this.updateResult());
        this.minute.valueChanges.subscribe(() => this.updateResult());
        this.second.valueChanges.subscribe(() => this.updateResult());
    }

    private updateResult() {
        this.update.emit(this.getResult());
    }

    private getResult(): DurationResult {
        return this.setDurationNaturalText({
            iso: this.getDurationIsoResult(),
            text: ''
        });
    }

    private getDurationIsoResult(): DurationIso {
        return this.setIsoString({
            string: '',
            year: <number>this.year.value,
            month: <number>this.month.value,
            day: <number>this.day.value,
            hour: <number>this.hour.value,
            minute: <number>this.minute.value,
            second: <number>this.second.value,
        });
    }

    private setDurationNaturalText(duration: DurationResult): DurationResult {
        moment.locale(this.localeId);
        duration.text = moment.duration(JSON.parse(JSON.stringify(duration.iso))).humanize();
        return duration;
    }

    private setIsoString(duration: DurationIso): DurationIso {
        moment.locale(this.localeId);
        duration.string = moment.duration(JSON.parse(JSON.stringify(duration))).toISOString();
        return duration;
    }
}
