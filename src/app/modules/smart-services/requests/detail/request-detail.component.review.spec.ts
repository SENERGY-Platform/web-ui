/*
 * Copyright 2026 InfAI (CC SES)
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

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { REQUEST_POLL_MS, RequestDetailComponent } from './request-detail.component';
import { ContentReviewService } from '../shared/content-review.service';
import { ReviewRequestModel } from '../shared/content-review.model';
import { DialogsService } from '../../../../core/services/dialogs.service';
import { CodeEditorComponent } from '../../../../core/components/code-editor/code-editor.component';
import { RejectDialogComponent } from '../reject-dialog/reject-dialog.component';

describe('RequestDetailComponent review actions', () => {
    let fixture: ComponentFixture<RequestDetailComponent>;
    let get: jasmine.Spy;
    let setTestCase: jasmine.Spy;
    let startTest: jasmine.Spy;
    let startFiles: jasmine.Spy;
    let publish: jasmine.Spy;
    let reject: jasmine.Spy;
    let withdraw: jasmine.Spy;
    let confirm: jasmine.Spy;
    let confirmed: boolean;
    let dialogOpen: jasmine.Spy;
    let dialogResult: string | undefined;

    const request = (overrides: Partial<ReviewRequestModel> = {}): ReviewRequestModel => ({
        id: 'r1', kind: 'smart-service', design_id: 'd', release_id: 'rel-1', name: 'Heating', author_id: 'author', author_name: 'Ada',
        test_description: 'Check the heating', test_parameters: null, test_case: null, state: 'in_review', error: '',
        test: { status: 'none', at: null, detail: '' },
        sync: { status: 'none', files: null, truncated: false, commit: '', at: null, detail: '' },
        files: { status: 'none', at: null, detail: '', truncated: false, count: 0, operation_id: '' },
        operations: null, history: null, created_at: '2026-10-20T10:00:00Z', updated_at: '2026-10-21T11:30:00Z', version: 1,
        ...overrides,
    });

    const withCase = (overrides: Partial<ReviewRequestModel> = {}) => request({ test_case: { parameters: { a: 1 } }, ...overrides });
    const passed = { status: 'passed' as const, at: null, detail: '' };
    const stored = JSON.stringify({ parameters: { a: 1 } }, null, 2);

    interface Options {
        reviewer?: boolean;
        userId?: string;
        write?: Observable<ReviewRequestModel | null>;
    }

    function init(answers: ReviewRequestModel[], options: Options = {}) {
        let next = 0;
        const write = options.write ?? of(request());
        confirmed = true;
        dialogResult = 'Name the exports';
        get = jasmine.createSpy('get').and.callFake(() => of(answers[Math.min(next++, answers.length - 1)]));
        setTestCase = jasmine.createSpy('setTestCase').and.returnValue(write);
        startTest = jasmine.createSpy('startTest').and.returnValue(write);
        startFiles = jasmine.createSpy('startFiles').and.returnValue(write);
        publish = jasmine.createSpy('publish').and.returnValue(write);
        reject = jasmine.createSpy('reject').and.returnValue(write);
        withdraw = jasmine.createSpy('withdraw').and.returnValue(write);
        confirm = jasmine.createSpy('openConfirmDialog').and.callFake(() => ({ afterClosed: () => of(confirmed) }));
        dialogOpen = jasmine.createSpy('open').and.callFake(() => ({ afterClosed: () => of(dialogResult) }));
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, RequestDetailComponent],
            providers: [
                {
                    provide: ContentReviewService,
                    useValue: {
                        userId: () => options.userId ?? 'reviewer', userIsReviewer: () => options.reviewer !== false,
                        get, getFiles: () => of(null), withdraw, setTestCase, startTest, startFiles, publish, reject,
                    },
                },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'r1' } } } },
                { provide: DialogsService, useValue: { openConfirmDialog: confirm } },
                { provide: MatDialog, useValue: { open: dialogOpen } },
                { provide: MatSnackBar, useValue: { open: () => undefined } },
                { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
            ],
        });
        fixture = TestBed.createComponent(RequestDetailComponent);
        fixture.detectChanges();
    }

    const root = (): HTMLElement => fixture.nativeElement;
    const text = (): string => root().textContent || '';
    const editors = (): CodeEditorComponent[] => fixture.debugElement.queryAll(By.directive(CodeEditorComponent)).map((e) => e.componentInstance);
    const headerButtons = (): string[] =>
        Array.from(root().querySelectorAll('senergy-page-header button')).map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim());
    const button = (label: string): HTMLButtonElement | undefined =>
        (Array.from(root().querySelectorAll('button')) as HTMLButtonElement[]).find((b) => (b.textContent || '').includes(label));
    const saveBar = (): HTMLElement | null => root().querySelector('senergy-save-bar');
    const saveButton = (): HTMLButtonElement => root().querySelector('senergy-save-bar button.save') as HTMLButtonElement;
    const discardButton = (): HTMLButtonElement => root().querySelector('senergy-save-bar button.discard') as HTMLButtonElement;

    function type(value: string) {
        editors()[0].valueChange.emit(value);
        fixture.detectChanges();
    }

    describe('which actions are shown', () => {
        it('offers a reviewer Reject, and no Publish without a test case', () => {
            init([request()]);

            expect(headerButtons()).toEqual(['block Reject']);
            expect(button('Start test')).toBeUndefined();
            expect(button('Make files again')).toBeDefined();
        });

        it('offers Publish only for a stored test case with a passed test', () => {
            init([withCase({ test: passed })]);
            expect(headerButtons()).toEqual(['publish Publish', 'block Reject']);

            for (const other of [
                request({ test: passed }),
                withCase({ test: { status: 'failed', at: null, detail: '' } }),
                withCase({ test: { status: 'none', at: null, detail: '' } }),
            ]) {
                fixture.destroy();
                TestBed.resetTestingModule();
                init([other]);
                expect(headerButtons()).not.toContain('publish Publish');
            }
        });

        it('orders Publish, Reject and Withdraw when the reviewer is also the author', () => {
            init([withCase({ test: passed })], { userId: 'author' });

            expect(headerButtons()).toEqual(['publish Publish', 'block Reject', 'undo Withdraw']);
            expect(root().querySelector('senergy-page-header button[matButton="filled"]')?.textContent).toContain('Publish');
        });

        it('shows the author no review action and a read-only test case', () => {
            init([withCase({ test: passed })], { reviewer: false, userId: 'author' });

            expect(headerButtons()).toEqual(['undo Withdraw']);
            expect(button('Start test')).toBeUndefined();
            expect(button('Make files again')).toBeUndefined();
            expect(button('Remove test case')).toBeUndefined();
            expect(editors().length).toBe(1);
            expect(editors()[0].readOnly).toBeTrue();
            expect(editors()[0].value).toBe(stored);
            expect(saveBar()).toBeNull();
        });

        it('says there is no test case for the author when none is stored', () => {
            init([request()], { reviewer: false, userId: 'author' });

            expect(text()).toContain('No test case has been written yet.');
            expect(editors().length).toBe(0);
        });

        it('hides every review action outside of in_review', () => {
            init([withCase({ state: 'published', test: passed })]);

            expect(headerButtons()).toEqual([]);
            expect(button('Start test')).toBeUndefined();
            expect(button('Make files again')).toBeUndefined();
            expect(button('Remove test case')).toBeUndefined();
            expect(editors()[0].readOnly).toBeTrue();
        });

        it('hides every review action while the files job, the test, the transfer or another operation runs', fakeAsync(() => {
            const running = [
                withCase({ test: passed, files: { status: 'running', at: null, detail: '', truncated: false, count: 0, operation_id: '' } }),
                withCase({ test: { status: 'running', at: null, detail: '' } }),
                withCase({ test: passed, state: 'moving' }),
                withCase({ test: passed, operations: [{ id: 'o', kind: 'files', status: 'running', result: null, started_at: '2026-10-21T11:00:00Z', finished_at: null }] }),
            ];
            for (const one of running) {
                init([one]);

                expect(headerButtons()).toEqual([]);
                expect(button('Start test')).toBeUndefined();
                expect(button('Make files again')).toBeUndefined();
                expect(button('Remove test case')).toBeUndefined();
                expect(editors()[0].readOnly).toBeTrue();
                fixture.destroy();
                TestBed.resetTestingModule();
            }
        }));

        it('offers Start test beside the test status once a test case is stored', () => {
            init([withCase()]);

            expect(button('Start test')?.disabled).toBeFalse();
        });
    });

    describe('test case', () => {
        it('shows the stored test case editable for a reviewer and no save bar while unchanged', () => {
            init([withCase()]);

            expect(editors()[0].language).toBe('json');
            expect(editors()[0].readOnly).toBeFalse();
            expect(editors()[0].value).toBe(stored);
            expect(saveBar()).toBeNull();

            type(stored);
            expect(saveBar()).toBeNull();
        });

        it('mentions that a changed test case resets the test and names the keys of the format', () => {
            init([withCase()]);

            expect(text()).toContain('A changed test case resets the test.');
            expect(text()).toContain('parameters');
            expect(text()).toContain('export_within_minutes');
            expect(text()).toContain('standing_export_hours');
            expect(text()).toContain('training');
            expect(text()).toContain('cases');
        });

        it('keeps the test description and parameters visible above the test case', () => {
            init([withCase({ test_parameters: { rooms: 2 } })]);

            expect(text().indexOf('Check the heating')).toBeLessThan(text().indexOf('A changed test case resets the test.'));
            expect(editors().length).toBe(2);
            expect(JSON.parse(editors()[0].value)).toEqual({ rooms: 2 });
            expect(editors()[0].readOnly).toBeTrue();
            expect(editors()[1].readOnly).toBeFalse();
        });

        it('shows the save bar for a change and sends the text as typed on Save, then reloads', () => {
            init([withCase(), withCase({ test_case: { parameters: { a: 2 } } })]);
            const typed = '{ "parameters": {"a": 2.0, "big": 12345678901234567890} }';

            type(typed);

            expect(saveBar()).not.toBeNull();
            expect(saveButton().disabled).toBeFalse();
            saveButton().click();

            expect(setTestCase).toHaveBeenCalledOnceWith('r1', typed);
            expect(get).toHaveBeenCalledTimes(2);
            fixture.detectChanges();
            expect(saveBar()).toBeNull();
            expect(editors()[0].value).toBe(JSON.stringify({ parameters: { a: 2 } }, null, 2));
        });

        it('refuses text that is no JSON object and says why', () => {
            init([withCase()]);

            for (const [bad, reason] of [['[1]', 'must be a JSON object'], ['{"a":', 'no valid JSON'], ['', 'Enter the test case']]) {
                type(bad);
                expect(saveBar()?.textContent).toContain(reason);
                expect(saveButton().disabled).toBeTrue();
                saveButton().click();
            }
            expect(setTestCase).not.toHaveBeenCalled();
        });

        it('refuses a test case above 65536 bytes without whitespace', () => {
            init([withCase()]);

            type('{"a":"' + 'x'.repeat(65536) + '"}');

            expect(saveBar()?.textContent).toContain('larger than 65536 bytes');
            expect(saveButton().disabled).toBeTrue();
        });

        it('lets a reviewer write the first test case into an empty editor', () => {
            init([request()]);

            expect(editors()[0].readOnly).toBeFalse();
            expect(editors()[0].value).toBe('');
            expect(saveBar()).toBeNull();
            expect(button('Remove test case')).toBeUndefined();

            type('{"parameters":{}}');
            saveButton().click();

            expect(setTestCase).toHaveBeenCalledOnceWith('r1', '{"parameters":{}}');
        });

        it('discards the edits by reading the request again', () => {
            init([withCase(), withCase()]);
            type('{"changed":true}');

            discardButton().click();
            fixture.detectChanges();

            expect(get).toHaveBeenCalledTimes(2);
            expect(editors()[0].value).toBe(stored);
            expect(saveBar()).toBeNull();
            expect(setTestCase).not.toHaveBeenCalled();
        });

        it('keeps unsaved edits when the page reloads by itself', fakeAsync(() => {
            init([withCase({ test: { status: 'running', at: null, detail: '' } }), withCase()]);
            tick(REQUEST_POLL_MS);
            fixture.detectChanges();
            type('{"edited":true}');

            fixture.componentInstance.load();
            fixture.detectChanges();

            expect(editors()[0].value).toBe('{"edited":true}');
            expect(saveBar()).not.toBeNull();
        }));

        it('removes the test case after the confirmation by sending null', () => {
            init([withCase(), request()]);

            button('Remove test case')?.click();

            expect(confirm).toHaveBeenCalledTimes(1);
            expect(setTestCase).toHaveBeenCalledOnceWith('r1', null);
            expect(get).toHaveBeenCalledTimes(2);
            fixture.detectChanges();
            expect(editors()[0].value).toBe('');
        });

        it('removes nothing when the confirmation is declined', () => {
            init([withCase()]);
            confirmed = false;

            button('Remove test case')?.click();

            expect(setTestCase).not.toHaveBeenCalled();
        });

        it('keeps the edits and reads the request again after a refused save', () => {
            init([withCase(), withCase()], { write: of(null) });
            type('{"edited":true}');

            saveButton().click();
            fixture.detectChanges();

            expect(setTestCase).toHaveBeenCalledTimes(1);
            expect(get).toHaveBeenCalledTimes(2);
            expect(editors()[0].value).toBe('{"edited":true}');
            expect(saveBar()).not.toBeNull();
            expect(saveButton().disabled).toBeFalse();
        });

        it('drops the edits when a running operation takes the right to edit', () => {
            init([withCase(), withCase({ test: { status: 'running', at: null, detail: '' } })], { write: of(null) });
            type('{"edited":true}');

            saveButton().click();
            fixture.detectChanges();

            expect(editors()[0].readOnly).toBeTrue();
            expect(editors()[0].value).toBe(stored);
            expect(saveBar()).toBeNull();
        });
    });

    describe('start test and make files again', () => {
        it('starts the test, reloads and follows it while it runs', fakeAsync(() => {
            init([withCase(), withCase({ test: { status: 'running', at: null, detail: '' } }), withCase({ test: passed })]);

            button('Start test')?.click();
            fixture.detectChanges();

            expect(startTest).toHaveBeenCalledOnceWith('r1');
            expect(get).toHaveBeenCalledTimes(2);
            expect(text()).toContain('Running');
            expect(button('Start test')).toBeUndefined();
            tick(REQUEST_POLL_MS);
            fixture.detectChanges();
            expect(get).toHaveBeenCalledTimes(3);
            expect(headerButtons()).toEqual(['publish Publish', 'block Reject']);
            tick(REQUEST_POLL_MS * 3);
            expect(get).toHaveBeenCalledTimes(3);
        }));

        it('does not start the test while the test case has unsaved changes', () => {
            init([withCase()]);
            type('{"edited":true}');

            expect(button('Start test')?.disabled).toBeTrue();
        });

        it('keeps the page usable and does not retry when another request is being tested', fakeAsync(() => {
            init([withCase(), withCase()], { write: of(null) });

            button('Start test')?.click();
            fixture.detectChanges();
            tick(REQUEST_POLL_MS * 3);

            expect(startTest).toHaveBeenCalledTimes(1);
            expect(get).toHaveBeenCalledTimes(2);
            expect(button('Start test')?.disabled).toBeFalse();
        }));

        it('makes the files again and reloads', () => {
            init([request(), request({ files: { status: 'running', at: null, detail: '', truncated: false, count: 0, operation_id: '' } })]);

            button('Make files again')?.click();

            expect(startFiles).toHaveBeenCalledOnceWith('r1');
            expect(get).toHaveBeenCalledTimes(2);
            fixture.detectChanges();
            expect(button('Make files again')).toBeUndefined();
        });
    });

    describe('reject', () => {
        it('asks for the reason in a dialog and sends it', () => {
            init([request(), request({ state: 'rejecting' })]);

            button('Reject')?.click();

            expect(dialogOpen.calls.mostRecent().args[0]).toBe(RejectDialogComponent);
            expect(dialogOpen.calls.mostRecent().args[1].data).toEqual({ name: 'Heating' });
            expect(reject).toHaveBeenCalledOnceWith('r1', 'Name the exports');
            expect(get).toHaveBeenCalledTimes(2);
        });

        it('follows the request to rejected', fakeAsync(() => {
            init([request(), request({ state: 'rejecting' }), request({ state: 'rejected' })]);

            button('Reject')?.click();
            fixture.detectChanges();
            expect(headerButtons()).toEqual([]);
            tick(REQUEST_POLL_MS);
            fixture.detectChanges();

            expect(get).toHaveBeenCalledTimes(3);
            expect(text()).toContain('Rejected');
            tick(REQUEST_POLL_MS * 3);
            expect(get).toHaveBeenCalledTimes(3);
        }));

        it('sends nothing when the dialog is closed without a reason', () => {
            init([request()]);
            dialogResult = undefined;

            button('Reject')?.click();

            expect(reject).not.toHaveBeenCalled();
        });

        it('reads the request again after a refusal and keeps the page usable', () => {
            init([request(), request()], { write: of(null) });

            button('Reject')?.click();
            fixture.detectChanges();

            expect(reject).toHaveBeenCalledTimes(1);
            expect(get).toHaveBeenCalledTimes(2);
            expect(button('Reject')).toBeDefined();
        });
    });

    describe('publish', () => {
        it('names the smart service and the target account in the confirmation, then publishes', () => {
            init([withCase({ test: passed }), withCase({ test: passed, state: 'publishing' })]);

            button('Publish')?.click();

            const [title, message] = confirm.calls.mostRecent().args;
            expect(title).toBe('Publish smart service');
            expect(message).toContain('Heating');
            expect(message).toContain('shared-resources-prod');
            expect(message).toContain('all users');
            expect(publish).toHaveBeenCalledOnceWith('r1');
            expect(get).toHaveBeenCalledTimes(2);
        });

        it('publishes nothing when the confirmation is declined', () => {
            init([withCase({ test: passed })]);
            confirmed = false;

            button('Publish')?.click();

            expect(publish).not.toHaveBeenCalled();
        });

        it('reads the request again after a refusal and keeps the page usable', () => {
            init([withCase({ test: passed }), withCase({ test: { status: 'none', at: null, detail: '' } })], { write: of(null) });

            button('Publish')?.click();
            fixture.detectChanges();

            expect(publish).toHaveBeenCalledTimes(1);
            expect(get).toHaveBeenCalledTimes(2);
            expect(headerButtons()).toEqual(['block Reject']);
        });
    });
});
