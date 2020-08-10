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

import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {WidgetModel} from '../../modules/dashboard/shared/dashboard-widget.model';
import {ProcessSchedulerService} from './shared/process-scheduler.service';
import {ProcessSchedulerModel} from './shared/process-scheduler.model';
import {Subscription} from 'rxjs';
import {DashboardService} from '../../modules/dashboard/shared/dashboard.service';
import {DeploymentsService} from '../../modules/processes/deployments/shared/deployments.service';
import {ProcessSchedulerWidgetModel} from './shared/process-scheduler-widget.model';
import {DeploymentsPreparedModel} from '../../modules/processes/deployments/shared/deployments-prepared.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {ProcessSchedulerScheduleDialogComponent} from './dialogs/process-scheduler-schedule-dialog.component';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DialogsService} from '../../core/services/dialogs.service';
import {CronConverterService} from './shared/cron-converter.service';

@Component({
    selector: 'senergy-process-scheduler',
    templateUrl: './process-scheduler.component.html',
    styleUrls: ['./process-scheduler.component.css'],
})
export class ProcessSchedulerComponent implements OnInit, OnDestroy {

    schedules: ProcessSchedulerWidgetModel[] = [];
    numReady = -1;
    numReadyNeeded = 0;
    destroy = new Subscription();

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;

    constructor(private processSchedulerService: ProcessSchedulerService,
                private dashboardService: DashboardService,
                private deploymentsService: DeploymentsService,
                private dialog: MatDialog,
                private snackBar: MatSnackBar,
                private dialogsService: DialogsService,
                private cronConverterService: CronConverterService) {
    }

    ngOnInit() {
        this.getSchedules();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    edit() {
        this.processSchedulerService.openEditDialog(this.dashboardId, this.widget.id);
    }

    delete(scheduleId: string) {
        this.dialogsService.openDeleteDialog('schedule').afterClosed().subscribe((deleteDashboard: boolean) => {
            if (deleteDashboard === true) {
                this.processSchedulerService.deleteSchedule(scheduleId).subscribe((resp: { status: number }) => {
                    if (resp.status === 200) {
                        this.reload();
                    }
                });
            }
        });
    }

    add(item: (ProcessSchedulerWidgetModel | null)) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = item ? JSON.parse(JSON.stringify(item)) : null;
        const editDialogRef = this.dialog.open(ProcessSchedulerScheduleDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((schedule: ProcessSchedulerModel) => {
            schedule.created_by = this.widget.id;
            if (schedule !== undefined) {
                if (schedule.id === '') {
                    this.processSchedulerService.createSchedule(schedule).subscribe((resp: (ProcessSchedulerModel | null)) => {
                        if (resp !== null) {
                            this.snackBar.open('Schedule saved!', undefined, {duration: 2000});
                            this.reload();
                        } else {
                            this.snackBar.open('Error while saving schedule!');
                        }
                    });
                } else {
                    this.processSchedulerService.updateSchedule(schedule).subscribe((resp: (ProcessSchedulerModel | null)) => {
                        if (resp !== null) {
                            this.snackBar.open('Schedule updated!', undefined, {duration: 2000});
                            this.reload();
                        } else {
                            this.snackBar.open('Error while updating schedule!');
                        }
                    });
                }

            }
        });
    }

    ready(): boolean {
        return this.numReady === this.numReadyNeeded;
    }

    private getSchedules() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.reload();
            }
        });
    }

    private reload() {
        this.numReady = 0;
        this.processSchedulerService.getSchedules(this.widget.properties.readAll === true ? null : this.widget.id)
            .subscribe((schedules: ProcessSchedulerModel[]) => {
                this.numReadyNeeded = schedules.length;
                this.schedules = [];
                schedules.forEach((schedule: ProcessSchedulerModel) => {
                    const newSchedule: ProcessSchedulerWidgetModel = {
                        cron: schedule.cron,
                        processId: schedule.process_deployment_id,
                        scheduleId: schedule.id,
                        disabled: schedule.disabled,
                    } as ProcessSchedulerWidgetModel;

                    if (schedule.process_alias !== undefined && schedule.process_alias !== '') {
                        newSchedule.processAlias = schedule.process_alias;
                        this.schedules.push(newSchedule);
                        this.numReady++;
                    } else { // No alias set, use actual process name
                        this.deploymentsService.getDeployments(schedule.process_deployment_id)
                            .subscribe((deployment: (DeploymentsPreparedModel | null)) => {
                                newSchedule.processName = deployment ? deployment.name : 'Invalid Deployment';
                                this.schedules.push(newSchedule);
                                this.numReady++;
                            });
                    }
                });
            });
    }

    cronReadable(cron: string): string {
        return this.cronConverterService.getHumanReadableString(cron);
    }

    canEdit(schedule: ProcessSchedulerWidgetModel) {
        return !this.cronConverterService.hasSecondsField(schedule.cron);
    }
}
