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


import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../../environments/environment';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { LadonService } from '../../../admin/permissions/shared/services/ladom.service';
import { ContentReviewService, REVIEW_GROUP } from './content-review.service';
import { ReviewProposalFilesModel, ReviewRequestModel } from './content-review.model';

describe('ContentReviewService', () => {
    const url = 'http://content-review.test';
    const savedUrl = environment.contentReviewUrl;
    let httpMock: HttpTestingController;

    interface Setup {
        rights?: Record<string, boolean> | undefined;
        groups?: string[] | undefined;
        admin?: boolean;
        userId?: string | Error;
    }

    function setup(options: Setup = {}): ContentReviewService {
        const rights = 'rights' in options ? options.rights : { GET: true, POST: true };
        TestBed.configureTestingModule({
            imports: [MatSnackBarModule],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: LadonService, useValue: { getUserAuthorizationsForURI: (uri: string) => (uri === url ? rights : undefined) } },
                {
                    provide: AuthorizationService,
                    useValue: {
                        getUsersGroups: () => options.groups,
                        userIsAdmin: () => options.admin === true,
                        getUserId: () => options.userId ?? 'user-1',
                    },
                },
            ],
        });
        httpMock = TestBed.inject(HttpTestingController);
        return TestBed.inject(ContentReviewService);
    }

    beforeEach(() => {
        environment.contentReviewUrl = url;
    });

    afterEach(() => {
        httpMock.verify();
        environment.contentReviewUrl = savedUrl;
    });

    it('lists the own requests with limit and offset and without the all parameter', () => {
        const service = setup();
        let answer: ReviewRequestModel[] | undefined;
        service.list(false, 500, 0).subscribe((requests) => (answer = requests));

        const req = httpMock.expectOne((r) => r.url === url + '/requests');
        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('limit')).toBe('500');
        expect(req.request.params.get('offset')).toBe('0');
        expect(req.request.params.has('all')).toBeFalse();
        req.flush([{ id: 'r1' }]);

        expect(answer?.length).toBe(1);
    });

    it('asks for every request with all=true and reads a null answer as an empty list', () => {
        const service = setup();
        let answer: ReviewRequestModel[] | undefined;
        service.list(true, 100, 200).subscribe((requests) => (answer = requests));

        const req = httpMock.expectOne((r) => r.url === url + '/requests');
        expect(req.request.params.get('all')).toBe('true');
        expect(req.request.params.get('offset')).toBe('200');
        req.flush(null);

        expect(answer).toEqual([]);
    });

    it('reads one request', () => {
        const service = setup();
        let answer: ReviewRequestModel | null | undefined;
        service.get('r1').subscribe((request) => (answer = request));

        const req = httpMock.expectOne(url + '/requests/r1');
        expect(req.request.method).toBe('GET');
        req.flush({ id: 'r1', name: 'Heating' });

        expect(answer?.name).toBe('Heating');
    });

    it('proposes with the test parameters exactly as typed, so numbers keep their spelling', () => {
        const service = setup();
        let answer: ReviewRequestModel | null | undefined;
        service.propose('rel-1', 'Check "it"', '{ "big": 12345678901234567890, "x": 1.0 }').subscribe((request) => (answer = request));

        const req = httpMock.expectOne(url + '/requests');
        expect(req.request.method).toBe('POST');
        expect(req.request.headers.get('Content-Type')).toBe('application/json');
        expect(req.request.body).toBe('{"release_id":"rel-1","test_description":"Check \\"it\\"","test_parameters":{ "big": 12345678901234567890, "x": 1.0 }}');
        req.flush({ id: 'new' }, { status: 201, statusText: 'Created' });

        expect(answer?.id).toBe('new');
    });

    it('leaves test_parameters out when there are none', () => {
        const service = setup();
        service.propose('rel-1', 'Check').subscribe();

        const req = httpMock.expectOne(url + '/requests');
        expect(JSON.parse(req.request.body)).toEqual({ release_id: 'rel-1', test_description: 'Check' });
        req.flush({ id: 'new' });
    });

    it('answers null and names the backend message when a proposal is refused', () => {
        const service = setup();
        const snackBar = TestBed.inject(MatSnackBar);
        const open = spyOn(snackBar, 'open').and.callThrough();
        let answer: ReviewRequestModel | null | undefined;
        service.propose('rel-1', 'Check').subscribe((request) => (answer = request));

        httpMock.expectOne(url + '/requests').flush({ error: 'an open request exists for the design' }, { status: 409, statusText: 'Conflict' });

        expect(answer).toBeNull();
        expect(open.calls.mostRecent().args[0]).toContain('content-review: request failed (409): an open request exists for the design');
    });

    it('withdraws with an empty object as body', () => {
        const service = setup();
        let answer: ReviewRequestModel | null | undefined;
        service.withdraw('r1').subscribe((request) => (answer = request));

        const req = httpMock.expectOne(url + '/requests/r1/withdraw');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({});
        req.flush({ id: 'r1', state: 'withdrawing' });

        expect(answer?.state).toBe('withdrawing');
    });

    it('answers null after reporting a failed withdraw', () => {
        const service = setup();
        const open = spyOn(TestBed.inject(MatSnackBar), 'open').and.callThrough();
        let answer: ReviewRequestModel | null | undefined;
        service.withdraw('r1').subscribe((request) => (answer = request));

        httpMock.expectOne(url + '/requests/r1/withdraw').flush({ error: 'not in review' }, { status: 409, statusText: 'Conflict' });

        expect(answer).toBeNull();
        expect(open.calls.mostRecent().args[0]).toContain('not in review');
    });

    it('sets the test case as typed, so numbers keep their spelling', () => {
        const service = setup();
        let answer: ReviewRequestModel | null | undefined;
        service.setTestCase('r1', '{ "parameters": {"big": 12345678901234567890}, "x": 1.0 }').subscribe((request) => (answer = request));

        const req = httpMock.expectOne(url + '/requests/r1/test-case');
        expect(req.request.method).toBe('PUT');
        expect(req.request.headers.get('Content-Type')).toBe('application/json');
        expect(req.request.body).toBe('{"test_case":{ "parameters": {"big": 12345678901234567890}, "x": 1.0 }}');
        req.flush({ id: 'r1' });

        expect(answer?.id).toBe('r1');
    });

    it('removes the test case by sending null', () => {
        const service = setup();
        service.setTestCase('r1', null).subscribe();

        const req = httpMock.expectOne(url + '/requests/r1/test-case');
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toBe('{"test_case":null}');
        req.flush({ id: 'r1' });
    });

    it('answers null and shows the backend message when the test case is refused', () => {
        const service = setup();
        const open = spyOn(TestBed.inject(MatSnackBar), 'open').and.callThrough();
        let answer: ReviewRequestModel | null | undefined;
        service.setTestCase('r1', '{}').subscribe((request) => (answer = request));

        httpMock.expectOne(url + '/requests/r1/test-case').flush({ error: 'an operation runs' }, { status: 409, statusText: 'Conflict' });

        expect(answer).toBeNull();
        expect(open.calls.mostRecent().args[0]).toContain('content-review: request failed (409): an operation runs');
    });

    it('posts the review actions with an empty object as body', () => {
        const service = setup();
        const calls: [string, (id: string) => ReturnType<ContentReviewService['startTest']>][] = [
            ['test', (id) => service.startTest(id)],
            ['files', (id) => service.startFiles(id)],
            ['publish', (id) => service.publish(id)],
        ];
        for (const [action, call] of calls) {
            let answer: ReviewRequestModel | null | undefined;
            call('r1').subscribe((request) => (answer = request));

            const req = httpMock.expectOne(url + '/requests/r1/' + action);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({});
            req.flush({ id: 'r1' });

            expect(answer?.id).toBe('r1');
        }
    });

    it('rejects with the reason as body', () => {
        const service = setup();
        service.reject('r1', 'Name the exports').subscribe();

        const req = httpMock.expectOne(url + '/requests/r1/reject');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ reason: 'Name the exports' });
        req.flush({ id: 'r1', state: 'rejecting' });
    });

    it('shows the backend message when another request is being tested and answers null', () => {
        const service = setup();
        const open = spyOn(TestBed.inject(MatSnackBar), 'open').and.callThrough();
        let answer: ReviewRequestModel | null | undefined;
        service.startTest('r1').subscribe((request) => (answer = request));

        httpMock.expectOne(url + '/requests/r1/test').flush({ error: 'another request is being tested' }, { status: 409, statusText: 'Conflict' });

        expect(answer).toBeNull();
        expect(open.calls.mostRecent().args[0]).toContain('another request is being tested');
    });

    it('answers null after a refused publish, files or reject call', () => {
        const service = setup();
        spyOn(TestBed.inject(MatSnackBar), 'open').and.callThrough();
        const answers: (ReviewRequestModel | null | undefined)[] = [undefined, undefined, undefined];
        service.publish('r1').subscribe((request) => (answers[0] = request));
        service.startFiles('r1').subscribe((request) => (answers[1] = request));
        service.reject('r1', 'x').subscribe((request) => (answers[2] = request));

        for (const action of ['publish', 'files', 'reject']) {
            httpMock.expectOne(url + '/requests/r1/' + action).flush({ error: 'not in review' }, { status: 409, statusText: 'Conflict' });
        }

        expect(answers).toEqual([null, null, null]);
    });

    it('reads the files of a request', () => {
        const service = setup();
        let answer: ReviewProposalFilesModel | null | undefined;
        service.getFiles('r1').subscribe((files) => (answer = files));

        const req = httpMock.expectOne(url + '/requests/r1/files');
        expect(req.request.method).toBe('GET');
        req.flush({ operation_id: 'op', at: '2026-10-20T10:00:00Z', truncated: false, files: [{ path: 'a.json', change: 'added', content: '{}' }] });

        expect(answer?.files?.[0].path).toBe('a.json');
    });

    it('reports a failed read of a request and answers null', () => {
        const service = setup();
        const open = spyOn(TestBed.inject(MatSnackBar), 'open').and.callThrough();
        let answer: ReviewRequestModel | null | undefined;
        service.get('r1').subscribe((request) => (answer = request));

        httpMock.expectOne(url + '/requests/r1').flush({ error: 'not found' }, { status: 404, statusText: 'Not Found' });

        expect(answer).toBeNull();
        expect(open.calls.mostRecent().args[0]).toContain('request failed (404)');
    });

    it('reads the rights of the service URL from ladon and treats a missing rule as no right', () => {
        expect(setup({ rights: { GET: true, POST: false } }).userHasReadAuthorization()).toBeTrue();
        TestBed.resetTestingModule();
        const service = setup({ rights: { GET: true, POST: false } });
        expect(service.userHasProposeAuthorization()).toBeFalse();
        TestBed.resetTestingModule();
        const none = setup({ rights: undefined });
        expect(none.userHasReadAuthorization()).toBeFalse();
        expect(none.userHasProposeAuthorization()).toBeFalse();
    });

    it('counts members of the review group and admins as reviewers, nobody else', () => {
        expect(setup({ groups: ['/other', REVIEW_GROUP] }).userIsReviewer()).toBeTrue();
        TestBed.resetTestingModule();
        expect(setup({ groups: ['/other'], admin: true }).userIsReviewer()).toBeTrue();
        TestBed.resetTestingModule();
        expect(setup({ groups: ['/other'] }).userIsReviewer()).toBeFalse();
        TestBed.resetTestingModule();
        expect(setup({ groups: undefined }).userIsReviewer()).toBeFalse();
    });

    it('proposes only the latest release of the user with the create right', () => {
        const service = setup();
        expect(service.canProposeRelease({ creator: 'user-1' })).toBeTrue();
        expect(service.canProposeRelease({ creator: 'user-1', new_release_id: 'newer' })).toBeFalse();
        expect(service.canProposeRelease({ creator: 'someone-else' })).toBeFalse();
        expect(service.canProposeRelease({})).toBeFalse();
        TestBed.resetTestingModule();
        expect(setup({ rights: { GET: true, POST: false } }).canProposeRelease({ creator: 'user-1' })).toBeFalse();
        TestBed.resetTestingModule();
        expect(setup({ userId: new Error('no sub') }).canProposeRelease({ creator: '' })).toBeFalse();
    });
});
