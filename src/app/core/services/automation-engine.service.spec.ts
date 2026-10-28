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
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AutomationEngineService, engineErrorMessage } from './automation-engine.service';
import { ErrorHandlerService } from './error-handler.service';
import { environment } from '../../../environments/environment';
import { EngineDeployment, EngineSchedule } from '../model/automation-engine.model';

describe('AutomationEngineService', () => {
    let service: AutomationEngineService;
    let http: HttpTestingController;
    let reported: string[];
    const base = () => environment.automationEngineUrl + '/namespaces/processes';

    beforeEach(() => {
        reported = [];
        // reached through `this`, so a handler called unbound fails the spec
        const handlers = {
            record(kind: string, result: unknown) {
                return () => {
                    reported.push(kind);
                    return of(result);
                };
            },
            handleError(_s: string, _m: string, result: unknown) {
                return this.record('notice', result);
            },
            handleErrorQuietly(_s: string, _m: string, result: unknown) {
                return this.record('quiet', result);
            },
        };
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ErrorHandlerService, useValue: handlers }],
        });
        service = TestBed.inject(AutomationEngineService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('creates a deployment in the namespace processes unless another is given', () => {
        let created: EngineDeployment | null = null;
        service.createDeployment({ name: 'd', xml: '<x/>', source: 'generated' }).subscribe((d) => (created = d));
        const req = http.expectOne(base() + '/deployments');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ name: 'd', xml: '<x/>', source: 'generated' });
        req.flush({ id: 'dep-1', namespace: 'processes', name: 'd' });
        expect(created!.id).toBe('dep-1');

        service.createDeployment({ name: 'd' }, 'smart-services').subscribe();
        http.expectOne(environment.automationEngineUrl + '/namespaces/smart-services/deployments').flush({ id: 'dep-2' });
    });

    it('answers a refused deployment with null and reports it', () => {
        let created: EngineDeployment | null | undefined;
        service.createDeployment({ name: 'd' }).subscribe((d) => (created = d));
        http.expectOne(base() + '/deployments').flush({ error: 'invalid' }, { status: 400, statusText: 'Bad Request' });
        expect(created).toBeNull();
        expect(reported).toEqual(['notice']);
    });

    it('deletes a deployment and a schedule by their escaped id', () => {
        const statuses: number[] = [];
        service.deleteDeployment('a/b').subscribe((r) => statuses.push(r.status));
        const dep = http.expectOne(base() + '/deployments/a%2Fb');
        expect(dep.request.method).toBe('DELETE');
        dep.flush(null, { status: 204, statusText: 'No Content' });

        service.deleteSchedule('s-1').subscribe((r) => statuses.push(r.status));
        const sched = http.expectOne(base() + '/schedules/s-1');
        expect(sched.request.method).toBe('DELETE');
        sched.flush('not found', { status: 404, statusText: 'Not Found' });

        expect(statuses).toEqual([204, 500]);
    });

    it('creates a schedule', () => {
        let created: EngineSchedule | null = null;
        service.createSchedule({ deployment_id: 'dep-1', cron: '0/30 * * * * *', created_by: 'widget-1' }).subscribe((s) => (created = s));
        const req = http.expectOne(base() + '/schedules');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ deployment_id: 'dep-1', cron: '0/30 * * * * *', created_by: 'widget-1' });
        req.flush({ id: 's-1', namespace: 'processes', deployment_id: 'dep-1', cron: '0/30 * * * * *' });
        expect(created!.id).toBe('s-1');
    });

    describe('deletes for clean-ups', () => {
        const cases: { kind: string; path: string; call: (s: AutomationEngineService, id: string, quiet?: boolean) => ReturnType<AutomationEngineService['deleteDeploymentIfExists']> }[] = [
            { kind: 'deployment', path: '/deployments/', call: (s, id, quiet) => s.deleteDeploymentIfExists(id, quiet) },
            { kind: 'schedule', path: '/schedules/', call: (s, id, quiet) => s.deleteScheduleIfExists(id, quiet) },
        ];
        cases.forEach(({ kind, path, call }) => {
            it(`answers 404 quietly for a ${kind} that is already gone`, () => {
                const statuses: number[] = [];
                call(service, 'x/1').subscribe((r) => statuses.push(r.status));
                const req = http.expectOne(base() + path + 'x%2F1');
                expect(req.request.method).toBe('DELETE');
                req.flush('not found', { status: 404, statusText: 'Not Found' });
                expect(statuses).toEqual([404]);
                expect(reported).toEqual(['quiet']);
            });

            it(`answers the real status of a failed ${kind} delete, with a notice unless quiet`, () => {
                const statuses: number[] = [];
                call(service, 'x').subscribe((r) => statuses.push(r.status));
                http.expectOne(base() + path + 'x').flush('down', { status: 502, statusText: 'Bad Gateway' });
                call(service, 'x', true).subscribe((r) => statuses.push(r.status));
                http.expectOne(base() + path + 'x').flush('down', { status: 502, statusText: 'Bad Gateway' });
                call(service, 'x').subscribe((r) => statuses.push(r.status));
                http.expectOne(base() + path + 'x').flush(null, { status: 204, statusText: 'No Content' });
                expect(statuses).toEqual([502, 502, 204]);
                expect(reported).toEqual(['notice', 'quiet']);
            });
        });
    });

    it('reads the debug state, a step of the history and complete variable values of an instance', () => {
        const instance = environment.automationEngineUrl + '/namespaces/smart-services/instances/i%2F1';
        service.getDebugState('smart-services', 'i/1', true).subscribe();
        expect(http.expectOne(instance + '/debug?evaluate_events=true').request.method).toBe('GET');

        service.getHistoryState('smart-services', 'i/1').subscribe();
        http.expectOne(instance + '/history');
        service.getHistoryState('smart-services', 'i/1', { seq: 12 }).subscribe();
        http.expectOne(instance + '/history?seq=12');
        service.getHistoryState('smart-services', 'i/1', { time: '2026-10-27T10:00:00.000Z' }).subscribe();
        http.expectOne((r) => r.url === instance + '/history' && r.params.get('time') === '2026-10-27T10:00:00.000Z');

        service.getVariable('smart-services', 'i/1', 'a b', 'Task_1').subscribe();
        http.expectOne(instance + '/variables/a%20b?element_id=Task_1');
        service.getHistoryVariable('smart-services', 'i/1', 'a', { seq: 3 }).subscribe();
        http.expectOne(instance + '/history/variables/a?seq=3');

        service.getActivities('smart-services', 'i/1', 10, 21).subscribe();
        http.expectOne(instance + '/activities?after_seq=10&limit=21');
        service.getEventEvaluations('smart-services', 'i/1', 'Catch_1', 2, '2026-10-27T10:00:00Z').subscribe();
        http.expectOne(instance + '/event-evaluations?element_id=Catch_1&run=2&after=2026-10-27T10:00:00Z');

        service.getDeploymentVersion('smart-services', 'd-1', 3).subscribe();
        http.expectOne(environment.automationEngineUrl + '/namespaces/smart-services/deployments/d-1/versions/3');
    });

    it('passes debugging errors on with the message of the engine', () => {
        let message = '';
        service.getHistoryState('processes', 'i-1', { seq: 1 }).subscribe({ error: (err) => (message = engineErrorMessage(err)) });
        http.expectOne(base() + '/instances/i-1/history?seq=1').flush(
            { kind: 'not_found', message: 'step 1 of instance i-1 is no longer available, the earliest is 40' },
            { status: 404, statusText: 'Not Found' },
        );
        expect(message).toBe('step 1 of instance i-1 is no longer available, the earliest is 40');
        expect(engineErrorMessage(new HttpErrorResponse({ status: 0 }))).toBe('the automation-engine is not reachable');
        expect(engineErrorMessage(new HttpErrorResponse({ status: 502, statusText: 'Bad Gateway', error: 'html' }))).toBe('502 Bad Gateway');
    });

    describe('smart-services namespace', () => {
        const smartBase = () => environment.automationEngineUrl + '/namespaces/smart-services';

        it('starts a maintenance procedure with string variables and answers its status', () => {
            let status: number | undefined;
            service.startMaintenanceProcedure('inst-1', 'accept_suggestion', { suggestion_id: 's1', auto_off_s: '' })
                .subscribe((r) => (status = r.status));
            const req = http.expectOne(smartBase() + '/instances/inst-1/maintenance-procedures/accept_suggestion/start');
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ variables: { suggestion_id: 's1', auto_off_s: '' } });
            req.flush({}, { status: 201, statusText: 'Created' });
            expect(status).toBe(201);
        });

        it('lists the modules of an instance by type and key', () => {
            let items: unknown[] | undefined;
            service.listModules({ instanceId: 'inst-1', moduleType: 'process_deployment', key: 'suggestion:s1' })
                .subscribe((list) => (items = list.items));
            const req = http.expectOne((r) => r.url === smartBase() + '/modules');
            expect(req.request.method).toBe('GET');
            expect(req.request.params.get('instance_id')).toBe('inst-1');
            expect(req.request.params.get('module_type')).toBe('process_deployment');
            expect(req.request.params.get('key')).toBe('suggestion:s1');
            req.flush({ items: [{ id: 'm1' }], total: 1, limit: 100, offset: 0 });
            expect(items).toEqual([{ id: 'm1' }]);
        });

        it('leaves out the optional list filters', () => {
            service.listModules({ instanceId: 'inst-1' }).subscribe();
            const req = http.expectOne((r) => r.url === smartBase() + '/modules');
            expect(req.request.params.has('module_type')).toBeFalse();
            expect(req.request.params.has('key')).toBeFalse();
            req.flush({ items: [], total: 0, limit: 100, offset: 0 });
        });

        it('deletes a module by its id and answers the status', () => {
            let status: number | undefined;
            service.deleteModule('mod/1').subscribe((r) => (status = r.status));
            const req = http.expectOne(smartBase() + '/modules/mod%2F1');
            expect(req.request.method).toBe('DELETE');
            req.flush('', { status: 204, statusText: 'No Content' });
            expect(status).toBe(204);
        });

        it('does not catch a 403, so the caller can show it', () => {
            let error: unknown;
            service.listModules({ instanceId: 'inst-1' }).subscribe({ error: (e: unknown) => (error = e) });
            http.expectOne((r) => r.url === smartBase() + '/modules')
                .flush({ error: 'forbidden' }, { status: 403, statusText: 'Forbidden' });
            expect((error as { status: number }).status).toBe(403);
        });
    });
});
