/*
 * Copyright 2018 InfAI (CC SES)
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
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {HttpClient} from '@angular/common/http';
import {forkJoin, Observable} from 'rxjs';
import {environment} from '../../../../../environments/environment';
import {catchError, map, share} from 'rxjs/internal/operators';
import {MonitorProcessModel} from './monitor-process.model';
import {MatDialog, MatDialogConfig} from '@angular/material';
import {MonitorDetailsDialogComponent} from '../dialogs/monitor-details-dialog.component';
import {MonitorProcessVariableInstancesModel} from './monitor-process-variable-instances.model';
import {MonitorProcessIncidentModel} from './monitor-process-incident.model';

@Injectable({
    providedIn: 'root'
})
export class MonitorService {

    private getAllHistoryInstancesObservable: Observable<MonitorProcessModel[]> | null = null;

    constructor(private http: HttpClient,
                private errorHandlerService: ErrorHandlerService,
                private dialog: MatDialog) {
    }

    getAllHistoryInstances(): Observable<MonitorProcessModel[]> {
        if (this.getAllHistoryInstancesObservable === null) {
            this.getAllHistoryInstancesObservable = this.getAllHistoryInstancesObservable = this.http.get<MonitorProcessModel[]>(environment.processServiceUrl + '/history/process-instance').pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(MonitorService.name, 'getAllHistoryInstances', [])),
                share()
            );
        }
        return this.getAllHistoryInstancesObservable;
    }

    getFilteredHistoryInstances(filter: string): Observable<MonitorProcessModel[]> {
        return this.http.get<MonitorProcessModel[]>
        (environment.processServiceUrl + '/history/' + filter + '/process-instance').pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(MonitorService.name, 'getFilteredHistoryInstances', []))
        );
    }

    getVariableInstances(id: string): Observable<MonitorProcessVariableInstancesModel[]> {
        return this.http.get<MonitorProcessVariableInstancesModel[]>
        (environment.processServiceUrl + '/history/process-instance/' + id + '/variable-instance').pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(MonitorService.name, 'getVariableInstances', []))
        );
    }

    getInstancesIncidents(id: string): Observable<MonitorProcessIncidentModel[]> {
        return this.http.get<MonitorProcessIncidentModel[]>
        (environment.processServiceUrl + '/process-instance/' + id + '/incident').pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(MonitorService.name, 'getInstancesIncidents', []))
        );
    }

    stopInstances(id: string): Observable<string> {
        return this.http.delete
        (environment.processServiceUrl + '/process-instance/' + id, {responseType: 'text'}).pipe(
            catchError(this.errorHandlerService.handleError(MonitorService.name, 'stopInstances', 'error'))
        );
    }

    openDetailsDialog(id: string): void {
        this.getInstancesIncidents(id).subscribe((incident: MonitorProcessIncidentModel[]) => {
            this.getVariableInstances(id).subscribe((variables: MonitorProcessVariableInstancesModel[]) => {
                const dialogConfig = new MatDialogConfig();
                dialogConfig.disableClose = false;
                dialogConfig.data = {
                    variables: variables,
                    incident: incident,
                };
                this.dialog.open(MonitorDetailsDialogComponent, dialogConfig);
            });
        });

    }


}
