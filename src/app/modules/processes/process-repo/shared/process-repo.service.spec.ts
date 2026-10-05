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
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProcessRepoService } from './process-repo.service';
import { LadonService } from '../../../admin/permissions/shared/services/ladom.service';

class MockLadonService {
    getUserAuthorizationsForURI(_uri: string): any {
        return {};
    }
}

describe('ProcessRepoService', () => {
    let service: ProcessRepoService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ProcessRepoService,
                { provide: LadonService, useClass: MockLadonService },
                { provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open']) },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        service = TestBed.inject(ProcessRepoService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    const listRequest = () => http.expectOne((r) => r.url.endsWith('/v2/processes'));

    it('sends no owner filter by default', () => {
        service.getProcessModels('', 10, 0, 'date', 'desc').subscribe();
        const req = listRequest();
        expect(req.request.params.has('owner')).toBeFalse();
        expect(req.request.params.has('not-owner')).toBeFalse();
        req.flush([]);
    });

    it('sends owner for own process models', () => {
        service.getProcessModels('', 10, 0, 'date', 'desc', { owner: 'u1' }).subscribe();
        const req = listRequest();
        expect(req.request.params.get('owner')).toBe('u1');
        expect(req.request.params.has('not-owner')).toBeFalse();
        req.flush([]);
    });

    it('sends not-owner for shared process models', () => {
        service.getProcessModels('', 10, 0, 'date', 'desc', { notOwner: 'u1' }).subscribe();
        const req = listRequest();
        expect(req.request.params.get('not-owner')).toBe('u1');
        expect(req.request.params.has('owner')).toBeFalse();
        req.flush([]);
    });
});
