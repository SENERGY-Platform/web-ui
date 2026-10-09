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
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { DeviceInstancesComponent } from './device-instances.component';
import { DeviceInstancesService } from './shared/device-instances.service';
import { DeviceInstancesDialogService } from './shared/device-instances-dialog.service';
import { DeviceInstanceModel } from './shared/device-instances.model';
import { DialogsService } from '../../../core/services/dialogs.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { DeviceTypeService } from '../../metadata/device-types-overview/shared/device-type.service';
import { ExportDataService } from 'src/app/widgets/shared/export-data.service';

describe('DeviceInstancesComponent delete', () => {
    const one = { id: 'urn:infai:ses:device:1', name: 'One', display_name: 'One' } as DeviceInstanceModel;
    const two = { id: 'urn:infai:ses:device:2', name: 'Two', display_name: 'Two' } as DeviceInstanceModel;

    let component: DeviceInstancesComponent;
    let service: jasmine.SpyObj<DeviceInstancesService>;
    let dialogs: { openDeleteDialog: jasmine.Spy };
    let snackBar: { open: jasmine.Spy };

    function answerDialog(answer: boolean | undefined): void {
        dialogs.openDeleteDialog.and.returnValue({ afterClosed: () => of(answer) });
    }

    beforeEach(() => {
        service = jasmine.createSpyObj<DeviceInstancesService>('DeviceInstancesService', ['getDeviceInstances', 'deleteDeviceInstance']);
        service.getDeviceInstances.and.returnValue(of({ result: [one, two], total: 2 }));
        dialogs = { openDeleteDialog: jasmine.createSpy('openDeleteDialog') };
        snackBar = { open: jasmine.createSpy('open') };

        TestBed.configureTestingModule({
            providers: [
                { provide: DeviceInstancesService, useValue: service },
                { provide: DialogsService, useValue: dialogs },
                { provide: MatSnackBar, useValue: snackBar },
                { provide: MatDialog, useValue: {} },
                { provide: DeviceInstancesDialogService, useValue: {} },
                { provide: PermissionsDialogService, useValue: {} },
                { provide: PermissionsService, useValue: {} },
                { provide: DeviceTypeService, useValue: {} },
                { provide: ExportDataService, useValue: {} },
                { provide: ActivatedRoute, useValue: {} },
                { provide: Router, useValue: {} },
            ],
        });
        TestBed.overrideComponent(DeviceInstancesComponent, { set: { template: '', imports: [] } });
        component = TestBed.createComponent(DeviceInstancesComponent).componentInstance;
    });

    describe('single delete', () => {
        beforeEach(() => {
            component.dataSource.data = [one, two];
        });

        it('asks without the device name', () => {
            answerDialog(false);
            component.deleteDevice(one);
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('device');
        });

        it('deletes by id, reports success and removes the row locally without reloading', () => {
            answerDialog(true);
            service.deleteDeviceInstance.and.returnValue(of(one));
            component.deleteDevice(one);
            expect(service.deleteDeviceInstance).toHaveBeenCalledOnceWith(one.id);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Device deleted successfully.', undefined, { duration: 2000 });
            expect(component.dataSource.data).toEqual([two]);
            expect(service.getDeviceInstances).not.toHaveBeenCalled();
            expect(component.ready).toBeTrue();
        });

        it('reports null as error and still removes the row locally', () => {
            answerDialog(true);
            service.deleteDeviceInstance.and.returnValue(of(null));
            component.deleteDevice(one);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting device!', 'close', { panelClass: 'snack-bar-error' });
            expect(component.dataSource.data).toEqual([two]);
            expect(component.ready).toBeTrue();
        });

        [false, undefined].forEach((answer) => {
            it('does nothing when the dialog answers ' + answer, () => {
                answerDialog(answer);
                component.deleteDevice(one);
                expect(service.deleteDeviceInstance).not.toHaveBeenCalled();
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
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('1 device');
        });

        it('asks with the count, plural for several', () => {
            answerDialog(false);
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(dialogs.openDeleteDialog).toHaveBeenCalledOnceWith('2 devices');
        });

        it('deletes every selected id once, reports success, reloads and clears the selection', () => {
            answerDialog(true);
            service.deleteDeviceInstance.and.returnValues(of(one), of(two));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(service.deleteDeviceInstance.calls.allArgs()).toEqual([[one.id], [two.id]]);
            expect(snackBar.open).toHaveBeenCalledOnceWith('Devices deleted successfully.', undefined, { duration: 2000 });
            expect(service.getDeviceInstances).toHaveBeenCalledTimes(1);
            expect(component.selection.isEmpty()).toBeTrue();
            expect(component.ready).toBeTrue();
        });

        it('reports a null result as a single error, still reloads and clears the selection', () => {
            answerDialog(true);
            service.deleteDeviceInstance.and.returnValues(of(one), of(null));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting devices!', 'close', { panelClass: 'snack-bar-error' });
            expect(service.getDeviceInstances).toHaveBeenCalledTimes(1);
            expect(component.selection.isEmpty()).toBeTrue();
        });

        it('reports status 500 as error but accepts any other status', () => {
            answerDialog(true);
            service.deleteDeviceInstance.and.returnValues(of({ status: 404 } as unknown as DeviceInstanceModel), of({ status: 500 } as unknown as DeviceInstanceModel));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(snackBar.open).toHaveBeenCalledOnceWith('Error while deleting devices!', 'close', { panelClass: 'snack-bar-error' });

            snackBar.open.calls.reset();
            service.deleteDeviceInstance.and.returnValues(of({ status: 404 } as unknown as DeviceInstanceModel), of({ status: 204 } as unknown as DeviceInstanceModel));
            component.selection.select(one, two);
            component.deleteMultipleItems();
            expect(snackBar.open).toHaveBeenCalledOnceWith('Devices deleted successfully.', undefined, { duration: 2000 });
        });

        it('does not reload once the page has loaded, because reload() returns while not ready', () => {
            answerDialog(true);
            service.deleteDeviceInstance.and.returnValues(of(one));
            component.init = true;
            component.ready = true;
            component.selection.select(one);
            component.deleteMultipleItems();
            expect(snackBar.open).toHaveBeenCalledOnceWith('Devices deleted successfully.', undefined, { duration: 2000 });
            expect(service.getDeviceInstances).not.toHaveBeenCalled();
            expect(component.ready).toBeFalse();
            expect(component.selection.selected.length).toBe(1);
        });

        [false, undefined].forEach((answer) => {
            it('does nothing when the dialog answers ' + answer + ' and keeps the selection', () => {
                answerDialog(answer);
                component.ready = true;
                component.selection.select(one, two);
                component.deleteMultipleItems();
                expect(service.deleteDeviceInstance).not.toHaveBeenCalled();
                expect(snackBar.open).not.toHaveBeenCalled();
                expect(service.getDeviceInstances).not.toHaveBeenCalled();
                expect(component.ready).toBeTrue();
                expect(component.selection.selected.length).toBe(2);
            });
        });
    });
});
