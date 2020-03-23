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
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {ProcessModelListEditDialogComponent} from '../dialogs/process-model-list-edit-dialog.component';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {Observable} from 'rxjs';
import {ProcessModelListModel} from './process-model-list.model';
import {ProcessModel} from '../../../modules/processes/process-repo/shared/process.model';
import {ProcessRepoService} from '../../../modules/processes/process-repo/shared/process-repo.service';


@Injectable({
    providedIn: 'root'
})
export class ProcessModelListService {

    constructor(private dialog: MatDialog,
                private dashboardService: DashboardService,
                private processRepoService: ProcessRepoService) {
    }

    openEditDialog(dashboardId: string, widgetId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId: widgetId,
            dashboardId: dashboardId,
        };
        const editDialogRef = this.dialog.open(ProcessModelListEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getProcesses(): Observable<ProcessModelListModel[]> {
        return new Observable<ProcessModelListModel[]>((observer) => {
            this.processRepoService.getProcessModels('', 10, 0, 'date', 'desc', null).subscribe((processes: ProcessModel[]) => {
                observer.next(this.prettifyProcessData(processes));
                observer.complete();
            });
        });
    }

    private prettifyProcessData(processes: ProcessModel[]): ProcessModelListModel[] {
        const processesArray: ProcessModelListModel[] = [];
        if (processes !== null) {
            processes.forEach(process => {
                processesArray.push(new ProcessModelListModel(process.name, process.id, new Date(process.date)));
            });
        }
        return processesArray;
    }
}

