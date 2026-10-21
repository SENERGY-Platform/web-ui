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
import { OverlayContainer } from '@angular/cdk/overlay';
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
import { decodeSvgDataUrl, FLOW_IMAGE, HOSTILE_IMAGE, HOSTILE_OPERATOR_ID, liveMarkup } from '../../../core/svg-image.mock';

describe('FlowRepoComponent list', () => {
    let component: FlowRepoComponent;
    let fixture: ComponentFixture<FlowRepoComponent>;
    let router: Router;

    const service: Spy<FlowRepoService> = createSpyFromClass<FlowRepoService>(FlowRepoService);
    const permissions: Spy<PermissionsService> = createSpyFromClass<PermissionsService>(PermissionsService);
    const cost: Spy<CostService> = createSpyFromClass<CostService>(CostService);
    const flow = { _id: 'flow-1', name: 'Smoothing', description: 'Averages values', image: '<svg xmlns="http://www.w3.org/2000/svg" viewbox="0 0 10 10"></svg>', userId: 'me' } as FlowModel;

    function init(rights = { create: true, update: true, delete: true }, perms = { read: true, write: true, execute: true, administrate: true }, shown = flow) {
        delete (window as any).svgImageXss;
        service.getFlows.and.returnValue(of({ flows: [shown], total: 1 }));
        service.userHasCreateAuthorization.and.returnValue(rights.create);
        service.userHasUpdateAuthorization.and.returnValue(rights.update);
        service.userHasDeleteAuthorization.and.returnValue(rights.delete);
        permissions.getComputedResourcePermissionsV2.and.returnValue(of([{ id: shown._id, ...perms } as any]));
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

        const root = decodeSvgDataUrl(component.previewUrl('flow-prolog', FLOW_IMAGE)!).documentElement;
        expect(FLOW_IMAGE.startsWith('<?xml')).toBeTrue();
        expect(root.getAttribute('viewBox')).toBe('4.546875 37.20000076293945 648.90625 142.8000030517578');
        expect(root.hasAttribute('viewbox')).toBeFalse();
        expect(root.querySelector('[model-id="n1"] > rect')).withContext('the operator is drawn').not.toBeNull();
    }));

    it('shows a stored image only as an img with a data URL, never as markup in the page', fakeAsync(() => {
        const shared = { _id: 'flow-2', name: 'a shared flow', description: '', image: HOSTILE_IMAGE, userId: 'someone else' } as FlowModel;
        init(undefined, { read: true, write: false, execute: true, administrate: false }, shared);

        const small = fixture.nativeElement.querySelector('td.mat-column-image img.svg-preview') as HTMLImageElement;
        small.dispatchEvent(new Event('mouseenter'));
        fixture.detectChanges();
        discardPeriodicTasks();

        const overlay = TestBed.inject(OverlayContainer).getContainerElement();
        const large = overlay.querySelector('img.svg-preview-large') as HTMLImageElement;
        expect(large).withContext('the enlarged preview').not.toBeNull();
        expect(large.getAttribute('src')).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
        expect(overlay.querySelectorAll('svg').length).toBe(0);
        expect(liveMarkup(overlay)).toEqual([]);
        expect(liveMarkup(fixture.nativeElement)).toEqual([]);
        const drawn = decodeSvgDataUrl(large.src);
        expect(drawn.querySelector('[model-id="' + HOSTILE_OPERATOR_ID + '"] > rect')).withContext('the operator is drawn').not.toBeNull();
        expect(liveMarkup(drawn)).withContext('nothing live inside the image either').toEqual([]);
        expect((window as any).svgImageXss).toBeUndefined();
        small.dispatchEvent(new Event('mouseleave'));
    }));

    it('shows no preview for a stored image that is not an svg document', fakeAsync(() => {
        const broken = { ...flow, _id: 'flow-3', image: '<html><body><svg xmlns="http://www.w3.org/2000/svg"></svg></body></html>' } as FlowModel;
        init(undefined, undefined, broken);
        discardPeriodicTasks();

        expect(component.previewUrl('flow-3', broken.image)).toBeNull();
        expect(fixture.nativeElement.querySelector('senergy-hover-preview')).toBeNull();
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
