/*
 * Copyright 2022 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {Observable, timer} from 'rxjs';
import {environment} from '../../../../../environments/environment';
import {catchError, map, mergeMap, retryWhen} from 'rxjs/operators';
import {ProcessIoVariable, VariablesCount} from './process-io.model';

@Injectable({
    providedIn: 'root',
})
export class ProcessIoService {
    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) {}

    listVariables(limit: number, offset: number, sort: string, keyRegex: string): Observable<ProcessIoVariable[] | null> {
        let query: string[] = []
        if(limit){
            query.push("limit="+limit)
        }
        if(offset){
            query.push("offset="+offset)
        }
        if(sort){
            query.push("sort="+sort)
        }
        if(keyRegex){
            query.push("key_regex="+keyRegex)
        }
        return this.http
            .get<ProcessIoVariable[]>(environment.processIoUrl + '/variables?'+query.join("&"))
            .pipe(catchError(this.errorHandlerService.handleError(ProcessIoService.name, 'listVariables', null)));
    }

    countVariables(keyRegex: string): Observable<VariablesCount | null> {
        let query: string[] = []
        if(keyRegex){
            query.push("key_regex="+keyRegex)
        }
        return this.http
            .get<VariablesCount>(environment.processIoUrl + '/count/variables?'+query.join("&"))
            .pipe(catchError(this.errorHandlerService.handleError(ProcessIoService.name, 'countVariables', null)));
    }

    remove(key: string): Observable<{ status: number }> {
        return this.http
            .delete(environment.processIoUrl + '/variables/'+encodeURIComponent(key), {
                responseType: 'text',
                observe: 'response',
            })
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(ProcessIoService.name, 'remove', { status: 500 })),
            );
    }

    set(variable: ProcessIoVariable): Observable<{ status: number }> {
        return this.http
            .put(environment.processIoUrl + '/variables/'+encodeURIComponent(variable.key), variable,{
                responseType: 'text',
                observe: 'response',
            })
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(ProcessIoService.name, 'set', { status: 500 })),
            );
    }

    get(key: string): Observable<ProcessIoVariable | null> {
        return this.http
            .get<ProcessIoVariable>(environment.processIoUrl + '/variables/'+encodeURIComponent(key))
            .pipe(catchError(this.errorHandlerService.handleError(ProcessIoService.name, 'get', null)));
    }
}
