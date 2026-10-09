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


import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { ProcessIoVariablesComponent } from './variables.component';
import { ProcessIoService } from '../shared/process-io.service';
import { ProcessIoVariable } from '../shared/process-io.model';
import { DialogsService } from '../../../../core/services/dialogs.service';
import { UtilService } from '../../../../core/services/util.service';

describe('ProcessIoVariablesComponent delete', () => {
    const one: ProcessIoVariable = { key: 'first', value: 1, process_definition_id: 'def', process_instance_id: 'inst', unix_timestamp_in_s: 1 };
    const two: ProcessIoVariable = { key: 'second', value: 2, process_definition_id: 'def', process_instance_id: 'inst', unix_timestamp_in_s: 2 };

    let component: ProcessIoVariablesComponent;
    let service: jasmine.SpyObj<ProcessIoService>;
    let dialogs: { openDeleteDialog: jasmine.Spy };
    let snackBar: { open: jasmine.Spy };

    function answerDialog(answer: boolean | undefined): void {
        dialogs.openDeleteDialog.and.returnValue({ afterClosed: () => of(answer) });
    }

    beforeEach(() => {
        service = jasmine.createSpyObj<ProcessIoService>('ProcessIoService', [
            'userHasCreateAuthorization', 'userHasUpdateAuthorization', 'userHasDeleteAuthorization',
            'countVariables', 'listVariables', 'remove',
        ]);
        service.countVariables.and.returnValue(of({ count: 2 }));
        service.listVariables.and.returnValue(of([one, two]));
        dialogs = { openDeleteDialog: jasmine.createSpy('openDeleteDialog') };
        snackBar = { open: jasmine.createSpy('open') };

        TestBed.configureTestingModule({
            providers: [
                { provide: ProcessIoService, useValue: service },
                { provide: DialogsService, useValue: dialogs },
                { provide: MatSnackBar, useValue: snackBar },
                { provide: MatDialog, useValue: {} },
                { provide: UtilService, useValue: {} },
            ],
        });
        TestBed.overrideComponent(ProcessIoVariablesComponent, { set: { template: '', imports: [] } });
        component = TestBed.createComponent(ProcessIoVariablesComponent).componentInstance;
        component.dataSource.data = [one, two];
        service.countVariables.calls.reset();
    });

    describe('single delete', () => {
        it('asks with a fixed text', () => {
            answerDialog(false);
            component.remove(one.key);
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('Process-IO Variable');
        });

        it('removes by key and drops the row locally without notice or reload', () => {
            answerDialog(true);
            service.remove.and.returnValue(of({ status: 204 }));
            component.remove(one.key);
            expect(service.remove).toHaveBeenCalledOnceWith(one.key);
            expect(component.dataSource.data).toEqual([two]);
            expect(snackBar.open).not.toHaveBeenCalled();
            expect(service.listVariables).not.toHaveBeenCalled();
            expect(service.countVariables).not.toHaveBeenCalled();
        });

        it('reports a status of 300 or more as error and keeps the row', () => {
            answerDialog(true);
            service.remove.and.returnValue(of({ status: 300 }));
            component.remove(one.key);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting process-io variable!', 'close', { panelClass: 'snack-bar-error' });
            expect(component.dataSource.data).toEqual([one, two]);
            expect(service.listVariables).not.toHaveBeenCalled();
        });

        [false, undefined].forEach((answer) => {
            it('does nothing when the dialog answers ' + answer, () => {
                answerDialog(answer);
                component.remove(one.key);
                expect(service.remove).not.toHaveBeenCalled();
                expect(snackBar.open).not.toHaveBeenCalled();
                expect(component.dataSource.data).toEqual([one, two]);
            });
        });
    });

    describe('bulk delete', () => {
        it('asks with the count, singular for one', () => {
            answerDialog(false);
            component.selection.select(one);
            component.deleteMultipleItems();
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('1 process');
        });

        it('asks with the count, plural for several', () => {
            answerDialog(false);
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('2 processes');
        });

        it('removes every selected key once, reports success, reloads and clears the selection', () => {
            answerDialog(true);
            service.remove.and.returnValue(of({ status: 204 }));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(service.remove.calls.allArgs()).toEqual([[one.key], [two.key]]);
            expect(snackBar.open).toHaveBeenCalledOnceWith('2 processes deleted successfully.', undefined, { duration: 2000 });
            expect(service.listVariables).toHaveBeenCalledTimes(1);
            expect(service.countVariables).toHaveBeenCalledTimes(1);
            expect(component.selection.isEmpty()).toBeTrue();
            expect(component.ready).toBeTrue();
        });

        it('treats only a status of 500 as failure, so a 404 still counts as success', () => {
            answerDialog(true);
            service.remove.and.returnValue(of({ status: 404 }));
            component.selection.select(one);
            component.deleteMultipleItems();
            expect(snackBar.open).toHaveBeenCalledOnceWith('1 process deleted successfully.', undefined, { duration: 2000 });
        });

        it('reports one status 500 as a single error with the count, still reloads and clears the selection', () => {
            answerDialog(true);
            service.remove.and.returnValues(of({ status: 204 }), of({ status: 500 }));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(service.remove).toHaveBeenCalledTimes(2);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting 2 processes!', 'close', { panelClass: 'snack-bar-error' });
            expect(service.listVariables).toHaveBeenCalledTimes(1);
            expect(component.selection.isEmpty()).toBeTrue();
        });

        it('reports a null answer as failure', () => {
            answerDialog(true);
            service.remove.and.returnValue(of(null as unknown as { status: number }));
            component.selection.select(one);
            component.deleteMultipleItems();
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting 1 process!', 'close', { panelClass: 'snack-bar-error' });
        });

        [false, undefined].forEach((answer) => {
            it('does nothing when the dialog answers ' + answer + ' and keeps the selection', () => {
                answerDialog(answer);
                component.selection.select(one, two);
                component.deleteMultipleItems();
                expect(service.remove).not.toHaveBeenCalled();
                expect(snackBar.open).not.toHaveBeenCalled();
                expect(service.listVariables).not.toHaveBeenCalled();
                expect(component.selection.selected.length).toBe(2);
            });
        });
    });
});
