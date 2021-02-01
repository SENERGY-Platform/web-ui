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
import {ExportModel} from '../../../modules/exports/shared/export.model';
import {ExportService} from '../../../modules/exports/shared/export.service';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {ProcessSchedulerService} from '../../process-scheduler/shared/process-scheduler.service';
import {DataTableElementModel} from './data-table.model';
import {Observable} from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class DataTableService {

    constructor(private dialog: MatDialog,
                private dashboardService: DashboardService,
                private exportService: ExportService,
                private deploymentsService: DeploymentsService,
                private processSchedulerService: ProcessSchedulerService) {
    }

    deleteElements(elements: DataTableElementModel[] | undefined): void {
        if (elements === undefined) {
            return;
        }
        elements.forEach(element => {
            this.deleteElement(element);
        });
    }

    deleteElementsAndObserve(elements: DataTableElementModel[] | undefined): Observable<any>[] {
        const observables: Observable<any>[] = [];
        if (elements === undefined) {
            return observables;
        }
        elements.forEach(element => {
            observables.push(...this.deleteElement(element, false));
        });
        return observables;
    }

    deleteElement(element: DataTableElementModel, shouldSubscribe: boolean = true): Observable<any>[] | void {
        const observables: Observable<any>[] = [];
        if (element.exportCreatedByWidget) {
            observables.push(this.exportService.stopPipeline({ID: element.exportId} as ExportModel));
        }
        if (element.elementDetails.device?.deploymentId) {
            observables.push(this.deploymentsService.deleteDeployment(element.elementDetails.device?.deploymentId));
        }
        if (element.elementDetails.device?.scheduleId) {
            observables.push(this.processSchedulerService.deleteSchedule(element.elementDetails.device?.scheduleId));
        }
        if (shouldSubscribe) {
            observables.forEach(o => o.subscribe());
            return;
        } else {
            return observables;
        }
    }
}

