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
import { environment } from '../../../../../environments/environment';
import { MatDialogModule } from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';

describe('DeploymentsService', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
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
});
