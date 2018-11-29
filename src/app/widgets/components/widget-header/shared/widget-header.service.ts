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

import {Injectable} from '@angular/core';
import {MatDialog, MatDialogConfig} from '@angular/material';

import {WidgetHeaderDeleteDialogComponent} from '../dialogs/widget-header-delete-dialog.component';
import {DashboardService} from '../../../../modules/dashboard/shared/dashboard.service';

@Injectable({
    providedIn: 'root'
})
export class WidgetHeaderService {

    constructor(private dialog: MatDialog,
                private dashboardService: DashboardService) {
    }

    openDeleteWidgetDialog(dashboardId: string, widgetId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(WidgetHeaderDeleteDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((deleteWidget: boolean) => {
           if (deleteWidget === true) {
                this.dashboardService.deleteWidget(dashboardId, widgetId).subscribe(() => {
                    this.dashboardService.initDashboard();
                });
            }
        });
    }

}

