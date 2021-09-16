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

import { UtilService } from './util.service';

describe('UtilService', () => {
    let service: UtilService;
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [UtilService],
        });
        service = TestBed.inject(UtilService);
    });

    it('should create', () => {
        expect(service).toBeTruthy();
    });

    it('test toByteArray', () => {
        expect(service.stringToByteArray('6bd07b75d7cc4a1a88dbac93f61aa7b3')).toEqual([
            107, 208, 123, 117, 215, 204, 74, 26, 136, 219, 172, 147, 246, 26, 167, 179,
        ]);
    });

    it('test base64ArrayBuffer', () => {
        expect(service.convertByteArrayToBase64([107, 208, 123, 117, 215, 204, 74, 26, 136, 219, 172, 147, 246, 26, 167, 179])).toBe(
            'a9B7ddfMShqI26yT9hqnsw',
        );
    });
});
