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

import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../../../core/directives/matError.directive';

@Component({
    selector: 'senergy-cycle-event-config',
    templateUrl: './cycle-event-config.component.html',
    styleUrls: ['./cycle-event-config.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormsModule, MatFormField, MatInput, ReactiveFormsModule, MatLabel, MatError, MatErrorMessagesDirective]
})
export class CycleEventConfigComponent implements OnInit {
    private destroyRef = inject(DestroyRef);

    @Input() initial = '';
    @Output() update = new EventEmitter<{ cron: string; text: string }>();

    cronFormControl = new FormControl('');

    constructor() {}

    ngOnInit() {
        this.cronFormControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.update.emit(this.getResult());
        });
        this.cronFormControl.setValue(this.initial || '* * * * * ?');
    }

    private getResult(): { cron: string; text: string } {
        const cron = this.cronFormControl.value as string;
        return { cron, text: this.cronToText(cron) };
    }

    private cronToText(cron: string) {
        console.log('todo: interpret cycle-event-config as text');
        return cron;
    }
}
