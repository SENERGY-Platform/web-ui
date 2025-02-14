/*
 * Copyright 2023 InfAI (CC SES)
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
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {TimescaleRuleModel, TimescaleRuleTemplateModel} from './timescale-rule.model';
import {catchError, map} from 'rxjs/operators';
import {Observable} from 'rxjs';
import {environment} from '../../../../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class TimescaleRulesService {
    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) {
    }

    getRules(limit: number, offset: number): Observable<TimescaleRuleModel[]> {
        return this.http.get<TimescaleRuleModel[]>(environment.timescaleRuleManagerUrl + '/rules?limit=' + limit + '&offset=' + offset).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleErrorWithSnackBar('Error loading rules', TimescaleRulesService.name, 'getRules()', [])),
        );
    }

    deleteRule(id: string): Observable<boolean> {
        return this.http.delete(environment.timescaleRuleManagerUrl + '/rules/' + id).pipe(
            map((_) => true),
            catchError(this.errorHandlerService.handleErrorWithSnackBar('Error deleting rule', TimescaleRulesService.name, 'deleteRule()', false)),
        );
    }

    createRule(r: TimescaleRuleModel): Observable<TimescaleRuleModel | null> {
        return this.http.post<TimescaleRuleModel>(environment.timescaleRuleManagerUrl + '/rules', r).pipe(
            catchError((error: HttpErrorResponse) => this.errorHandlerService.handleErrorWithSnackBar('Error creating rule: ' + this.formatErr(error.error), TimescaleRulesService.name, 'createRule()', null)(error)),
        );
    }

    createRuleFromTemplate(r: TimescaleRuleModel): Observable<TimescaleRuleModel | null> {
        return this.http.post<TimescaleRuleModel>(environment.timescaleRuleManagerUrl + '/template-rules', r).pipe(
            catchError((error: HttpErrorResponse) => this.errorHandlerService.handleErrorWithSnackBar('Error creating rule: ' + this.formatErr(error.error), TimescaleRulesService.name, 'createRule()', null)(error)),
        );
    }

    updateRule(r: TimescaleRuleModel): Observable<boolean> {
        return this.http.put(environment.timescaleRuleManagerUrl + '/rules/' + r.id, r).pipe(
            map((_) => true),
            catchError((error: HttpErrorResponse) => this.errorHandlerService.handleErrorWithSnackBar('Error updating rule: ' + this.formatErr(error.error), TimescaleRulesService.name, 'updateRule()', false)(error)),
        );
    }

    updateRuleFromTemplate(r: TimescaleRuleModel): Observable<boolean> {
        return this.http.put(environment.timescaleRuleManagerUrl + '/template-rules/' + r.id, r).pipe(
            map((_) => true),
            catchError((error: HttpErrorResponse) => this.errorHandlerService.handleErrorWithSnackBar('Error updating rule: ' + this.formatErr(error.error), TimescaleRulesService.name, 'updateRule()', false)(error)),
        );
    }

    getTemplates(): Observable<TimescaleRuleTemplateModel[]> {
        return this.http.get<any>(environment.timescaleRuleManagerUrl + '/templates').pipe(
            map((resp) => {
                const arr: TimescaleRuleTemplateModel[] = [];
                Object.keys(resp).forEach((k) => {
                    const v = resp[k];
                    if (v !== undefined) {
                        v.name = k;
                        arr.push(v);
                    }
                });
                return arr;
            }),
            catchError(this.errorHandlerService.handleErrorWithSnackBar('Error loading templates', TimescaleRulesService.name, 'getTemplates()', [])),
        );
    }

    private formatErr(err: any): string {
        if (typeof err === 'string' || err instanceof String) {
            return err as string;
        } else {
            return JSON.stringify(err);
        }
    }
}
