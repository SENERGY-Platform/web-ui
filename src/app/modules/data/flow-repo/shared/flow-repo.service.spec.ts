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
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { FlowRepoService } from './flow-repo.service';
import { FlowCreateResponse, FlowModel } from './flow.model';
import { environment } from '../../../../../environments/environment';

describe('FlowRepoService', () => {
    let service: FlowRepoService;
    let http: HttpTestingController;

    const newFlow = () =>
        ({
            name: 'my flow',
            description: 'a flow',
            model: { cells: [] },
            image: '<svg></svg>',
        }) as unknown as FlowModel;

    beforeEach(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [MatDialogModule, MatSnackBarModule],
            providers: [FlowRepoService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
        });
        service = TestBed.inject(FlowRepoService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        http.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('creates a flow without id and returns the id of the created flow', () => {
        const bodies: (FlowCreateResponse | null)[] = [];
        service.saveFlow(newFlow()).subscribe((resp) => bodies.push(resp !== null ? resp.body : null));

        const req = http.expectOne(environment.flowRepoUrl + '/flow/');
        expect(req.request.method).toEqual('PUT');
        req.flush({ _id: 'created-flow-id' }, { status: 201, statusText: 'Created' });

        expect(bodies).toEqual([{ _id: 'created-flow-id' }]);
    });

    it('updates a flow with id on its own endpoint and does not send the id in the body', () => {
        const flow = newFlow();
        flow._id = 'existing-flow-id';
        service.saveFlow(flow).subscribe();

        const req = http.expectOne(environment.flowRepoUrl + '/flow/existing-flow-id/');
        expect(req.request.method).toEqual('POST');
        expect(req.request.body._id).toBeUndefined();
        expect(req.request.body.name).toEqual('my flow');
        req.flush(null, { status: 200, statusText: 'OK' });
    });
});
