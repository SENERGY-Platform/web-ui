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

import {Component, Input} from '@angular/core';
import {FormGroup} from '@angular/forms';
import * as moment from 'moment';


@Component({
    selector: 'senergy-process-deployments-config-time-event',
    templateUrl: './deployments-config-time-event.component.html',
    styleUrls: ['./deployments-config-time-event.component.css']
})

export class DeploymentsConfigTimeEventComponent {

    @Input() time_event: FormGroup = new FormGroup({});

    constructor() {
    }

    change(): void {
        const time_raw = <FormGroup>this.time_event.get('time_raw');
        this.time_event.patchValue({time: moment.duration(JSON.parse(JSON.stringify(time_raw.value))).toISOString()});
    }

}
