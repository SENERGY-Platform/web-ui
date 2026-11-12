/*
 * Copyright 2026 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
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
import { ThingsService } from './things.service';
import { ThingModel } from './things.model';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { environment } from '../../../../../environments/environment';

class MockLadonService {
    getUserAuthorizationsForURI(_uri: string): any {
        return {};
    }
}

describe('ThingsService', () => {
    let service: ThingsService;
    let httpMock: HttpTestingController;
    const id = 'urn:infai:ses:thing:t1';
    const thingUrl = environment.deviceRepoUrl + '/things/' + encodeURIComponent(id);

    function thing(): ThingModel {
        return {
            id,
            name: 'oven',
            owner_id: 'u1',
            attributes: [{ key: 'power', value: '2000', origin: 'meter-extractor' }],
            content_variables: [
                {
                    id: 'cv1',
                    name: 'consumption',
                    type: 'https://schema.org/StructuredValue',
                    indices: [0],
                    is_void: false,
                    omit_empty: true,
                    serialization_options: ['xml_attribute'],
                    sub_content_variables: [
                        {
                            id: 'cv2',
                            name: 'value',
                            type: 'https://schema.org/Float',
                            indices: [0, 0],
                            characteristic_id: 'urn:infai:ses:characteristic:kwh',
                            unit_reference: 'unit',
                            value: 1.5,
                            aspect_ids: ['urn:infai:ses:aspect:a1'],
                            function_id: 'urn:infai:ses:measuring-function:f1',
                            is_void: false,
                            serialization_options: [],
                        },
                    ],
                },
            ],
            device_links: [{ id: 'l1', device_id: 'd1', from: '2026-01-01T00:00:00Z', until: null }],
        };
    }

    // The body is the stored thing without device_links and without the editor's indices; every other
    // field, also one this app does not know, goes back unchanged.
    function expectedBody(): Omit<ThingModel, 'device_links'> {
        const { device_links: _links, ...body } = thing();
        return {
            ...body,
            content_variables: [
                {
                    id: 'cv1',
                    name: 'consumption',
                    type: 'https://schema.org/StructuredValue',
                    is_void: false,
                    omit_empty: true,
                    serialization_options: ['xml_attribute'],
                    sub_content_variables: [
                        {
                            id: 'cv2',
                            name: 'value',
                            type: 'https://schema.org/Float',
                            characteristic_id: 'urn:infai:ses:characteristic:kwh',
                            unit_reference: 'unit',
                            value: 1.5,
                            aspect_ids: ['urn:infai:ses:aspect:a1'],
                            function_id: 'urn:infai:ses:measuring-function:f1',
                            is_void: false,
                            serialization_options: [],
                        },
                    ],
                },
            ],
        };
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [MatDialogModule, MatSnackBarModule],
            providers: [
                ThingsService,
                { provide: LadonService, useClass: MockLadonService },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        service = TestBed.inject(ThingsService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should list with paging, search and sort and read the total from the header', (done) => {
        service.getThings({ limit: 20, offset: 40, search: 'oven', sortBy: 'name', sortDirection: 'desc' }).subscribe((resp) => {
            expect(resp.total).toBe(41);
            expect(resp.result.length).toBe(1);
            done();
        });
        const req = httpMock.expectOne((r) => r.url === environment.deviceRepoUrl + '/things');
        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('limit')).toBe('20');
        expect(req.request.params.get('offset')).toBe('40');
        expect(req.request.params.get('search')).toBe('oven');
        expect(req.request.params.get('sort')).toBe('name.desc');
        req.flush([thing()], { headers: { 'X-Total-Count': '41' } });
    });

    it('should update with PUT and the body without device links and indices', () => {
        service.updateThing(thing()).subscribe();
        const req = httpMock.expectOne(thingUrl);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual(expectedBody());
        req.flush(thing());
    });

    it('should create with POST and no id in the body', () => {
        service.createThing({ ...thing(), id: '' }).subscribe();
        const req = httpMock.expectOne(environment.deviceRepoUrl + '/things');
        expect(req.request.method).toBe('POST');
        const { id: _id, ...body } = expectedBody();
        expect(req.request.body).toEqual(body);
        req.flush(thing());
    });

    it('should not change the thing it saves', () => {
        const t = thing();
        service.updateThing(t).subscribe();
        httpMock.expectOne(thingUrl).flush(t);
        expect(t.device_links.length).toBe(1);
        expect(t.content_variables[0].indices).toEqual([0]);
        expect(t.content_variables[0].sub_content_variables?.[0].indices).toEqual([0, 0]);
    });

    it('should link a device with the given body', () => {
        service.addDeviceLink(id, { device_id: 'd2', from: '2026-02-01T00:00:00Z' }).subscribe();
        const req = httpMock.expectOne(thingUrl + '/device-links');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ device_id: 'd2', from: '2026-02-01T00:00:00Z' });
        req.flush(thing());
    });

    it('should end a link with an empty body, which ends it now', () => {
        service.endDeviceLink(id, 'l1').subscribe();
        const req = httpMock.expectOne(thingUrl + '/device-links/l1/end');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({});
        req.flush(thing());
    });

    it('should report a delete answered with an empty 200 as success', (done) => {
        service.deleteThing(id).subscribe((resp) => {
            expect(resp).toBeTrue();
            done();
        });
        const req = httpMock.expectOne(thingUrl);
        expect(req.request.method).toBe('DELETE');
        req.flush(null, { status: 200, statusText: 'OK' });
    });

    it('should report a refused delete as false', (done) => {
        service.deleteThing(id).subscribe((resp) => {
            expect(resp).toBeFalse();
            done();
        });
        httpMock.expectOne(thingUrl).flush('access denied', { status: 403, statusText: 'Forbidden' });
    });
});
