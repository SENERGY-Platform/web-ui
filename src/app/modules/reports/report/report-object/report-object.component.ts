/*
 * Copyright 2024 InfAI (CC SES)
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

import {Component, Input, OnInit} from '@angular/core';
import {ReportObjectModel} from '../../shared/template.model';

@Component({
    selector: 'senergy-reports-object',
    templateUrl: './report-object.component.html',
    styleUrls: ['./report-object.component.css'],
})
export class ReportObjectComponent implements OnInit {

    @Input() name = '';
    @Input() data: ReportObjectModel = {} as ReportObjectModel;
    @Input() requestObject: Map<string, any> = new Map<string, any>();

    constructor() {
    }

    ngOnInit() {
    }

    inputChanged(key: string, data: any) {
        this.requestObject.set(key, data);
        //this.changeInputEvent.emit(this.requestObject);
    }
}
