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
import { EnvironmentsService } from './environments.service';
import { LadonService } from '../../admin/permissions/shared/services/ladom.service';
import { environment } from '../../../../environments/environment';
import { CatalogDeviceType, DatasetMeta, Environment, StateChange, ValidationError } from './environments.model';

class MockLadonService {
    authorizations: { [key: string]: { [method: string]: boolean } } = {};

    getUserAuthorizationsForURI(uri: string): any {
        return this.authorizations[uri];
    }
}

describe('EnvironmentsService', () => {
    let service: EnvironmentsService;
    let httpMock: HttpTestingController;
    const environmentsUrl = environment.mosesUrl + '/environments';
    const datasetsUrl = environment.mosesUrl + '/datasets';
    const deviceTypesUrl = environment.mosesUrl + '/device-types';
    const devicesUrl = environment.mosesUrl + '/devices';

    beforeEach(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [MatDialogModule, MatSnackBarModule],
            providers: [
                EnvironmentsService,
                { provide: LadonService, useClass: MockLadonService },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        service = TestBed.inject(EnvironmentsService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should not throw when ladon has no rule for the endpoint and report no authorization', () => {
        expect(service.userHasReadAuthorization()).toBeFalse();
        expect(service.userHasCreateAuthorization()).toBeFalse();
        expect(service.userHasUpdateAuthorization()).toBeFalse();
        expect(service.userHasDeleteAuthorization()).toBeFalse();
    });

    it('should list environments with a GET on /environments', (done) => {
        const envs: Environment[] = [{ id: 'e1', name: 'Plant A' }];
        service.listEnvironments().subscribe(resp => {
            expect(resp).toEqual(envs);
            done();
        });
        const req = httpMock.expectOne(environmentsUrl);
        expect(req.request.method).toBe('GET');
        req.flush(envs);
    });

    it('should get one environment with a GET on /environments/{id}', (done) => {
        const env: Environment = { id: 'e1', name: 'Plant A' };
        service.getEnvironment('e1').subscribe(resp => {
            expect(resp).toEqual(env);
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1');
        expect(req.request.method).toBe('GET');
        req.flush(env);
    });

    it('should create an environment with a POST on /environments', (done) => {
        const env: Environment = { name: 'Plant A', type: 'industrial_site' };
        const created: Environment = { id: 'e1', ...env };
        service.createEnvironment(env).subscribe(resp => {
            expect(resp).toEqual(created);
            done();
        });
        const req = httpMock.expectOne(environmentsUrl);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(env);
        req.flush(created);
    });

    it('should replace an environment with a PUT on /environments/{id}', (done) => {
        const env: Environment = { id: 'e1', name: 'Plant A' };
        service.updateEnvironmentChecked('e1', env).subscribe(resp => {
            expect(resp).toEqual(env);
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1');
        expect(req.request.method).toBe('PUT');
        req.flush(env);
    });

    it('should surface the ValidationError body of a 400 response instead of swallowing it', (done) => {
        const env: Environment = { id: 'e1', name: '' };
        const validationError: ValidationError = { problems: [{ path: 'name', message: 'must not be empty' }] };
        service.updateEnvironmentChecked('e1', env).subscribe(resp => {
            expect(resp).toEqual(validationError);
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1');
        req.flush(validationError, { status: 400, statusText: 'Bad Request' });
    });

    // Regression: a 400 whose body is plain text (a Go json.Unmarshal message, not a
    // {problems: [...]} object) must not be silently treated as a ValidationError or,
    // worse, as success -- both isValidationError(string) checks are false, so this has
    // to fall through to the ApiError branch rather than being lost.
    it('should surface a plaintext 400 body as an ApiError rather than swallowing or misreading it', (done) => {
        const env: Environment = { id: 'e1', seed: 900.5 };
        const plainTextBody = 'unable to read the request body: json: cannot unmarshal number 900.5 into Go struct field Environment.seed of type int64';
        service.updateEnvironmentChecked('e1', env).subscribe(resp => {
            expect(resp).toEqual({ message: plainTextBody });
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1');
        req.flush(plainTextBody, { status: 400, statusText: 'Bad Request' });
    });

    it('should surface a non-400 error of the checked update as an ApiError, like the other checked methods', (done) => {
        const env: Environment = { id: 'e1', name: 'Plant A' };
        service.updateEnvironmentChecked('e1', env).subscribe(resp => {
            expect(resp).toEqual({ message: 'boom' });
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1');
        req.flush('boom', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should delete an environment with a DELETE on /environments/{id}', (done) => {
        service.deleteEnvironment('e1').subscribe(resp => {
            expect(resp).toBeTrue();
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1');
        expect(req.request.method).toBe('DELETE');
        req.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('should patch the live state with a PATCH on /environments/{id}/state and report success as true', (done) => {
        const change: StateChange = { context: { outdoor_temp: 12 } };
        service.setStateChecked('e1', change).subscribe(resp => {
            expect(resp).toBe(true);
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1/state');
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual(change);
        req.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('should surface a 404 body of setStateChecked as an ApiError instead of a bare false', (done) => {
        const change: StateChange = { context: { outdoor_temp: 12 } };
        service.setStateChecked('e1', change).subscribe(resp => {
            expect(resp).toEqual({ message: 'environment e1 is not running' });
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1/state');
        req.flush('environment e1 is not running', { status: 404, statusText: 'Not Found' });
    });

    it('should list datasets with a GET on /datasets', (done) => {
        const datasets: DatasetMeta[] = [{ id: 'd1', name: 'profile.csv' }];
        service.listDatasets().subscribe(resp => {
            expect(resp).toEqual(datasets);
            done();
        });
        const req = httpMock.expectOne(datasetsUrl);
        expect(req.request.method).toBe('GET');
        req.flush(datasets);
    });

    it('should delete a dataset with a DELETE on /datasets/{id}', (done) => {
        service.deleteDataset('d1').subscribe(resp => {
            expect(resp).toBeTrue();
            done();
        });
        const req = httpMock.expectOne(datasetsUrl + '/d1');
        expect(req.request.method).toBe('DELETE');
        req.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('should upload a dataset as raw body with name and tz as query params', (done) => {
        const meta: DatasetMeta = { id: 'd1', name: 'profile.csv', timezone: 'Europe/Berlin' };
        service.uploadDatasetChecked('profile.csv', 'time,value\n1,2', 'Europe/Berlin').subscribe(resp => {
            expect(resp).toEqual(meta);
            done();
        });
        const req = httpMock.expectOne(datasetsUrl + '?name=profile.csv&tz=Europe%2FBerlin');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toBe('time,value\n1,2');
        req.flush(meta);
    });

    it('should upload a dataset without a tz query param when none is given', (done) => {
        const meta: DatasetMeta = { id: 'd1', name: 'profile.csv' };
        service.uploadDatasetChecked('profile.csv', 'time,value\n1,2').subscribe(resp => {
            expect(resp).toEqual(meta);
            done();
        });
        const req = httpMock.expectOne(datasetsUrl + '?name=profile.csv');
        req.flush(meta);
    });

    // Regression: HttpParams' default codec leaves ';' unescaped, so the server's query
    // parser (Go's url.ParseQuery treats ';' as a separator) drops the whole name= pair.
    // Pin the fully percent-encoded query string, not a value computed the same way the
    // implementation computes it, so a regression to HttpParams would actually fail this.
    it('should fully percent-encode a name containing a semicolon and an umlaut', (done) => {
        const meta: DatasetMeta = { id: 'd1', name: 'Halle A; Zähler 3' };
        service.uploadDatasetChecked('Halle A; Zähler 3', 'time,value\n1,2').subscribe(resp => {
            expect(resp).toEqual(meta);
            done();
        });
        const req = httpMock.expectOne(datasetsUrl + '?name=Halle%20A%3B%20Z%C3%A4hler%203');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toBe('time,value\n1,2');
        req.flush(meta);
    });

    // The whole point of the checked variant: a broken CSV line is the entire value of
    // the error, and a bare failure would collapse it to nothing usable.
    it('should surface the broken-line message of a failed upload as an ApiError', (done) => {
        service.uploadDatasetChecked('profile.csv', 'time,value\nnot-a-number,2').subscribe(resp => {
            expect(resp).toEqual({ message: 'line 2: "not-a-number" is not a valid timestamp' });
            done();
        });
        const req = httpMock.expectOne(datasetsUrl + '?name=profile.csv');
        req.flush('line 2: "not-a-number" is not a valid timestamp', { status: 400, statusText: 'Bad Request' });
    });

    it('should list device types with a GET on /device-types', (done) => {
        const types: CatalogDeviceType[] = [{ id: 't1', name: 'Machine', services: [{ id: 's1', name: 'Power', direction: 'sensor' }] }];
        service.listDeviceTypes().subscribe(resp => {
            expect(resp).toEqual(types);
            done();
        });
        const req = httpMock.expectOne(deviceTypesUrl);
        expect(req.request.method).toBe('GET');
        req.flush(types);
    });

    it('should delete a device with a DELETE on /devices/{id}', (done) => {
        service.deleteDevice('d1').subscribe(resp => {
            expect(resp).toBeTrue();
            done();
        });
        const req = httpMock.expectOne(devicesUrl + '/d1');
        expect(req.request.method).toBe('DELETE');
        req.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('should report dataset authorizations independently of the environment ones', () => {
        expect(service.userHasDatasetReadAuthorization()).toBeFalse();
        expect(service.userHasDatasetCreateAuthorization()).toBeFalse();
        expect(service.userHasDatasetDeleteAuthorization()).toBeFalse();
    });
});
