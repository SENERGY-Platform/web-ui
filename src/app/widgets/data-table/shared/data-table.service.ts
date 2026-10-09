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
import { ExportModel } from '../../../modules/exports/shared/export.model';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { ProcessSchedulerService } from '../../process-scheduler/shared/process-scheduler.service';
import { DataTableElementModel } from './data-table.model';
import { Observable } from 'rxjs';
import { deleteGeneratedResources, GeneratedResource } from '../../shared/generated-resources';

@Injectable({
    providedIn: 'root',
})
export class DataTableService {
    private dialog = inject(MatDialog);
    private dashboardService = inject(DashboardService);
    private exportService = inject(ExportService);
    private deploymentsService = inject(DeploymentsService);
    private processSchedulerService = inject(ProcessSchedulerService);


    deleteElements(elements: DataTableElementModel[] | undefined): void {
        if (elements === undefined) {
            return;
        }
        elements.forEach((element) => {
            this.deleteElement(element);
        });
    }

    /**
     * The generated resources the given elements refer to. An export counts only when the widget created it
     * (`exportCreatedByWidget`); other exports belong to the user.
     */
    generatedResources(elements: DataTableElementModel[] | undefined): GeneratedResource[] {
        const resources: GeneratedResource[] = [];
        (elements || []).forEach((element) => {
            const label = element.name || 'a measurement without a name';
            const device = element.elementDetails?.device;
            if (element.exportCreatedByWidget && element.exportId) {
                resources.push({ kind: 'export', id: element.exportId, label });
            }
            if (device?.deploymentId) {
                resources.push({ kind: 'process deployment', id: device.deploymentId, label });
            }
            if (device?.scheduleId) {
                resources.push({ kind: 'schedule', id: device.scheduleId, label });
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

    deleteElement(element: DataTableElementModel, shouldSubscribe: boolean = true): Observable<any>[] {
        const observables: Observable<any>[] = [];
        if (element.exportCreatedByWidget) {
            observables.push(this.exportService.stopPipeline({ ID: element.exportId } as ExportModel));
        }
        if (element.elementDetails.device?.deploymentId) {
            observables.push(this.deploymentsService.v2deleteDeployment(element.elementDetails.device?.deploymentId));
        }
        if (element.elementDetails.device?.scheduleId) {
            observables.push(this.processSchedulerService.deleteSchedule(element.elementDetails.device?.scheduleId));
        }
        if (shouldSubscribe) {
            observables.forEach((o) => o.subscribe());
            return [];
        } else {
            return observables;
        }
    }
}
