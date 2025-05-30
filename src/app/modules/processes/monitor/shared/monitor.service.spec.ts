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
import { MatDialogModule } from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('MonitorService', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    imports: [MatDialogModule],
    providers: [MonitorService, MatSnackBar, provideHttpClient(withInterceptorsFromDi())]
});
    });

    it('should be created', inject([MonitorService], (service: MonitorService) => {
        expect(service).toBeTruthy();
    }));
});
