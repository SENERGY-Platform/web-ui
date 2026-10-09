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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { OperatorRepoComponent } from './operator-repo.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { OperatorRepoService } from './shared/operator-repo.service';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { DialogsService } from '../../../core/services/dialogs.service';
import { MatDialogModule } from '@angular/material/dialog';
import { AuthorizationServiceMock } from '../../../core/services/authorization.service.mock';
import { CoreModule } from '../../../core/core.module';
import { MatIconModule } from '@angular/material/icon';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { OperatorModel } from './shared/operator.model';

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
                    provideHttpClient(withXhr(), withInterceptorsFromDi()),
                    provideHttpClientTesting(),
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
});
