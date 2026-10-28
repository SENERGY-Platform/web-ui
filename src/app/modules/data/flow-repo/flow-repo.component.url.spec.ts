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

import { discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { FlowRepoComponent } from './flow-repo.component';
import { FlowRepoService } from './shared/flow-repo.service';
import { FlowEngineService } from './shared/flow-engine.service';
import { FlowModel } from './shared/flow.model';
import { KeepPageInRangeDirective } from '../../../core/directives/keep-page-in-range.directive';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { CostService } from '../../cost/shared/cost.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PipelineRegistryService } from '../pipeline-registry/shared/pipeline-registry.service';

describe('FlowRepoComponent page in the URL', () => {
    const flows = Array.from({ length: 30 }, (_, i) => ({ _id: 'flow-' + i, name: 'Flow ' + i, image: '', description: '' }) as FlowModel);
    let getFlows: jasmine.Spy;

    beforeEach(() => {
        localStorage.removeItem('PreferencesService/pageSize');
        getFlows = jasmine.createSpy('getFlows').and.callFake((_search: string, limit: number, offset: number) =>
            of({ flows: flows.slice(offset, offset + limit), total: flows.length }),
        );
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [FlowRepoComponent, NoopAnimationsModule, MatTableModule, MatSortModule, MatPaginatorModule, OverlayModule, KeepPageInRangeDirective],
            providers: [
                provideRouter([]),
                {
                    provide: FlowRepoService,
                    useValue: { getFlows, userHasUpdateAuthorization: () => false, userHasDeleteAuthorization: () => false },
                },
                { provide: MatSnackBar, useValue: {} },
                { provide: DialogsService, useValue: {} },
                { provide: AuthorizationService, useValue: { getUserId: () => 'user', userIsAdmin: () => false } },
                { provide: FlowEngineService, useValue: { userHasCreateAuthorization: () => false } },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: PipelineRegistryService, useValue: {} },
                { provide: MatDialog, useValue: {} },
            ],
        });
        TestBed.overrideComponent(FlowRepoComponent, {
            set: {
                providers: [
                    { provide: PermissionsService, useValue: { getComputedResourcePermissionsV2: () => of([]) } },
                    { provide: CostService, useValue: { userMayGetFlowCostEstimations: () => false } },
                ],
            },
        });
    });

    function open(url: string) {
        const router = TestBed.inject(Router);
        router.navigateByUrl(url);
        tick();
        const fixture = TestBed.createComponent(FlowRepoComponent);
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();
        flush();
        return { fixture, router };
    }

    it('moves back to the last page when the page of the URL is beyond the end and answers empty', fakeAsync(() => {
        const { fixture, router } = open('/?page=12');

        expect(fixture.componentInstance.totalCount).toBe(30);
        expect(getFlows.calls.mostRecent().args[2]).toBe(20);
        expect(fixture.componentInstance.list.pageIndex).toBe(1);
        expect(router.url).toBe('/?page=1');
    }));
});
