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
import {MatDialog} from '@angular/material/dialog';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {
    DeviceStatusElementModel
} from './device-status-properties.model';
import {ExportModel} from '../../../modules/data/export/shared/export.model';
import {ExportService} from '../../../modules/data/export/shared/export.service';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {HttpClient} from '@angular/common/http';
import {ProcessSchedulerService} from '../../process-scheduler/shared/process-scheduler.service';

@Injectable({
    providedIn: 'root'
})
export class DeviceStatusService {

    constructor(private dialog: MatDialog,
                private dashboardService: DashboardService,
                private exportService: ExportService,
                private deploymentsService: DeploymentsService,
                private processSchedulerService: ProcessSchedulerService,
                private http: HttpClient) {
    }

    deleteElements(elements: DeviceStatusElementModel[] | undefined): void {
        if (elements) {
            elements.forEach((element: DeviceStatusElementModel) => {
                if (element.exportId) {
                    this.exportService.stopPipeline({ID: element.exportId} as ExportModel).subscribe();
                }
                if (element.deploymentId) {
                    this.deploymentsService.v2deleteDeployment(element.deploymentId).subscribe();
                }
                if (element.scheduleId) {
                    this.processSchedulerService.deleteSchedule(element.scheduleId).subscribe();
                }
            });
        }
    }
}

