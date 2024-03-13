/*
 * Copyright 2023 InfAI (CC SES)
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
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {SingleValueModel} from '../shared/single-value.model';

@Component({
    selector: 'senergy-single-value-value',
    templateUrl: './value.component.html',
    styleUrls: ['./value.component.css']
})
export class ValueComponent {
    @Input() widget: WidgetModel | undefined;
    @Input() sv: SingleValueModel | undefined;
    @Input() color?: string;

    maxFontSize() {
        return this.widget?.properties?.threshold ? this.widget.properties.threshold : 128;
    }
}
