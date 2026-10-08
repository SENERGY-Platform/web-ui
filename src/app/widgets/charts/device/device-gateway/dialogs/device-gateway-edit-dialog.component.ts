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
import { MatTable } from '@angular/material/table';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatErrorMessagesDirective } from '../../../../../core/directives/matError.directive';
import { MatButton } from '@angular/material/button';

@Component({
    templateUrl: './device-gateway-edit-dialog.component.html',
    styleUrls: ['./device-gateway-edit-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, MatFormField, MatLabel, MatInput, FormsModule, MatError, MatErrorMessagesDirective, MatDialogActions, MatButton]
})
export class DeviceGatewayEditDialogComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<DeviceGatewayEditDialogComponent>>(MatDialogRef);
    private deploymentsService = inject(DeploymentsService);
    private dashboardService = inject(DashboardService);

    @ViewChild(MatTable, { static: false }) table!: MatTable<DeploymentsModel>;

    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    userHasUpdateNameAuthorization = false;

    constructor() {
        const data = inject<{
            dashboardId: string;
            widgetId: string;
            userHasUpdateNameAuthorization: boolean;
        }>(MAT_DIALOG_DATA);

        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
        this.userHasUpdateNameAuthorization = data.userHasUpdateNameAuthorization;
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
        this.dashboardService.updateWidgetName(this.dashboardId, this.widgetId, this.widget.name).subscribe((resp: DashboardResponseMessageModel) => {
            if (resp.message === 'OK') {
                this.dialogRef.close(this.widget);
            }
        });
    }
}
