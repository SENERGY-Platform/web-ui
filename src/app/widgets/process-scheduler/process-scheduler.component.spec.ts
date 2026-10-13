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

import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { createSpyFromClass } from 'jasmine-auto-spies';
import { ProcessSchedulerComponent } from './process-scheduler.component';
import { ProcessSchedulerService } from './shared/process-scheduler.service';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { DeploymentsService } from '../../modules/processes/deployments/shared/deployments.service';
import { DialogsService } from '../../core/services/dialogs.service';
import { CronConverterService } from './shared/cron-converter.service';
import { ProcessSchedulerModel } from './shared/process-scheduler.model';

describe('ProcessSchedulerComponent', () => {
    function create(closedWith: ProcessSchedulerModel | undefined) {
        const service = createSpyFromClass(ProcessSchedulerService);
        TestBed.configureTestingModule({
            providers: [
                { provide: ProcessSchedulerService, useValue: service },
                { provide: DashboardService, useValue: createSpyFromClass(DashboardService) },
                { provide: DeploymentsService, useValue: createSpyFromClass(DeploymentsService) },
                { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(closedWith) }) } },
                { provide: MatSnackBar, useValue: createSpyFromClass(MatSnackBar) },
                { provide: DialogsService, useValue: createSpyFromClass(DialogsService) },
                { provide: CronConverterService, useValue: createSpyFromClass(CronConverterService) },
            ],
        });
        const component = TestBed.runInInjectionContext(() => new ProcessSchedulerComponent());
        component.widget = { id: 'widget-1' } as any;
        return { component, service };
    }

    // rxjs rethrows an error of the subscriber on a timer, so only tick() surfaces it.
    it('does nothing when the schedule dialog is cancelled', fakeAsync(() => {
        const { component, service } = create(undefined);

        component.add(null);
        tick();

        expect(service.createSchedule).not.toHaveBeenCalled();
        expect(service.updateSchedule).not.toHaveBeenCalled();
    }));

    it('creates a saved schedule on behalf of the widget', () => {
        const schedule = { id: '' } as ProcessSchedulerModel;
        const { component, service } = create(schedule);
        service.createSchedule.and.returnValue(of(null));

        component.add(null);

        expect(service.createSchedule).toHaveBeenCalledWith(jasmine.objectContaining({ created_by: 'widget-1' }));
    });
});
