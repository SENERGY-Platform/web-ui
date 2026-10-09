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

import { DeviceClassesComponent } from './device-classes.component';
import { DeviceClassesService } from './shared/device-classes.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { DeviceTypeService } from '../device-types-overview/shared/device-type.service';
import { DeviceTypeDeviceClassModel } from '../device-types-overview/shared/device-type.model';

describe('DeviceClassesComponent delete', () => {
    const one: DeviceTypeDeviceClassModel = { id: 'urn:infai:ses:device-class:1', name: 'One', image: '' };
    const two: DeviceTypeDeviceClassModel = { id: 'urn:infai:ses:device-class:2', name: 'Two', image: '' };

    let component: DeviceClassesComponent;
    let service: jasmine.SpyObj<DeviceClassesService>;
    let dialogs: { openDeleteDialog: jasmine.Spy };
    let snackBar: { open: jasmine.Spy };

    function answerDialog(answer: boolean | undefined): void {
        dialogs.openDeleteDialog.and.returnValue({ afterClosed: () => of(answer) });
    }

    beforeEach(() => {
        service = jasmine.createSpyObj<DeviceClassesService>('DeviceClassesService', ['getDeviceClasses', 'deleteDeviceClasses']);
        service.getDeviceClasses.and.returnValue(of({ result: [one, two], total: 2 }));
        dialogs = { openDeleteDialog: jasmine.createSpy('openDeleteDialog') };
        snackBar = { open: jasmine.createSpy('open') };

        TestBed.configureTestingModule({
            providers: [
                { provide: DeviceClassesService, useValue: service },
                { provide: DialogsService, useValue: dialogs },
                { provide: MatSnackBar, useValue: snackBar },
                { provide: MatDialog, useValue: {} },
                { provide: AuthorizationService, useValue: {} },
                { provide: DeviceTypeService, useValue: {} },
            ],
        });
        TestBed.overrideComponent(DeviceClassesComponent, { set: { template: '', imports: [] } });
        component = TestBed.createComponent(DeviceClassesComponent).componentInstance;
    });

    describe('single delete', () => {
        it('asks with the device class name', () => {
            answerDialog(false);
            component.deleteDeviceClass(one);
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('device class One');
        });

        it('deletes by id, reports success and reloads', () => {
            answerDialog(true);
            service.deleteDeviceClasses.and.returnValue(of(true));
            component.deleteDeviceClass(one);
            expect(service.deleteDeviceClasses).toHaveBeenCalledOnceWith(one.id);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Device class deleted successfully.', undefined, { duration: 2000 });
            expect(service.getDeviceClasses).toHaveBeenCalledTimes(1);
            expect(component.ready).toBeTrue();
        });

        it('reports a failed delete as error and still reloads', () => {
            answerDialog(true);
            service.deleteDeviceClasses.and.returnValue(of(false));
            component.deleteDeviceClass(one);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting the device class!', 'close', { panelClass: 'snack-bar-error' });
            expect(service.getDeviceClasses).toHaveBeenCalledTimes(1);
        });

        [false, undefined].forEach((answer) => {
            it('does nothing when the dialog answers ' + answer, () => {
                answerDialog(answer);
                component.deleteDeviceClass(one);
                expect(service.deleteDeviceClasses).not.toHaveBeenCalled();
                expect(snackBar.open).not.toHaveBeenCalled();
                expect(service.getDeviceClasses).not.toHaveBeenCalled();
            });
        });
    });

    describe('bulk delete', () => {
        it('asks with the count, singular for one', () => {
            answerDialog(false);
            component.selection.select(one);
            component.deleteMultipleItems();
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('1 device class');
        });

        it('asks with the count, plural for several', () => {
            answerDialog(false);
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('2 device classes');
        });

        it('deletes every selected id once, reports success, reloads and clears the selection', () => {
            answerDialog(true);
            service.deleteDeviceClasses.and.returnValue(of(true));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(service.deleteDeviceClasses.calls.allArgs()).toEqual([[one.id], [two.id]]);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Device classes deleted successfully.', undefined, { duration: 2000 });
            expect(service.getDeviceClasses).toHaveBeenCalledTimes(1);
            expect(component.selection.isEmpty()).toBeTrue();
            expect(component.ready).toBeTrue();
        });

        it('reports one failed delete as a single error, still reloads and clears the selection', () => {
            answerDialog(true);
            service.deleteDeviceClasses.and.returnValues(of(true), of(false));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(service.deleteDeviceClasses).toHaveBeenCalledTimes(2);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting device classes!', 'close', { panelClass: 'snack-bar-error' });
            expect(service.getDeviceClasses).toHaveBeenCalledTimes(1);
            expect(component.selection.isEmpty()).toBeTrue();
        });

        [false, undefined].forEach((answer) => {
            it('does nothing when the dialog answers ' + answer + ' and keeps the selection', () => {
                answerDialog(answer);
                component.selection.select(one, two);
                component.deleteMultipleItems();
                expect(service.deleteDeviceClasses).not.toHaveBeenCalled();
                expect(snackBar.open).not.toHaveBeenCalled();
                expect(service.getDeviceClasses).not.toHaveBeenCalled();
                expect(component.selection.selected.length).toBe(2);
            });
        });
    });
});
