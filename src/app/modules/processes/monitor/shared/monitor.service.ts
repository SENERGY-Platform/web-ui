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

import { Injectable } from '@angular/core';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { catchError, map, share } from 'rxjs/operators';
import { MonitorProcessModel } from './monitor-process.model';
import { MatLegacyDialog as MatDialog, MatLegacyDialogConfig as MatDialogConfig } from '@angular/material/legacy-dialog';
import { MonitorDetailsDialogComponent } from '../dialogs/monitor-details-dialog.component';
import { MonitorProcessTotalModel } from './monitor-process-total.model';
import { ProcessIncidentsService } from '../../incidents/shared/process-incidents.service';
import { ProcessIncidentsModel } from '../../incidents/shared/process-incidents.model';
import { DeviceInstancesUpdateModel } from '../../../devices/device-instances/shared/device-instances-update.model';

@Injectable({
    providedIn: 'root',
})
export class MonitorService {
    private getAllHistoryInstancesObservable: Observable<MonitorProcessModel[]> | null = null;

    constructor(
        private http: HttpClient,
        private errorHandlerService: ErrorHandlerService,
        private dialog: MatDialog,
        private processIncidentsService: ProcessIncidentsService,
    ) {}

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
    ): Observable<MonitorProcessTotalModel> {
        let url = environment.processServiceUrl + '/v2/history/process-instances?'+
            filter+'=true' +
            '&with_total=true' +
            '&maxResults=' + limit +
            '&firstResult=' + offset +
            '&sortBy=' + value +
            '&sortOrder=' + order;
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
            dialogConfig.data = {
                incident,
            };
            this.dialog.open(MonitorDetailsDialogComponent, dialogConfig);
        });
    }
}
