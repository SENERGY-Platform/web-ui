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
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BehaviorSubject, of } from 'rxjs';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { DialogsService } from 'src/app/core/services/dialogs.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { KongService } from '../shared/services/kong.service';
import { LadonService } from '../shared/services/ladom.service';
import { PermissionModel } from '../shared/permission.model';
import { PermissionsListComponent } from './permissions-list.component';
import { UrlStateService } from 'src/app/core/services/url-state.service';
import { UrlStateServiceMock } from 'src/app/core/services/url-state.service.mock';

describe('PermissionsListComponent list', () => {
    let fixture: ComponentFixture<PermissionsListComponent>;
    let component: PermissionsListComponent;
    let ladon: jasmine.SpyObj<LadonService>;
    let dialog: jasmine.SpyObj<MatDialog>;
    let search: BehaviorSubject<string>;
    let urlState: UrlStateServiceMock;

    const policies = [
        { id: 'p1', subject: 'alice', resource: '/devices', actions: ['GET', 'POST'] },
        { id: 'p2', subject: 'bob', resource: '/flows', actions: ['GET'] },
        { id: 'admin-all', subject: 'admin', resource: '/', actions: ['GET'] },
    ] as PermissionModel[];

    function init(urlParams: Record<string, string> = {}, data: PermissionModel[] = policies) {
        search = new BehaviorSubject('');
        ladon = jasmine.createSpyObj<LadonService>('LadonService', ['getAllPolicies', 'deletePolicies', 'test']);
        ladon.getAllPolicies.and.callFake(() => of(data.map((p) => ({ ...p }))));
        ladon.test.and.returnValue(of({ GET: true, POST: false, PUT: false, PATCH: false, DELETE: false, HEAD: false }));
        const auth = jasmine.createSpyObj<AuthorizationService>('AuthorizationService', ['loadAllRoles', 'loadAllUsers', 'loadAllClients', 'userIsAdmin']);
        auth.loadAllRoles.and.returnValue(of([{ name: 'ops' }]));
        auth.loadAllUsers.and.returnValue(of([{ id: 'u1', username: 'alice' }]));
        auth.loadAllClients.and.returnValue(of([{ clientId: 'frontend' }]));
        auth.userIsAdmin.and.returnValue(true);
        dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
        dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, MatSnackBarModule, PermissionsListComponent],
            providers: [
                { provide: LadonService, useValue: ladon },
                { provide: AuthorizationService, useValue: auth },
                { provide: KongService, useValue: { loadUris: () => of(['/devices', '/flows']) } },
                { provide: DialogsService, useValue: {} },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: MatDialog, useValue: dialog },
                { provide: SearchbarService, useValue: { currentSearchText: search, changeMessage: (t: string) => search.next(t) } },
                {
                    provide: UrlStateService,
                    useFactory: () => {
                        urlState = new UrlStateServiceMock();
                        urlState.params = urlParams;
                        return urlState;
                    },
                },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(PermissionsListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    const names = () => component.sortedData.map((p) => p.subject);

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        ladon.getAllPolicies.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(ladon.getAllPolicies).toHaveBeenCalledTimes(1);
    }));

    it('offers export, import and create in the page header', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        const labels = Array.from(fixture.nativeElement.querySelectorAll('senergy-page-header a, senergy-page-header button')).map((b) => (b as HTMLElement).textContent!.trim());
        expect(labels.join('|')).toContain('Export');
        expect(labels.join('|')).toContain('Import');
        expect(labels.join('|')).toContain('New policy');
        expect(fixture.nativeElement.querySelector('.fabs')).toBeNull();
    }));

    it('filters by the toolbar search and keeps the list on an invalid regular expression', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        search.next('bob');
        expect(names()).toEqual(['bob']);

        search.next('(');
        expect(names()).toEqual(['bob']);
    }));

    it('filters by the subject chosen in the filter dialog and removes the filter again', fakeAsync(() => {
        init();
        discardPeriodicTasks();
        dialog.open.and.returnValue({ afterClosed: () => of({ user: 'alice', role: '', client: '', endpoint: '' }) } as any);

        component.openFilterDialog();
        expect(names()).toEqual(['alice']);

        component.removeFilter('user');
        expect(names().length).toBe(3);
    }));

    it('opens the edit dialog on a row click but not for the admin-all policy', fakeAsync(() => {
        init();
        discardPeriodicTasks();
        dialog.open.calls.reset();

        const rows = Array.from(fixture.nativeElement.querySelectorAll('tr[mat-row]')) as HTMLElement[];
        const adminRow = rows[rows.length - 1];
        expect(adminRow.classList).not.toContain('clickable-row');
        adminRow.click();
        expect(dialog.open).not.toHaveBeenCalled();

        rows[0].click();
        expect(dialog.open).toHaveBeenCalledTimes(1);
    }));

    it('shows the methods as check marks in narrow columns and one action column', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(component.displayedColumns).toEqual(['select', 'subject', 'resource', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'actions']);
        const first = fixture.nativeElement.querySelector('tr[mat-row]') as HTMLElement;
        expect(first.querySelectorAll('.method-allowed').length).toBe(2);
    }));

    it('keeps the search after a reload', fakeAsync(() => {
        init();
        discardPeriodicTasks();
        search.next('bob');

        component.loadPolicies();

        expect(names()).toEqual(['bob']);
        expect(component.total).toBe(1);
    }));

    it('pages through the filtered policies, not through all of them', fakeAsync(() => {
        init();
        discardPeriodicTasks();
        search.next('a');
        expect(names()).toEqual(['alice', 'admin']);

        component.paginator.page.emit({ pageIndex: 1, pageSize: 1, length: 2 });

        expect(names()).toEqual(['admin']);
    }));
    describe('view state in the URL', () => {
        const many = Array.from({ length: 45 }, (_, i) => ({ id: 'p' + i, subject: 'u' + String(i).padStart(2, '0'), resource: '/r', actions: ['GET'] }) as PermissionModel);

        it('applies a filter from the URL before the first list and clamps the page to it', fakeAsync(() => {
            init({ page: '1', role: 'u30' }, many);
            discardPeriodicTasks();

            expect(names()).toEqual(['u30']);
            expect(component.selectedRole).toBe('u30');
            expect(component.pageIndex).toBe(0);
            expect(urlState.writes).toEqual([{ page: null }]);
        }));

        it('restores the page and the sort', fakeAsync(() => {
            init({ page: '1', sort: 'subject', dir: 'desc' }, many);
            discardPeriodicTasks();

            expect(names()[0]).toBe('u24');
            expect(component.pageIndex).toBe(1);
            expect(urlState.writes).toEqual([]);
        }));

        it('moves a page beyond the end to the last page and writes it', fakeAsync(() => {
            init({ page: '9' }, many);
            discardPeriodicTasks();

            expect(component.pageIndex).toBe(2);
            expect(urlState.writes).toContain({ page: 2 });
            expect(names().length).toBe(5);
        }));

        it('keeps the page for the first search and leaves it for a new one', fakeAsync(() => {
            init({ page: '1' }, many);
            discardPeriodicTasks();
            expect(component.pageIndex).toBe(1);
            expect(urlState.writes).toEqual([]);

            search.next('u1');

            expect(component.pageIndex).toBe(0);
            expect(urlState.writes).toContain(jasmine.objectContaining({ page: null }));
        }));

        it('writes a filter change with the page dropped, and a sort change likewise', fakeAsync(() => {
            init({ page: '1' }, many);
            discardPeriodicTasks();

            component.removeFilter('user');
            expect(component.pageIndex).toBe(0);
            expect(urlState.writes[urlState.writes.length - 1]).toEqual({ user: '', role: '', client: '', endpoint: '', page: null });

            component.sortChanged({ active: 'subject', direction: 'desc' });
            expect(urlState.writes[urlState.writes.length - 1]).toEqual({ sort: 'subject', dir: 'desc', page: null });
        }));

        it('writes a page event', fakeAsync(() => {
            init({}, many);
            discardPeriodicTasks();

            component.paginator.page.emit({ pageIndex: 2, pageSize: 20, length: 45 });

            expect(component.pageIndex).toBe(2);
            expect(urlState.writes).toContain({ page: 2 });
        }));
    });
});
