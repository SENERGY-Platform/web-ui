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
import { MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';

import { ProcessIoVariablesComponent } from './variables.component';
import { ProcessIoService } from '../shared/process-io.service';
import { SearchbarService } from '../../../../core/components/searchbar/shared/searchbar.service';
import { KeepPageInRangeDirective } from '../../../../core/directives/keep-page-in-range.directive';
import { DialogsService } from '../../../../core/services/dialogs.service';
import { UtilService } from '../../../../core/services/util.service';

describe('ProcessIoVariablesComponent total', () => {
    it('takes the total of the search the page was opened with, however late the unfiltered count answers', fakeAsync(() => {
        localStorage.removeItem('PreferencesService/pageSize');
        const unfiltered = new Subject<{ count: number }>();
        const countVariables = jasmine.createSpy('countVariables').and.callFake((search: string) => (search === '' ? unfiltered : of({ count: 30 })));
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [ProcessIoVariablesComponent, NoopAnimationsModule, MatSnackBarModule, MatTableModule, MatSortModule, MatPaginatorModule, KeepPageInRangeDirective],
            providers: [
                provideRouter([]),
                {
                    provide: ProcessIoService,
                    useValue: {
                        userHasCreateAuthorization: () => false,
                        userHasUpdateAuthorization: () => false,
                        userHasDeleteAuthorization: () => false,
                        countVariables,
                        listVariables: () => of([]),
                    },
                },
                { provide: DialogsService, useValue: {} },
                { provide: MatDialog, useValue: {} },
                { provide: UtilService, useValue: {} },
            ],
        });
        const router = TestBed.inject(Router);
        router.navigateByUrl('/?page=1');
        tick();
        TestBed.inject(SearchbarService).changeMessage('foo');
        const fixture = TestBed.createComponent(ProcessIoVariablesComponent);
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();

        unfiltered.next({ count: 5000 });
        tick(400);
        fixture.detectChanges();
        discardPeriodicTasks();
        flush();

        expect(fixture.componentInstance.totalCount).toBe(30);
        expect(router.url).toBe('/?page=1');
    }));
});
