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

import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of } from 'rxjs';
import { BudgetComponent } from './budget.component';
import { BudgetService } from './shared/budget.service';
import { BudgetModel } from './shared/budget.model';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';

describe('BudgetComponent list', () => {
    let fixture: ComponentFixture<BudgetComponent>;
    let component: BudgetComponent;
    let service: jasmine.SpyObj<BudgetService>;
    let dialog: jasmine.SpyObj<MatDialog>;
    let search: BehaviorSubject<string>;

    const budgets: BudgetModel[] = [
        { budget_identifier: 'storage', user_id: 'u1', value: 10 },
        { budget_identifier: 'compute', role: 'ops', value: 20 },
        { budget_identifier: 'network', user_id: 'u2', value: 30 },
    ];

    function init(list: BudgetModel[] = budgets) {
        search = new BehaviorSubject('');
        service = jasmine.createSpyObj<BudgetService>('BudgetService', ['getBudgets', 'deleteBudget']);
        service.getBudgets.and.callFake((limit, offset) => of(list.slice(offset, offset + limit)));
        const auth = jasmine.createSpyObj<AuthorizationService>('AuthorizationService', ['loadAllRoles', 'loadAllUsers']);
        auth.loadAllRoles.and.returnValue(of([{ name: 'ops' }]));
        auth.loadAllUsers.and.returnValue(of([{ id: 'u1', username: 'alice' }, { id: 'u2', username: 'bob' }]));
        dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
        dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, BudgetComponent],
            providers: [
                { provide: BudgetService, useValue: service },
                { provide: AuthorizationService, useValue: auth },
                { provide: DialogsService, useValue: { openDeleteDialog: () => ({ afterClosed: () => of(true) }) } },
                { provide: MatDialog, useValue: dialog },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: SearchbarService, useValue: { currentSearchText: search, changeMessage: (t: string) => search.next(t) } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(BudgetComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        service.getBudgets.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);

        expect(service.getBudgets).toHaveBeenCalledTimes(1);
    }));

    it('loads every page of the API and pages on the client', fakeAsync(() => {
        init(Array.from({ length: 1001 }, (_, i) => ({ budget_identifier: 'b' + i, role: 'ops', value: i })));

        expect(component.dataSource.data.length).toBe(1001);
        expect(service.getBudgets.calls.count()).toBe(3);
        expect(fixture.nativeElement.querySelectorAll('tr[mat-row]').length).toBe(20);
    }));

    it('names the user or the role with a chip and opens the details on a row click', fakeAsync(() => {
        init();

        const rows = Array.from(fixture.nativeElement.querySelectorAll('tr.clickable-row')) as HTMLElement[];
        expect(rows[0].textContent).toContain('alice');
        expect(rows[0].querySelector('.type-chip')?.textContent).toContain('User');
        expect(rows[1].textContent).toContain('ops');
        expect(rows[1].querySelector('.type-chip')?.textContent).toContain('Role');

        rows[0].click();
        expect((dialog.open.calls.mostRecent().args[1] as any).data.editable).toBeFalse();
    }));

    it('removes only the deleted budget from the list', fakeAsync(() => {
        init();
        service.deleteBudget.and.returnValue(of(true));

        component.delete(component.budgets[0]);

        expect(component.dataSource.data.map((b) => b.budget_identifier)).toEqual(['compute', 'network']);
    }));

    it('narrows the list with the toolbar search by budget and user name', fakeAsync(() => {
        init();

        search.next('bob');

        expect(component.dataSource.filteredData.map((b) => b.budget_identifier)).toEqual(['network']);
    }));

    it('offers the new budget button in the page header', fakeAsync(() => {
        init();

        expect(fixture.nativeElement.querySelector('senergy-page-header button').textContent).toContain('New budget');
    }));

    it('keeps the list when the deleted budget is already gone after a reload', fakeAsync(() => {
        init();
        service.deleteBudget.and.returnValue(of(true));

        component.delete({ budget_identifier: 'stale', value: 1 });

        expect(component.dataSource.data.length).toBe(3);
    }));
});
