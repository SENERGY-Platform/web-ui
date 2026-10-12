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
import { CharacteristicsService } from './characteristics.service';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { environment } from '../../../../../environments/environment';

class MockLadonService {
    getUserAuthorizationsForURI(_uri: string): any {
        return {};
    }
}

describe('CharacteristicsService delete', () => {
    let service: CharacteristicsService;
    let httpMock: HttpTestingController;
    const id = 'urn:infai:ses:characteristic:ch1';
    const deleteUrl = environment.deviceRepoUrl + '/characteristics/' + id;

    beforeEach(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [MatDialogModule, MatSnackBarModule],
            providers: [
                CharacteristicsService,
                { provide: LadonService, useClass: MockLadonService },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        service = TestBed.inject(CharacteristicsService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    // The device-repository answers an accepted delete with 200 and an empty body on some endpoints
    // and with a `true` body on others. Reading the body therefore reports a successful delete as a
    // failure wherever the body is empty, which is why only the status may decide.
    it('should report a delete answered with an empty 200 as success', (done) => {
        service.deleteCharacteristic(id).subscribe(resp => {
            expect(resp).toBeTrue();
            done();
        });
        const req = httpMock.expectOne(deleteUrl);
        expect(req.request.method).toBe('DELETE');
        req.flush(null, { status: 200, statusText: 'OK' });
    });

    it('should report a delete answered with a true body as success', (done) => {
        service.deleteCharacteristic(id).subscribe(resp => {
            expect(resp).toBeTrue();
            done();
        });
        httpMock.expectOne(deleteUrl).flush(true);
    });

    it('should report a refused delete as false', (done) => {
        service.deleteCharacteristic(id).subscribe(resp => {
            expect(resp).toBeFalse();
            done();
        });
        httpMock.expectOne(deleteUrl).flush('still in use', { status: 400, statusText: 'Bad Request' });
    });
});
