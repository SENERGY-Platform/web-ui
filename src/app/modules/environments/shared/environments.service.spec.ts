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
import { CatalogDeviceType, DatasetMeta, Environment, HistoryPollResult, HistoryStartRefusal, HistoryStatus, StateChange, ValidationError } from './environments.model';

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
            expect(resp).toEqual({ message: plainTextBody, status: 400 });
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1');
        req.flush(plainTextBody, { status: 400, statusText: 'Bad Request' });
    });

    it('should surface a non-400 error of the checked update as an ApiError, like the other checked methods', (done) => {
        const env: Environment = { id: 'e1', name: 'Plant A' };
        service.updateEnvironmentChecked('e1', env).subscribe(resp => {
            expect(resp).toEqual({ message: 'boom', status: 500 });
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1');
        req.flush('boom', { status: 500, statusText: 'Internal Server Error' });
    });

    // Optimistic locking (Environment.version): the editor tells a 409 apart from any other
    // failure by this status field -- collapsing it back to a bare message would make that
    // impossible.
    it('should carry the HTTP status on a 409 optimistic-locking conflict from the checked update', (done) => {
        const env: Environment = { id: 'e1', name: 'Plant A', version: 3 };
        const conflictMessage = 'version conflict: you have 3, current is 4';
        service.updateEnvironmentChecked('e1', env).subscribe(resp => {
            expect(resp).toEqual({ message: conflictMessage, status: 409 });
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1');
        expect(req.request.body.version).toBe(3);
        req.flush(conflictMessage, { status: 409, statusText: 'Conflict' });
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
            expect(resp).toEqual({ message: 'environment e1 is not running', status: 404 });
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1/state');
        req.flush('environment e1 is not running', { status: 404, statusText: 'Not Found' });
    });

    // Regression target: a timeline-governed context key (see Environment.timeline) rejects an
    // actual change with a structured 400, same shape as a PUT validation failure -- the editor
    // needs the problems array to show the server's reason instead of a generic error text.
    it('should surface the ValidationError body of a 400 response from setStateChecked instead of a generic ApiError', (done) => {
        const change: StateChange = { context: { energy_price: 1 } };
        const validationError: ValidationError = { problems: [{ path: 'context.energy_price', message: 'driven by the timeline, cannot be changed here' }] };
        service.setStateChecked('e1', change).subscribe(resp => {
            expect(resp).toEqual(validationError);
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1/state');
        req.flush(validationError, { status: 400, statusText: 'Bad Request' });
    });

    it('should get the live state with a GET on /environments/{id}/state', (done) => {
        const state = { running: true, as_of: '2026-08-27T10:00:00Z', context: { outdoor_temp: 5 }, zones: { z1: { occupied: true } }, assets: {} };
        service.getEnvironmentState('e1').subscribe(resp => {
            expect(resp).toEqual(state);
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1/state');
        expect(req.request.method).toBe('GET');
        req.flush(state);
    });

    it('should return null instead of throwing when the live state endpoint fails', (done) => {
        service.getEnvironmentState('e1').subscribe(resp => {
            expect(resp).toBeNull();
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1/state');
        req.flush('environment e1 is not running', { status: 404, statusText: 'Not Found' });
    });

    it('should get the history status with a GET on /environments/{id}/history', (done) => {
        const status: HistoryStatus = { environment_id: 'e1', state: 'running', from: '2026-07-01T00:00:00Z', to: '2026-08-01T00:00:00Z' };
        service.getHistory('e1').subscribe(resp => {
            expect(resp).toEqual({ kind: 'status', status } as HistoryPollResult);
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1/history');
        expect(req.request.method).toBe('GET');
        req.flush(status);
    });

    it('should report kind "none" when nothing is known about a history run (404), without logging it as an error', (done) => {
        spyOn(console, 'error');
        service.getHistory('e1').subscribe(resp => {
            expect(resp).toEqual({ kind: 'none' });
            expect(console.error).not.toHaveBeenCalled();
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1/history');
        req.flush('nothing is known about a history run of this environment', { status: 404, statusText: 'Not Found' });
    });

    it('should report kind "error" (and log it) for anything other than a 404', (done) => {
        spyOn(console, 'error');
        service.getHistory('e1').subscribe(resp => {
            expect(resp).toEqual({ kind: 'error', message: 'moses is down', status: 500 });
            expect(console.error).toHaveBeenCalled();
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1/history');
        req.flush('moses is down', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should start a history run with a POST on /environments/{id}/history', (done) => {
        const status: HistoryStatus = { environment_id: 'e1', state: 'running', from: '2026-07-01T00:00:00Z', to: '2026-08-01T00:00:00Z' };
        service.startHistory('e1', '2026-07-01T00:00:00Z', false).subscribe(resp => {
            expect(resp).toEqual(status);
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1/history');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ from: '2026-07-01T00:00:00Z', force: false });
        req.flush(status, { status: 202, statusText: 'Accepted' });
    });

    // Regression target: the occupied-window 409 body names devices with and without an asset
    // name (see moses' OccupiedDevice.String) -- both forms must parse.
    it('should classify an occupied-window 409 and parse its devices, with and without a name', (done) => {
        const body = [
            'the first day of the window already holds readings for these devices, so the run would write rows a second time; send force: true to start anyway',
            'device d1 (Meter 1)',
            'device d2',
        ].join('\n');
        service.startHistory('e1', '2026-07-01T00:00:00Z', false).subscribe(resp => {
            const refusal = resp as HistoryStartRefusal;
            expect(refusal.kind).toBe('occupied');
            expect(refusal.message).toBe(
                'the first day of the window already holds readings for these devices, so the run would write rows a second time; send force: true to start anyway',
            );
            expect(refusal.devices).toEqual([{ id: 'd1', name: 'Meter 1' }, { id: 'd2', name: undefined }]);
            expect(refusal.status).toBe(409);
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1/history');
        req.flush(body, { status: 409, statusText: 'Conflict' });
    });

    // Regression target: an asset name can contain a newline, parentheses or non-ASCII letters,
    // and a device can have no name at all -- all of these break across the body's lines differently.
    it('should parse device names split across a newline, with parentheses, with umlauts, and without a name', (done) => {
        const body = [
            'the first day of the window already holds readings for these devices, so the run would write rows a second time; send force: true to start anyway',
            'device d1 (Line 1',
            'Hall A)',
            'device d2 (Meter (main))',
            'device d3 (Motor für Halle 3)',
            'device d4',
        ].join('\n');
        service.startHistory('e1', '2026-07-01T00:00:00Z', false).subscribe(resp => {
            const refusal = resp as HistoryStartRefusal;
            expect(refusal.devices).toEqual([
                { id: 'd1', name: 'Line 1\nHall A' },
                { id: 'd2', name: 'Meter (main)' },
                { id: 'd3', name: 'Motor für Halle 3' },
                { id: 'd4', name: undefined },
            ]);
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1/history');
        req.flush(body, { status: 409, statusText: 'Conflict' });
    });

    it('should classify a plain "already running" 409 (no force offered) as running, not occupied', (done) => {
        service.startHistory('e1', '2026-07-01T00:00:00Z', false).subscribe(resp => {
            expect(resp).toEqual({ kind: 'running', message: 'a history run of this environment is in progress', status: 409 });
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1/history');
        req.flush('a history run of this environment is in progress', { status: 409, statusText: 'Conflict' });
    });

    it('should classify a 503 as a check timeout', (done) => {
        service.startHistory('e1', '2026-07-01T00:00:00Z', false).subscribe(resp => {
            expect(resp).toEqual({
                kind: 'timeout',
                message: 'the timescale did not answer in time, so the history window could not be checked; send force: true to start the run without the check',
                status: 503,
            });
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1/history');
        req.flush(
            'the timescale did not answer in time, so the history window could not be checked; send force: true to start the run without the check',
            { status: 503, statusText: 'Service Unavailable' },
        );
    });

    it('should classify a 400 as an invalid window', (done) => {
        service.startHistory('e1', '2026-07-01T00:00:00Z', false).subscribe(resp => {
            expect(resp).toEqual({ kind: 'window', message: 'the window may not start in the future', status: 400 });
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1/history');
        req.flush('the window may not start in the future', { status: 400, statusText: 'Bad Request' });
    });

    it('should classify any other failure as "other"', (done) => {
        service.startHistory('e1', '2026-07-01T00:00:00Z', false).subscribe(resp => {
            expect(resp).toEqual({ kind: 'other', message: 'boom', status: 500 });
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1/history');
        req.flush('boom', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should cancel a history run with a DELETE on /environments/{id}/history', (done) => {
        const status: HistoryStatus = { environment_id: 'e1', state: 'cancelled' };
        service.cancelHistory('e1').subscribe(resp => {
            expect(resp).toEqual({ kind: 'status', status });
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1/history');
        expect(req.request.method).toBe('DELETE');
        req.flush(status, { status: 202, statusText: 'Accepted' });
    });

    it('should report "none" when cancelling a history run that is not known (404)', (done) => {
        service.cancelHistory('e1').subscribe(resp => {
            expect(resp).toEqual({ kind: 'none' });
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1/history');
        req.flush('nothing is known about a history run of this environment', { status: 404, statusText: 'Not Found' });
    });

    it('should report an error, not "none", when the cancel fails for another reason', (done) => {
        service.cancelHistory('e1').subscribe(resp => {
            expect(resp).toEqual({ kind: 'error', message: 'unable to abort the history run', status: 500 });
            done();
        });
        const req = httpMock.expectOne(environmentsUrl + '/e1/history');
        req.flush('unable to abort the history run', { status: 500, statusText: 'Internal Server Error' });
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
