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

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { createSpyFromClass } from 'jasmine-auto-spies';
import { environment } from 'src/environments/environment';
import { ErrorHandlerService } from './error-handler.service';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { PermissionTestResponse } from 'src/app/modules/admin/permissions/shared/permission.model';
import { PhotonHit, photonHits, photonLabel, PhotonService } from './photon.service';

describe('photonLabel', () => {
    it('describes an address', () => {
        expect(photonLabel({ street: 'Augustusplatz', housenumber: '10', postcode: '04109', city: 'Leipzig', country: 'Germany' }))
            .toBe('Augustusplatz 10, 04109 Leipzig, Germany');
    });

    it('puts the name of a building in front of its address', () => {
        expect(photonLabel({ name: 'Paulinum', street: 'Augustusplatz', housenumber: '10', postcode: '04109', city: 'Leipzig' }))
            .toBe('Paulinum, Augustusplatz 10, 04109 Leipzig');
    });

    it('names a street once', () => {
        expect(photonLabel({ name: 'Augustusplatz', street: 'Augustusplatz', city: 'Leipzig' })).toBe('Augustusplatz, Leipzig');
    });

    it('names a town by its name', () => {
        expect(photonLabel({ name: 'Leipzig', country: 'Germany' })).toBe('Leipzig, Germany');
    });
});

describe('photonHits', () => {
    const feature = (properties: object, coordinates = [12.38, 51.34]) => ({ properties, geometry: { coordinates } });

    it('keeps the ranking and the coordinates', () => {
        const hits = photonHits({ features: [feature({ name: 'Leipzig' }, [12.37, 51.34]), feature({ name: 'Halle' }, [11.97, 51.48])] });

        expect(hits.map(h => [h.label, h.lon, h.lat])).toEqual([['Leipzig', 12.37, 51.34], ['Halle', 11.97, 51.48]]);
    });

    it('turns the extent of an area into west, south, east, north', () => {
        const hits = photonHits({ features: [feature({ name: 'Leipzig', extent: [12.23, 51.45, 12.54, 51.23] })] });

        expect(hits[0].extent).toEqual([12.23, 51.23, 12.54, 51.45]);
    });

    it('lists hits with the same label close by once', () => {
        const address = { street: 'Augustusplatz', housenumber: '10', city: 'Leipzig' };

        expect(photonHits({ features: [feature(address, [12.3810, 51.3390]), feature(address, [12.3811, 51.3391])] }).length).toBe(1);
    });

    it('keeps towns of the same name far apart', () => {
        const town = { name: 'Neustadt', country: 'Germany' };

        expect(photonHits({ features: [feature(town, [8.14, 49.35]), feature(town, [11.11, 50.32])] }).length).toBe(2);
    });

    it('has no hits without an answer', () => {
        expect(photonHits(null)).toEqual([]);
    });
});

describe('PhotonService', () => {
    let service: PhotonService;
    let http: HttpTestingController;
    let rights: PermissionTestResponse | undefined;

    beforeEach(() => {
        rights = undefined;
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ErrorHandlerService, useValue: createSpyFromClass(ErrorHandlerService) },
                { provide: LadonService, useValue: { getUserAuthorizationsForURI: (uri: string) => (uri === environment.photonUrl + '/api' ? rights : undefined) } },
            ],
        });
        service = TestBed.inject(PhotonService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('lets the user search with a GET right on the api', () => {
        rights = { GET: true } as PermissionTestResponse;

        expect(service.userMaySearch()).toBeTrue();
    });

    it('treats a missing rule as no right to search', () => {
        expect(service.userMaySearch()).toBeFalse();
    });

    it('asks the api of Photon for five hits', () => {
        let hits: PhotonHit[] | undefined;
        service.search('Augustusplatz').subscribe(h => hits = h);

        const req = http.expectOne(r => r.url === environment.photonUrl + '/api');
        expect(req.request.params.get('q')).toBe('Augustusplatz');
        expect(req.request.params.get('limit')).toBe('5');
        req.flush({ features: [{ properties: { name: 'Augustusplatz', city: 'Leipzig' }, geometry: { coordinates: [12.38, 51.34] } }] });

        expect(hits?.map(h => h.label)).toEqual(['Augustusplatz, Leipzig']);
    });
});
