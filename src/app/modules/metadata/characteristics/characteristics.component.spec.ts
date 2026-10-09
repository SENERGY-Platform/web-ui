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
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { CharacteristicsComponent } from './characteristics.component';
import { CharacteristicsService } from './shared/characteristics.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { DeviceTypeService } from '../device-types-overview/shared/device-type.service';
import { CharacteristicsPermSearchModel } from './shared/characteristics-perm-search.model';
import { DeviceTypeCharacteristicsModel } from '../device-types-overview/shared/device-type.model';

describe('CharacteristicsComponent delete', () => {
    const idOne = 'urn:infai:ses:characteristic:1';
    const idTwo = 'urn:infai:ses:characteristic:2';
    const one = { id: idOne, name: 'One' } as DeviceTypeCharacteristicsModel;
    const two = { id: idTwo, name: 'Two' } as DeviceTypeCharacteristicsModel;

    let component: CharacteristicsComponent;
    let service: jasmine.SpyObj<CharacteristicsService>;
    let dialogs: { openDeleteDialog: jasmine.Spy };
    let snackBar: { open: jasmine.Spy };

    function answerDialog(answer: boolean | undefined): void {
        dialogs.openDeleteDialog.and.returnValue({ afterClosed: () => of(answer) });
    }

    beforeEach(() => {
        service = jasmine.createSpyObj<CharacteristicsService>('CharacteristicsService', ['getCharacteristics', 'deleteCharacteristic']);
        service.getCharacteristics.and.returnValue(of({ result: [one, two], total: 2 }));
        dialogs = { openDeleteDialog: jasmine.createSpy('openDeleteDialog') };
        snackBar = { open: jasmine.createSpy('open') };

        TestBed.configureTestingModule({
            providers: [
                { provide: CharacteristicsService, useValue: service },
                { provide: DialogsService, useValue: dialogs },
                { provide: MatSnackBar, useValue: snackBar },
                { provide: MatDialog, useValue: {} },
                { provide: DeviceTypeService, useValue: {} },
                { provide: Router, useValue: { getCurrentNavigation: () => null } },
            ],
        });
        TestBed.overrideComponent(CharacteristicsComponent, { set: { template: '', imports: [] } });
        component = TestBed.createComponent(CharacteristicsComponent).componentInstance;
    });

    describe('single delete', () => {
        const target = one as unknown as CharacteristicsPermSearchModel;

        it('asks with the characteristic name', () => {
            answerDialog(false);
            component.deleteCharacteristic(target);
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('characteristic One');
        });

        it('deletes by id, reports success and reloads', () => {
            answerDialog(true);
            service.deleteCharacteristic.and.returnValue(of(true));
            component.deleteCharacteristic(target);
            expect(service.deleteCharacteristic).toHaveBeenCalledOnceWith(idOne);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Characteristic deleted successfully.', undefined, { duration: 2000 });
            expect(service.getCharacteristics).toHaveBeenCalledTimes(1);
            expect(component.ready).toBeTrue();
        });

        it('reports a failed delete as error and still reloads', () => {
            answerDialog(true);
            service.deleteCharacteristic.and.returnValue(of(false));
            component.deleteCharacteristic(target);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting the characteristic!', 'close', { panelClass: 'snack-bar-error' });
            expect(service.getCharacteristics).toHaveBeenCalledTimes(1);
        });

        [false, undefined].forEach((answer) => {
            it('does nothing when the dialog answers ' + answer, () => {
                answerDialog(answer);
                component.deleteCharacteristic(target);
                expect(service.deleteCharacteristic).not.toHaveBeenCalled();
                expect(snackBar.open).not.toHaveBeenCalled();
                expect(service.getCharacteristics).not.toHaveBeenCalled();
            });
        });
    });

    describe('bulk delete', () => {
        it('asks with the count, singular for one', () => {
            answerDialog(false);
            component.selection.select(one);
            component.deleteMultipleItems();
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('1 characteristic');
        });

        it('asks with the count, plural for several', () => {
            answerDialog(false);
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('2 characteristics');
        });

        it('deletes every selected id once, reports success, reloads and clears the selection', () => {
            answerDialog(true);
            service.deleteCharacteristic.and.returnValue(of(true));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(service.deleteCharacteristic.calls.allArgs()).toEqual([[idOne], [idTwo]]);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Characteristics deleted successfully.', undefined, { duration: 2000 });
            expect(service.getCharacteristics).toHaveBeenCalledTimes(1);
            expect(component.selection.isEmpty()).toBeTrue();
            expect(component.ready).toBeTrue();
        });

        it('reports one failed delete as a single error, still reloads and clears the selection', () => {
            answerDialog(true);
            service.deleteCharacteristic.and.returnValues(of(true), of(false));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(service.deleteCharacteristic).toHaveBeenCalledTimes(2);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting characteristics!', 'close', { panelClass: 'snack-bar-error' });
            expect(service.getCharacteristics).toHaveBeenCalledTimes(1);
            expect(component.selection.isEmpty()).toBeTrue();
        });

        [false, undefined].forEach((answer) => {
            it('does nothing when the dialog answers ' + answer + ' and keeps the selection', () => {
                answerDialog(answer);
                component.selection.select(one, two);
                component.deleteMultipleItems();
                expect(service.deleteCharacteristic).not.toHaveBeenCalled();
                expect(snackBar.open).not.toHaveBeenCalled();
                expect(service.getCharacteristics).not.toHaveBeenCalled();
                expect(component.selection.selected.length).toBe(2);
            });
        });
    });
});
