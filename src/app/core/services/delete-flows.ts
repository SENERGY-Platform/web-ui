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


import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, filter, forkJoin, map } from 'rxjs';
import { DeleteDialogOptions, DeleteDialogResponse } from '../dialogs/delete-dialog.component';
import { DialogsService } from './dialogs.service';
import { snackError, snackSuccess } from './snack-bar-messages';

/** "1 function", "2 functions": plural only above one, so zero reads singular like the old page texts. */
export function countLabel(count: number, one: string, many: string): string {
    return count + ' ' + (count > 1 ? many : one);
}

/** Emits once when the delete dialog was confirmed; cancel, Esc and backdrop emit nothing and complete. */
export function confirmDelete(dialogs: DialogsService, text: string, options?: DeleteDialogOptions): Observable<void> {
    const ref = options === undefined ? dialogs.openDeleteDialog(text) : dialogs.openDeleteDialog(text, options);
    const closed: Observable<boolean | DeleteDialogResponse | undefined> = ref.afterClosed();
    return closed.pipe(
        filter((result) => (typeof result === 'boolean' ? result : result?.confirmed === true)),
        map(() => undefined),
    );
}

/** Every job answered true. */
export function everyTrue(results: boolean[]): boolean {
    return results.every((result) => result === true);
}

/** No job answered null or with HTTP status 500; other statuses count as success. */
export function noneNullOrServerError(results: unknown[]): boolean {
    return results.findIndex((result) => result === null || (result as { status?: number }).status === 500) === -1;
}

export interface BulkDeleteConfig<T> {
    /** Subject of the confirm dialog, see countLabel. */
    text: string;
    /** Built after the confirmation, so nothing is requested on cancel. */
    jobs: () => Observable<T>[];
    /** Runs after the confirmation, before the first request. */
    before?: () => void;
    /** Decides success from the results; without it the outcome is next (success) or error (failure). */
    isSuccess?: (results: T[]) => boolean;
    successMessage: string;
    errorMessage: string | ((err: unknown) => string);
    /** Runs on a failed forkJoin, before the error snack bar (only without isSuccess). */
    onError?: (err: unknown) => void;
    /** Runs after the snack bar, in success and failure. */
    after: () => void;
}

/**
 * Confirms, runs the jobs in parallel and reports the outcome. Cancel does nothing at all, and an empty
 * job list never completes the outcome, as the pages did with forkJoin([]).
 */
export function bulkDelete<T>(dialogs: DialogsService, snackBar: MatSnackBar, config: BulkDeleteConfig<T>): void {
    const finish = (ok: boolean, err?: unknown): void => {
        if (ok) {
            snackSuccess(snackBar, config.successMessage);
        } else {
            snackError(snackBar, typeof config.errorMessage === 'function' ? config.errorMessage(err) : config.errorMessage);
        }
        config.after();
    };

    confirmDelete(dialogs, config.text).subscribe(() => {
        config.before?.();
        const isSuccess = config.isSuccess;
        forkJoin(config.jobs()).subscribe(
            isSuccess
                ? { next: (results) => finish(isSuccess(results)) }
                : {
                      next: () => finish(true),
                      error: (err) => {
                          config.onError?.(err);
                          finish(false, err);
                      },
                  },
        );
    });
}
