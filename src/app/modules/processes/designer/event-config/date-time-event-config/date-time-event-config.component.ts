import {Component, EventEmitter, Inject, Input, LOCALE_ID, OnInit, Output} from '@angular/core';
import {FormControl, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA} from '@angular/material';

@Component({
    selector: 'senergy-date-time-event-config',
    templateUrl: './date-time-event-config.component.html',
    styleUrls: ['./date-time-event-config.component.css']
})
export class DateTimeEventConfigComponent implements OnInit {

    @Input() initial = '';
    @Output() update =  new EventEmitter<{iso: string, text: string}>();

    date = new FormControl(new Date(), Validators.required);
    hour = new FormControl(0, [Validators.max(23), Validators.min(0)]);
    minute = new FormControl(0, [Validators.max(59), Validators.min(0)]);

    constructor(@Inject(LOCALE_ID) private localeId: string) {

    }

    ngOnInit() {
        this.date.valueChanges.subscribe(value => {
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


    private getResult(): {iso: string, text: string} {
        let date = <Date>this.date.value;
        date.setHours(this.hour.value);
        date.setMinutes(this.minute.value);
        return {iso: date.toISOString(), text: date.toLocaleString(this.localeId)};
    }
}
