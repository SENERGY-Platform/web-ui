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
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {HttpClient} from '@angular/common/http';
import {forkJoin, Observable} from 'rxjs';
import {environment} from '../../../../../environments/environment';
import {catchError, map, share} from 'rxjs/internal/operators';
import {MonitorProcessModel} from './monitor-process.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {MonitorDetailsDialogComponent} from '../dialogs/monitor-details-dialog.component';
import {MonitorProcessTotalModel} from './monitor-process-total.model';
import {ProcessIncidentsModel} from '../../incidents/shared/process-incidents.model';

@Injectable({
    providedIn: 'root'
})
export class MonitorFogFactory {

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService, private dialog: MatDialog) {
    }

    withHubId(hubId: string): MonitorFogService {
        return new MonitorFogService(hubId, this.http, this.errorHandlerService, this.dialog);
    }
}


export class MonitorFogService {

    constructor(private hubId: string,
                private http: HttpClient,
                private errorHandlerService: ErrorHandlerService,
                private dialog: MatDialog) {
    }

    getFilteredHistoryInstances(filter: string, searchtype: string, searchvalue: string, limit: number, offset: number, feature: string, order: string): Observable<MonitorProcessTotalModel> {
        let url = environment.processSyncUrl +
            '/history/process-instances?sort=' + feature + '.' + order +
            '&limit=' + limit +
            '&offset=' + offset +
            '&network_id=' + encodeURIComponent(this.hubId) +
            '&with_total=true' +
            '&state=' + encodeURIComponent(filter);
        if (searchtype === 'processDefinitionId') {
            url = url + '&processDefinitionId=' + encodeURIComponent(searchvalue);
        } else {
            url = url + '&search=' + encodeURIComponent(searchvalue);
        }

        return this.http.get<MonitorProcessTotalModel>(url).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(MonitorFogService.name, 'getFilteredHistoryInstances', {} as MonitorProcessTotalModel))
        );
    }

    stopInstances(id: string): Observable<string> {
        return this.http.delete
        (environment.processSyncUrl + '/process-instances/' + encodeURIComponent(this.hubId) + '/' + encodeURIComponent(id), {responseType: 'text'}).pipe(
            catchError(this.errorHandlerService.handleError(MonitorFogService.name, 'stopInstances', 'error'))
        );
    }

    stopMultipleInstances(processes: MonitorProcessModel[]): Observable<string[]> {

                const array: Observable<string>[] = [];

                processes.forEach((process: MonitorProcessModel) => {
                    array.push(this.stopInstances(process.id));
                });

                return forkJoin(array).pipe(
                    catchError(this.errorHandlerService.handleError(MonitorFogService.name, 'stopMultipleInstances', []))
                );
            }

    deleteInstances(id: string): Observable<string> {
        return this.http.delete
        (environment.processSyncUrl + '/history/process-instances/' +  encodeURIComponent(this.hubId) + '/' + encodeURIComponent(id), {responseType: 'text'}).pipe(
            catchError(this.errorHandlerService.handleError(MonitorFogService.name, 'deleteInstances', 'error'))
        );
    }

    deleteMultipleInstances(processes: MonitorProcessModel[]): Observable<string[]> {

        const array: Observable<string>[] = [];

        processes.forEach((process: MonitorProcessModel) => {
            array.push(this.deleteInstances(process.id));
        });

        return forkJoin(array).pipe(
            catchError(this.errorHandlerService.handleError(MonitorFogService.name, 'deleteMultipleInstances', []))
        );
    }

    openDetailsDialog(id: string): void {
        this.http.get<ProcessIncidentsModel[]>
        (environment.processSyncUrl + '/incidents?network_id=' +  encodeURIComponent(this.hubId) + '&process_instance_id=' + encodeURIComponent(id)).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(MonitorFogService.name, 'openDetailsDialog', []))
        ).subscribe((incident: ProcessIncidentsModel[]) => {
            const dialogConfig = new MatDialogConfig();
            dialogConfig.disableClose = false;
            dialogConfig.data = {
                incident: incident,
            };
            this.dialog.open(MonitorDetailsDialogComponent, dialogConfig);
        });

    }


}
