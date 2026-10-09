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

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MonitorProcessModel } from '../../../../../modules/processes/monitor/shared/monitor-process.model';
import { MonitorService } from '../../../../../modules/processes/monitor/shared/monitor.service';
import { ElementSizeService } from '../../../../../core/services/element-size.service';
import { MatDialog } from '@angular/material/dialog';
import { DashboardService } from '../../../../../modules/dashboard/shared/dashboard.service';
import { openWidgetEditDialog } from '../../../../../modules/dashboard/shared/open-widget-edit-dialog';
import { ChartsProcessDeploymentsEditDialogComponent } from '../dialogs/charts-process-deployments-edit-dialog.component';
import { map } from 'rxjs/operators';
import { DeploymentsPerDay, deploymentsPerDay } from './charts-process-deployments-chart';

@Injectable({
    providedIn: 'root',
})
export class ChartsProcessDeploymentsService {
    private monitorService = inject(MonitorService);
    private elementSizeService = inject(ElementSizeService);
    private dialog = inject(MatDialog);
    private dashboardService = inject(DashboardService);


    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean, userHasUpdatePropertiesAuthorization: boolean): void {
        openWidgetEditDialog(this.dialog, this.dashboardService, ChartsProcessDeploymentsEditDialogComponent, {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization,
            userHasUpdatePropertiesAuthorization
        });
    }

    /** The instances per start day; undefined without instances. */
    getProcessDeploymentHistory(): Observable<DeploymentsPerDay[] | undefined> {
        return this.monitorService.getAllHistoryInstances().pipe(
            map((processes: MonitorProcessModel[]) => (processes.length === 0 ? undefined : deploymentsPerDay(processes))),
        );
    }
}
