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
import { OperatorRepoService } from './operator-repo.service';
import { LadonService } from '../../../admin/permissions/shared/services/ladom.service';
import { environment } from '../../../../../environments/environment';

describe('OperatorRepoService', () => {
    let service: OperatorRepoService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: LadonService, useValue: { getUserAuthorizationsForURI: () => ({}) } },
            ],
        });
        service = TestBed.inject(OperatorRepoService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('asks for all operators with limit=0, since the repository rejects a limit above 1000', () => {
        service.getAllOperators().subscribe();

        const req = http.expectOne((r) => r.url.startsWith(environment.operatorRepoUrl + '/operator?'));
        expect(req.request.url).toBe(environment.operatorRepoUrl + '/operator?limit=0&offset=0&sort=name:asc');
        req.flush({ operators: [], totalCount: 0 });
    });

    it('passes a refused single delete on to the caller', () => {
        let status: number | undefined;
        service.deleteOperator({_id: 'op-1'} as any).subscribe({next: () => fail('must not succeed'), error: (e) => (status = e.status)});

        http.expectOne(environment.operatorRepoUrl + '/operator/op-1/').flush({error: 'in use', flows: 1, pipelines: 0}, {status: 409, statusText: 'Conflict'});

        expect(status).toBe(409);
    });

    it('passes a refused batch delete on to the caller and succeeds on 204', () => {
        let status: number | undefined;
        service.deleteOperators(['a', 'b']).subscribe({next: () => fail('must not succeed'), error: (e) => (status = e.status)});
        const refused = http.expectOne(environment.operatorRepoUrl + '/operator');
        expect(refused.request.body).toEqual(['a', 'b']);
        refused.flush({error: 'in use', operators: []}, {status: 409, statusText: 'Conflict'});
        expect(status).toBe(409);

        let ok: number | undefined;
        service.deleteOperators(['a']).subscribe((resp) => (ok = resp.status));
        http.expectOne(environment.operatorRepoUrl + '/operator').flush(null, {status: 204, statusText: 'No Content'});
        expect(ok).toBe(204);
    });

    it('passes the user filter through', () => {
        service.getAllOperators('user-a').subscribe();

        const req = http.expectOne((r) => r.url.startsWith(environment.operatorRepoUrl + '/operator?'));
        expect(req.request.url).toBe(environment.operatorRepoUrl + '/operator?limit=0&offset=0&sort=name:asc&for_user=user-a');
        req.flush({ operators: [], totalCount: 0 });
    });

    describe('versions', () => {
        const body = {image: 'img:v1', inputs: [], outputs: [], config_values: [], deprecated: false};

        it('puts the version under its label and returns the answer', () => {
            let done = false;
            service.putOperatorVersion('op-1', 'v1.0.0', body).subscribe(() => (done = true));
            const req = http.expectOne(environment.operatorRepoUrl + '/operator/op-1/versions/v1.0.0');
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual(body);
            req.flush({}, {status: 201, statusText: 'Created'});
            expect(done).toBeTrue();
        });

        it('passes a refused put on to the caller', () => {
            let status: number | undefined;
            service.putOperatorVersion('op-1', 'v1.0.0', body).subscribe({next: () => fail('must not succeed'), error: (e) => (status = e.status)});
            http.expectOne(environment.operatorRepoUrl + '/operator/op-1/versions/v1.0.0').flush('image in use', {status: 400, statusText: 'Bad Request'});
            expect(status).toBe(400);
        });

        it('deletes the version under its label and passes a refused delete on', () => {
            let ok = false;
            service.deleteOperatorVersion('op-1', 'v1.0.0').subscribe(() => (ok = true));
            const req = http.expectOne(environment.operatorRepoUrl + '/operator/op-1/versions/v1.0.0');
            expect(req.request.method).toBe('DELETE');
            req.flush(null, {status: 204, statusText: 'No Content'});
            expect(ok).toBeTrue();

            let status: number | undefined;
            service.deleteOperatorVersion('op-1', 'v1.1.0').subscribe({next: () => fail('must not succeed'), error: (e) => (status = e.status)});
            http.expectOne(environment.operatorRepoUrl + '/operator/op-1/versions/v1.1.0')
                .flush({error: 'in use', flows: 1, pipelines: 0}, {status: 409, statusText: 'Conflict'});
            expect(status).toBe(409);
        });
    });
});
