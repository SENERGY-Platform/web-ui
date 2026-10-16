/*
 * Copyright 2020 InfAI (CC SES)
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

import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { OperatorRepoComponent } from './operator-repo.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OperatorRepoService } from './shared/operator-repo.service';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DialogsService } from '../../../core/services/dialogs.service';
import { MatDialogModule } from '@angular/material/dialog';
import { AuthorizationServiceMock } from '../../../core/services/authorization.service.mock';
import { CoreModule } from '../../../core/core.module';
import { MatIconModule } from '@angular/material/icon';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { HttpErrorResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError } from 'rxjs';
import { OperatorModel } from './shared/operator.model';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';

class MockOperatorRepoService {}

describe('OperatorRepoComponent', () => {
    let fixture: ComponentFixture<OperatorRepoComponent>;

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                schemas: [NO_ERRORS_SCHEMA],
                imports: [MatSnackBarModule,
                    MatDialogModule,
                    CoreModule,
                    MatIconModule,
                    MatSortModule,
                    MatPaginatorModule, OperatorRepoComponent],
                providers: [
                    { provide: OperatorRepoService, useClass: MockOperatorRepoService },
                    { provide: AuthorizationService, useClass: AuthorizationServiceMock },
                    DialogsService,
                    provideHttpClient(withInterceptorsFromDi()),
                    provideHttpClientTesting(),
                    provideNoopAnimations(),
                    provideRouter([]),
                ],
            });
            fixture = TestBed.createComponent(OperatorRepoComponent);
        }),
    );

    it('should create', () => {
        expect(fixture).toBeTruthy();
    });

    describe('header checkbox', () => {
        let component: OperatorRepoComponent;
        const row = (id: string) => ({ _id: id } as OperatorModel);
        const setRows = (ids: string[]) => (component.operatorsDataSource.data = ids.map(row));

        beforeEach(() => {
            component = fixture.componentInstance;
        });

        it('is not all selected with no rows and nothing selected; toggle selects nothing', () => {
            setRows([]);
            expect(component.isAllSelected()).toBeFalse();
            component.masterToggle();
            expect(component.selection.selected).toEqual([]);
        });

        it('counts one selected row as all and clears on toggle', () => {
            setRows(['a', 'b', 'c']);
            expect(component.isAllSelected()).toBeFalse();
            component.selection.select(component.operatorsDataSource.data[1]);
            expect(component.isAllSelected()).toBeTrue();
            component.masterToggle();
            expect(component.selection.selected).toEqual([]);
        });

        it('selects every shown row when nothing is selected', () => {
            setRows(['a', 'b', 'c']);
            component.masterToggle();
            expect(component.selection.selected.map((o) => o._id).sort()).toEqual(['a', 'b', 'c']);
            expect(component.isAllSelected()).toBeTrue();
        });

        it('does not count more selected rows than shown as all; toggle then selects the shown rows', () => {
            setRows(['a', 'b', 'c']);
            component.masterToggle();
            component.operatorsDataSource.data = component.operatorsDataSource.data.slice(0, 2);
            expect(component.isAllSelected()).toBeFalse();
            component.masterToggle();
            expect(component.selection.selected.length).toBe(3);
        });
    });

    describe('version column', () => {
        it('comes after the name', () => {
            const columns = fixture.componentInstance.displayedColumns;
            expect(columns.indexOf('version')).toBe(columns.indexOf('name') + 1);
        });

        it('shows the newest label, whatever the order, and a dash without versions', () => {
            const component = fixture.componentInstance;
            const withVersions = {_id: 'a', versions: [{version: 'v1.2.0'}, {version: 'v1.10.0'}, {version: 'v1.9.0'}]} as OperatorModel;
            expect(component.versionLabel(withVersions)).toBe('v1.10.0');
            const deprecatedHighest = {_id: 'd', versions: [{version: 'v1.0.0'}, {version: 'v2.0.0', deprecated: true}]} as OperatorModel;
            expect(component.versionLabel(deprecatedHighest)).toBe('v1.0.0');
            expect(component.versionLabel({_id: 'b'} as OperatorModel)).toBe('–');
            expect(component.versionLabel({_id: 'c', versions: []} as unknown as OperatorModel)).toBe('–');
        });
    });

    describe('requests per sort or page event', () => {
        let component: OperatorRepoComponent;
        let getOperators: jasmine.Spy;

        beforeEach(() => {
            component = fixture.componentInstance;
            const service = TestBed.inject(OperatorRepoService) as any;
            service.userHasCreateAuthorization = () => false;
            service.userHasUpdateAuthorization = () => false;
            service.userHasDeleteAuthorization = () => false;
            getOperators = jasmine.createSpy('getOperators').and.returnValue(of({operators: [{_id: 'a', name: 'Alpha'}], totalCount: 1}));
            service.getOperators = getOperators;
        });

        it('sends one request after several searches and reloads', fakeAsync(() => {
            const searchbar = TestBed.inject(SearchbarService);
            fixture.detectChanges();
            tick(300);
            searchbar.changeMessage('al');
            tick(300);
            searchbar.changeMessage('alp');
            tick(300);
            (component as any).getOperators(true);
            (component as any).getOperators(true);
            expect(component.ready).toBeTrue();

            getOperators.calls.reset();
            component.sort.sortChange.emit({active: 'name', direction: 'desc'});
            expect(getOperators).toHaveBeenCalledTimes(1);
            expect(getOperators.calls.mostRecent().args[0]).toBe('alp');

            getOperators.calls.reset();
            component.paginator.page.emit({pageIndex: 1, pageSize: 10, length: 30});
            expect(getOperators).toHaveBeenCalledTimes(1);
        }));
    });

    describe('deleting', () => {
        let component: OperatorRepoComponent;
        let service: any;
        let snackOpen: jasmine.Spy;
        let reload: jasmine.Spy;
        const operator = {_id: 'a', name: 'Alpha'} as OperatorModel;

        beforeEach(() => {
            component = fixture.componentInstance;
            service = TestBed.inject(OperatorRepoService);
            spyOn(TestBed.inject(DialogsService), 'openDeleteDialog').and.returnValue({afterClosed: () => of(true)} as any);
            snackOpen = spyOn(TestBed.inject(MatSnackBar), 'open');
            reload = spyOn(component as any, 'getOperators');
        });

        it('reloads and confirms after a successful delete', () => {
            service.deleteOperator = () => of({});
            component.deleteOperator(operator);
            expect(snackOpen.calls.mostRecent().args[0]).toBe('Operator deleted');
            expect(reload).toHaveBeenCalled();
        });

        it('names the users of an operator whose delete was refused and does not reload', () => {
            service.deleteOperator = () => throwError(() => new HttpErrorResponse({status: 409, error: {error: 'in use', flows: 2, pipelines: 0}}));
            component.deleteOperator(operator);
            expect(snackOpen.calls.mostRecent().args[0]).toContain('2 flows');
            expect(reload).not.toHaveBeenCalled();
            expect(component.ready).toBeTrue();
        });

        it('keeps the selection and does not reload when a batch delete is refused', () => {
            component.selection.select(operator);
            service.deleteOperators = () => throwError(() => new HttpErrorResponse({status: 502, error: 'down'}));
            component.deleteMultipleItems();
            expect(snackOpen.calls.mostRecent().args[0]).toContain('nothing was deleted');
            expect(reload).not.toHaveBeenCalled();
            expect(component.selection.selected).toEqual([operator]);
        });

        it('reloads and clears the selection after a successful batch delete', () => {
            component.selection.select(operator);
            service.deleteOperators = () => of({status: 204});
            component.deleteMultipleItems();
            expect(reload).toHaveBeenCalled();
            expect(component.selection.selected).toEqual([]);
        });
    });
});
