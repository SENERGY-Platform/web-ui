/*
 * Copyright 2018 InfAI (CC SES)
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

import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {WidgetHeaderService} from './shared/widget-header.service';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {DashboardManipulationEnum} from '../../../modules/dashboard/shared/dashboard-manipulation.enum';

@Component({
    selector: 'senergy-widget-header',
    templateUrl: './widget-header.component.html',
    styleUrls: ['./widget-header.component.css'],
})
export class WidgetHeaderComponent implements OnInit {

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {id: '', name: '', type: '', properties: {}};
    @Output() editEvent = new EventEmitter<boolean>();

    constructor(private widgetHeaderService: WidgetHeaderService,
                private dashboardService: DashboardService) {
    }

    ngOnInit() {
    }

    edit() {
        this.editEvent.emit(true);
    }

    close() {
        this.widgetHeaderService.openDeleteWidgetDialog(this.dashboardId, this.widget.id);
    }

    refresh() {
        this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, this.widget.id, this.widget);
    }
}
