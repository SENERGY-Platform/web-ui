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

import { ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';

import { ProcessIoVariablesComponent } from './variables.component';
import { ProcessIoService } from '../shared/process-io.service';
import { ProcessIoVariable } from '../shared/process-io.model';
import { DialogsService } from '../../../../core/services/dialogs.service';

describe('ProcessIoVariablesComponent list', () => {
    let fixture: ComponentFixture<ProcessIoVariablesComponent>;
    let service: jasmine.SpyObj<ProcessIoService>;
    let dialog: jasmine.SpyObj<MatDialog>;

    const variable: ProcessIoVariable = { key: 'inst_def_speed', value: 42, process_definition_id: 'def', process_instance_id: 'inst', unix_timestamp_in_s: 1700000000 };

    function init(rights = { create: true, update: true, delete: true }) {
        service = jasmine.createSpyObj<ProcessIoService>('ProcessIoService', [
            'userHasCreateAuthorization', 'userHasUpdateAuthorization', 'userHasDeleteAuthorization', 'countVariables', 'listVariables', 'remove',
        ]);
        service.userHasCreateAuthorization.and.returnValue(rights.create);
        service.userHasUpdateAuthorization.and.returnValue(rights.update);
        service.userHasDeleteAuthorization.and.returnValue(rights.delete);
        service.countVariables.and.returnValue(of({ count: 1 }));
        service.listVariables.and.returnValue(of([variable]));
        dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
        dialog.open.and.returnValue({ afterClosed: () => of(null) } as any);
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, MatSnackBarModule, ProcessIoVariablesComponent],
            providers: [
                { provide: ProcessIoService, useValue: service },
                { provide: DialogsService, useValue: {} },
                { provide: MatDialog, useValue: dialog },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(ProcessIoVariablesComponent);
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    it('reloads exactly once when the refresh button is clicked', fakeAsync(() => {
        init();
        service.listVariables.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        fixture.detectChanges();
        tick(400);
        discardPeriodicTasks();

        expect(service.listVariables).toHaveBeenCalledTimes(1);
    }));

    it('opens the edit dialog on a row click with the update right', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        (fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement).click();

        expect(dialog.open).toHaveBeenCalled();
    }));

    it('has no clickable rows, no action menu and no selection without the update and delete rights', fakeAsync(() => {
        init({ create: false, update: false, delete: false });
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('tr.clickable-row')).toBeNull();
        expect(fixture.componentInstance.displayedColumns).toEqual(['key', 'value', 'process_instance_id', 'process_definition_id', 'unix_timestamp_in_s']);
        expect(fixture.nativeElement.querySelector('senergy-page-header button')).toBeNull();
    }));

    it('offers the create button in the page header with the create right', fakeAsync(() => {
        init();
        discardPeriodicTasks();

        expect(fixture.nativeElement.querySelector('senergy-page-header button').textContent).toContain('New variable');
    }));

    describe('view state in the URL', () => {
        it('takes the total of the search the page opened with, however late the unfiltered count answers', fakeAsync(() => {
            const unfiltered = new Subject<{ count: number }>();
            service = jasmine.createSpyObj<ProcessIoService>('ProcessIoService', [
                'userHasCreateAuthorization', 'userHasUpdateAuthorization', 'userHasDeleteAuthorization', 'countVariables', 'listVariables', 'remove',
            ]);
            service.userHasCreateAuthorization.and.returnValue(true);
            service.userHasUpdateAuthorization.and.returnValue(true);
            service.userHasDeleteAuthorization.and.returnValue(true);
            service.countVariables.and.callFake((search: string) => (search === '' ? unfiltered : of({ count: 30 })));
            service.listVariables.and.returnValue(of([variable]));
            TestBed.configureTestingModule({
                schemas: [NO_ERRORS_SCHEMA],
                imports: [NoopAnimationsModule, MatSnackBarModule, ProcessIoVariablesComponent],
                providers: [
                    provideRouter([]),
                    { provide: ProcessIoService, useValue: service },
                    { provide: DialogsService, useValue: {} },
                    { provide: MatDialog, useValue: {} },
                ],
            }).compileComponents();
            const router = TestBed.inject(Router);
            router.navigateByUrl('/?search=foo&page=4');
            tick();
            fixture = TestBed.createComponent(ProcessIoVariablesComponent);
            fixture.detectChanges();
            tick(400);
            fixture.detectChanges();

            unfiltered.next({ count: 5000 });
            tick(400);
            fixture.detectChanges();
            tick(400);
            discardPeriodicTasks();

            expect(fixture.componentInstance.totalCount).toBe(30);
            expect(fixture.componentInstance.list.pageIndex).toBe(1);
            expect(router.url).toBe('/?search=foo&page=1');
        }));
    });
});
