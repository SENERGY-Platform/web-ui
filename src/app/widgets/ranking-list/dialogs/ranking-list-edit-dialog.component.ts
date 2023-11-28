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
import { DeploymentsModel } from '../../../modules/processes/deployments/shared/deployments.model';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { DashboardResponseMessageModel } from '../../../modules/dashboard/shared/dashboard-response-message.model';
import { MatTable } from '@angular/material/table';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { forkJoin, Observable } from 'rxjs';

@Component({
    templateUrl: './ranking-list-edit-dialog.component.html',
    styleUrls: ['./ranking-list-edit-dialog.component.css'],
})
export class RankingListEditDialogComponent implements OnInit {
    @ViewChild(MatTable, { static: false }) table!: MatTable<DeploymentsModel>;

    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    userHasUpdateNameAuthorization: boolean = false
    userHasUpdatePropertiesAuthorization: boolean = false 

    constructor(
        private dialogRef: MatDialogRef<RankingListEditDialogComponent>,
        private deploymentsService: DeploymentsService,
        private dashboardService: DashboardService,
        @Inject(MAT_DIALOG_DATA) data: { 
            dashboardId: string; 
            widgetId: string, 
            userHasUpdateNameAuthorization: boolean;
            userHasUpdatePropertiesAuthorization: boolean
        },
    ) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
        this.userHasUpdateNameAuthorization = data.userHasUpdateNameAuthorization;
        this.userHasUpdatePropertiesAuthorization = data.userHasUpdatePropertiesAuthorization
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
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, this.widget.name)
    }

    updateProperties(): Observable<DashboardResponseMessageModel> {
        return this.dashboardService.updateWidgetProperty(this.dashboardId, this.widget.id, [], this.widget.properties)
    }

    save(): void {
        var obs = []
        if(this.userHasUpdateNameAuthorization) {
            obs.push(this.updateName())
        }
        if(this.userHasUpdatePropertiesAuthorization) {
            obs.push(this.updateProperties())
        }        
        
        forkJoin(obs).subscribe(responses => {
            var errorOccured = responses.find((response) => response.message != "OK")
            if(!errorOccured) {
                this.dialogRef.close(this.widget);
            }
        })
    } 
}
