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
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { OperatorRepoComponent } from './operator-repo.component';
import { OperatorRepoService } from './shared/operator-repo.service';
import { OperatorModel } from './shared/operator.model';
import { KeepPageInRangeDirective } from '../../../core/directives/keep-page-in-range.directive';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { FlowRepoService } from '../flow-repo/shared/flow-repo.service';
import { PipelineRegistryService } from '../pipeline-registry/shared/pipeline-registry.service';

describe('OperatorRepoComponent page in the URL', () => {
    const operators = Array.from({ length: 30 }, (_, i) => ({ _id: 'op-' + i, name: 'Operator ' + i }) as OperatorModel);
    let getOperators: jasmine.Spy;

    beforeEach(() => {
        localStorage.removeItem('PreferencesService/pageSize');
        getOperators = jasmine.createSpy('getOperators').and.callFake((_search: string, limit: number, offset: number) =>
            of({ operators: operators.slice(offset, offset + limit), totalCount: operators.length }),
        );
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [OperatorRepoComponent],
            imports: [NoopAnimationsModule, MatSnackBarModule, MatTableModule, MatSortModule, MatPaginatorModule, KeepPageInRangeDirective],
            providers: [
                provideRouter([]),
                {
                    provide: OperatorRepoService,
                    useValue: {
                        getOperators,
                        userHasCreateAuthorization: () => false,
                        userHasUpdateAuthorization: () => false,
                        userHasDeleteAuthorization: () => false,
                    },
                },
                { provide: AuthorizationService, useValue: { getUserId: () => 'me', userIsAdmin: () => false } },
                { provide: PermissionsService, useValue: { getComputedResourcePermissionsV2: () => of([]) } },
                { provide: DialogsService, useValue: {} },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: PipelineRegistryService, useValue: {} },
                { provide: FlowRepoService, useValue: {} },
            ],
        });
    });

    function open(url: string) {
        const router = TestBed.inject(Router);
        router.navigateByUrl(url);
        tick();
        const fixture = TestBed.createComponent(OperatorRepoComponent);
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
        expect(getOperators.calls.mostRecent().args[2]).toBe(20);
        expect(fixture.componentInstance.pageIndex).toBe(1);
        expect(router.url).toBe('/?page=1');
    }));

    it('keeps a page inside the range', fakeAsync(() => {
        const { fixture, router } = open('/?page=1');

        expect(getOperators).toHaveBeenCalledTimes(1);
        expect(fixture.componentInstance.pageIndex).toBe(1);
        expect(router.url).toBe('/?page=1');
    }));
});
