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
import { DeviceStatusElementModel } from './device-status-properties.model';
import { ExportModel } from '../../../modules/exports/shared/export.model';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { HttpClient } from '@angular/common/http';
import { ProcessSchedulerService } from '../../process-scheduler/shared/process-scheduler.service';
import { Observable } from 'rxjs';
import { deleteGeneratedResources, GeneratedResource } from '../../shared/generated-resources';

@Injectable({
    providedIn: 'root',
})
export class DeviceStatusService {
    private dialog = inject(MatDialog);
    private dashboardService = inject(DashboardService);
    private exportService = inject(ExportService);
    private deploymentsService = inject(DeploymentsService);
    private processSchedulerService = inject(ProcessSchedulerService);
    private http = inject(HttpClient);


    deleteElements(elements: DeviceStatusElementModel[] | undefined): void {
        if (elements) {
            elements.forEach((element: DeviceStatusElementModel) => {
                if (element.exportId) {
                    this.exportService.stopPipeline({ ID: element.exportId } as ExportModel).subscribe();
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

    /** The generated resources the given elements refer to. */
    generatedResources(elements: DeviceStatusElementModel[] | undefined): GeneratedResource[] {
        const resources: GeneratedResource[] = [];
        (elements || []).forEach((element, index) => {
            const label = element.name || 'element ' + (index + 1);
            if (element.exportId) {
                resources.push({ kind: 'export', id: element.exportId, label });
            }
            if (element.deploymentId) {
                resources.push({ kind: 'process deployment', id: element.deploymentId, label });
            }
            if (element.scheduleId) {
                resources.push({ kind: 'schedule', id: element.scheduleId, label });
            }
        });
        return resources;
    }

    /** Deletes the candidates that `stillUsed` does not contain; answers the descriptions of the deletes that failed. */
    deleteGeneratedResources(candidates: GeneratedResource[], stillUsed: GeneratedResource[]): Observable<string[]> {
        return deleteGeneratedResources(candidates, stillUsed, {
            export: (id) => this.exportService.stopPipelineByIdIfExists(id),
            deployment: (id) => this.deploymentsService.v2deleteDeploymentIfExists(id),
            schedule: (id) => this.processSchedulerService.deleteScheduleIfExists(id),
        });
    }
}
