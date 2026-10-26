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

import { TestBed } from '@angular/core/testing';

import { MatDialogModule } from '@angular/material/dialog';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeviceInstancesService } from './device-instances.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { Attribute, DeviceInstanceModel } from './device-instances.model';

describe('DeviceInstancesService', () => {
    let service: DeviceInstancesService;
    beforeEach(() => {
        TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    imports: [MatDialogModule, MatSnackBarModule],
    providers: [DeviceInstancesService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
        service = TestBed.inject(DeviceInstancesService);
    });

    it('should create', () => {
        expect(service).toBeTruthy();
    });

    it('test convertToShortId', () => {
        expect(service.convertToShortId('urn:infai:ses:device:6bd07b75-d7cc-4a1a-88db-ac93f61aa7b3')).toBe('a9B7ddfMShqI26yT9hqnsw');
        expect(function() {
            service.convertToShortId('6bd07b75-d7cc-4a1a-88db-ac93f61aa7b3');
        }).toThrowError('expected urn:infai:ses:device as prefix');
        expect(service.convertToShortId('')).toBe('');
        expect(service.convertToShortId(undefined)).toBe('');
    });

    describe('does not write account default attributes back onto the device', () => {
        const attributes: Attribute[] = [
            {key: 'last_message_max_age', value: '1h', origin: 'default'},
            {key: 'monitor_connection_state', value: '6h', origin: 'default'},
            {key: 'last_message_max_age', value: '2h', origin: 'web-ui'}, // overrides the default on this device
        ];
        const device = {id: 'device-1', attributes} as DeviceInstanceModel;
        const ownAttributes = [attributes[2]];
        let httpMock: HttpTestingController;

        beforeEach(() => {
            httpMock = TestBed.inject(HttpTestingController);
        });

        afterEach(() => {
            httpMock.verify();
        });

        it('on update', () => {
            service.updateDeviceInstance(device).subscribe();
            const req = httpMock.expectOne(environment.deviceRepoUrl + '/devices/device-1');
            expect(req.request.body.attributes).toEqual(ownAttributes);
            req.flush(device);
            expect(device.attributes).toEqual(attributes);
        });

        it('on attribute update', () => {
            service.updateDeviceInstanceAttributes('device-1', attributes).subscribe();
            const req = httpMock.expectOne(environment.deviceRepoUrl + '/devices/device-1/attributes');
            expect(req.request.body).toEqual(ownAttributes);
            req.flush(device);
        });

        it('on create', () => {
            service.saveDeviceInstance(device).subscribe();
            const req = httpMock.expectOne(environment.deviceRepoUrl + '/devices');
            expect(req.request.body.attributes).toEqual(ownAttributes);
            req.flush(device);
        });
    });
});
