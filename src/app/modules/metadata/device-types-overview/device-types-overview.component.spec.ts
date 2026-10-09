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
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { DeviceTypesOverviewComponent } from './device-types-overview.component';
import { DeviceTypeService } from './shared/device-type.service';
import { DeviceTypeModel } from './shared/device-type.model';
import { DialogsService } from '../../../core/services/dialogs.service';
import { DeviceInstancesDialogService } from '../../devices/device-instances/shared/device-instances-dialog.service';

describe('DeviceTypesOverviewComponent delete', () => {
    // The slash makes encodeURIComponent visible in the assertions.
    const one = { id: 'urn:infai:ses:device-type:a/1', name: 'One' } as DeviceTypeModel;
    const two = { id: 'urn:infai:ses:device-type:b/2', name: 'Two' } as DeviceTypeModel;

    let component: DeviceTypesOverviewComponent;
    let service: jasmine.SpyObj<DeviceTypeService>;
    let dialogs: { openDeleteDialog: jasmine.Spy };
    let snackBar: { open: jasmine.Spy };

    function answerDialog(answer: boolean | undefined): void {
        dialogs.openDeleteDialog.and.returnValue({ afterClosed: () => of(answer) });
    }

    beforeEach(() => {
        service = jasmine.createSpyObj<DeviceTypeService>('DeviceTypeService', ['getDeviceTypes', 'deleteDeviceType']);
        service.getDeviceTypes.and.returnValue(of({ result: [one, two], total: 2 }));
        dialogs = { openDeleteDialog: jasmine.createSpy('openDeleteDialog') };
        snackBar = { open: jasmine.createSpy('open') };

        TestBed.configureTestingModule({
            providers: [
                { provide: DeviceTypeService, useValue: service },
                { provide: DialogsService, useValue: dialogs },
                { provide: MatSnackBar, useValue: snackBar },
                { provide: Router, useValue: {} },
                { provide: DeviceInstancesDialogService, useValue: {} },
            ],
        });
        TestBed.overrideComponent(DeviceTypesOverviewComponent, { set: { template: '', imports: [] } });
        component = TestBed.createComponent(DeviceTypesOverviewComponent).componentInstance;
    });

    describe('single delete', () => {
        it('asks with the device type name', () => {
            answerDialog(false);
            component.delete(one);
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('device type: One');
        });

        it('deletes by URL-encoded id, reports success and reloads', () => {
            answerDialog(true);
            service.deleteDeviceType.and.returnValue(of(true));
            component.delete(one);
            expect(service.deleteDeviceType).toHaveBeenCalledOnceWith(encodeURIComponent(one.id));
            expect(snackBar.open).toHaveBeenCalledOnceWith('Device type deleted successfully.', undefined, { duration: 2000 });
            expect(service.getDeviceTypes).toHaveBeenCalledTimes(1);
            expect(component.ready).toBeTrue();
        });

        it('reports a failed delete as error and still reloads', () => {
            answerDialog(true);
            service.deleteDeviceType.and.returnValue(of(false));
            component.delete(one);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting device type!', 'close', { panelClass: 'snack-bar-error' });
            expect(service.getDeviceTypes).toHaveBeenCalledTimes(1);
        });

        [false, undefined].forEach((answer) => {
            it('does nothing when the dialog answers ' + answer, () => {
                answerDialog(answer);
                component.delete(one);
                expect(service.deleteDeviceType).not.toHaveBeenCalled();
                expect(snackBar.open).not.toHaveBeenCalled();
                expect(service.getDeviceTypes).not.toHaveBeenCalled();
            });
        });
    });

    describe('bulk delete', () => {
        it('asks with the count, singular for one', () => {
            answerDialog(false);
            component.selection.select(one);
            component.deleteMultipleItems();
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('1 device type');
        });

        it('asks with the count, plural for several', () => {
            answerDialog(false);
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('2 device types');
        });

        it('deletes every selected id once, URL-encoded like the single delete, reports success, reloads and clears the selection', () => {
            answerDialog(true);
            service.deleteDeviceType.and.returnValue(of(true));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(service.deleteDeviceType.calls.allArgs()).toEqual([[encodeURIComponent(one.id)], [encodeURIComponent(two.id)]]);
            expect(snackBar.open).toHaveBeenCalledOnceWith('2 device types deleted successfully.', undefined, { duration: 2000 });
            expect(service.getDeviceTypes).toHaveBeenCalledTimes(1);
            expect(component.selection.isEmpty()).toBeTrue();
            expect(component.ready).toBeTrue();
        });

        it('reports one failed delete as a single error with the count, still reloads and clears the selection', () => {
            answerDialog(true);
            service.deleteDeviceType.and.returnValues(of(true), of(false));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(service.deleteDeviceType).toHaveBeenCalledTimes(2);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting 2 device types!', 'close', { panelClass: 'snack-bar-error' });
            expect(service.getDeviceTypes).toHaveBeenCalledTimes(1);
            expect(component.selection.isEmpty()).toBeTrue();
        });

        [false, undefined].forEach((answer) => {
            it('does nothing when the dialog answers ' + answer + ' and keeps the selection', () => {
                answerDialog(answer);
                component.selection.select(one, two);
                component.deleteMultipleItems();
                expect(service.deleteDeviceType).not.toHaveBeenCalled();
                expect(snackBar.open).not.toHaveBeenCalled();
                expect(service.getDeviceTypes).not.toHaveBeenCalled();
                expect(component.selection.selected.length).toBe(2);
            });
        });
    });
});
