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

import { Injectable } from '@angular/core';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../../../../environments/environment';
import {catchError, map, share} from 'rxjs/internal/operators';
import {MonitorProcessModel} from './monitor-process.model';

@Injectable({
  providedIn: 'root'
})
export class MonitorService {

    private getAllHistoryInstancesObservable: Observable<MonitorProcessModel[]> | null = null;

  constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) { }

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

}
