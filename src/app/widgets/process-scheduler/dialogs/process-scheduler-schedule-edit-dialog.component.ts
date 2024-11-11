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

import { Component, Inject, OnInit } from '@angular/core';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { DashboardResponseMessageModel } from '../../../modules/dashboard/shared/dashboard-response-message.model';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { forkJoin, Observable } from 'rxjs';
import {FormBuilder, FormGroup, Validators} from "@angular/forms";

@Component({
    templateUrl: './process-scheduler-schedule-edit-dialog.component.html',
    styleUrls: ['./process-scheduler-schedule-edit-dialog.component.css'],
})
export class ProcessSchedulerScheduleEditDialogComponent implements OnInit {
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    readAll = false;
    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;
    formGroup: FormGroup;

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<ProcessSchedulerScheduleEditDialogComponent>,
        private deploymentsService: DeploymentsService,
        private dashboardService: DashboardService,
        @Inject(MAT_DIALOG_DATA) data: {
            dashboardId: string;
            widgetId: string;
            userHasUpdateNameAuthorization: boolean;
            userHasUpdatePropertiesAuthorization: boolean;
        },
    ) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
        this.userHasUpdateNameAuthorization = data.userHasUpdateNameAuthorization;
        this.userHasUpdatePropertiesAuthorization = data.userHasUpdatePropertiesAuthorization;
        this.formGroup = this.fb.group({
            name: [this.widget.name, Validators.required],
            readAll: [false],
        });
    }

    ngOnInit() {
        this.getWidgetData();
        this.onChanges();
    }

    onChanges(): void {
        this.formGroup.controls['name'].valueChanges.subscribe(val => {
            this.widget.name = val;
        });
        this.formGroup.controls['readAll'].valueChanges.subscribe(val => {
            this.readAll = val;
        });
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.widget = widget;
            this.readAll = this.widget.properties.readAll === true;
            this.formGroup.patchValue({
                name: this.widget.name,
                readAll: this.readAll,
            });
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    updateName(): Observable<DashboardResponseMessageModel> {
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, this.widget.name);
    }

    updateProperties(): Observable<DashboardResponseMessageModel> {
        this.widget.properties.readAll = this.readAll;
        return this.dashboardService.updateWidgetProperty(this.dashboardId, this.widget.id, [], this.widget.properties);
    }

    save(): void {
        const obs = [];
        if(this.userHasUpdateNameAuthorization) {
            obs.push(this.updateName());
        }
        if(this.userHasUpdatePropertiesAuthorization) {
            obs.push(this.updateProperties());
        }
        forkJoin(obs).subscribe(responses => {
            const errorOccured = responses.find((response) => response.message != 'OK');
            if(!errorOccured) {
                this.dialogRef.close(this.widget);
            }
        });
    }
}
