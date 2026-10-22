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
import { AutomationEngineService } from '../../../core/services/automation-engine.service';
import { DataTableElementModel } from './data-table.model';
import { Observable } from 'rxjs';
import { deleteResources, GeneratedResource, GeneratedResourceDeleters } from '../../shared/generated-resources';

@Injectable({
    providedIn: 'root',
})
export class DataTableService {
    private dialog = inject(MatDialog);
    private dashboardService = inject(DashboardService);
    private exportService = inject(ExportService);
    private automationEngineService = inject(AutomationEngineService);

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

    /** Deletes the resources; answers those whose delete failed. */
    deleteResources(resources: GeneratedResource[]): Observable<GeneratedResource[]> {
        return deleteResources(resources, this.deleters());
    }

    private deleters(): GeneratedResourceDeleters {
        return {
            export: (id) => this.exportService.stopPipelineByIdIfExists(id),
            deployment: (id) => this.automationEngineService.deleteDeploymentIfExists(id),
            schedule: (id) => this.automationEngineService.deleteScheduleIfExists(id),
        };
    }

    deleteElement(element: DataTableElementModel, shouldSubscribe: boolean = true): Observable<any>[] {
        const observables: Observable<any>[] = [];
        if (element.exportCreatedByWidget) {
            observables.push(this.exportService.stopPipeline({ ID: element.exportId } as ExportModel));
        }
        if (element.elementDetails.device?.deploymentId) {
            observables.push(this.automationEngineService.deleteDeployment(element.elementDetails.device?.deploymentId));
        }
        if (element.elementDetails.device?.scheduleId) {
            observables.push(this.automationEngineService.deleteSchedule(element.elementDetails.device?.scheduleId));
        }
        if (shouldSubscribe) {
            observables.forEach((o) => o.subscribe());
            return [];
        } else {
            return observables;
        }
    }
}
