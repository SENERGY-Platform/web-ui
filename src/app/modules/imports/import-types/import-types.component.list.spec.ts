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

import { ImportTypesComponent } from './import-types.component';
import { ImportTypesService } from './shared/import-types.service';
import { ImportTypeModel } from './shared/import-types.model';
import { CostService } from '../../cost/shared/cost.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { CoreModule } from '../../../core/core.module';

describe('ImportTypesComponent list', () => {
    let component: ImportTypesComponent;
    let fixture: ComponentFixture<ImportTypesComponent>;
    let router: Router;

    const service: Spy<ImportTypesService> = createSpyFromClass<ImportTypesService>(ImportTypesService);
    const permissions: Spy<PermissionsService> = createSpyFromClass<PermissionsService>(PermissionsService);
    const cost: Spy<CostService> = createSpyFromClass<CostService>(CostService);
    const type = { id: 'type-1', name: 'Weather', description: 'Hourly values', image: 'img:1' } as ImportTypeModel;

    function init(rights = { create: true, update: true, delete: true }, perms = { read: true, write: true, execute: true, administrate: true }) {
        service.listImportTypes.and.returnValue(of({ result: [type], total: 1 }));
        service.userHasCreateAuthorization.and.returnValue(rights.create);
        service.userHasUpdateAuthorization.and.returnValue(rights.update);
        service.userHasDeleteAuthorization.and.returnValue(rights.delete);
        cost.userMayGetImportCostEstimations.and.returnValue(false);
        permissions.getComputedResourcePermissionsV2.and.returnValue(of([{ id: type.id, ...perms } as any]));

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule, MatDialogModule, MatPaginatorModule, ImportTypesComponent],
            providers: [
                { provide: ImportTypesService, useValue: service },
                { provide: CostService, useValue: cost },
                { provide: PermissionsService, useValue: permissions },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: DialogsService, useValue: {} },
            ],
        }).compileComponents();
        router = TestBed.inject(Router);
        spyOn(router, 'navigateByUrl').and.resolveTo(true);
        fixture = TestBed.createComponent(ImportTypesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    afterEach(() => {
        service.listImportTypes.calls.reset();
    });

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        service.listImportTypes.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(service.listImportTypes).toHaveBeenCalledTimes(1);
    }));

    it('offers the create button with the create right and opens the new type page', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        const button = fixture.nativeElement.querySelector('senergy-page-header button') as HTMLButtonElement;
        expect(button.textContent).toContain('New import type');
        button.click();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/imports/types/new');
    }));

    it('hides the create button and the selection column without the create and delete rights', fakeAsync(() => {
        init({ create: false, update: true, delete: false });
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('senergy-page-header button')).toBeNull();
        expect(component.displayedColumns).not.toContain('select');
    }));

    it('opens the one import type page on a row click, with no mode in the URL', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        (fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement).click();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/imports/types/type-1');
    }));

    it('keeps one action column instead of one column per action', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(component.displayedColumns).toEqual(['select', 'name', 'description', 'image', 'actions']);
    }));
});
