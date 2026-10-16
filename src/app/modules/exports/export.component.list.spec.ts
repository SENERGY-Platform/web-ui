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

import { ExportComponent } from './export.component';
import { ExportService } from './shared/export.service';
import { BrokerExportService } from './shared/broker-export.service';
import { ExportModel } from './shared/export.model';
import { ExportDataService } from 'src/app/widgets/shared/export-data.service';
import { PermissionsService } from '../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../permissions/shared/permissions-dialog.service';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { DialogsService } from '../../core/services/dialogs.service';
import { CoreModule } from '../../core/core.module';

describe('ExportComponent list', () => {
    let component: ExportComponent;
    let fixture: ComponentFixture<ExportComponent>;
    let router: Router;

    const service: Spy<ExportService> = createSpyFromClass<ExportService>(ExportService);
    const permissions: Spy<PermissionsService> = createSpyFromClass<PermissionsService>(PermissionsService);
    const exportData: Spy<ExportDataService> = createSpyFromClass<ExportDataService>(ExportDataService);
    const exp = { ID: 'exp-1', Name: 'Temperature', Description: 'Hourly', FilterType: 'deviceId', Generated: true } as ExportModel;

    function init(rights = { create: true, update: true, delete: true }) {
        ['data.exports.showGenerated', 'data.exports.search', 'data.exports.searchField'].forEach(key => localStorage.removeItem(key));
        service.getExports.and.returnValue(of({ instances: [exp], total: 1 } as any));
        service.userHasCreateAuthorization.and.returnValue(rights.create);
        service.userHasUpdateAuthorization.and.returnValue(rights.update);
        service.userHasDeleteAuthorization.and.returnValue(rights.delete);
        exportData.userHasUsageAuthroization.and.returnValue(false);
        permissions.getComputedResourcePermissionsV2.and.returnValue(of([{ id: exp.ID, write: true, administrate: true, execute: false } as any]));

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, RouterTestingModule, NoopAnimationsModule, MatSnackBarModule, MatDialogModule, MatPaginatorModule, ExportComponent],
            providers: [
                { provide: ExportService, useValue: service },
                { provide: BrokerExportService, useValue: {} },
                { provide: ExportDataService, useValue: exportData },
                { provide: PermissionsService, useValue: permissions },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: AuthorizationService, useValue: { getUserId: () => 'me', getUserRoles: () => [] } },
                { provide: DialogsService, useValue: {} },
            ],
        }).compileComponents();
        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);
        fixture = TestBed.createComponent(ExportComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    afterEach(() => {
        service.getExports.calls.reset();
        localStorage.removeItem('data.exports.showGenerated');
        localStorage.removeItem('data.exports.searchField');
    });

    it('loads once at the start and once per refresh click', fakeAsync(() => {
        init();
        expect(service.getExports).toHaveBeenCalledTimes(1);
        service.getExports.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(service.getExports).toHaveBeenCalledTimes(1);
    }));

    it('loads once when the generated chip or the search field changes, back on page one', fakeAsync(() => {
        init();
        service.getExports.calls.reset();

        (fixture.nativeElement.querySelector('mat-chip-option button') as HTMLElement).click();
        fixture.detectChanges();
        tick(400);
        expect(service.getExports).toHaveBeenCalledTimes(1);
        expect(component.showGenerated).toBeTrue();
        expect(service.getExports.calls.mostRecent().args[6]).toBeUndefined();

        service.getExports.calls.reset();
        component.searchField = 'description';
        component.searchFieldChanged();
        tick(400);
        discardPeriodicTasks();
        expect(service.getExports).toHaveBeenCalledTimes(1);
        expect(service.getExports.calls.mostRecent().args[7]).toBe('description');
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

    it('opens the details on a row click and the editor from the menu', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        (fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement).click();
        expect(router.navigate).toHaveBeenCalledWith(['/exports/details', 'exp-1']);

        component.editExport(exp);
        expect(router.navigate).toHaveBeenCalledWith(['/exports/edit', 'exp-1']);
    }));

    it('names the source and marks generated exports with a chip', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        const row = fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement;
        const chips = Array.from(row.querySelectorAll('.type-chip')).map(chip => chip.textContent);
        expect(chips).toEqual(['Generated', 'Device']);
    }));

    it('reloads from page one after a single delete, so the total and the paginator stay right', fakeAsync(() => {
        init();
        discardPeriodicTasks();
        (TestBed.inject(DialogsService) as any).openDeleteDialog = () => ({ afterClosed: () => of(true) });
        service.stopPipeline.and.returnValue(of({ status: 204 } as any));
        service.getExports.calls.reset();

        component.deleteExport(exp);
        tick(400);
        discardPeriodicTasks();

        expect(service.getExports).toHaveBeenCalledTimes(1);
        expect(component.paginator.pageIndex).toBe(0);
    }));

    it('counts the generated filter as a filter for the empty state', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(component.filtered).toBeFalse();
        component.showGenerated = true;
        expect(component.filtered).toBeTrue();
    }));
});
