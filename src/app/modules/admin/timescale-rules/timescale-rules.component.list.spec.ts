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
import { TimescaleRulesComponent } from './timescale-rules.component';
import { TimescaleRulesService } from './shared/timescale-rules.service';
import { TimescaleRuleModel } from './shared/timescale-rule.model';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';

describe('TimescaleRulesComponent list', () => {
    let fixture: ComponentFixture<TimescaleRulesComponent>;
    let component: TimescaleRulesComponent;
    let service: jasmine.SpyObj<TimescaleRulesService>;
    let dialog: jasmine.SpyObj<MatDialog>;
    let search: BehaviorSubject<string>;

    const rule = (id: string, description: string, extra: Partial<TimescaleRuleModel> = {}) =>
        ({ id, description, group: 'g', priority: 1, users: [], roles: ['ops'], type: 'template', completed_run: true, ...extra }) as TimescaleRuleModel;

    function init(rules: TimescaleRuleModel[]) {
        search = new BehaviorSubject('');
        service = jasmine.createSpyObj<TimescaleRulesService>('TimescaleRulesService', ['getRules', 'getTemplates', 'deleteRule']);
        service.getRules.and.callFake((limit, offset) => of(rules.slice(offset, offset + limit)));
        service.getTemplates.and.returnValue(of([]));
        const auth = jasmine.createSpyObj<AuthorizationService>('AuthorizationService', ['loadAllRoles', 'loadAllUsers']);
        auth.loadAllRoles.and.returnValue(of([{ name: 'ops' }]));
        auth.loadAllUsers.and.returnValue(of([]));
        dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
        dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, TimescaleRulesComponent],
            providers: [
                { provide: TimescaleRulesService, useValue: service },
                { provide: AuthorizationService, useValue: auth },
                { provide: DialogsService, useValue: { openDeleteDialog: () => ({ afterClosed: () => of(true) }) } },
                { provide: MatDialog, useValue: dialog },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: SearchbarService, useValue: { currentSearchText: search, changeMessage: (t: string) => search.next(t) } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(TimescaleRulesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init([rule('a', 'First')]);
        service.getRules.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);

        expect(service.getRules).toHaveBeenCalledTimes(1);
    }));

    it('loads every page of the API and pages on the client', fakeAsync(() => {
        init(Array.from({ length: 1100 }, (_, i) => rule('r' + i, 'Rule ' + i)));

        expect(component.dataSource.data.length).toBe(1100);
        expect(service.getRules.calls.allArgs()).toEqual([[500, 0], [500, 500], [500, 1000]]);
        expect(fixture.nativeElement.querySelectorAll('tr[mat-row]').length).toBe(20);
    }));

    it('opens the details on a row click and offers the new rule button in the page header', fakeAsync(() => {
        init([rule('a', 'First')]);

        (fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement).click();
        expect(dialog.open).toHaveBeenCalled();
        expect((dialog.open.calls.mostRecent().args[1] as any).data.editable).toBeFalse();
        expect(fixture.nativeElement.querySelector('senergy-page-header button').textContent).toContain('New rule');
    }));

    it('shows failed, completed and not yet run rules as status chips', fakeAsync(() => {
        init([rule('a', 'Broken', { errors: ['boom'] }), rule('b', 'Done'), rule('c', 'Waiting', { completed_run: false })]);

        const chips = Array.from(fixture.nativeElement.querySelectorAll('.status-chip')).map((c) => (c as HTMLElement).textContent!.trim());
        expect(chips).toEqual(['Failed', 'Completed', 'Not run yet']);
    }));

    it('removes only the deleted rule from the list', fakeAsync(() => {
        init([rule('a', 'First'), rule('b', 'Second'), rule('c', 'Third')]);
        service.deleteRule.and.returnValue(of(true));

        component.delete(component.rules[0]);

        expect(component.dataSource.data.map((r) => r.id)).toEqual(['b', 'c']);
    }));

    it('narrows the list with the toolbar search', fakeAsync(() => {
        init([rule('a', 'First'), rule('b', 'Second')]);

        search.next('sec');

        expect(component.dataSource.filteredData.map((r) => r.id)).toEqual(['b']);
    }));

    it('keeps the list when the deleted rule is already gone after a reload', fakeAsync(() => {
        init([rule('a', 'First'), rule('b', 'Second')]);
        service.deleteRule.and.returnValue(of(true));

        component.delete(rule('stale', 'Stale'));

        expect(component.dataSource.data.length).toBe(2);
    }));
});
