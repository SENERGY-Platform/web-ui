/*
 * Copyright 2020 InfAI (CC SES)
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

import { TestBed, inject } from '@angular/core/testing';

import { DeploymentsService } from './deployments.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CamundaVariable } from './deployments-definition.model';
import { DeploymentsModel } from './deployments.model';
import { environment } from '../../../../../environments/environment';
import { MatDialogModule } from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { LadonService } from '../../../admin/permissions/shared/services/ladom.service';

describe('DeploymentsService', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    imports: [MatDialogModule],
    providers: [DeploymentsService, MatSnackBar, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
    });

    it('should be created', inject([DeploymentsService], (service: DeploymentsService) => {
        expect(service).toBeTruthy();
    }));

    it('should return a map', inject(
        [DeploymentsService, HttpTestingController],
        (service: DeploymentsService, http: HttpTestingController) => {
            const responseBody = { foo: { value: null, type: 'string' } };
            const expectedServiceResponse = new Map<string, CamundaVariable>([['foo', { value: null, type: 'string' }]]);
            let receivedResponse = new Map<string, CamundaVariable>();
            service.getDeploymentInputParameters('deplid').subscribe((resp) => {
                if (resp) {
                    receivedResponse = resp;
                }

                expect(receivedResponse).toEqual(expectedServiceResponse);

                expect(receivedResponse.get('foo')).toBeDefined();
                const foo = receivedResponse.get('foo');
                expect(foo && foo.type).toEqual('string');
            });

            http.expectOne(environment.processServiceUrl + '/v2/deployments/deplid/parameter').flush(responseBody);
        },
    ));

    it('should start with number parameter', inject(
        [DeploymentsService, HttpTestingController],
        (service: DeploymentsService, http: HttpTestingController) => {
            const parameter = new Map<string, CamundaVariable>([['foo', { value: 42, type: 'Long' }]]);
            service.startDeploymentWithParameter('deplid', parameter).subscribe(() => {});
            const r = http.expectOne(environment.processServiceUrl + '/v2/deployments/deplid/start?foo=42');
            expect(r.cancelled).toBeFalse();
        },
    ));

    it('should start with string parameter', inject(
        [DeploymentsService, HttpTestingController],
        (service: DeploymentsService, http: HttpTestingController) => {
            const parameter = new Map<string, CamundaVariable>([['foo', { value: 'bar', type: 'String' }]]);
            service.startDeploymentWithParameter('deplid', parameter).subscribe(() => {});
            const r = http.expectOne(environment.processServiceUrl + '/v2/deployments/deplid/start?foo=%22bar%22');
            expect(r.cancelled).toBeFalse();
        },
    ));

    it('should start with multiple parameter', inject(
        [DeploymentsService, HttpTestingController],
        (service: DeploymentsService, http: HttpTestingController) => {
            const parameter = new Map<string, CamundaVariable>([
                ['foo', { value: 'bar', type: 'String' }],
                ['batz', { value: 42, type: 'long' }],
            ]);
            service.startDeploymentWithParameter('deplid', parameter).subscribe(() => {});
            const r = http.expectOne(environment.processServiceUrl + '/v2/deployments/deplid/start?foo=%22bar%22&batz=42');
            expect(r.cancelled).toBeFalse();
        },
    ));

    it('should put the disabled flag of a deployment and return the stored state', inject(
        [DeploymentsService, HttpTestingController],
        (service: DeploymentsService, http: HttpTestingController) => {
            let received: { disabled: boolean } | null | undefined;
            service.setDeploymentDisabled('deplid', true).subscribe((resp) => (received = resp));

            const r = http.expectOne(environment.processServiceUrl + '/v2/deployments/deplid/disabled');
            expect(r.request.method).toBe('PUT');
            expect(r.request.body).toEqual({ disabled: true });
            r.flush({ disabled: true });
            expect(received).toEqual({ disabled: true });
        },
    ));

    it('should send disabled false when a deployment is switched on again', inject(
        [DeploymentsService, HttpTestingController],
        (service: DeploymentsService, http: HttpTestingController) => {
            service.setDeploymentDisabled('deplid', false).subscribe(() => {});

            const r = http.expectOne(environment.processServiceUrl + '/v2/deployments/deplid/disabled');
            expect(r.request.body).toEqual({ disabled: false });
        },
    ));

    it('should list the deployments of all networks without network_id and source', inject(
        [DeploymentsService, HttpTestingController],
        (service: DeploymentsService, http: HttpTestingController) => {
            let received: DeploymentsModel[] | undefined;
            service.listOfNetworks('', 2, 0, 'deploymentTime', 'desc', '').subscribe((resp) => (received = resp));

            const list = http.expectOne((r) => r.url === environment.automationEngineUrl + '/namespaces/processes/deployments');
            expect(list.request.params.keys().sort()).toEqual(['limit', 'offset', 'sort']);
            expect(list.request.params.get('sort')).toBe('created_at.desc');
            list.flush({
                items: [
                    { id: 'cloud-1', name: 'alarm', created_at: '2026-10-27T10:00:00Z', disabled: true },
                    { id: 'hub-1-deployment', name: 'light', created_at: '2026-10-27T11:00:00Z', network_id: 'hub-1' },
                ],
                total: 2,
                limit: 2,
                offset: 0,
            });
            http.expectOne(environment.processServiceUrl + '/v2/process-definitions/cloud-1/diagram').flush('<svg>1</svg>');
            http.expectOne(environment.processServiceUrl + '/v2/process-definitions/hub-1-deployment/diagram').flush('<svg>2</svg>');
            // devices are checked for the platform deployment only, the hub for the hub deployment
            http.expectOne(environment.processDeploymentUrl + '/dependencies?ids=cloud-1').flush([]);
            http.expectOne(environment.automationEngineUrl + '/networks/hub-1').flush({
                id: 'hub-1',
                name: 'Hub',
                online: false,
                resources: [{ kind: 'deployment', id: 'hub-1-deployment', state: 'pending' }],
            });
            http.verify();

            expect(received?.map((d) => [d.id, d.network_id, d.diagram, d.disabled, d.online, d.sync])).toEqual([
                ['cloud-1', undefined, '<svg>1</svg>', true, true, false],
                ['hub-1-deployment', 'hub-1', '<svg>2</svg>', false, false, true],
            ]);
            expect(received?.[1].offline_reasons.map((r) => r.description)).toEqual(['Hub offline']);
        },
    ));

    it('should pass the selected network and the source on', inject(
        [DeploymentsService, HttpTestingController],
        (service: DeploymentsService, http: HttpTestingController) => {
            service.listOfNetworks('alarm', 10, 20, 'name', 'asc', 'sepl', 'cloud').subscribe(() => {});

            const list = http.expectOne((r) => r.url === environment.automationEngineUrl + '/namespaces/processes/deployments');
            expect(list.request.params.get('network_id')).toBe('cloud');
            expect(list.request.params.get('source')).toBe('sepl');
            expect(list.request.params.get('search')).toBe('alarm');
            expect(list.request.params.get('sort')).toBe('name.asc');
            expect(list.request.params.get('offset')).toBe('20');
        },
    ));

    it('should keep a hub deployment that the hub could not apply offline with its error', inject(
        [DeploymentsService, HttpTestingController],
        (service: DeploymentsService, http: HttpTestingController) => {
            let received: DeploymentsModel | null | undefined;
            service.getDeploymentOfNetworks('d1').subscribe((resp) => (received = resp));

            http.expectOne(environment.automationEngineUrl + '/namespaces/processes/deployments/d1').flush({ id: 'd1', name: 'light', network_id: 'hub-1' });
            http.expectOne(environment.processServiceUrl + '/v2/process-definitions/d1/diagram').flush('<svg></svg>');
            http.expectOne(environment.automationEngineUrl + '/networks/hub-1').flush({
                id: 'hub-1',
                name: 'Hub',
                online: true,
                resources: [{ kind: 'deployment', id: 'd1', state: 'failed', error: 'unknown device' }],
            });

            expect(received?.online).toBeFalse();
            expect(received?.sync).toBeFalse();
            expect(received?.offline_reasons.map((r) => r.description)).toEqual(['Hub could not apply the deployment: unknown device']);
        },
    ));

    it('should return null when switching a deployment on or off fails', inject(
        [DeploymentsService, HttpTestingController],
        (service: DeploymentsService, http: HttpTestingController) => {
            let received: { disabled: boolean } | null | undefined;
            service.setDeploymentDisabled('deplid', true).subscribe((resp) => (received = resp));

            http.expectOne(environment.processServiceUrl + '/v2/deployments/deplid/disabled').flush('boom', {
                status: 500,
                statusText: 'Internal Server Error',
            });
            expect(received).toBeNull();
        },
    ));
});

describe('DeploymentsService.v2deleteDeploymentIfExists', () => {
    let reported: string[];

    function serviceFailingWith(status: number): DeploymentsService {
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
            providers: [
                { provide: HttpClient, useValue: { delete: () => throwError(() => new HttpErrorResponse({ status })) } },
                { provide: ErrorHandlerService, useValue: handlers },
                { provide: LadonService, useValue: { getUserAuthorizationsForURI: () => ({}) } },
            ],
        });
        return TestBed.runInInjectionContext(() => new DeploymentsService());
    }

    it('shows the error notice for a failure other than 404', (done) => {
        serviceFailingWith(502).v2deleteDeploymentIfExists('d1').subscribe((result) => {
            expect(result).toEqual({ status: 502 });
            expect(reported).toEqual(['notice']);
            done();
        });
    });

    it('logs that failure without the error notice when asked to be quiet', (done) => {
        serviceFailingWith(502).v2deleteDeploymentIfExists('d1', true).subscribe((result) => {
            expect(result).toEqual({ status: 502 });
            expect(reported).toEqual(['quiet']);
            done();
        });
    });
});

