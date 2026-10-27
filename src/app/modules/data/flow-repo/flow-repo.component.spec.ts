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

import { ComponentFixture, discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { FlowRepoComponent } from './flow-repo.component';
import { FlowRepoService } from './shared/flow-repo.service';
import { FlowModel } from './shared/flow.model';
import { FlowEngineService } from './shared/flow-engine.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { CostService } from '../../cost/shared/cost.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PipelineRegistryService } from '../pipeline-registry/shared/pipeline-registry.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { UrlStateService } from '../../../core/services/url-state.service';
import { decodeSvgDataUrl, HOSTILE_IMAGE, liveMarkup } from '../../../core/svg-image.mock';

describe('FlowRepoComponent image preview', () => {
    let fixture: ComponentFixture<FlowRepoComponent>;
    let overlay: HTMLElement;

    const flow = { _id: 'flow-1', name: 'a shared flow', description: '', image: HOSTILE_IMAGE, userId: 'someone else' } as unknown as FlowModel;

    beforeEach(() => {
        delete (window as any).svgImageXss;
        const costService = { userMayGetFlowCostEstimations: () => false };
        const permissionsService = { getComputedResourcePermissionsV2: () => of([{ id: flow._id, read: true, write: false, execute: true, administrate: false }]) };
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [MatTableModule, MatSortModule, MatPaginatorModule, OverlayModule, NoopAnimationsModule],
            declarations: [FlowRepoComponent],
            providers: [
                {
                    provide: FlowRepoService,
                    useValue: {
                        getFlows: () => of({ flows: [flow], total: 1 }),
                        userHasUpdateAuthorization: () => false,
                        userHasDeleteAuthorization: () => false,
                    },
                },
                { provide: MatSnackBar, useValue: {} },
                { provide: DialogsService, useValue: {} },
                { provide: AuthorizationService, useValue: { getUserId: () => 'user', userIsAdmin: () => false } },
                // debounced like the real search text, so the list loads after the first check
                { provide: SearchbarService, useValue: { currentSearchText: of('').pipe(delay(300)) } },
                { provide: FlowEngineService, useValue: { userHasCreateAuthorization: () => false } },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: PipelineRegistryService, useValue: {} },
                { provide: Router, useValue: {} },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: MatDialog, useValue: {} },
                { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } },
                { provide: UrlStateService, useValue: { getSort: () => ({ active: 'dateUpdated', direction: 'desc' }), getPage: () => 0, setPage: () => {}, setSort: () => {} } },
            ],
        });
        TestBed.overrideComponent(FlowRepoComponent, {
            set: {
                providers: [
                    { provide: PermissionsService, useValue: permissionsService },
                    { provide: CostService, useValue: costService },
                ],
            },
        });
        fixture = TestBed.createComponent(FlowRepoComponent);
        overlay = TestBed.inject(OverlayContainer).getContainerElement();
    });

    afterEach(() => fixture.componentInstance.closeOverlay());

    const hoverImageButton = () => {
        fixture.detectChanges();
        tick(300); // the search text, which loads the list
        fixture.detectChanges();
        const imageButton = fixture.nativeElement.querySelector('td.mat-column-image button') as HTMLButtonElement;
        imageButton.dispatchEvent(new Event('mouseenter'));
        fixture.detectChanges();
        flush();
        discardPeriodicTasks();
    };

    it('shows a stored image as an img with a data URL, never as markup in the page', fakeAsync(() => {
        hoverImageButton();

        const img = overlay.querySelector('.svg-container img') as HTMLImageElement;
        expect(img).withContext('the preview').not.toBeNull();
        expect(img.getAttribute('src')).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
        expect(overlay.querySelectorAll('svg').length).toBe(0);
        expect(liveMarkup(overlay)).toEqual([]);
        expect(liveMarkup(fixture.nativeElement)).toEqual([]);
        expect(decodeSvgDataUrl(img.src).querySelector('[model-id="op-1"] > rect')).withContext('the operator is drawn').not.toBeNull();
        expect((window as any).svgImageXss).toBeUndefined();
    }));

    it('keeps the width the inline image had, with the height following its viewBox', fakeAsync(() => {
        hoverImageButton();

        expect(getComputedStyle(overlay.querySelector('.svg-container img') as HTMLImageElement).width).toBe('300px');
    }));
});
