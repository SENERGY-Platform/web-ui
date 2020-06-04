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
                private deploymentsService: DeploymentsService) {
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

    delete(id: string) {
        this.processSchedulerService.deleteSchedule(id).subscribe((resp: { status: number }) => {
            if (resp.status === 200) {
                this.reload();
            }
        });
    }

    add() {
        this.processSchedulerService.openScheduleDialog();
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
        const min = cron.split(' ')[0];
        const hours = cron.split(' ')[1];
        const days = cron.split(' ')[4];
        const date = new Date();
        date.setUTCHours(parseInt(hours, 10));
        date.setUTCMinutes(parseInt(min, 10));
        return date.getHours() + ':' + date.getMinutes() + ' ' + days;
    }
}
