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

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ExportService } from './export.service';
import { BrokerExportService } from './broker-export.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { LadonService } from '../../admin/permissions/shared/services/ladom.service';
import { DeviceInstancesService } from '../../devices/device-instances/shared/device-instances.service';

describe('stopPipelines', () => {
    const failingHttp = (status: number) => ({ request: () => throwError(() => new HttpErrorResponse({ status })) }) as unknown as HttpClient;
    const errorHandler = { logError: () => {} } as unknown as ErrorHandlerService;
    const ladon = { getUserAuthorizationsForURI: () => ({}) } as unknown as LadonService;

    // The component tells a gateway timeout from a failure by this status; it used to be 404 for every error.
    it('should hand the real error status of the export service to the caller', (done) => {
        TestBed.configureTestingModule({
            providers: [
                { provide: HttpClient, useValue: failingHttp(504) },
                { provide: ErrorHandlerService, useValue: errorHandler },
                { provide: LadonService, useValue: ladon },
                { provide: DeviceInstancesService, useValue: {} },
            ],
        });
        const service = TestBed.runInInjectionContext(() => new ExportService());
        service.stopPipelines(['e1', 'e2']).subscribe(result => {
            expect(result).toEqual({ status: 504 });
            done();
        });
    });

    it('should hand the real error status of the broker export service to the caller', (done) => {
        TestBed.configureTestingModule({
            providers: [
                { provide: HttpClient, useValue: failingHttp(504) },
                { provide: ErrorHandlerService, useValue: errorHandler },
                { provide: LadonService, useValue: ladon },
            ],
        });
        const service = TestBed.runInInjectionContext(() => new BrokerExportService());
        service.stopPipelines(['e1', 'e2']).subscribe(result => {
            expect(result).toEqual({ status: 504 });
            done();
        });
    });
});

describe('stopPipelineByIdIfExists', () => {
    const ladon = { getUserAuthorizationsForURI: () => ({}) } as unknown as LadonService;
    let reported: string[];
    // reached through `this`, so a handler called unbound fails the spec
    const errorHandler = {
        record(kind: string, result: unknown) {
            return () => {
                reported.push(kind);
                return of(result);
            };
        },
        handleErrorQuietly(_s: string, _m: string, result: unknown) {
            return this.record('quiet', result);
        },
        handleError(_s: string, _m: string, result: unknown) {
            return this.record('snack', result);
        },
    };

    beforeEach(() => (reported = []));

    function serviceFailingWith(status: number): ExportService {
        const http = { delete: () => throwError(() => new HttpErrorResponse({ status })) } as unknown as HttpClient;
        TestBed.configureTestingModule({
            providers: [
                { provide: HttpClient, useValue: http },
                { provide: ErrorHandlerService, useValue: errorHandler },
                { provide: LadonService, useValue: ladon },
                { provide: DeviceInstancesService, useValue: {} },
            ],
        });
        return TestBed.runInInjectionContext(() => new ExportService());
    }

    it('answers 404 for an export that is already gone', (done) => {
        serviceFailingWith(404).stopPipelineByIdIfExists('e1').subscribe((result) => {
            expect(result).toEqual({ status: 404 });
            expect(reported).toEqual(['quiet']);
            done();
        });
    });

    it('logs another failure without the error notice when asked to be quiet', (done) => {
        serviceFailingWith(502).stopPipelineByIdIfExists('e1', true).subscribe((result) => {
            expect(result).toEqual({ status: 502 });
            expect(reported).toEqual(['quiet']);
            done();
        });
    });

    it('answers the real status of another failure, and 500 when there is none', (done) => {
        serviceFailingWith(502).stopPipelineByIdIfExists('e1').subscribe((result) => {
            expect(result).toEqual({ status: 502 });
            expect(reported).toEqual(['snack']);
            TestBed.resetTestingModule();
            serviceFailingWith(0).stopPipelineByIdIfExists('e1').subscribe((noStatus) => {
                expect(noStatus).toEqual({ status: 500 });
                done();
            });
        });
    });
});

describe('getAllExportsQuietly', () => {
    const ladon = { getUserAuthorizationsForURI: () => ({}) } as unknown as LadonService;
    let reported: string[];
    let urls: string[];
    const errorHandler = {
        handleErrorQuietly: (_s: string, _m: string, result: unknown) => () => {
            reported.push('quiet');
            return of(result);
        },
        handleError: (_s: string, _m: string, result: unknown) => () => {
            reported.push('snack');
            return of(result);
        },
    } as unknown as ErrorHandlerService;

    function serviceAnswering(answer: () => ReturnType<HttpClient['get']>): ExportService {
        const http = {
            get: (url: string) => {
                urls.push(url);
                return answer();
            },
        } as unknown as HttpClient;
        TestBed.configureTestingModule({
            providers: [
                { provide: HttpClient, useValue: http },
                { provide: ErrorHandlerService, useValue: errorHandler },
                { provide: LadonService, useValue: ladon },
                { provide: DeviceInstancesService, useValue: {} },
            ],
        });
        return TestBed.runInInjectionContext(() => new ExportService());
    }

    beforeEach(() => {
        reported = [];
        urls = [];
    });

    it('asks for every export unpaged, also outside the internal databases, and hands the answer on unchanged', (done) => {
        serviceAnswering(() => of({})).getAllExportsQuietly().subscribe((result) => {
            expect(urls.length).toBe(1);
            expect(urls[0]).toMatch(/\/instance\?internal_only=false$/);
            expect(result).toEqual({});
            done();
        });
    });

    it('answers null on an error and logs it without the error notice', (done) => {
        serviceAnswering(() => throwError(() => new HttpErrorResponse({ status: 502 }))).getAllExportsQuietly().subscribe((result) => {
            expect(result).toBeNull();
            expect(reported).toEqual(['quiet']);
            done();
        });
    });
});
