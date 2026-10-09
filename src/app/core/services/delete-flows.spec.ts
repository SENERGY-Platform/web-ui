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
import { Observable, of, throwError } from 'rxjs';
import { bulkDelete, confirmDelete, countLabel, everyTrue, noneNullOrServerError } from './delete-flows';
import { DialogsService } from './dialogs.service';
import { DeleteDialogResponse } from '../dialogs/delete-dialog.component';

describe('delete-flows', () => {
    let dialogs: { openDeleteDialog: jasmine.Spy };
    let snackBar: { open: jasmine.Spy };
    let calls: string[];

    function answer(result: boolean | DeleteDialogResponse | undefined): void {
        dialogs.openDeleteDialog.and.returnValue({ afterClosed: () => of(result) });
    }

    beforeEach(() => {
        dialogs = { openDeleteDialog: jasmine.createSpy('openDeleteDialog') };
        snackBar = { open: jasmine.createSpy('open').and.callFake(() => calls.push('snack')) };
        calls = [];
    });

    describe('countLabel', () => {
        it('uses the plural only above one, as the pages did', () => {
            expect(countLabel(0, 'function', 'functions')).toBe('0 function');
            expect(countLabel(1, 'function', 'functions')).toBe('1 function');
            expect(countLabel(2, 'function', 'functions')).toBe('2 functions');
            expect(countLabel(2, 'process', 'processes')).toBe('2 processes');
        });
    });

    describe('confirmDelete', () => {
        function run(text = 'function One'): { emitted: number; completed: boolean } {
            const seen = { emitted: 0, completed: false };
            confirmDelete(dialogs as unknown as DialogsService, text).subscribe({
                next: () => seen.emitted++,
                complete: () => (seen.completed = true),
            });
            return seen;
        }

        it('emits once and completes when the dialog answered true', () => {
            answer(true);
            expect(run()).toEqual({ emitted: 1, completed: true });
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('function One');
        });

        [false, undefined].forEach((result) => {
            it('emits nothing but completes when the dialog answered ' + result, () => {
                answer(result);
                expect(run()).toEqual({ emitted: 0, completed: true });
            });
        });

        it('reads the confirmed flag of a response and passes the options on', () => {
            answer({ confirmed: true, checkboxChecked: false });
            const seen = { emitted: 0 };
            confirmDelete(dialogs as unknown as DialogsService, 'environment E', { note: 'n' }).subscribe(() => seen.emitted++);
            expect(seen.emitted).toBe(1);
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('environment E', { note: 'n' });

            answer({ confirmed: false });
            confirmDelete(dialogs as unknown as DialogsService, 'environment E', { note: 'n' }).subscribe(() => seen.emitted++);
            expect(seen.emitted).toBe(1);
        });
    });

    describe('success predicates', () => {
        it('everyTrue: only all true, an empty list counts as true', () => {
            expect(everyTrue([true, true])).toBeTrue();
            expect(everyTrue([true, false])).toBeFalse();
            expect(everyTrue([false])).toBeFalse();
            expect(everyTrue([])).toBeTrue();
            expect(everyTrue([true, 1 as unknown as boolean])).toBeFalse();
        });

        it('noneNullOrServerError: null and status 500 fail, other statuses and bodies pass', () => {
            expect(noneNullOrServerError([{}, {}])).toBeTrue();
            expect(noneNullOrServerError([{}, null])).toBeFalse();
            expect(noneNullOrServerError([{ status: 500 }])).toBeFalse();
            expect(noneNullOrServerError([{ status: 404 }, { status: 204 }])).toBeTrue();
            expect(noneNullOrServerError([])).toBeTrue();
        });
    });

    describe('bulkDelete', () => {
        let jobs: jasmine.Spy<() => Observable<boolean>[]>;
        let before: jasmine.Spy;
        let after: jasmine.Spy;
        let onError: jasmine.Spy;

        function run(extra: { isSuccess?: (r: boolean[]) => boolean; errorMessage?: string | ((e: unknown) => string) } = {}): void {
            bulkDelete<boolean>(dialogs as unknown as DialogsService, snackBar as unknown as MatSnackBar, {
                text: '2 things',
                jobs,
                before,
                onError,
                after,
                successMessage: 'Things deleted successfully.',
                errorMessage: 'Error while deleting things!',
                ...extra,
            });
        }

        beforeEach(() => {
            jobs = jasmine.createSpy('jobs').and.callFake(() => {
                calls.push('jobs');
                return [of(true), of(true)];
            });
            before = jasmine.createSpy('before').and.callFake(() => calls.push('before'));
            after = jasmine.createSpy('after').and.callFake(() => calls.push('after'));
            onError = jasmine.createSpy('onError');
        });

        [false, undefined].forEach((result) => {
            it('does nothing at all when the dialog answered ' + result, () => {
                answer(result);
                run({ isSuccess: everyTrue });
                run();
                expect(dialogs.openDeleteDialog).toHaveBeenCalledWith('2 things');
                expect(jobs).not.toHaveBeenCalled();
                expect(before).not.toHaveBeenCalled();
                expect(snackBar.open).not.toHaveBeenCalled();
                expect(after).not.toHaveBeenCalled();
            });
        });

        it('with a predicate: before, jobs, success snack, after, in that order', () => {
            answer(true);
            run({ isSuccess: everyTrue });
            expect(calls).toEqual(['before', 'jobs', 'snack', 'after']);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Things deleted successfully.', undefined, { duration: 2000 });
        });

        it('with a predicate: a failing result gives the error snack and still runs after', () => {
            answer(true);
            jobs.and.returnValue([of(true), of(false)]);
            run({ isSuccess: everyTrue });
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting things!', 'close', { panelClass: 'snack-bar-error' });
            expect(after).toHaveBeenCalledTimes(1);
            expect(onError).not.toHaveBeenCalled();
        });

        it('without a predicate: completion is success', () => {
            answer(true);
            run();
            expect(snackBar.open).toHaveBeenCalledOnceWith('Things deleted successfully.', undefined, { duration: 2000 });
            expect(after).toHaveBeenCalledTimes(1);
        });

        it('without a predicate: an error runs onError, then the error snack built from it, then after', () => {
            answer(true);
            jobs.and.returnValue([throwError(() => 'boom')]);
            run({ errorMessage: (err) => 'Error while deleting things!: ' + err });
            expect(onError).toHaveBeenCalledOnceWith('boom');
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting things!: boom', 'close', { panelClass: 'snack-bar-error' });
            expect(after).toHaveBeenCalledTimes(1);
        });

        it('an empty job list reports nothing, as forkJoin([]) did', () => {
            answer(true);
            jobs.and.returnValue([]);
            run({ isSuccess: everyTrue });
            run();
            expect(before).toHaveBeenCalledTimes(2);
            expect(snackBar.open).not.toHaveBeenCalled();
            expect(after).not.toHaveBeenCalled();
        });
    });
});
