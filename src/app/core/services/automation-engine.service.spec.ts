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
import { AutomationEngineService } from './automation-engine.service';
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
});
