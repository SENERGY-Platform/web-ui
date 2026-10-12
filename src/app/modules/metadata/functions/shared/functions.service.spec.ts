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
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FunctionsService } from './functions.service';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { environment } from '../../../../../environments/environment';

class MockLadonService {
    getUserAuthorizationsForURI(_uri: string): any {
        return {};
    }
}

describe('FunctionsService delete', () => {
    let service: FunctionsService;
    let httpMock: HttpTestingController;
    const id = 'urn:infai:ses:function:f1';
    const deleteUrl = environment.deviceRepoUrl + '/functions/' + id;

    beforeEach(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [MatDialogModule, MatSnackBarModule],
            providers: [
                FunctionsService,
                { provide: LadonService, useClass: MockLadonService },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        service = TestBed.inject(FunctionsService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    // The device-repository answers an accepted delete with 200 and an empty body on some endpoints
    // and with a `true` body on others. Reading the body therefore reports a successful delete as a
    // failure wherever the body is empty, which is why only the status may decide.
    it('should report a delete answered with an empty 200 as success', (done) => {
        service.deleteFunction(id).subscribe(resp => {
            expect(resp).toBeTrue();
            done();
        });
        const req = httpMock.expectOne(deleteUrl);
        expect(req.request.method).toBe('DELETE');
        req.flush(null, { status: 200, statusText: 'OK' });
    });

    it('should report a delete answered with a true body as success', (done) => {
        service.deleteFunction(id).subscribe(resp => {
            expect(resp).toBeTrue();
            done();
        });
        httpMock.expectOne(deleteUrl).flush(true);
    });

    it('should report a refused delete as false', (done) => {
        service.deleteFunction(id).subscribe(resp => {
            expect(resp).toBeFalse();
            done();
        });
        httpMock.expectOne(deleteUrl).flush('still in use', { status: 400, statusText: 'Bad Request' });
    });
});

describe('FunctionsService getFunctionsByConceptIds', () => {
    let service: FunctionsService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [MatDialogModule, MatSnackBarModule],
            providers: [
                FunctionsService,
                { provide: LadonService, useClass: MockLadonService },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        service = TestBed.inject(FunctionsService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('requests the functions of every given concept in one call, comma-joined', (done) => {
        const conceptIds = ['urn:infai:ses:concept:temp', 'urn:infai:ses:concept:humidity'];
        service.getFunctionsByConceptIds(conceptIds).subscribe(resp => {
            expect(resp.length).toBe(1);
            done();
        });
        const req = httpMock.expectOne(environment.deviceRepoUrl + '/functions?concept_ids=' +
            conceptIds.map(encodeURIComponent).join(',') + '&limit=9999');
        expect(req.request.method).toBe('GET');
        req.flush([{ id: 'f1', name: 'Get-Temperature', display_name: '', description: '', rdf_type: '', concept_id: conceptIds[0] }]);
    });

    it('falls back to an empty list when the request fails', (done) => {
        const conceptIds = ['urn:infai:ses:concept:temp'];
        service.getFunctionsByConceptIds(conceptIds).subscribe(resp => {
            expect(resp).toEqual([]);
            done();
        });
        httpMock.expectOne(environment.deviceRepoUrl + '/functions?concept_ids=' +
            conceptIds.map(encodeURIComponent).join(',') + '&limit=9999')
            .flush('error', { status: 500, statusText: 'Internal Server Error' });
    });
});

describe('FunctionsService getFunctions with a concept filter', () => {
    let service: FunctionsService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [MatDialogModule, MatSnackBarModule],
            providers: [
                FunctionsService,
                { provide: LadonService, useClass: MockLadonService },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        service = TestBed.inject(FunctionsService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('lists through GET /functions with paging, sort, search and the concepts, and reads the total from the header', (done) => {
        service.getFunctions('temp', 20, 40, 'name', 'desc', ['c1', 'c2']).subscribe(resp => {
            expect(resp.total).toBe(42);
            expect(resp.result.length).toBe(1);
            done();
        });
        const req = httpMock.expectOne(r => r.url === environment.deviceRepoUrl + '/functions');
        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('concept_ids')).toBe('c1,c2');
        expect(req.request.params.get('limit')).toBe('20');
        expect(req.request.params.get('offset')).toBe('40');
        expect(req.request.params.get('sort')).toBe('name.desc');
        expect(req.request.params.get('search')).toBe('temp');
        req.flush([{ id: 'f1', name: 'Get-Temperature', display_name: '', description: '', rdf_type: '', concept_id: 'c1' }],
            { headers: { 'X-Total-Count': '42' } });
    });

    it('keeps using the query endpoint without a concept filter', () => {
        service.getFunctions('', 20, 0, 'name', 'asc').subscribe();
        const req = httpMock.expectOne(environment.deviceRepoUrl + '/query/functions');
        expect(req.request.method).toBe('POST');
        req.flush([]);
    });
});
