/*
 * Copyright 2025 InfAI (CC SES)
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
import { MatDialog } from '@angular/material/dialog';

import { InfoService } from './info.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('InfoService', () => {
    let service: InfoService;

    beforeEach(() => {
        TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
            providers: [
                {provide: MatDialog, useValue: {}}
            ]
        });
        service = TestBed.inject(InfoService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
