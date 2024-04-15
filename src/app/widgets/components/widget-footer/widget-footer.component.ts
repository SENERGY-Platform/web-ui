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

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { DashboardManipulationEnum } from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import { WidgetFooterService } from './shared/widget-footer.service';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';

@Component({
    selector: 'senergy-widget-footer',
    templateUrl: './widget-footer.component.html',
    styleUrls: ['./widget-footer.component.css'],
})
export class WidgetFooterComponent implements OnInit {
    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() optionZoom = false;
    @Input() optionAdd = false;
    @Input() optionCustomDisabled: boolean[] = [];
    @Input() optionCustomIcon: string[] = [];
    @Input() optionCustomTooltip: string[] = [];
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;
    @Input() widgetHasUpdateableProperties = false;
    @Input() refreshing = false;
    @Input() reloadAfterZoom = true;
    @Input() getInitialWidgetData: any = () => {};

    @Output() editEvent = new EventEmitter<boolean>();
    @Output() addEvent = new EventEmitter<boolean>();
    @Output() customEvent = new EventEmitter<{index: number; icon: string}>();

    constructor(
        private widgetHeaderService: WidgetFooterService,
        private dashboardService: DashboardService,
    ) {

    }

    ngOnInit() {}

    edit() {
        this.editEvent.emit(true);
    }

    add() {
        this.addEvent.emit(true);
    }

    custom(i: number) {
        this.customEvent.emit({index: i, icon: this.optionCustomIcon[i]});
    }

    delete() {
        this.widgetHeaderService.openDeleteWidgetDialog(this.dashboardId, this.widget.id);
    }

    refresh() {
        this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, this.widget.id, this.widget);
    }

    zoomWidget() {
        this.dashboardService.zoomWidget(DashboardManipulationEnum.Zoom, this.widget.id, this.widget, this.reloadAfterZoom, this.getInitialWidgetData());
    }
}
