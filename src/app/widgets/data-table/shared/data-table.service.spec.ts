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
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { AutomationEngineService } from '../../../core/services/automation-engine.service';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { DataTableElementModel } from './data-table.model';
import { DataTableService } from './data-table.service';

describe('DataTableService', () => {
    let service: DataTableService;
    let exportService: jasmine.SpyObj<ExportService>;
    let engine: jasmine.SpyObj<AutomationEngineService>;

    const element = (overrides: Partial<DataTableElementModel> = {}): DataTableElementModel =>
        ({
            name: 'Battery flow',
            exportCreatedByWidget: true,
            exportId: 'export-1',
            elementDetails: { device: { deploymentId: 'deployment-1', scheduleId: 'schedule-1' } },
            ...overrides,
        }) as unknown as DataTableElementModel;

    beforeEach(() => {
        exportService = jasmine.createSpyObj('ExportService', ['stopPipeline', 'stopPipelineById', 'stopPipelineByIdIfExists']);
        engine = jasmine.createSpyObj('AutomationEngineService', [
            'deleteDeployment',
            'deleteSchedule',
            'deleteDeploymentIfExists',
            'deleteScheduleIfExists',
        ]);
        // the resource is gone already, which is what the widget delete used to report as an error
        exportService.stopPipelineByIdIfExists.and.returnValue(of({ status: 404 }));
        engine.deleteDeploymentIfExists.and.returnValue(of({ status: 404 }));
        engine.deleteScheduleIfExists.and.returnValue(of({ status: 404 }));
        // answered as well, so a wrong call shows up as a failed expectation and not as a missing stub
        exportService.stopPipeline.and.returnValue(of({ status: 404 }));
        exportService.stopPipelineById.and.returnValue(of({ status: 404 }));
        engine.deleteDeployment.and.returnValue(of({ status: 404 }));
        engine.deleteSchedule.and.returnValue(of({ status: 404 }));

        TestBed.configureTestingModule({
            providers: [
                DataTableService,
                { provide: ExportService, useValue: exportService },
                { provide: AutomationEngineService, useValue: engine },
                { provide: DashboardService, useValue: jasmine.createSpyObj('DashboardService', ['updateWidget']) },
                { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
            ],
        });
        service = TestBed.inject(DataTableService);
    });

    it('deletes the generated resources with the variants that accept a 404', () => {
        service.deleteElements([element()]);

        expect(exportService.stopPipelineByIdIfExists).toHaveBeenCalledWith('export-1');
        expect(engine.deleteDeploymentIfExists).toHaveBeenCalledWith('deployment-1');
        expect(engine.deleteScheduleIfExists).toHaveBeenCalledWith('schedule-1');
        expect(exportService.stopPipeline).not.toHaveBeenCalled();
        expect(exportService.stopPipelineById).not.toHaveBeenCalled();
        expect(engine.deleteDeployment).not.toHaveBeenCalled();
        expect(engine.deleteSchedule).not.toHaveBeenCalled();
    });

    it('keeps an export the widget did not create', () => {
        service.deleteElements([element({ exportCreatedByWidget: false })]);

        expect(exportService.stopPipelineByIdIfExists).not.toHaveBeenCalled();
        expect(engine.deleteDeploymentIfExists).toHaveBeenCalledWith('deployment-1');
    });

    it('does nothing without elements', () => {
        service.deleteElements(undefined);

        expect(exportService.stopPipelineByIdIfExists).not.toHaveBeenCalled();
        expect(engine.deleteDeploymentIfExists).not.toHaveBeenCalled();
    });
});
