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
import { NO_ERRORS_SCHEMA, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule } from '@angular/material/dialog';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';

import { FlowRepoComponent } from './flow-repo.component';
import { FlowModel } from './shared/flow.model';
import { FlowRepoService } from './shared/flow-repo.service';
import { FlowEngineService } from './shared/flow-engine.service';
import { CostService } from '../../cost/shared/cost.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { PipelineRegistryService } from '../pipeline-registry/shared/pipeline-registry.service';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { CoreModule } from '../../../core/core.module';

describe('FlowRepoComponent list', () => {
    let component: FlowRepoComponent;
    let fixture: ComponentFixture<FlowRepoComponent>;
    let router: Router;

    const service: Spy<FlowRepoService> = createSpyFromClass<FlowRepoService>(FlowRepoService);
    const permissions: Spy<PermissionsService> = createSpyFromClass<PermissionsService>(PermissionsService);
    const cost: Spy<CostService> = createSpyFromClass<CostService>(CostService);
    const flow = { _id: 'flow-1', name: 'Smoothing', description: 'Averages values', image: '<svg viewbox="0 0 10 10"></svg>', userId: 'me' } as FlowModel;

    function init(rights = { create: true, update: true, delete: true }, perms = { read: true, write: true, execute: true, administrate: true }) {
        service.getFlows.and.returnValue(of({ flows: [flow], total: 1 }));
        service.userHasCreateAuthorization.and.returnValue(rights.create);
        service.userHasUpdateAuthorization.and.returnValue(rights.update);
        service.userHasDeleteAuthorization.and.returnValue(rights.delete);
        permissions.getComputedResourcePermissionsV2.and.returnValue(of([{ id: flow._id, ...perms } as any]));
        cost.userMayGetFlowCostEstimations.and.returnValue(true);
        cost.getFlowCostEstimations.and.returnValue(of([{ min: 1, max: 2, median: 1.5, mean: 1.5 } as any]));

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule, MatDialogModule, MatPaginatorModule, FlowRepoComponent],
            providers: [
                { provide: FlowRepoService, useValue: service },
                { provide: FlowEngineService, useValue: { userHasCreateAuthorization: () => true } },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: PipelineRegistryService, useValue: {} },
                { provide: AuthorizationService, useValue: { getUserId: () => 'me', userIsAdmin: () => false } },
                { provide: DialogsService, useValue: {} },
            ],
        }).overrideComponent(FlowRepoComponent, {
            set: {
                providers: [
                    { provide: PermissionsService, useValue: permissions },
                    { provide: CostService, useValue: cost },
                ],
            },
        }).compileComponents();
        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);
        fixture = TestBed.createComponent(FlowRepoComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    afterEach(() => {
        service.getFlows.calls.reset();
    });

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        service.getFlows.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(service.getFlows).toHaveBeenCalledTimes(1);
    }));

    it('loads the first page once at the start', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(service.getFlows).toHaveBeenCalledTimes(1);
        expect(service.getFlows.calls.mostRecent().args.slice(3, 5)).toEqual(['dateUpdated', 'desc']);
    }));

    it('has no selection column and no FAB, the flow is deleted one at a time from the menu', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(component.displayedColumns).not.toContain('select');
        expect(fixture.nativeElement.querySelector('button.fab')).toBeNull();
        expect(component.canDelete(flow)).toBeTrue();
    }));

    it('offers the create button to everyone, as the page always did', fakeAsync(() => {
        init({ create: false, update: true, delete: true });
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('senergy-page-header button').textContent).toContain('New flow');
    }));

    it('opens the designer on a row click for who may edit, otherwise the row is inert', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        (fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement).click();
        expect(router.navigate).toHaveBeenCalledWith(['/data/designer', 'flow-1']);

        (router.navigate as jasmine.Spy).calls.reset();
        component.permissionsPerFlows = [{ id: 'flow-1', read: true, write: false, execute: true, administrate: true }];
        component.editFlow(flow);
        expect(router.navigate).not.toHaveBeenCalled();
    }));

    it('shows the flow image as a preview and the cost estimate by flow id', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        const row = fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement;
        const img = row.querySelector('img.svg-preview') as HTMLImageElement;
        expect(img.src).toMatch(/^data:image\/svg\+xml/);
        expect(decodeURIComponent(img.src)).toContain('viewBox=');
        expect(row.querySelector('svg')).toBeNull();
        expect(component.flowEstimations.get('flow-1')?.max).toBe(2);
    }));

    it('fixes the lower-case viewbox of a stored image that starts with an XML prolog', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        const stored = '<?xml version="1.0" standalone="no"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewbox="10 20 300 120"><g></g></svg>';
        const safe = component.previewUrl('flow-prolog', stored);
        const url = TestBed.inject(DomSanitizer).sanitize(SecurityContext.URL, safe) as string;
        const decoded = decodeURIComponent(url.substring(url.indexOf(',') + 1));
        expect(url).toMatch(/^data:image\/svg\+xml/);
        expect(decoded).toContain('viewBox="10 20 300 120"');
        expect(decoded).not.toContain('viewbox=');
        expect(decoded.startsWith('<?xml')).toBeTrue();
    }));

    it('shows an empty list as the empty state after the answer cleared the rows', fakeAsync(() => {
        init();
        service.getFlows.and.returnValue(of({ flows: [], total: 0 }));

        component.reload();
        fixture.detectChanges();
        discardPeriodicTasks();

        expect(component.flowsDataSource.data).toEqual([]);
        expect(fixture.nativeElement.querySelector('senergy-empty-state')).not.toBeNull();
    }));
});
