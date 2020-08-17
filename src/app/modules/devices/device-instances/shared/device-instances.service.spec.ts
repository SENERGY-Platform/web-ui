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

import {TestBed} from '@angular/core/testing';

import {MatDialogModule} from '@angular/material/dialog';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {DeviceInstancesService} from './device-instances.service';
import {MatSnackBarModule} from '@angular/material/snack-bar';


describe('DeviceInstancesService', () => {
    let service: DeviceInstancesService;
    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [MatDialogModule, HttpClientTestingModule, MatSnackBarModule],
            providers: [DeviceInstancesService]
        });
        service = TestBed.inject(DeviceInstancesService);
    });

    it('should create', () => {
        expect(service).toBeTruthy();
    });

    it('test convertToShortId', () => {
        expect(service.convertToShortId('urn:infai:ses:device:6bd07b75-d7cc-4a1a-88db-ac93f61aa7b3')).toBe('a9B7ddfMShqI26yT9hqnsw');
        expect(function () {
            service.convertToShortId('6bd07b75-d7cc-4a1a-88db-ac93f61aa7b3');
        }).toThrowError('expected urn:infai:ses:device as prefix');
        expect(service.convertToShortId('')).toBe('');
        expect(service.convertToShortId(undefined)).toBe('');
    });

});
