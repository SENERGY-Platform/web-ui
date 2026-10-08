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

import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { DashboardManipulationEnum } from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { NgClass } from '@angular/common';
import { MatIconButton } from '@angular/material/button';

@Component({
    selector: 'senergy-widget-header',
    templateUrl: './widget-header.component.html',
    styleUrls: ['./widget-header.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatCardHeader, MatCardTitle, MatTooltip, MatIcon, NgClass, MatIconButton]
})
export class WidgetHeaderComponent {
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() warnText = '';
    @Input() optionCustomDisabled: boolean[] = [];
    @Input() optionCustomIcon: string[] = [];
    @Input() optionCustomTooltip: string[] = [];
    @Input() refreshing = false;
    @Output() customEvent = new EventEmitter<{index: number; icon: string}>();

    constructor(private dashboardService: DashboardService) {}

    refresh() {
        this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, this.widget.id, this.widget);
    }

    zoomWidget() {
        this.dashboardService.zoomWidget(DashboardManipulationEnum.Zoom, this.widget.id, this.widget, false, null);
    }

    custom(i: number) {
        this.customEvent.emit({index: i, icon: this.optionCustomIcon[i]});
    }

}
