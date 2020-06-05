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
import {
    WidgetModel
} from '../../modules/dashboard/shared/dashboard-widget.model';
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
import {DashboardManipulationEnum} from '../../modules/dashboard/shared/dashboard-manipulation.enum';
import {DialogsService} from '../../core/services/dialogs.service';

@Component({
    selector: 'senergy-process-scheduler',
    templateUrl: './process-scheduler.component.html',
    styleUrls: ['./process-scheduler.component.css'],
})
export class ProcessSchedulerComponent implements OnInit, OnDestroy {

    schedules: ProcessSchedulerWidgetModel[] = [];
    ready = false;
    destroy = new Subscription();

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;

    constructor(private processSchedulerService: ProcessSchedulerService,
                private dashboardService: DashboardService,
                private deploymentsService: DeploymentsService,
                private dialog: MatDialog,
                private snackBar: MatSnackBar,
                private dialogsService: DialogsService) {
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

    add() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        const editDialogRef = this.dialog.open(ProcessSchedulerScheduleDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((schedule: ProcessSchedulerModel) => {
            if (schedule !== undefined) {
                this.processSchedulerService.createSchedule(schedule).subscribe((resp: (ProcessSchedulerModel | null)) => {
                    if (resp !== null) {
                        this.snackBar.open('Schedule saved!', undefined, {duration: 2000});
                        this.reload();
                    } else {
                        this.snackBar.open('Error while saving schedule!');
                    }

                });
            }
        });
    }

    private getSchedules() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.reload();
            }
        });
    }

    private reload() {
        this.ready = false;
        this.processSchedulerService.getSchedules().subscribe((schedules: ProcessSchedulerModel[]) => {
            this.schedules = [];
            schedules.forEach((schedule: ProcessSchedulerModel) => {
                this.deploymentsService.getDeployments(schedule.process_deployment_id).subscribe((deployment: (DeploymentsPreparedModel | null)) => {
                    this.schedules.push({
                        cron: schedule.cron,
                        cronHumanReadable: this.splitCron(schedule.cron),
                        processId: schedule.process_deployment_id,
                        scheduleId: schedule.id,
                        processName: deployment ? deployment.name : 'Invalid Deployment',
                    });
                });
            });
            this.ready = true;
        });
    }

    private splitCron(cron: string) {
        const daysAbbreviation = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        const min = cron.split(' ')[0];
        const hours = cron.split(' ')[1];
        const days = cron.split(' ')[4].split(',');
        const daysReadable: string[] = [];
        days.forEach((day: string) => {
            daysReadable.push(daysAbbreviation[parseInt(day, 10)]);
        });

        const date = new Date();
        date.setUTCHours(parseInt(hours, 10));
        date.setUTCMinutes(parseInt(min, 10));

        let time = date.getHours() + ':';
        if (date.getMinutes() < 10) {
            time += '0' + date.getMinutes();
        } else {
            time += date.getMinutes();
        }

        return time + ' ' + daysReadable.join();
    }
}
