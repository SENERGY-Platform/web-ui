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
import { Observable } from 'rxjs';
import { ChartsModel } from '../../../shared/charts.model';
import { MonitorProcessModel } from '../../../../../modules/processes/monitor/shared/monitor-process.model';
import { MonitorService } from '../../../../../modules/processes/monitor/shared/monitor.service';
import { ElementSizeService } from '../../../../../core/services/element-size.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DashboardService } from '../../../../../modules/dashboard/shared/dashboard.service';
import { WidgetModel } from '../../../../../modules/dashboard/shared/dashboard-widget.model';
import { DashboardManipulationEnum } from '../../../../../modules/dashboard/shared/dashboard-manipulation.enum';
import { ChartsProcessDeploymentsEditDialogComponent } from '../dialogs/charts-process-deployments-edit-dialog.component';
import { ChartDataTableModel } from '../../../../../core/model/chart/chart-data-table.model';
import { ChartsDataTableModel } from '../../../shared/charts-data-table.model';
import { deploymentsChart, deploymentsPerDay, deploymentsTable } from './charts-process-deployments-chart';

@Injectable({
    providedIn: 'root',
})
export class ChartsProcessDeploymentsService {
    constructor(
        private monitorService: MonitorService,
        private elementSizeService: ElementSizeService,
        private dialog: MatDialog,
        private dashboardService: DashboardService,
    ) {}

    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean, userHasUpdatePropertiesAuthorization: boolean): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization,
            userHasUpdatePropertiesAuthorization
        };
        const editDialogRef = this.dialog.open(ChartsProcessDeploymentsEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getProcessDeploymentHistory(widgetId: string): Observable<ChartsModel> {
        return new Observable<ChartsModel>((observer) => {
            this.monitorService.getAllHistoryInstances().subscribe((processes: MonitorProcessModel[]) => {
                if (processes.length === 0) {
                    observer.next(this.setProcessDeploymentValues(widgetId, new ChartsDataTableModel([[]])));
                } else {
                    observer.next(this.setProcessDeploymentValues(widgetId, this.sumUpProcessDeployments(processes)));
                }
                observer.complete();
            });
        });
    }

    private sumUpProcessDeployments(processes: MonitorProcessModel[]): ChartDataTableModel {
        return deploymentsTable(deploymentsPerDay(processes));
    }

    private setProcessDeploymentValues(widgetId: string, dataTable: ChartDataTableModel): ChartsModel {
        return deploymentsChart(dataTable, this.elementSizeService.getHeightAndWidthByElementId(widgetId));
    }
}
