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

import { ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';

import { PipelineRegistryComponent } from './pipeline-registry.component';
import { PipelineRegistryService } from './shared/pipeline-registry.service';
import { PipelineModel } from './shared/pipeline.model';
import { FlowEngineService } from '../flow-repo/shared/flow-engine.service';
import { SmartServiceModuleService } from '../../smart-services/instances/shared/modules.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { CoreModule } from '../../../core/core.module';

describe('PipelineRegistryComponent list', () => {
    let component: PipelineRegistryComponent;
    let fixture: ComponentFixture<PipelineRegistryComponent>;
    let router: Router;

    const registry: Spy<PipelineRegistryService> = createSpyFromClass<PipelineRegistryService>(PipelineRegistryService);
    const engine: Spy<FlowEngineService> = createSpyFromClass<FlowEngineService>(FlowEngineService);
    const modules: Spy<SmartServiceModuleService> = createSpyFromClass<SmartServiceModuleService>(SmartServiceModuleService);
    const permissions: Spy<PermissionsService> = createSpyFromClass<PermissionsService>(PermissionsService);
    const pipeline = {
        id: 'pipe-1', name: 'Smoothing', userId: 'me', operators: [{ inputSelections: [{}] }],
        createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-02T10:00:00Z',
    } as unknown as PipelineModel;

    function init(rights = { update: true, delete: true }) {
        registry.getPipelinesNew.and.returnValue(of({ data: [pipeline], total: 1 }));
        engine.getPipelinesStatus.and.returnValue(of([{ name: 'pipe-1', running: true, transitioning: false, message: '' } as any]));
        engine.userHasUpdateAuthorization.and.returnValue(rights.update);
        engine.userHasDeleteAuthorization.and.returnValue(rights.delete);
        modules.getModules.and.returnValue(of([]));
        permissions.getComputedResourcePermissionsV2.and.returnValue(of([{ id: pipeline.id, administrate: true } as any]));

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule, MatDialogModule, MatPaginatorModule, PipelineRegistryComponent],
            providers: [
                { provide: PipelineRegistryService, useValue: registry },
                { provide: FlowEngineService, useValue: engine },
                { provide: SmartServiceModuleService, useValue: modules },
                { provide: PermissionsService, useValue: permissions },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: AuthorizationService, useValue: { getUserId: () => 'me' } },
                { provide: DialogsService, useValue: {} },
            ],
        }).compileComponents();
        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);
        fixture = TestBed.createComponent(PipelineRegistryComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    afterEach(() => {
        registry.getPipelinesNew.calls.reset();
    });

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        registry.getPipelinesNew.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(registry.getPipelinesNew).toHaveBeenCalledTimes(1);
    }));

    it('has the selection column only with the delete right', fakeAsync(() => {
        init({ update: true, delete: false });
        discardPeriodicTasks();

        expect(component.displayedColumns).not.toContain('select');
        expect(component.displayedColumns).toContain('actions');
    }));

    it('opens the details page on a row click, edit stays reachable from the menu', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        (fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement).click();
        expect(router.navigate).toHaveBeenCalledWith(['/data/pipelines/details', 'pipe-1']);

        component.editPipeline(pipeline);
        expect(router.navigate).toHaveBeenCalledWith(['/data/pipelines/edit', 'pipe-1']);
    }));

    it('shows the run state as a chip', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        const chip = fixture.nativeElement.querySelector('tr.clickable-row .status-chip') as HTMLElement;
        expect(chip.textContent).toBe('Running');
        expect(chip.classList).toContain('online');
    }));

    it('carries the operator and flow filters as removable chips in the toolbar', fakeAsync(() => {
        init();
        component.routerOperator = ['op-1'];
        component.routerOperatorNames = ['Average'];
        component.routerFlow = ['flow-1'];
        component.routerFlowNames = ['Smoothing flow'];
        fixture.detectChanges();
        discardPeriodicTasks();

        const chips = fixture.nativeElement.querySelectorAll('senergy-list-toolbar mat-chip');
        expect(chips.length).toBe(2);
        expect(component.filtered).toBeTrue();
    }));

    it('has no table height computed in code', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('.table-container').style.maxHeight).toBe('');
    }));

    it('shows dates as dd.MM.yyyy HH:mm, has no origin column and puts the smart service chip next to the name', fakeAsync(() => {
        init();
        component.dataSource.data = [{ ...pipeline, smartServiceInstanceId: 'inst-1' } as PipelineModel];
        fixture.detectChanges();
        discardPeriodicTasks();

        const row = fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement;
        expect(component.displayedColumns).not.toContain('smartServiceInstanceId');
        expect(row.querySelector('.name-chip')?.textContent).toBe('Smart service');
        expect(row.textContent).toMatch(/\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/);
    }));
});
