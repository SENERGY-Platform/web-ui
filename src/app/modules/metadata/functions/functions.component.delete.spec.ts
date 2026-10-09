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
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { FunctionsComponent } from './functions.component';
import { FunctionsService } from './shared/functions.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { DeviceTypeService } from '../device-types-overview/shared/device-type.service';
import { DeviceTypeFunctionModel } from '../device-types-overview/shared/device-type.model';
import { ConceptsService } from '../concepts/shared/concepts.service';
import { AuthorizationService } from '../../../core/services/authorization.service';

describe('FunctionsComponent delete', () => {
    const idOne = 'urn:infai:ses:function:1';
    const idTwo = 'urn:infai:ses:function:2';
    const one = { id: idOne, name: 'One' } as DeviceTypeFunctionModel;
    const two = { id: idTwo, name: 'Two' } as DeviceTypeFunctionModel;

    let component: FunctionsComponent;
    let service: jasmine.SpyObj<FunctionsService>;
    let dialogs: { openDeleteDialog: jasmine.Spy };
    let snackBar: { open: jasmine.Spy };

    function answerDialog(answer: boolean | undefined): void {
        dialogs.openDeleteDialog.and.returnValue({ afterClosed: () => of(answer) });
    }

    beforeEach(() => {
        service = jasmine.createSpyObj<FunctionsService>('FunctionsService', ['getFunctions', 'deleteFunction']);
        service.getFunctions.and.returnValue(of({ result: [one, two], total: 2 }));
        dialogs = { openDeleteDialog: jasmine.createSpy('openDeleteDialog') };
        snackBar = { open: jasmine.createSpy('open') };

        TestBed.configureTestingModule({
            providers: [
                { provide: FunctionsService, useValue: service },
                { provide: DialogsService, useValue: dialogs },
                { provide: MatSnackBar, useValue: snackBar },
                { provide: MatDialog, useValue: {} },
                { provide: DeviceTypeService, useValue: {} },
                { provide: ConceptsService, useValue: {} },
                { provide: AuthorizationService, useValue: {} },
                { provide: ActivatedRoute, useValue: {} },
                { provide: Router, useValue: { getCurrentNavigation: () => null } },
            ],
        });
        TestBed.overrideComponent(FunctionsComponent, { set: { template: '', imports: [] } });
        component = TestBed.createComponent(FunctionsComponent).componentInstance;
    });

    describe('single delete', () => {
        const target = one;

        it('asks with the function name', () => {
            answerDialog(false);
            component.deleteFunction(target);
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('function One');
        });

        it('deletes by id, reports success and reloads', () => {
            answerDialog(true);
            service.deleteFunction.and.returnValue(of(true));
            component.deleteFunction(target);
            expect(service.deleteFunction).toHaveBeenCalledOnceWith(idOne);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Function deleted successfully.', undefined, { duration: 2000 });
            expect(service.getFunctions).toHaveBeenCalledTimes(1);
            expect(component.ready).toBeTrue();
        });

        it('reports a failed delete as error and still reloads', () => {
            answerDialog(true);
            service.deleteFunction.and.returnValue(of(false));
            component.deleteFunction(target);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting the function!', 'close', { panelClass: 'snack-bar-error' });
            expect(service.getFunctions).toHaveBeenCalledTimes(1);
        });

        [false, undefined].forEach((answer) => {
            it('does nothing when the dialog answers ' + answer, () => {
                answerDialog(answer);
                component.deleteFunction(target);
                expect(service.deleteFunction).not.toHaveBeenCalled();
                expect(snackBar.open).not.toHaveBeenCalled();
                expect(service.getFunctions).not.toHaveBeenCalled();
            });
        });
    });

    describe('bulk delete', () => {
        it('asks with the count, singular for one', () => {
            answerDialog(false);
            component.selection.select(one);
            component.deleteMultipleItems();
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('1 function');
        });

        it('asks with the count, plural for several', () => {
            answerDialog(false);
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('2 functions');
        });

        it('deletes every selected id once, reports success, reloads and clears the selection', () => {
            answerDialog(true);
            service.deleteFunction.and.returnValue(of(true));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(service.deleteFunction.calls.allArgs()).toEqual([[idOne], [idTwo]]);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Functions deleted successfully.', undefined, { duration: 2000 });
            expect(service.getFunctions).toHaveBeenCalledTimes(1);
            expect(component.selection.isEmpty()).toBeTrue();
            expect(component.ready).toBeTrue();
        });

        it('reports one failed delete as a single error, still reloads and clears the selection', () => {
            answerDialog(true);
            service.deleteFunction.and.returnValues(of(true), of(false));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(service.deleteFunction).toHaveBeenCalledTimes(2);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting functions!', 'close', { panelClass: 'snack-bar-error' });
            expect(service.getFunctions).toHaveBeenCalledTimes(1);
            expect(component.selection.isEmpty()).toBeTrue();
        });

        [false, undefined].forEach((answer) => {
            it('does nothing when the dialog answers ' + answer + ' and keeps the selection', () => {
                answerDialog(answer);
                component.selection.select(one, two);
                component.deleteMultipleItems();
                expect(service.deleteFunction).not.toHaveBeenCalled();
                expect(snackBar.open).not.toHaveBeenCalled();
                expect(service.getFunctions).not.toHaveBeenCalled();
                expect(component.selection.selected.length).toBe(2);
            });
        });
    });
});
