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

import { MonitorService } from './monitor.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';
import { MonitorProcessTotalModel } from './monitor-process-total.model';
import { MatDialogModule } from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('MonitorService', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    imports: [MatDialogModule],
    providers: [MonitorService, MatSnackBar, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
    });

    it('should be created', inject([MonitorService], (service: MonitorService) => {
        expect(service).toBeTruthy();
    }));

    it('should list the instances of all networks from the engine in the format of the tables', inject(
        [MonitorService, HttpTestingController],
        (service: MonitorService, http: HttpTestingController) => {
            let received: MonitorProcessTotalModel | undefined;
            service.getInstancesOfNetworks('finished', 'alarm', undefined, 20, 40, 'endTime', 'asc').subscribe((resp) => (received = resp));

            const list = http.expectOne((r) => r.url === environment.automationEngineUrl + '/namespaces/processes/instances');
            expect(list.request.params.keys().sort()).toEqual(['deployment_name', 'limit', 'offset', 'sort', 'state']);
            expect(list.request.params.get('state')).toBe('finished');
            expect(list.request.params.get('sort')).toBe('ended_at.asc');
            list.flush({
                items: [
                    {
                        id: 'i1',
                        deployment_id: 'd1',
                        deployment_name: 'alarm',
                        deployment_version: 2,
                        state: 'incident',
                        end_reason: 'device offline',
                        started_at: '2026-10-27T10:00:00Z',
                        ended_at: '2026-10-27T10:00:05Z',
                        network_id: 'hub-1',
                    },
                ],
                total: 41,
                limit: 20,
                offset: 40,
            });

            expect(received?.total).toBe(41);
            const instance = received?.data[0];
            expect([instance?.processDefinitionName, instance?.state, instance?.durationInMillis, instance?.deleteReason, instance?.network_id]).toEqual([
                'alarm',
                'INTERNALLY_TERMINATED',
                5000,
                'device offline',
                'hub-1',
            ]);
        },
    ));

    it('should filter by deployment, business key and network instead of the name', inject(
        [MonitorService, HttpTestingController],
        (service: MonitorService, http: HttpTestingController) => {
            service.getInstancesOfNetworks('running', 'alarm', 'd1', 20, 0, 'id', 'asc', 'wardened:i1', 'cloud').subscribe(() => {});

            const list = http.expectOne((r) => r.url === environment.automationEngineUrl + '/namespaces/processes/instances');
            expect(list.request.params.get('deployment_id')).toBe('d1');
            expect(list.request.params.get('deployment_name')).toBeNull();
            expect(list.request.params.get('ids')).toBe('i1');
            expect(list.request.params.get('network_id')).toBe('cloud');
            // the engine cannot sort by id
            expect(list.request.params.get('sort')).toBeNull();
        },
    ));
});
