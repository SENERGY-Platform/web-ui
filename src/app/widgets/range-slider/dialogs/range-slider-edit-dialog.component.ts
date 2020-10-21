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

import {Component, Inject, OnInit, ViewChild} from '@angular/core';
import {FormControl} from '@angular/forms';
import {DeploymentsModel} from '../../../modules/processes/deployments/shared/deployments.model';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {MatTable} from '@angular/material/table';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

export interface TableElement {
    name: string;
    id: string;
    trigger: string;
}

@Component({
    templateUrl: './range-slider-edit-dialog.component.html',
    styleUrls: ['./range-slider-edit-dialog.component.css'],
})
export class RangeSliderEditDialogComponent implements OnInit {

    @ViewChild(MatTable, {static: false}) table!: MatTable<DeploymentsModel>;

    formControl = new FormControl('');

    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {properties: {imgUrl: ''}} as WidgetModel;

    constructor(private dialogRef: MatDialogRef<RangeSliderEditDialogComponent>,
                private dashboardService: DashboardService,
                @Inject(MAT_DIALOG_DATA) data: { dashboardId: string, widgetId: string }) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
    }

    ngOnInit() {
        this.getWidgetData();
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.widget = widget;
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
    }
}
