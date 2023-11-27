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
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { DashboardManipulationEnum } from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import { forkJoin, Observable } from 'rxjs';
import { ProcessSchedulerModel } from './process-scheduler.model';
import { ProcessRepoService } from '../../../modules/processes/process-repo/shared/process-repo.service';
import { environment } from '../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { HttpClient, HttpResponseBase } from '@angular/common/http';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProcessSchedulerScheduleEditDialogComponent } from '../dialogs/process-scheduler-schedule-edit-dialog.component';

@Injectable({
    providedIn: 'root',
})
export class ProcessSchedulerService {
    constructor(
        private dialog: MatDialog,
        private dashboardService: DashboardService,
        private processRepoService: ProcessRepoService,
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private snackBar: MatSnackBar,
    ) {}

    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean, userHasUpdatePropertiesAuthorization: boolean): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.minHeight = '235px';
        dialogConfig.data = {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization,
            userHasUpdatePropertiesAuthorization
        };
        const editDialogRef = this.dialog.open(ProcessSchedulerScheduleEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getSchedules(createdBy: string | null): Observable<ProcessSchedulerModel[]> {
        let path = '/schedules';
        if (createdBy !== null && createdBy !== '') {
            path += '?created_by=' + createdBy;
        }
        return this.http.get<ProcessSchedulerModel[]>(environment.processSchedulerUrl + path).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'getSchedules()', [])),
        );
    }

    deleteSchedule(scheduleId: string): Observable<{ status: number }> {
        return this.http
            .delete<HttpResponseBase>(environment.processSchedulerUrl + '/schedules/' + scheduleId, { observe: 'response' })
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'deleteSchedule', { status: 500 })),
            );
    }

    createSchedule(schedule: ProcessSchedulerModel): Observable<ProcessSchedulerModel | null> {
        return this.http.post<ProcessSchedulerModel>(environment.processSchedulerUrl + '/schedules', schedule).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'deleteSchedule', null)),
        );
    }

    updateSchedule(schedule: ProcessSchedulerModel): Observable<ProcessSchedulerModel | null> {
        return this.http.put<ProcessSchedulerModel>(environment.processSchedulerUrl + '/schedules/' + schedule.id, schedule).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'updateSchedule', null)),
        );
    }

    deleteSchedulesByWidget(widgetId: string): Observable<{ status: number }[]> {
        return new Observable<{ status: number }[]>((obs) => {
            this.getSchedules(widgetId).subscribe((schedules) => {
                const observables: Observable<{ status: number }>[] = [];
                schedules.forEach((schedule) => observables.push(this.deleteSchedule(schedule.id)));
                forkJoin(observables).subscribe((states) => {
                    obs.next(states);
                    obs.complete();
                });
            });
        });
    }
}
