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

import { Component, Input, OnInit, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WidgetModel } from '../../modules/dashboard/shared/dashboard-widget.model';
import { ProcessSchedulerService } from './shared/process-scheduler.service';
import { ProcessSchedulerModel } from './shared/process-scheduler.model';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { DeploymentsService } from '../../modules/processes/deployments/shared/deployments.service';
import { ProcessSchedulerWidgetModel } from './shared/process-scheduler-widget.model';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ProcessSchedulerScheduleDialogComponent } from './dialogs/process-scheduler-schedule-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogsService } from '../../core/services/dialogs.service';
import { snackError, snackSuccess } from '../../core/services/snack-bar-messages';
import { CronConverterService } from './shared/cron-converter.service';
import { MatCard, MatCardContent } from '@angular/material/card';
import { WidgetHeaderComponent } from '../components/widget-header/widget-header.component';
import { WidgetSpinnerComponent } from '../components/widget-spinner/widget-spinner.component';
import { MatList, MatListItem, MatListItemTitle, MatListItemIcon, MatListItemLine, MatListItemMeta } from '@angular/material/list';
import { NgClass } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { WidgetNoDataComponent } from '../../core/components/widget-no-data/widget-no-data.component';
import { WidgetFooterComponent } from '../components/widget-footer/widget-footer.component';

@Component({
    selector: 'senergy-process-scheduler',
    templateUrl: './process-scheduler.component.html',
    styleUrls: ['./process-scheduler.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatCard, WidgetHeaderComponent, MatCardContent, WidgetSpinnerComponent, MatList, MatListItem, NgClass, MatListItemTitle, MatIcon, MatListItemIcon, MatListItemLine, MatListItemMeta, MatIconButton, MatTooltip, WidgetNoDataComponent, WidgetFooterComponent]
})
export class ProcessSchedulerComponent implements OnInit {
    private processSchedulerService = inject(ProcessSchedulerService);
    private dashboardService = inject(DashboardService);
    private deploymentsService = inject(DeploymentsService);
    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);
    private dialogsService = inject(DialogsService);
    private cronConverterService = inject(CronConverterService);
    private destroyRef = inject(DestroyRef);

    schedules: ProcessSchedulerWidgetModel[] = [];
    numReady = -1;
    numReadyNeeded = 0;

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;

    ngOnInit() {
        this.getSchedules();
    }

    edit() {
        this.processSchedulerService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }

    delete(scheduleId: string) {
        this.dialogsService
            .openDeleteDialog('schedule')
            .afterClosed()
            .subscribe((deleteDashboard: boolean | undefined) => {
                if (deleteDashboard === true) {
                    this.processSchedulerService.deleteSchedule(scheduleId).subscribe((resp: { status: number }) => {
                        if (resp.status === 200) {
                            this.reload();
                        }
                    });
                }
            });
    }

    add(item: ProcessSchedulerWidgetModel | null) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = item ? JSON.parse(JSON.stringify(item)) : null;
        const editDialogRef = this.dialog.open(ProcessSchedulerScheduleDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((schedule: ProcessSchedulerModel) => {
            schedule.created_by = this.widget.id;
            if (schedule !== undefined) {
                if (schedule.id === '') {
                    this.processSchedulerService.createSchedule(schedule).subscribe((resp: ProcessSchedulerModel | null) => {
                        if (resp !== null) {
                            snackSuccess(this.snackBar, 'Schedule saved!');
                            this.reload();
                        } else {
                            snackError(this.snackBar, 'Error while saving schedule!');
                        }
                    });
                } else {
                    this.processSchedulerService.updateSchedule(schedule).subscribe((resp: ProcessSchedulerModel | null) => {
                        if (resp !== null) {
                            snackSuccess(this.snackBar, 'Schedule updated!');
                            this.reload();
                        } else {
                            snackError(this.snackBar, 'Error while updating schedule!');
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
        this.dashboardService.initWidgetObservable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.reload();
            }
        });
    }

    private reload() {
        this.numReady = 0;
        this.processSchedulerService
            .getSchedules(this.widget.properties.readAll === true ? null : this.widget.id)
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
                    } else {
                        // No alias set, use actual process name
                        this.deploymentsService.getDeploymentName(schedule.process_deployment_id).subscribe((deploymentName) => {
                            newSchedule.processName = deploymentName;
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
