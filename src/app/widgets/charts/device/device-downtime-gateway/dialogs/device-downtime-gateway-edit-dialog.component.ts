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

import { Component, OnInit, ViewChild, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { DeploymentsModel } from '../../../../../modules/processes/deployments/shared/deployments.model';
import { WidgetModel } from '../../../../../modules/dashboard/shared/dashboard-widget.model';
import { DeploymentsService } from '../../../../../modules/processes/deployments/shared/deployments.service';
import { DashboardService } from '../../../../../modules/dashboard/shared/dashboard.service';
import { DashboardResponseMessageModel } from '../../../../../modules/dashboard/shared/dashboard-response-message.model';
import { saveWidgetEdits } from '../../../../../modules/dashboard/shared/save-widget-edits';
import { MatTable } from '@angular/material/table';
import { Observable } from 'rxjs';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatErrorMessagesDirective } from '../../../../../core/directives/matError.directive';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatButton } from '@angular/material/button';

@Component({
    templateUrl: './device-downtime-gateway-edit-dialog.component.html',
    styleUrls: ['./device-downtime-gateway-edit-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, MatFormField, MatLabel, MatInput, FormsModule, MatError, MatErrorMessagesDirective, MatCheckbox, MatDialogActions, MatButton]
})
export class DeviceDowntimeGatewayEditDialogComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<DeviceDowntimeGatewayEditDialogComponent>>(MatDialogRef);
    private deploymentsService = inject(DeploymentsService);
    private dashboardService = inject(DashboardService);

    @ViewChild(MatTable, { static: false }) table!: MatTable<DeploymentsModel>;

    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = { properties: { hideZeroPercentage: false } } as WidgetModel;
    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;

    constructor() {
        const data = inject<{
            dashboardId: string;
            widgetId: string;
            userHasUpdateNameAuthorization: boolean;
            userHasUpdatePropertiesAuthorization: boolean;
        }>(MAT_DIALOG_DATA);

        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
        this.userHasUpdateNameAuthorization = data.userHasUpdateNameAuthorization;
        this.userHasUpdatePropertiesAuthorization = data.userHasUpdatePropertiesAuthorization;
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

    updateName(): Observable<DashboardResponseMessageModel> {
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, this.widget.name);
    }

    updateProperties(): Observable<DashboardResponseMessageModel> {
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

        saveWidgetEdits(obs).subscribe(() => {
            this.dialogRef.close(this.widget);
        });
    }
}
