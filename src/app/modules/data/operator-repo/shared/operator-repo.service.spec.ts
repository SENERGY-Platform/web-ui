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

    it('passes the user filter through', () => {
        service.getAllOperators('user-a').subscribe();

        const req = http.expectOne((r) => r.url.startsWith(environment.operatorRepoUrl + '/operator?'));
        expect(req.request.url).toBe(environment.operatorRepoUrl + '/operator?limit=0&offset=0&sort=name:asc&for_user=user-a');
        req.flush({ operators: [], totalCount: 0 });
    });
});
