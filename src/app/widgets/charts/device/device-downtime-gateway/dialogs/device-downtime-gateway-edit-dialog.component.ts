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

import {Component, Inject, OnInit, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef, MatTable} from '@angular/material';
import {DeploymentsModel} from '../../../../../modules/processes/deployments/shared/deployments.model';
import {WidgetModel} from '../../../../../modules/dashboard/shared/dashboard-widget.model';
import {DeploymentsService} from '../../../../../modules/processes/deployments/shared/deployments.service';
import {DashboardService} from '../../../../../modules/dashboard/shared/dashboard.service';
import {DashboardResponseMessageModel} from '../../../../../modules/dashboard/shared/dashboard-response-message.model';

@Component({
    templateUrl: './device-downtime-gateway-edit-dialog.component.html',
    styleUrls: ['./device-downtime-gateway-edit-dialog.component.css'],
})
export class DeviceDowntimeGatewayEditDialogComponent implements OnInit {

    @ViewChild(MatTable, {static: false}) table!: MatTable<DeploymentsModel>;

    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {id: '', name: '', type: '', properties: {hideZeroPercentage: false}};

    constructor(private dialogRef: MatDialogRef<DeviceDowntimeGatewayEditDialogComponent>,
                private deploymentsService: DeploymentsService,
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
        this.dashboardService.updateWidget(this.dashboardId, this.widget).subscribe((resp: DashboardResponseMessageModel) => {
            if (resp.message === 'OK') {
                this.dialogRef.close(this.widget);
            }
        });
    }

}
