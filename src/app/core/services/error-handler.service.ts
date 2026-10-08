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
import {MatSnackBar, MatSnackBarRef, TextOnlySnackBar} from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class ErrorHandlerService {
    private reportedSnackBar?: { ref: MatSnackBarRef<TextOnlySnackBar>; text: string };

    constructor(private snackBar: MatSnackBar) {}

    logError(service: string, method: string, error: any) {
        console.error('Error =>> Service: ' + service + ' =>> Method: ' + method);
        console.error(error);
    }

    /** Logs, names the failing backend in a snack bar and answers with the fallback `result`. */
    handleError<T>(service: string, method: string, result?: T) {
        return (error?: HttpErrorResponse): Observable<T> => {
            this.logError(service, method, error);
            this.reportHttpError(service, error);
            return of(result as T);
        };
    }

    /** Like handleError, for failures that are a normal outcome of the call (probes, optional data). */
    handleErrorQuietly<T>(service: string, method: string, result?: T) {
        return (error?: HttpErrorResponse): Observable<T> => {
            this.logError(service, method, error);
            return of(result as T);
        };
    }

    handleErrorWithSnackBar<T>(snackbarMessage: string, service: string, method: string, result?: T) {
        return (error?: HttpErrorResponse): Observable<T> => {
            this.logError(service, method, error);
            this.showErrorInSnackBar(snackbarMessage);
            return of(result as T);
        };
    }

    checkIfErrorExists(toBeDetermined: any): toBeDetermined is ErrorModel {
        if ((toBeDetermined as ErrorModel).error) {
            return true;
        }
        return false;
    }

    showErrorInSnackBar(snackbarMessage: string) {
        this.snackBar.open(snackbarMessage, 'close', { panelClass: 'snack-bar-error' });
    }

    private reportHttpError(service: string, error?: HttpErrorResponse) {
        if (!(error instanceof HttpErrorResponse)) {
            return;
        }
        const backend = ErrorHandlerService.backendName(error.url, service);
        const text = error.status === 0
            ? backend + ' is not reachable'
            // statusText is not shown: over HTTP/2 it is empty and Angular's XHR backend fills in 'OK'
            : backend + ': request failed (' + error.status + ')';
        // polling widgets hit the same dead backend repeatedly; one open message is enough
        if (this.reportedSnackBar?.text === text) {
            return;
        }
        const ref = this.snackBar.open(text, 'close', { panelClass: 'snack-bar-error' });
        this.reportedSnackBar = { ref, text };
        ref.afterDismissed().subscribe(() => {
            if (this.reportedSnackBar?.ref === ref) {
                this.reportedSnackBar = undefined;
            }
        });
    }

    /** Key of the longest `environment` URL that prefixes `url`, kebab-cased without its Url suffix. */
    private static backendName(url: string | null, fallback: string): string {
        if (!url) {
            return fallback;
        }
        let best: { key: string; length: number } | undefined;
        for (const [key, value] of Object.entries(environment)) {
            if (typeof value !== 'string' || !/^(https?|wss?):\/\//.test(value)) {
                continue;
            }
            const base = value.replace(/\/+$/, '');
            const next = url.charAt(base.length);
            if (url.startsWith(base) && (next === '' || next === '/' || next === '?' || next === '#')
                && (best === undefined || base.length > best.length)) {
                best = { key, length: base.length };
            }
        }
        if (best !== undefined) {
            return best.key
                .replace(/(Url|URL)$/, '')
                .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
                .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
                .toLowerCase();
        }
        try {
            return new URL(url).host || fallback;
        } catch {
            return fallback;
        }
    }
}
