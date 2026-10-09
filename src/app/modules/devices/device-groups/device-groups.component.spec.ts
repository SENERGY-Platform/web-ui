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

import { DeviceGroupsComponent } from './device-groups.component';
import { DeviceGroupsService } from './shared/device-groups.service';
import { DeviceGroupModel } from './shared/device-groups.model';
import { DialogsService } from '../../../core/services/dialogs.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';

describe('DeviceGroupsComponent delete', () => {
    const one = { id: 'urn:infai:ses:device-group:1', name: 'One' } as DeviceGroupModel;
    const two = { id: 'urn:infai:ses:device-group:2', name: 'Two' } as DeviceGroupModel;

    // hideGenerated is true by default, so a reload lists through the generated-free query.
    let component: DeviceGroupsComponent;
    let service: jasmine.SpyObj<DeviceGroupsService>;
    let dialogs: { openDeleteDialog: jasmine.Spy };
    let snackBar: { open: jasmine.Spy };

    function answerDialog(answer: boolean | undefined): void {
        dialogs.openDeleteDialog.and.returnValue({ afterClosed: () => of(answer) });
    }

    beforeEach(() => {
        service = jasmine.createSpyObj<DeviceGroupsService>('DeviceGroupsService', ['getDeviceGroups', 'getDeviceGroupsWithoutGenerated', 'deleteDeviceGroup']);
        service.getDeviceGroups.and.returnValue(of({ result: [one, two], total: 2 }));
        service.getDeviceGroupsWithoutGenerated.and.returnValue(of({ result: [one, two], total: 2 }));
        const permissions = jasmine.createSpyObj<PermissionsService>('PermissionsService', ['getComputedResourcePermissionsV2']);
        permissions.getComputedResourcePermissionsV2.and.returnValue(of([]));
        dialogs = { openDeleteDialog: jasmine.createSpy('openDeleteDialog') };
        snackBar = { open: jasmine.createSpy('open') };

        TestBed.configureTestingModule({
            providers: [
                { provide: DeviceGroupsService, useValue: service },
                { provide: DialogsService, useValue: dialogs },
                { provide: MatSnackBar, useValue: snackBar },
                { provide: Router, useValue: {} },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: PermissionsService, useValue: permissions },
            ],
        });
        TestBed.overrideComponent(DeviceGroupsComponent, { set: { template: '', imports: [] } });
        component = TestBed.createComponent(DeviceGroupsComponent).componentInstance;
    });

    describe('single delete', () => {
        it('asks with the device group name', () => {
            answerDialog(false);
            component.deleteDeviceGroup(one);
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('device group One');
        });

        it('deletes by id, reports success and reloads', () => {
            answerDialog(true);
            service.deleteDeviceGroup.and.returnValue(of(true));
            component.deleteDeviceGroup(one);
            expect(service.deleteDeviceGroup).toHaveBeenCalledOnceWith(one.id);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Device-Group deleted successfully.', undefined, { duration: 2000 });
            expect(service.getDeviceGroupsWithoutGenerated).toHaveBeenCalledTimes(1);
            expect(component.ready).toBeTrue();
        });

        it('reports a failed delete as error and still reloads', () => {
            answerDialog(true);
            service.deleteDeviceGroup.and.returnValue(of(false));
            component.deleteDeviceGroup(one);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting the device-group!', 'close', { panelClass: 'snack-bar-error' });
            expect(service.getDeviceGroupsWithoutGenerated).toHaveBeenCalledTimes(1);
        });

        [false, undefined].forEach((answer) => {
            it('does nothing when the dialog answers ' + answer, () => {
                answerDialog(answer);
                component.deleteDeviceGroup(one);
                expect(service.deleteDeviceGroup).not.toHaveBeenCalled();
                expect(snackBar.open).not.toHaveBeenCalled();
                expect(service.getDeviceGroupsWithoutGenerated).not.toHaveBeenCalled();
            });
        });
    });

    describe('bulk delete', () => {
        it('asks with the count, singular for one', () => {
            answerDialog(false);
            component.selection.select(one);
            component.deleteMultipleItems();
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('1 device group');
        });

        it('asks with the count, plural for several', () => {
            answerDialog(false);
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('2 device groups');
        });

        it('deletes every selected id once, reports a plural success, reloads and clears the selection', () => {
            answerDialog(true);
            service.deleteDeviceGroup.and.returnValue(of(true));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(service.deleteDeviceGroup.calls.allArgs()).toEqual([[one.id], [two.id]]);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Device groups deleted successfully.', undefined, { duration: 2000 });
            expect(service.getDeviceGroupsWithoutGenerated).toHaveBeenCalledTimes(1);
            expect(component.selection.isEmpty()).toBeTrue();
            expect(component.ready).toBeTrue();
        });

        it('reports a singular success when one group was deleted', () => {
            answerDialog(true);
            service.deleteDeviceGroup.and.returnValue(of(true));
            component.selection.select(one);
            component.deleteMultipleItems();
            expect(service.deleteDeviceGroup).toHaveBeenCalledOnceWith(one.id);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Device group deleted successfully.', undefined, { duration: 2000 });
        });

        it('reports one failed delete as a single singular error, still reloads and clears the selection', () => {
            answerDialog(true);
            service.deleteDeviceGroup.and.returnValues(of(true), of(false));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(service.deleteDeviceGroup).toHaveBeenCalledTimes(2);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting the device group!', 'close', { panelClass: 'snack-bar-error' });
            expect(service.getDeviceGroupsWithoutGenerated).toHaveBeenCalledTimes(1);
            expect(component.selection.isEmpty()).toBeTrue();
        });

        [false, undefined].forEach((answer) => {
            it('does nothing when the dialog answers ' + answer + ' and keeps the selection', () => {
                answerDialog(answer);
                component.selection.select(one, two);
                component.deleteMultipleItems();
                expect(service.deleteDeviceGroup).not.toHaveBeenCalled();
                expect(snackBar.open).not.toHaveBeenCalled();
                expect(service.getDeviceGroupsWithoutGenerated).not.toHaveBeenCalled();
                expect(component.selection.selected.length).toBe(2);
            });
        });
    });
});
