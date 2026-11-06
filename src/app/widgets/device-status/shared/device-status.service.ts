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
import { ExportService } from '../../../modules/exports/shared/export.service';
import { HttpClient } from '@angular/common/http';
import { AutomationEngineService } from '../../../core/services/automation-engine.service';
import { Observable } from 'rxjs';
import { deleteResources, GeneratedResource, GeneratedResourceDeleters } from '../../shared/generated-resources';

@Injectable({
    providedIn: 'root',
})
export class DeviceStatusService {
    private dialog = inject(MatDialog);
    private dashboardService = inject(DashboardService);
    private exportService = inject(ExportService);
    private automationEngineService = inject(AutomationEngineService);
    private http = inject(HttpClient);

    /** Deletes what the widget generated; a resource that is already gone counts as deleted. */
    deleteElements(elements: DeviceStatusElementModel[] | undefined): void {
        this.deleteResources(this.generatedResources(elements)).subscribe();
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
}
