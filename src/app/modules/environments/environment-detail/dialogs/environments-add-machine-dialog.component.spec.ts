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

import { of } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import { EnvironmentsAddMachineDialogComponent } from './environments-add-machine-dialog.component';
import { EnvironmentsService } from '../../shared/environments.service';
import { CatalogDeviceType } from '../../shared/environments.model';

describe('EnvironmentsAddMachineDialogComponent', () => {
    let dialogRef: jasmine.SpyObj<MatDialogRef<EnvironmentsAddMachineDialogComponent>>;
    let environmentsService: jasmine.SpyObj<EnvironmentsService>;
    const types: CatalogDeviceType[] = [
        { id: 't1', name: 'Press', services: [{ id: 's1', name: 'Power', direction: 'sensor' }] },
    ];

    beforeEach(() => {
        dialogRef = jasmine.createSpyObj<MatDialogRef<EnvironmentsAddMachineDialogComponent>>('MatDialogRef', ['close']);
        environmentsService = jasmine.createSpyObj<EnvironmentsService>('EnvironmentsService', ['listDeviceTypes']);
        environmentsService.listDeviceTypes.and.returnValue(of(types));
    });

    function build(): EnvironmentsAddMachineDialogComponent {
        const component = new EnvironmentsAddMachineDialogComponent(dialogRef, environmentsService);
        component.ngOnInit();
        return component;
    }

    it('loads the device type catalog on init', () => {
        const component = build();
        expect(component.deviceTypes).toEqual(types);
        expect(component.dataReady).toBe(true);
    });

    it('does not close with a result when name or device type is missing', () => {
        const component = build();
        component.name = '';
        component.deviceType = types[0];
        component.create();
        component.name = 'Press 1';
        component.deviceType = null;
        component.create();
        expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('closes with the chosen name and device type', () => {
        const component = build();
        component.name = 'Press 1';
        component.deviceType = types[0];
        component.create();
        expect(dialogRef.close).toHaveBeenCalledWith({ name: 'Press 1', deviceType: types[0] });
    });

    it('closes with nothing on cancel', () => {
        const component = build();
        component.cancel();
        expect(dialogRef.close).toHaveBeenCalledWith();
    });

    it('treats two device types with the same id as equal, e.g. across a reload', () => {
        const component = build();
        expect(component.compareDeviceTypes({ id: 't1', name: 'a' }, { id: 't1', name: 'b' })).toBe(true);
        expect(component.compareDeviceTypes({ id: 't1' }, { id: 't2' })).toBe(false);
    });
});
