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
import { MatDialog } from '@angular/material/dialog';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { openWidgetEditDialog } from '../../../modules/dashboard/shared/open-widget-edit-dialog';
import { ProcessModelListEditDialogComponent } from '../dialogs/process-model-list-edit-dialog.component';
import { Observable } from 'rxjs';
import { ProcessModelListModel } from './process-model-list.model';
import { ProcessModel } from '../../../modules/processes/process-repo/shared/process.model';
import { ProcessRepoService } from '../../../modules/processes/process-repo/shared/process-repo.service';

@Injectable({
    providedIn: 'root',
})
export class ProcessModelListService {
    private dialog = inject(MatDialog);
    private dashboardService = inject(DashboardService);
    private processRepoService = inject(ProcessRepoService);


    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean): void {
        openWidgetEditDialog(this.dialog, this.dashboardService, ProcessModelListEditDialogComponent, {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization
        });
    }

    getProcesses(): Observable<ProcessModelListModel[]> {
        return new Observable<ProcessModelListModel[]>((observer) => {
            this.processRepoService.getProcessModels('', 10, 0, 'date', 'desc').subscribe(processes => {
                observer.next(this.prettifyProcessData(processes.result));
                observer.complete();
            });
        });
    }

    private prettifyProcessData(processes: ProcessModel[]): ProcessModelListModel[] {
        const processesArray: ProcessModelListModel[] = [];
        if (processes !== null) {
            processes.forEach((process) => {
                processesArray.push(new ProcessModelListModel(process.name, process._id, new Date(process.date)));
            });
        }
        return processesArray;
    }
}
