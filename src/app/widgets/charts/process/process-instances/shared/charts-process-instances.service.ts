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
import {Observable} from 'rxjs';
import {ChartsModel} from '../../../shared/charts.model';
import {MonitorProcessModel} from '../../../../../modules/processes/monitor/shared/monitor-process.model';
import {ChartsDataTableModel} from '../../../shared/charts-data-table.model';
import {MonitorService} from '../../../../../modules/processes/monitor/shared/monitor.service';
import {ElementSizeService} from '../../../../../core/services/element-size.service';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {ChartsProcessInstancesEditDialogComponent} from '../dialogs/charts-process-instances-edit-dialog.component';
import {DashboardService} from '../../../../../modules/dashboard/shared/dashboard.service';
import {WidgetModel} from '../../../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../../../modules/dashboard/shared/dashboard-manipulation.enum';

@Injectable({
    providedIn: 'root'
})
export class ChartsProcessInstancesService {

    constructor(private monitorService: MonitorService,
                private elementSizeService: ElementSizeService,
                private dialog: MatDialog,
                private dashboardService: DashboardService) {
    }

    openEditDialog(dashboardId: string, widgetId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId: widgetId,
            dashboardId: dashboardId,
        };
        const editDialogRef = this.dialog.open(ChartsProcessInstancesEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getProcessInstancesStatus(widgetId: string): Observable<ChartsModel> {
        return new Observable<ChartsModel>((observer) => {
            this.monitorService.getAllHistoryInstances().subscribe((processes: MonitorProcessModel[]) => {
                if (processes.length === 0) {
                    observer.next(this.setProcessInstancesStatusValues(widgetId, new ChartsDataTableModel([[]])));
                } else {
                    observer.next(this.setProcessInstancesStatusValues(widgetId, this.sumUpProcessStatuses(processes)));
                }
                    observer.complete();
                }
            );
        });
    }

    private sumUpProcessStatuses(processes: MonitorProcessModel[]): ChartsDataTableModel {
        const dataTable = new ChartsDataTableModel([['Status', 'Count']]);
        const status = {active: 0, suspended: 0, completed: 0, externallyTerminated: 0, internallyTerminated: 0};
        processes.forEach(process => {
            switch (process.state) {
                case 'ACTIVE': {
                    status.active++;
                    break;
                }
                case 'SUSPENDED': {
                    status.suspended++;
                    break;
                }
                case 'COMPLETED': {
                    status.completed++;
                    break;
                }
                case 'EXTERNALLY_TERMINATED': {
                    status.externallyTerminated++;
                    break;
                }
                case 'INTERNALLY_TERMINATED': {
                    status.internallyTerminated++;
                    break;
                }
                default: {
                    throw new Error('Unknown process state.');
                }
            }
        });
        dataTable.data.push(['Active', status.active]);
        dataTable.data.push(['Suspended', status.suspended]);
        dataTable.data.push(['Completed', status.completed]);
        dataTable.data.push(['ExternallyTerminated', status.externallyTerminated]);
        dataTable.data.push(['InternallyTerminated', status.internallyTerminated]);
        return dataTable;
    }

    private setProcessInstancesStatusValues(widgetId: string, dataTable: ChartsDataTableModel): ChartsModel {

        const element = this.elementSizeService.getHeightAndWidthByElementId(widgetId);

        return new ChartsModel(
            'PieChart',
            dataTable.data,
            {
                chartArea: {width: element.widthPercentage, height: element.heightPercentage},
                height: element.height,
                width: element.width,
                pieSliceText: 'value',
                legend: 'none',
            });
    }
}

