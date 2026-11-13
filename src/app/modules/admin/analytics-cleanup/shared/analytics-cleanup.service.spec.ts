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
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AnalyticsCleanupService } from './analytics-cleanup.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { environment } from '../../../../../environments/environment';

describe('AnalyticsCleanupService', () => {
    let service: AnalyticsCleanupService;
    let http: HttpTestingController;
    let handled: string[];
    const base = () => environment.flowEngineUrl + '/admin/cleanup';

    beforeEach(() => {
        handled = [];
        const handlers = {
            handleError(_s: string, method: string, result: unknown) {
                return () => {
                    handled.push(method);
                    return of(result);
                };
            },
        };
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ErrorHandlerService, useValue: handlers }],
        });
        service = TestBed.inject(AnalyticsCleanupService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('lists pipelines with GET and reads an empty body as no pipelines', () => {
        let result: unknown;
        service.listPipelines().subscribe((r) => (result = r));
        const req = http.expectOne(base() + '/pipelines');
        expect(req.request.method).toBe('GET');
        req.flush(null);
        expect(result).toEqual([]);
    });

    it('deletes one pipeline with DELETE on its id and reports true by status', () => {
        let result: boolean | undefined;
        service.deletePipeline('a/b').subscribe((r) => (result = r));
        const req = http.expectOne(base() + '/pipelines/a%2Fb');
        expect(req.request.method).toBe('DELETE');
        req.flush(null, { status: 204, statusText: 'No Content' });
        expect(result).toBeTrue();
    });

    it('answers false and null on a failed call', () => {
        let deleted: boolean | undefined;
        let listed: unknown = 'unset';
        service.deletePipeline('x').subscribe((r) => (deleted = r));
        http.expectOne(base() + '/pipelines/x').flush('registry unavailable', { status: 404, statusText: 'x' });
        service.listPipelines().subscribe((r) => (listed = r));
        http.expectOne(base() + '/pipelines').flush('registry unavailable', { status: 503, statusText: 'x' });
        expect(deleted).toBeFalse();
        expect(listed).toBeNull();
        expect(handled).toEqual(['deletePipeline', 'listPipelines']);
    });

    it('deletes all pipelines with DELETE on the collection and returns the report', () => {
        let result: unknown;
        service.deleteAllPipelines().subscribe((r) => (result = r));
        const req = http.expectOne(base() + '/pipelines');
        expect(req.request.method).toBe('DELETE');
        req.flush({ deleted: ['a'], failed: [{ pipeline_id: 'b', error: 'e' }] });
        expect(result).toEqual({ deleted: ['a'], failed: [{ pipeline_id: 'b', error: 'e' }] });
    });

    it('lists topics and deletes one with the name encoded', () => {
        service.listTopics().subscribe();
        const list = http.expectOne(base() + '/topics');
        expect(list.request.method).toBe('GET');
        list.flush(['analytics-x-repartition']);

        service.deleteTopic('analytics-x-KSTREAM-aggregate-STATE-STORE-0000000001-changelog').subscribe();
        const del = http.expectOne(base() + '/topics/analytics-x-KSTREAM-aggregate-STATE-STORE-0000000001-changelog');
        expect(del.request.method).toBe('DELETE');
        del.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('starts, reads and stops the topic job', () => {
        let started: boolean | undefined;
        service.startTopicJob().subscribe((r) => (started = r));
        const start = http.expectOne(base() + '/topics/job');
        expect(start.request.method).toBe('POST');
        start.flush(null, { status: 202, statusText: 'Accepted' });
        expect(started).toBeTrue();

        let job: unknown;
        service.getTopicJob().subscribe((r) => (job = r));
        const get = http.expectOne(base() + '/topics/job');
        expect(get.request.method).toBe('GET');
        get.flush({ total: 3, remaining: 2, running: true, errors: [] });
        expect(job).toEqual({ total: 3, remaining: 2, running: true, errors: [] });

        service.stopTopicJob().subscribe();
        const stop = http.expectOne(base() + '/topics/job');
        expect(stop.request.method).toBe('DELETE');
        stop.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('treats a 409 on start as a failure', () => {
        let started: boolean | undefined;
        service.startTopicJob().subscribe((r) => (started = r));
        http.expectOne(base() + '/topics/job').flush('job running', { status: 409, statusText: 'Conflict' });
        expect(started).toBeFalse();
    });
});
