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

import {Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';

import {DashboardService} from '../../../../modules/dashboard/shared/dashboard.service';
import {DashboardManipulationEnum} from '../../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {DialogsService} from '../../../../core/services/dialogs.service';

@Injectable({
    providedIn: 'root'
})
export class WidgetFooterService {

    constructor(private dialog: MatDialog,
                private dashboardService: DashboardService,
                private dialogsService: DialogsService) {
    }

    openDeleteWidgetDialog(dashboardId: string, widgetId: string): void {
        this.dialogsService.openDeleteDialog('widget').afterClosed().subscribe((deleteWidget: boolean) => {
            if (deleteWidget === true) {
                this.dashboardService.deleteWidget(dashboardId, widgetId).subscribe(() => {
                    this.dashboardService.manipulateWidget(DashboardManipulationEnum.Delete, widgetId, null);
                });
            }
        });
    }

}

