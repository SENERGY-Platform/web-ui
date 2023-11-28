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

import { Injectable } from '@angular/core';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { RankingListEditDialogComponent } from '../dialogs/ranking-list-edit-dialog.component';
import { DashboardManipulationEnum } from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';

@Injectable({
    providedIn: 'root',
})
export class RankingListService {
    constructor(private dialog: MatDialog, private dashboardService: DashboardService) {}

    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean, userHasUpdatePropertiesAuthorization: boolean): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization,
            userHasUpdatePropertiesAuthorization
        };
        const editDialogRef = this.dialog.open(RankingListEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }
}
