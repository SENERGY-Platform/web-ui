import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormControl} from '@angular/forms';

@Component({
    selector: 'senergy-cycle-event-config',
    templateUrl: './cycle-event-config.component.html',
    styleUrls: ['./cycle-event-config.component.css']
})
export class CycleEventConfigComponent implements OnInit {

    @Input() initial = '';
    @Output() update =  new EventEmitter<{cron: string, text: string}>();

    cronFormControl = new FormControl('');

    constructor() {}

    ngOnInit() {
        this.cronFormControl.valueChanges.subscribe(() => {
            this.update.emit(this.getResult());
        });
        this.cronFormControl.setValue(this.initial || '* * * * * ?');
    }

    private getResult(): {cron: string, text: string} {
        const cron = <string>this.cronFormControl.value;
        return {cron: cron, text: this.cronToText(cron)};
    }

    private cronToText(cron: string) {
        console.log('todo: interpret cycle-event-config as text');
        return cron;
    }
}
