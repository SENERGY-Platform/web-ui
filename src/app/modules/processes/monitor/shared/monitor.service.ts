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
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { catchError, map, share } from 'rxjs/operators';
import { MonitorProcessModel } from './monitor-process.model';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MonitorDetailsDialogComponent } from '../dialogs/monitor-details-dialog.component';
import { MonitorProcessTotalModel } from './monitor-process-total.model';
import { ProcessIncidentsService } from '../../incidents/shared/process-incidents.service';
import { ProcessIncidentsModel } from '../../incidents/shared/process-incidents.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { dialogSize } from '../../../../core/dialog-size';
import { AutomationEngineService } from '../../../../core/services/automation-engine.service';
import { EngineInstance } from '../../../../core/model/automation-engine.model';

// columns of the monitor tables and the sort fields of the engine; the others are not sortable there
const instanceSort = new Map([
    ['startTime', 'started_at'],
    ['endTime', 'ended_at'],
    ['definitionName', 'deployment_name'],
]);

@Injectable({
    providedIn: 'root',
})
export class MonitorService {
    private http = inject(HttpClient);
    private errorHandlerService = inject(ErrorHandlerService);
    private dialog = inject(MatDialog);
    private processIncidentsService = inject(ProcessIncidentsService);
    private ladonService = inject(LadonService);
    private automationEngineService = inject(AutomationEngineService);

    private getAllHistoryInstancesObservable: Observable<MonitorProcessModel[]> | null = null;
    authorizations: PermissionTestResponse;

    constructor() {
        this.authorizations = this.ladonService.getUserAuthorizationsForURI(environment.processServiceUrl);
    }

    getAllHistoryInstances(): Observable<MonitorProcessModel[]> {
        if (this.getAllHistoryInstancesObservable === null) {
            this.getAllHistoryInstancesObservable = this.getAllHistoryInstancesObservable = this.http
                .get<MonitorProcessModel[]>(environment.processServiceUrl + '/v2/history/process-instances')
                .pipe(
                    map((resp) => resp || []),
                    catchError(this.errorHandlerService.handleError(MonitorService.name, 'getAllHistoryInstances', [])),
                    share(),
                );
        }
        return this.getAllHistoryInstancesObservable;
    }

    getFilteredHistoryInstances(
        filter: string,
        searchtype: string,
        searchvalue: string,
        limit: number,
        offset: number,
        value: string,
        order: string,
        businessKey?: string
    ): Observable<MonitorProcessTotalModel> {
        let url = environment.processServiceUrl + '/v2/history/process-instances?'+
            filter+'=true' +
            '&with_total=true' +
            '&maxResults=' + limit +
            '&firstResult=' + offset +
            '&sortBy=' + value +
            '&sortOrder=' + order;
        if (businessKey) {
            url = url + '&processInstanceBusinessKey=' + encodeURIComponent(businessKey);
        }
        if (searchtype === 'processDefinitionNameLike') {
            url = url + '&processDefinitionNameLike='+encodeURIComponent('%'+searchvalue+'%');
        } else {
            url = url + '&'+searchtype+'='+encodeURIComponent(searchvalue);
        }
        return this.http
            .get<MonitorProcessTotalModel>(url)
            .pipe(
                map((resp) => resp || []),
                catchError(
                    this.errorHandlerService.handleError(
                        MonitorService.name,
                        'getFilteredHistoryInstances',
                        {} as MonitorProcessTotalModel,
                    ),
                ),
            );
    }

    /**
     * Instances of the platform and of the hubs, read from the engine, because the routes of the old
     * services list either the platform or one hub. networkId as in DeploymentsService.listOfNetworks.
     * Instances a hub has not reported yet are neither running nor finished and are not listed.
     */
    getInstancesOfNetworks(
        filter: 'running' | 'finished',
        search: string,
        deploymentId: string | undefined,
        limit: number,
        offset: number,
        sortActive: string,
        order: string,
        businessKey?: string,
        networkId?: string,
    ): Observable<MonitorProcessTotalModel> {
        const sortField = instanceSort.get(sortActive);
        return this.automationEngineService
            .listInstances({
                state: filter,
                limit,
                offset,
                sort: sortField && order ? sortField + '.' + order : undefined,
                deployment_id: deploymentId,
                deployment_name: deploymentId ? undefined : search,
                // the business key of an instance is its id; the old engine prefixed some with wardened:
                ids: businessKey ? businessKey.split(',').map((key) => key.replace(/^wardened:/, '')) : undefined,
                network_id: networkId,
            })
            .pipe(
                map((page) => ({ total: page.total, data: (page.items || []).map(historicInstance) })),
                catchError(
                    this.errorHandlerService.handleError(MonitorService.name, 'getInstancesOfNetworks', {
                        total: 0,
                        data: [],
                    } as MonitorProcessTotalModel),
                ),
            );
    }

    stopInstances(id: string): Observable<string> {
        return this.http
            .delete(environment.processServiceUrl + '/v2/process-instances/' + id, { responseType: 'text' })
            .pipe(catchError(this.errorHandlerService.handleError(MonitorService.name, 'stopInstances', 'error')));
    }

    stopMultipleInstances(processes: MonitorProcessModel[]): Observable<string[]> {
        const ids: string[] = [];
        processes.forEach((process: MonitorProcessModel) => {
            ids.push(process.id);
        });
        return this.http
            .request('DELETE', environment.processServiceUrl + '/v2/process-instances', { responseType: 'text', body: ids })
            .pipe()
            .pipe(
                map((value) => [value]),
                catchError(this.errorHandlerService.handleError(MonitorService.name, 'stopInstances', ['error'])),
            );
    }

    deleteInstances(id: string): Observable<string> {
        return this.http
            .delete(environment.processServiceUrl + '/v2/history/process-instances/' + id, { responseType: 'text' })
            .pipe(catchError(this.errorHandlerService.handleError(MonitorService.name, 'deleteInstances', 'error')));
    }

    deleteMultipleInstances(processes: MonitorProcessModel[]): Observable<string[]> {
        const ids: string[] = [];
        processes.forEach((process: MonitorProcessModel) => {
            ids.push(process.id);
        });
        return this.http
            .request('DELETE', environment.processServiceUrl + '/v2/history/process-instances', { responseType: 'text', body: ids })
            .pipe(
                map((value) => [value]),
                catchError(this.errorHandlerService.handleError(MonitorService.name, 'deleteInstances', ['error'])),
            );
    }

    openDetailsDialog(id: string): void {
        this.processIncidentsService.getProcessIncidentsByProcessInstanceId(id).subscribe((incident: ProcessIncidentsModel[]) => {
            const dialogConfig = new MatDialogConfig();
            dialogConfig.disableClose = false;
            Object.assign(dialogConfig, dialogSize('m'));
            dialogConfig.data = {
                incident,
            };
            this.dialog.open(MonitorDetailsDialogComponent, dialogConfig);
        });
    }

    userHasReadAuthorization(): boolean {
        return this.authorizations['GET'];
    }
}

/** an instance of the engine in the format of the history of the old engine, which the tables show */
function historicInstance(instance: EngineInstance): MonitorProcessModel {
    const ended = instance.ended_at ? new Date(instance.ended_at).getTime() : undefined;
    return {
        id: instance.id,
        businessKey: instance.id,
        processDefinitionId: instance.deployment_id,
        processDefinitionKey: instance.deployment_id,
        processDefinitionName: instance.deployment_name,
        processDefinitionVersion: instance.deployment_version,
        startTime: instance.started_at,
        endTime: instance.ended_at || '',
        durationInMillis: ended === undefined ? 0 : ended - new Date(instance.started_at).getTime(),
        state: historicState(instance.state),
        deleteReason: instance.state === 'completed' ? '' : instance.end_reason || '',
        tenantId: instance.owner,
        network_id: instance.network_id || undefined,
    } as MonitorProcessModel;
}

// the states of the history of the old engine; the details of an instance are offered for all but COMPLETED
function historicState(state: string): string {
    switch (state) {
        case 'completed':
            return 'COMPLETED';
        case 'terminated':
            return 'EXTERNALLY_TERMINATED';
        case 'incident':
            return 'INTERNALLY_TERMINATED';
    }
    return 'ACTIVE';
}
