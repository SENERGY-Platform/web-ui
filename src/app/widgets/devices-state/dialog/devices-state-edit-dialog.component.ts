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

import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DeploymentsModel } from '../../../modules/processes/deployments/shared/deployments.model';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { DashboardResponseMessageModel } from '../../../modules/dashboard/shared/dashboard-response-message.model';
import { MatTable } from '@angular/material/table';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';

@Component({
    templateUrl: './devices-state-edit-dialog.component.html',
    styleUrls: ['./devices-state-edit-dialog.component.css'],
})
export class DevicesStateEditDialogComponent implements OnInit {
    @ViewChild(MatTable, { static: false }) table!: MatTable<DeploymentsModel>;

    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    userHasUpdateNameAuthorization = false;
    formGroup: FormGroup = new FormGroup({});

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<DevicesStateEditDialogComponent>,
        private deploymentsService: DeploymentsService,
        private dashboardService: DashboardService,
        @Inject(MAT_DIALOG_DATA) data: { dashboardId: string; widgetId: string; userHasUpdateNameAuthorization: boolean},
    ) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
        this.userHasUpdateNameAuthorization = data.userHasUpdateNameAuthorization;
    }

    ngOnInit() {
        this.formGroup = this.fb.group({
            name: ['', Validators.required],
        });
        this.getWidgetData();
        this.onChanges();
    }

    onChanges(): void {
        this.formGroup.controls['name'].valueChanges.subscribe(val => {
            this.widget.name = val;
        });
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.widget = widget;
            this.formGroup.patchValue({
                name: this.widget.name
            });
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, this.widget.name).subscribe((resp: DashboardResponseMessageModel) => {
            if (resp.message === 'OK') {
                this.dialogRef.close(this.widget);
            }
        });
    }
}
