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
import { Observable, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorModel } from '../model/error.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { snackCentralError, snackError } from './snack-bar-messages';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class ErrorHandlerService {
    private snackBar = inject(MatSnackBar);

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
        snackError(this.snackBar, snackbarMessage);
    }

    private reportHttpError(service: string, error?: HttpErrorResponse) {
        if (!(error instanceof HttpErrorResponse)) {
            return;
        }
        const backend = ErrorHandlerService.backendName(error.url, service);
        const text = error.status === 0
            ? backend + ' is not reachable'
            // statusText is not shown: over HTTP/2 it is empty and Angular's XHR backend fills in 'OK'
            : backend + ': request failed (' + error.status + ')' + ErrorHandlerService.bodyMessage(error);
        // polling widgets hit the same dead backend repeatedly; one open message is enough
        snackCentralError(this.snackBar, text);
    }

    /** ': <message>' from a string body or the `error`/`message` string of an object body, at most 200 characters. */
    private static bodyMessage(error: HttpErrorResponse): string {
        const body: unknown = error.error;
        let message: unknown = body;
        if (typeof body === 'object' && body !== null) {
            const fields = body as { error?: unknown; message?: unknown };
            message = typeof fields.error === 'string' && fields.error.trim() !== '' ? fields.error : fields.message;
        }
        if (typeof message !== 'string' || message.trim() === '') {
            return '';
        }
        return ': ' + message.trim().slice(0, 200);
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
