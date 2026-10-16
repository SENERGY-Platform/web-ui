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
import { MatPaginatorModule } from '@angular/material/paginator';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';

import { OperatorRepoComponent } from './operator-repo.component';
import { OperatorRepoService } from './shared/operator-repo.service';
import { OperatorModel } from './shared/operator.model';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { PipelineRegistryService } from '../pipeline-registry/shared/pipeline-registry.service';
import { FlowRepoService } from '../flow-repo/shared/flow-repo.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { CoreModule } from '../../../core/core.module';

describe('OperatorRepoComponent list', () => {
    let component: OperatorRepoComponent;
    let fixture: ComponentFixture<OperatorRepoComponent>;
    let router: Router;

    const service: Spy<OperatorRepoService> = createSpyFromClass<OperatorRepoService>(OperatorRepoService);
    const permissions: Spy<PermissionsService> = createSpyFromClass<PermissionsService>(PermissionsService);
    const operator = { _id: 'op-1', name: 'Alpha', description: 'First', image: 'img:1', userId: 'me' } as OperatorModel;

    function init(rights = { create: true, update: true, delete: true }, perms = { read: true, write: true, administrate: true }) {
        service.getOperators.and.returnValue(of({ operators: [operator], totalCount: 1 }));
        service.userHasCreateAuthorization.and.returnValue(rights.create);
        service.userHasUpdateAuthorization.and.returnValue(rights.update);
        service.userHasDeleteAuthorization.and.returnValue(rights.delete);
        permissions.getComputedResourcePermissionsV2.and.returnValue(of([{ id: operator._id, ...perms } as any]));

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule, MatPaginatorModule, OperatorRepoComponent],
            providers: [
                { provide: OperatorRepoService, useValue: service },
                { provide: PermissionsService, useValue: permissions },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: AuthorizationService, useValue: { getUserId: () => 'me', userIsAdmin: () => false } },
                { provide: PipelineRegistryService, useValue: {} },
                { provide: FlowRepoService, useValue: {} },
                { provide: DialogsService, useValue: {} },
            ],
        }).compileComponents();
        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);
        fixture = TestBed.createComponent(OperatorRepoComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    afterEach(() => {
        service.getOperators.calls.reset();
    });

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        service.getOperators.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(service.getOperators).toHaveBeenCalledTimes(1);
    }));

    it('offers the create button only with the create right', fakeAsync(() => {
        init({ create: false, update: true, delete: true });
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('senergy-page-header button')).toBeNull();
    }));

    it('has the selection column only with the delete right', fakeAsync(() => {
        init({ create: true, update: true, delete: false });
        discardPeriodicTasks();

        expect(component.displayedColumns).not.toContain('select');
    }));

    it('opens the operator page on a row click and not without the read right', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        (fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement).click();
        expect(router.navigate).toHaveBeenCalledWith(['data/operator-repo/op', 'op-1']);

        (router.navigate as jasmine.Spy).calls.reset();
        component.permissionsPerOperator = [];
        component.openOperator(operator);
        expect(router.navigate).not.toHaveBeenCalled();
    }));

    it('edits with the update and write rights, shares and deletes with the administrate right', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(component.canEdit(operator)).toBeTrue();
        expect(component.canShare(operator)).toBeTrue();
        expect(component.canDelete(operator)).toBeTrue();

        component.permissionsPerOperator = [{ id: 'op-1', read: true, write: true, administrate: false, execute: false }];
        expect(component.canShare(operator)).toBeFalse();
        expect(component.canDelete(operator)).toBeFalse();
        component.permissionsPerOperator = [{ id: 'op-1', read: true, write: false, administrate: true, execute: false }];
        expect(component.canEdit(operator)).toBeFalse();
    }));

    it('shows the description under the name and the owner as a chip', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        const row = fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement;
        expect(row.querySelector('.name-cell')?.textContent).toContain('Alpha');
        expect(row.querySelector('.truncate-cell')?.textContent).toContain('First');
        expect(row.querySelector('.type-chip')?.textContent).toBe('Owner');
    }));
});
