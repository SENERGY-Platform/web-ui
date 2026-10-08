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

import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { duration, durationToIsoString } from '../../../../../../core/time/iso-duration';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../../../../core/directives/matError.directive';

@Component({
    selector: 'senergy-process-deployments-config-time-event',
    templateUrl: './deployments-config-time-event.component.html',
    styleUrls: ['./deployments-config-time-event.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatErrorMessagesDirective]
})
export class DeploymentsConfigTimeEventComponent {
    @Input() time_event: FormGroup = new FormGroup({});

    constructor() {}

    changeDuration(): void {
        const durationUnits = this.time_event.get('durationUnits') as FormGroup;
        this.time_event.patchValue({ time: durationToIsoString(duration(JSON.parse(JSON.stringify(durationUnits.value)))) });
    }
}
