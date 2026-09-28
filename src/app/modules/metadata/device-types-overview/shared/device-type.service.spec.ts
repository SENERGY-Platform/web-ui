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
import { DeviceTypeService } from './device-type.service';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { environment } from '../../../../../environments/environment';
import { of } from 'rxjs';
import { ImportTypesService } from 'src/app/modules/imports/import-types/shared/import-types.service';
import { ImportTypeContentVariableModel, ImportTypeModel } from 'src/app/modules/imports/import-types/shared/import-types.model';

class MockLadonService {
    getUserAuthorizationsForURI(_uri: string): any {
        return {};
    }
}

describe('DeviceTypeService delete', () => {
    let service: DeviceTypeService;
    let httpMock: HttpTestingController;
    const id = 'urn:infai:ses:device-type:dt1';
    const deleteUrl = environment.deviceRepoUrl + '/device-types/' + id;

    beforeEach(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [MatDialogModule, MatSnackBarModule],
            providers: [
                DeviceTypeService,
                { provide: LadonService, useClass: MockLadonService },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        service = TestBed.inject(DeviceTypeService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    // The device-repository answers an accepted delete with 200 and an empty body on some endpoints
    // and with a `true` body on others. Reading the body therefore reports a successful delete as a
    // failure wherever the body is empty, which is why only the status may decide.
    it('should report a delete answered with an empty 200 as success', (done) => {
        service.deleteDeviceType(id).subscribe(resp => {
            expect(resp).toBeTrue();
            done();
        });
        const req = httpMock.expectOne(deleteUrl);
        expect(req.request.method).toBe('DELETE');
        req.flush(null, { status: 200, statusText: 'OK' });
    });

    it('should report a delete answered with a true body as success', (done) => {
        service.deleteDeviceType(id).subscribe(resp => {
            expect(resp).toBeTrue();
            done();
        });
        httpMock.expectOne(deleteUrl).flush(true);
    });

    it('should report a refused delete as false', (done) => {
        service.deleteDeviceType(id).subscribe(resp => {
            expect(resp).toBeFalse();
            done();
        });
        httpMock.expectOne(deleteUrl).flush('still in use', { status: 400, statusText: 'Bad Request' });
    });
});

describe('DeviceTypeService import-type criteria', () => {
    let service: DeviceTypeService;
    let httpMock: HttpTestingController;
    const air = 'urn:infai:ses:aspect:air';
    const water = 'urn:infai:ses:aspect:water';
    const temperature = 'urn:infai:ses:measuring-function:temperature';
    const humidity = 'urn:infai:ses:measuring-function:humidity';

    const variable = (fields: Partial<ImportTypeContentVariableModel>): ImportTypeContentVariableModel =>
        ({ name: 'v', type: 'float', sub_content_variables: null, use_as_tag: false, ...fields });

    // aspect_id outside aspect_ids is what the import-repository would fold into the list
    const importOutput = variable({
        sub_content_variables: [
            variable({ aspect_id: water, aspect_ids: [air], function_id: temperature }),
            variable({ aspect_id: air, aspect_ids: [air], function_id: humidity }),
        ],
    });

    beforeEach(() => {
        const importTypesService = { listImportTypes: () => of({ result: [{ output: importOutput } as ImportTypeModel], total: 1 }) };
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [MatDialogModule, MatSnackBarModule],
            providers: [
                DeviceTypeService,
                { provide: LadonService, useClass: MockLadonService },
                { provide: ImportTypesService, useValue: importTypesService },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        service = TestBed.inject(DeviceTypeService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('offers every aspect of an import-type variable once, from both fields', () => {
        service.getAspectNodesWithMeasuringFunction().subscribe();
        httpMock.expectOne(environment.deviceRepoUrl + '/aspect-nodes?function=measuring-function').flush([]);
        const nodesRequest = httpMock.expectOne(environment.deviceRepoUrl + '/query/aspect-nodes');
        expect(nodesRequest.request.body).toEqual({ ids: [air, water] });
        nodesRequest.flush([]);
    });

    it('offers the import functions of an aspect named only in the deprecated field', () => {
        let functionIds: string[] = [];
        service.getAspectsMeasuringFunctionsWithImports(water).subscribe((functions) => (functionIds = functions.map((f) => f.id)));
        httpMock.expectOne(environment.deviceRepoUrl + '/aspects/' + water + '/measuring-functions').flush([]);
        httpMock.expectOne(environment.deviceRepoUrl + '/query/aspect-nodes').flush([]);
        const functionsRequest = httpMock.expectOne((req) => req.url.startsWith(environment.deviceRepoUrl + '/functions?ids='));
        expect(functionsRequest.request.url).toBe(environment.deviceRepoUrl + '/functions?ids=' + encodeURIComponent(temperature));
        functionsRequest.flush([{ id: temperature, name: 'Temperature' }]);
        expect(functionIds).toEqual([temperature]);
    });
});
