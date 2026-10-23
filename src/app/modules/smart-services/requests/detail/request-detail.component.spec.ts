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
import { of } from 'rxjs';
import { REQUEST_POLL_MS, RequestDetailComponent } from './request-detail.component';
import { ContentReviewService } from '../shared/content-review.service';
import { ReviewFileChange, ReviewProposalFileModel, ReviewProposalFilesModel, ReviewRequestModel } from '../shared/content-review.model';
import { DialogsService } from '../../../../core/services/dialogs.service';
import { CodeEditorComponent } from '../../../../core/components/code-editor/code-editor.component';

describe('RequestDetailComponent', () => {
    let fixture: ComponentFixture<RequestDetailComponent>;
    let get: jasmine.Spy;
    let getFiles: jasmine.Spy;
    let withdraw: jasmine.Spy;
    let confirm: jasmine.Spy;

    const request = (overrides: Partial<ReviewRequestModel> = {}): ReviewRequestModel => ({
        id: 'r1', kind: 'smart-service', design_id: 'd', release_id: 'rel-1', name: 'Heating', author_id: 'me', author_name: 'Ada',
        test_description: 'Check the heating', test_parameters: null, test_case: null, state: 'in_review', error: '',
        test: { status: 'none', at: null, detail: '' },
        sync: { status: 'none', files: null, truncated: false, commit: '', at: null, detail: '' },
        files: { status: 'none', at: null, detail: '', truncated: false, count: 0, operation_id: '' },
        operations: null, history: null, created_at: '2026-10-20T10:00:00Z', updated_at: '2026-10-21T11:30:00Z', version: 1,
        ...overrides,
    });

    const file = (path: string, change: ReviewFileChange, content: string | null): ReviewProposalFileModel => ({ path, change, content });

    const proposal = (files: ReviewProposalFileModel[], truncated = false): ReviewProposalFilesModel =>
        ({ operation_id: 'op-1', at: '2026-10-21T11:00:00Z', truncated, files });

    const readyFiles = { status: 'ready' as const, at: null, detail: '', truncated: false, count: 4, operation_id: 'op-1' };

    function init(answers: (ReviewRequestModel | null)[], files: ReviewProposalFilesModel | null = null, userId = 'me') {
        let next = 0;
        get = jasmine.createSpy('get').and.callFake(() => of(answers[Math.min(next++, answers.length - 1)]));
        getFiles = jasmine.createSpy('getFiles').and.callFake(() => of(files));
        withdraw = jasmine.createSpy('withdraw').and.returnValue(of(request({ state: 'withdrawing' })));
        confirm = jasmine.createSpy('openConfirmDialog').and.returnValue({ afterClosed: () => of(true) });
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, RequestDetailComponent],
            providers: [
                { provide: ContentReviewService, useValue: { userId: () => userId, userIsReviewer: () => false, get, getFiles, withdraw } },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'r1' } } } },
                { provide: DialogsService, useValue: { openConfirmDialog: confirm } },
                { provide: MatSnackBar, useValue: { open: () => undefined } },
                { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
            ],
        });
        fixture = TestBed.createComponent(RequestDetailComponent);
        fixture.detectChanges();
    }

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent || '';
    const editors = (): CodeEditorComponent[] => fixture.debugElement.queryAll(By.directive(CodeEditorComponent)).map((e) => e.componentInstance);
    const fileRows = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('.file-row'));

    it('shows the summary of the request', () => {
        init([request({ test_parameters: { rooms: 2 }, error: 'transfer refused' })]);

        expect(fixture.nativeElement.querySelector('senergy-page-header').textContent).toContain('Heating');
        expect(text()).toContain('Ada');
        expect(text()).toContain('rel-1');
        expect(text()).toContain('Check the heating');
        expect(text()).toContain('transfer refused');
        expect(fixture.nativeElement.querySelector('.status-chip.warning')?.textContent).toContain('In review');
        const parameters = editors()[0];
        expect(parameters.language).toBe('json');
        expect(parameters.readOnly).toBeTrue();
        expect(JSON.parse(parameters.value)).toEqual({ rooms: 2 });
    });

    it('shows no error field and no parameter editor without them', () => {
        init([request()]);

        expect(fixture.nativeElement.querySelector('.error')).toBeNull();
        expect(editors().length).toBe(0);
        expect(text()).toContain('None');
    });

    it('shows test, take-over and operation status as plain fields', () => {
        init([request({
            test: { status: 'passed', at: '2026-10-21T12:00:00Z', detail: 'all green' },
            sync: { status: 'synced', files: [], truncated: false, commit: 'abc123', at: '2026-10-22T09:00:00Z', detail: '' },
            operations: [{ id: 'op-1', kind: 'files', status: 'succeeded', result: null, started_at: '2026-10-21T11:00:00Z', finished_at: null }],
        })]);

        expect(text()).toContain('Passed');
        expect(text()).toContain('all green');
        expect(text()).toContain('Synced');
        expect(text()).toContain('abc123');
        expect(fixture.nativeElement.querySelector('.operation')?.textContent).toContain('files');
        expect(fixture.nativeElement.querySelector('.operation .status-chip.online')?.textContent).toContain('Succeeded');
    });

    it('says the files were not made yet and reads none', () => {
        init([request()]);

        expect(text()).toContain('The files have not been made yet.');
        expect(getFiles).not.toHaveBeenCalled();
    });

    it('says the files are being made while the files job runs, without reading them', fakeAsync(() => {
        init([request({ files: { ...readyFiles, status: 'running', operation_id: '' } })]);

        expect(text()).toContain('The files are being made');
        expect(getFiles).not.toHaveBeenCalled();
        fixture.destroy();
    }));

    it('shows the reason when the files job failed, without reading them', () => {
        init([request({ files: { ...readyFiles, status: 'failed', operation_id: '', detail: 'clone failed' } })]);

        expect(text()).toContain('Making the files failed.');
        expect(text()).toContain('clone failed');
        expect(getFiles).not.toHaveBeenCalled();
    });

    it('lists the ready files in the order sent with their change and selects the first', () => {
        init([request({ files: readyFiles })], proposal([
            file('b/flow.json', 'modified', '{"a":1}'),
            file('a/keep.txt', 'unchanged', 'same'),
            file('c/gone.txt', 'deleted', null),
        ]));

        expect(getFiles).toHaveBeenCalledOnceWith('r1');
        expect(fileRows().map((row) => row.querySelector('.file-path')?.textContent)).toEqual(['b/flow.json', 'a/keep.txt', 'c/gone.txt']);
        expect(fileRows().map((row) => row.querySelector('.status-chip')?.textContent)).toEqual(['modified', 'unchanged', 'deleted']);
        expect(fileRows()[0].classList).toContain('selected');
    });

    it('shows a json file in the json editor and any other text as plaintext', () => {
        init([request({ files: readyFiles })], proposal([
            file('flow.json', 'added', '{"a":1}'),
            file('process.bpmn', 'added', '<definitions/>'),
        ]));

        const fileEditor = () => editors()[0];
        expect(fileEditor().language).toBe('json');
        expect(fileEditor().value).toBe('{"a":1}');
        expect(fileEditor().readOnly).toBeTrue();

        fileRows()[1].click();
        fixture.detectChanges();

        expect(editors().length).toBe(1);
        expect(fileEditor().language).toBe('plaintext');
        expect(fileEditor().value).toBe('<definitions/>');
        expect(fileRows()[1].classList).toContain('selected');
        expect(fileRows()[0].classList).not.toContain('selected');
    });

    it('renders an svg as an image through the helper and keeps its markup in the editor', () => {
        init([request({ files: readyFiles })], proposal([
            file('icon.svg', 'added', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>'),
        ]));

        const image = fixture.nativeElement.querySelector('img.svg-image') as HTMLImageElement;
        expect(image.src.startsWith('data:image/svg+xml')).toBeTrue();
        expect(editors()[0].language).toBe('plaintext');
        expect(editors()[0].value).toContain('<rect');
    });

    it('shows no image for an svg that is no well-formed svg', () => {
        init([request({ files: readyFiles })], proposal([file('broken.svg', 'added', '<svg><oops></svg>')]));

        expect(fixture.nativeElement.querySelector('img.svg-image')).toBeNull();
        expect(editors()[0].value).toBe('<svg><oops></svg>');
    });

    it('says so instead of an editor for a deleted file and for a file without content', () => {
        init([request({ files: readyFiles })], proposal([
            file('gone.json', 'deleted', null),
            file('left-out.json', 'added', null),
        ]));

        expect(text()).toContain('The proposal deletes this file.');
        expect(editors().length).toBe(0);

        fileRows()[1].click();
        fixture.detectChanges();

        expect(text()).toContain('No text to show');
        expect(text()).not.toContain('The proposal deletes this file.');
        expect(editors().length).toBe(0);
    });

    it('notes that contents were left out when the upload was truncated', () => {
        init([request({ files: { ...readyFiles, truncated: true } })], proposal([file('a.json', 'added', '{}')], true));

        expect(fixture.nativeElement.querySelector('.notice')?.textContent).toContain('left out');
    });

    it('says so when the proposal writes no files and when the files could not be read', () => {
        init([request({ files: readyFiles })], proposal([]));
        expect(text()).toContain('The proposal writes no files.');

        fixture.destroy();
        TestBed.resetTestingModule();
        init([request({ files: readyFiles })], null);
        expect(text()).toContain('The files could not be read.');
    });

    it('lists the history newest first and names the author', () => {
        init([request({
            history: [
                { at: '2026-10-20T10:00:00Z', by: 'me', action: 'propose', detail: 'first' },
                { at: '2026-10-20T10:01:00Z', by: 'content-review', action: 'checked', detail: 'second' },
            ],
        })]);

        const rows = Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]')) as HTMLElement[];
        expect(rows.length).toBe(2);
        expect(rows[0].textContent).toContain('content-review');
        expect(rows[0].textContent).toContain('second');
        expect(rows[1].textContent).toContain('Ada');
        expect(rows[1].textContent).toContain('propose');
    });

    it('says the request was not found when it cannot be read', () => {
        init([null]);

        expect(text()).toContain('Request not found');
    });

    it('reloads every 5 seconds while the state is transitional and stops once it settles in review', fakeAsync(() => {
        init([request({ state: 'checking' }), request({ state: 'moving' }), request({ state: 'in_review' }), request({ state: 'in_review' })]);

        expect(get).toHaveBeenCalledTimes(1);
        tick(REQUEST_POLL_MS - 1);
        expect(get).toHaveBeenCalledTimes(1);
        tick(1);
        expect(get).toHaveBeenCalledTimes(2);
        tick(REQUEST_POLL_MS);
        expect(get).toHaveBeenCalledTimes(3);
        tick(REQUEST_POLL_MS * 4);
        expect(get).toHaveBeenCalledTimes(3);
    }));

    it('keeps polling while the files, the test or the take-over run in a request that is otherwise settled', fakeAsync(() => {
        const settled = request({ state: 'published' });
        init([
            request({ state: 'in_review', files: { ...readyFiles, status: 'running', operation_id: '' } }),
            request({ state: 'in_review', test: { status: 'running', at: null, detail: '' } }),
            { ...settled, sync: { ...settled.sync, status: 'syncing' } },
            settled,
        ]);

        tick(REQUEST_POLL_MS * 3);
        expect(get).toHaveBeenCalledTimes(4);
        tick(REQUEST_POLL_MS * 4);
        expect(get).toHaveBeenCalledTimes(4);
    }));

    it('stops polling when the page is left', fakeAsync(() => {
        init([request({ state: 'checking' })]);

        fixture.destroy();
        tick(REQUEST_POLL_MS * 3);

        expect(get).toHaveBeenCalledTimes(1);
    }));

    it('reads the files again only when another files job ended', fakeAsync(() => {
        const next = { ...readyFiles, operation_id: 'op-2' };
        init([request({ state: 'checking', files: readyFiles }), request({ state: 'moving', files: readyFiles }), request({ state: 'in_review', files: next }), request({ state: 'in_review', files: next })],
            proposal([file('a.json', 'added', '{}')]));

        expect(getFiles).toHaveBeenCalledTimes(1);
        tick(REQUEST_POLL_MS);
        expect(getFiles).toHaveBeenCalledTimes(1);
        tick(REQUEST_POLL_MS);
        expect(getFiles).toHaveBeenCalledTimes(2);
        fixture.destroy();
    }));

    it('offers Withdraw to the author of a request in review and withdraws after the confirmation', () => {
        init([request()]);

        const button = fixture.nativeElement.querySelector('senergy-page-header button') as HTMLButtonElement;
        expect(button.textContent).toContain('Withdraw');
        button.click();

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(withdraw).toHaveBeenCalledWith('r1');
    });

    it('hides Withdraw for another user and for a request that is not in review', () => {
        init([request()], null, 'someone-else');
        expect(fixture.nativeElement.querySelector('senergy-page-header button')).toBeNull();

        fixture.destroy();
        TestBed.resetTestingModule();
        init([request({ state: 'published' })]);
        expect(fixture.nativeElement.querySelector('senergy-page-header button')).toBeNull();
    });
});
