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
import { Observable, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorModel } from '../model/error.model';
import {MatLegacySnackBar as MatSnackBar} from '@angular/material/legacy-snack-bar';

@Injectable({
    providedIn: 'root',
})
export class ErrorHandlerService {
    constructor(private snackBar: MatSnackBar) {}

    logError(service: string, method: string, error: any) {
        console.error('Error =>> Service: ' + service + ' =>> Method: ' + method);
        console.error(error);
    }

    handleError<T>(service: string, method: string, result?: T) {
        return (error?: HttpErrorResponse): Observable<T> => {
            this.logError(service, method, error);
            return of(result as T);
        };
    }

    handleErrorWithSnackBar<T>(snackbarMessage: string, service: string, method: string, result?: T) {
        return (error?: HttpErrorResponse): Observable<T> => {
            this.handleError(service, method, result)(error);
            this.snackBar.open(snackbarMessage, 'close', { panelClass: 'snack-bar-error' });
            return of(result as T);
        };
    }

    checkIfErrorExists(toBeDetermined: any): toBeDetermined is ErrorModel {
        if ((toBeDetermined as ErrorModel).error) {
            return true;
        }
        return false;
    }
}
