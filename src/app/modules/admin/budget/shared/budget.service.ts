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
import {BudgetModel} from './budget.model';
import {catchError, map} from 'rxjs/operators';
import {Observable} from 'rxjs';
import {environment} from '../../../../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class BudgetService {
    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) {
    }

    getBudgets(limit: number, offset: number): Observable<BudgetModel[]> {
        return this.http.get<BudgetModel[]>(environment.budgetApiUrl + '/budgets?limit=' + limit + '&offset=' + offset).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleErrorWithSnackBar('Error loading budgets', BudgetService.name, 'getBudgets()', [])),
        );
    }

    deleteBudget(budget: BudgetModel): Observable<boolean> {
        let url = environment.budgetApiUrl + '/budgets/?budget_identifier=' + budget.budget_identifier;
        if (budget.role !== undefined && budget.role !== null) {
            url += '&role=' + budget.role;
        }
        if (budget.user_id !== undefined && budget.user_id !== null) {
            url += '&user_id=' + budget.user_id;
        }
        return this.http.delete(url).pipe(
            map((_) => true),
            catchError(this.errorHandlerService.handleErrorWithSnackBar('Error deleting budget', BudgetService.name, 'deleteBudget()', false)),
        );
    }

    setBudget(r: BudgetModel): Observable<boolean> {
        return this.http.put<null>(environment.budgetApiUrl + '/budgets', r).pipe(
            map(_ => true),
            catchError((error: HttpErrorResponse) => this.errorHandlerService.handleErrorWithSnackBar('Error setting budget: ' + this.formatErr(error.error), BudgetService.name, 'setBudget()', false)(error)),
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
