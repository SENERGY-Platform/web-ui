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
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { createSpyFromClass } from 'jasmine-auto-spies';
import { SingleValueService } from './single-value.service';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { ExportDataService } from '../../shared/export-data.service';

describe('SingleValueService edit dialog', () => {
    let open: jasmine.Spy;
    let service: SingleValueService;

    beforeEach(() => {
        open = jasmine.createSpy('open').and.returnValue({ afterClosed: () => new Subject() });
        TestBed.configureTestingModule({
            providers: [
                { provide: MatDialog, useValue: { open } },
                { provide: DashboardService, useValue: createSpyFromClass(DashboardService) },
                { provide: ErrorHandlerService, useValue: createSpyFromClass(ErrorHandlerService) },
                { provide: ExportDataService, useValue: createSpyFromClass(ExportDataService) },
            ],
        });
        service = TestBed.inject(SingleValueService);
    });

    const config = () => open.calls.mostRecent().args[1] as MatDialogConfig;

    it('opens the two columns at the large size', () => {
        service.openEditDialog('d', 'w', true, true);

        expect(config().width).toBe('800px');
        expect(config().maxWidth).toBe('95vw');
    });

    it('keeps the medium size when only the name can be edited', () => {
        service.openEditDialog('d', 'w', true, false);

        expect(config().width).toBe('600px');
    });
});
