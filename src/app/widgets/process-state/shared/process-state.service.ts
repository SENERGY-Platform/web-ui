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
import {forkJoin, Observable} from 'rxjs';
import {ProcessStateModel} from './process-state.model';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {ProcessStateEditDialogComponent} from '../dialog/process-state-edit-dialog.component';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {catchError} from 'rxjs/operators';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {ProcessRepoService} from '../../../modules/processes/process-repo/shared/process-repo.service';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';

@Injectable({
    providedIn: 'root'
})
export class ProcessStateService {

    constructor(private dialog: MatDialog,
                private dashboardService: DashboardService,
                private processRepoService: ProcessRepoService,
                private deploymentService: DeploymentsService,
                private errorHandlerService: ErrorHandlerService) {
    }

    openEditDialog(dashboardId: string, widgetId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId: widgetId,
            dashboardId: dashboardId,
        };
        const editDialogRef = this.dialog.open(ProcessStateEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getProcessStatus(): Observable<ProcessStateModel> {
        return new Observable<ProcessStateModel>((observer) => {
            this.getRawData().subscribe((obsArray: object[][]) => {
                observer.next(this.setProcessStatus(obsArray));
                observer.complete();
            });
        });
    }

    private setProcessStatus(obsArray: object[][]): ProcessStateModel {
        const processStatus: ProcessStateModel = {available: 0, executable: 0};
        processStatus.available = obsArray[0].length;
        processStatus.executable = obsArray[1].length;

        return processStatus;
    }

    private getRawData(): Observable<object[][]> {

        const array: Observable<object[]>[] = [];

        array.push(this.processRepoService.list('processmodel', 'r'));
        array.push(this.deploymentService.getAll('', 99999, 0, 'deploymentTime', 'desc'));

        return forkJoin(array).pipe(
            catchError(this.errorHandlerService.handleError(ProcessStateService.name, 'getRawData', []))
        );
    }
}

