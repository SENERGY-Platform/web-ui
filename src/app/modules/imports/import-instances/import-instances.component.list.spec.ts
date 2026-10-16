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
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { BehaviorSubject, of } from 'rxjs';

import { ImportInstancesComponent } from './import-instances.component';
import { ImportInstancesService } from './shared/import-instances.service';
import { ImportInstancesModel } from './shared/import-instances.model';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { CoreModule } from '../../../core/core.module';

describe('ImportInstancesComponent list', () => {
    let component: ImportInstancesComponent;
    let fixture: ComponentFixture<ImportInstancesComponent>;
    let dialog: jasmine.Spy;
    let params: BehaviorSubject<ParamMap>;

    const service: Spy<ImportInstancesService> = createSpyFromClass<ImportInstancesService>(ImportInstancesService);
    const permissions: Spy<PermissionsService> = createSpyFromClass<PermissionsService>(PermissionsService);
    const instance = { id: 'inst-1', name: 'Weather import', image: 'img:1', generated: true, import_type_id: 'type-1' } as ImportInstancesModel;

    function init(rights = { update: true, delete: true }, perms = { read: true, write: true, execute: true, administrate: true }) {
        localStorage.removeItem('import.instances.excludeGenerated');
        params = new BehaviorSubject<ParamMap>(convertToParamMap({}));
        service.listImportInstances.and.returnValue(of([instance]));
        service.getTotalCountOfInstances.and.returnValue(of(1));
        service.userHasUpdateAuthorization.and.returnValue(rights.update);
        service.userHasDeleteAuthorization.and.returnValue(rights.delete);
        service.userHasCreateAuthorization.and.returnValue(true);
        permissions.getComputedResourcePermissionsV2.and.returnValue(of([{ id: instance.id, ...perms } as any]));

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule, MatDialogModule, MatPaginatorModule, ImportInstancesComponent],
            providers: [
                { provide: ImportInstancesService, useValue: service },
                { provide: PermissionsService, useValue: permissions },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: AuthorizationService, useValue: { getUserId: () => 'me', getUserRoles: () => [] } },
                { provide: DialogsService, useValue: {} },
                { provide: ActivatedRoute, useValue: { queryParamMap: params } },
            ],
        }).compileComponents();
        spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        dialog = spyOn(TestBed.inject(MatDialog), 'open').and.returnValue({ afterClosed: () => of(undefined) } as any);
        fixture = TestBed.createComponent(ImportInstancesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    afterEach(() => {
        service.listImportInstances.calls.reset();
        localStorage.removeItem('import.instances.excludeGenerated');
    });

    it('loads once at the start and once per refresh click', fakeAsync(() => {
        init();
        expect(service.listImportInstances).toHaveBeenCalledTimes(1);
        service.listImportInstances.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(service.listImportInstances).toHaveBeenCalledTimes(1);
    }));

    it('loads once when the generated chip is switched off', fakeAsync(() => {
        init();
        service.listImportInstances.calls.reset();

        (fixture.nativeElement.querySelector('mat-chip-option button') as HTMLElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(service.listImportInstances).toHaveBeenCalledTimes(1);
        expect(component.excludeGenerated).toBeTrue();
    }));

    it('shows the instance filter as a chip and loads once when it changes, without a second search subscription', fakeAsync(() => {
        init();
        service.listImportInstances.calls.reset();

        params.next(convertToParamMap({ id: 'inst-1' }));
        fixture.detectChanges();
        tick(400);
        params.next(convertToParamMap({ id: 'inst-2' }));
        tick(400);
        discardPeriodicTasks();

        expect(service.listImportInstances).toHaveBeenCalledTimes(2);
        expect(component.instanceId).toBe('inst-2');
    }));

    it('opens the edit dialog on a row click and a read-only one without the update right', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        (fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement).click();
        expect(dialog.calls.mostRecent().args[1].data.readOnly).toBeUndefined();

        component.permissionsPerInstance = [{ id: 'inst-1', read: true, write: false, execute: false, administrate: false }];
        (fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement).click();
        expect(dialog.calls.mostRecent().args[1].data.readOnly).toBeTrue();
    }));

    it('has the selection column only with the delete right', fakeAsync(() => {
        init({ update: true, delete: false });
        discardPeriodicTasks();

        expect(component.displayedColumns).not.toContain('select');
    }));

    it('shows the run state as a chip and marks generated imports', fakeAsync(() => {
        init();
        component.dataSource.data = [{ ...instance, status: { running: true, transitioning: false } } as any];
        fixture.detectChanges();
        discardPeriodicTasks();

        const row = fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement;
        expect(row.querySelector('.status-chip.online')?.textContent).toBe('Running');
        expect(row.querySelector('.type-chip.name-chip')?.textContent).toBe('Generated');
    }));

    it('counts the switched-off generated chip as a filter for the empty state', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(component.filtered).toBeFalse();
        component.excludeGenerated = true;
        expect(component.filtered).toBeTrue();
    }));
});
