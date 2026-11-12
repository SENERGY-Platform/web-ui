/*
 * Copyright 2026 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ThingsDeviceLinkDialogComponent } from './things-device-link-dialog.component';
import { DeviceInstancesService } from '../../device-instances/shared/device-instances.service';
import { toRfc3339Seconds } from '../../../environments/shared/environments-datetime';

describe('ThingsDeviceLinkDialogComponent', () => {
    let component: ThingsDeviceLinkDialogComponent;
    let fixture: ComponentFixture<ThingsDeviceLinkDialogComponent>;
    let dialogRef: jasmine.SpyObj<MatDialogRef<ThingsDeviceLinkDialogComponent>>;

    beforeEach(async () => {
        dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
        const deviceInstancesService = jasmine.createSpyObj('DeviceInstancesService', ['getDeviceInstances']);
        deviceInstancesService.getDeviceInstances.and.returnValue(
            of({
                result: [
                    { id: 'd1', name: 'raw-1', display_name: 'Meter one' },
                    { id: 'd2', name: 'raw-2', display_name: '' },
                ],
                total: 2,
            }),
        );
        await TestBed.configureTestingModule({
            imports: [ThingsDeviceLinkDialogComponent, NoopAnimationsModule],
            providers: [
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: DeviceInstancesService, useValue: deviceInstancesService },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(ThingsDeviceLinkDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('lists the devices with display name or name', () => {
        expect(component.devices).toEqual([
            { id: 'd1', label: 'Meter one' },
            { id: 'd2', label: 'raw-2' },
        ]);
    });

    it('omits an empty from and until', () => {
        component.form.patchValue({ device_id: 'd1' });
        component.save();
        expect(dialogRef.close).toHaveBeenCalledOnceWith({ device_id: 'd1' });
    });

    it('sends from and until as RFC3339 when set', () => {
        component.form.patchValue({ device_id: 'd1', from: '2026-03-01T10:00:00', until: '2026-03-02T10:00:00' });
        component.save();
        expect(dialogRef.close).toHaveBeenCalledOnceWith({
            device_id: 'd1',
            from: toRfc3339Seconds('2026-03-01T10:00:00'),
            until: toRfc3339Seconds('2026-03-02T10:00:00'),
        });
    });

    it('needs a device', () => {
        component.save();
        expect(dialogRef.close).not.toHaveBeenCalled();
        expect(component.form.controls.device_id.hasError('required')).toBeTrue();
    });

    it('rejects an until that is not after from', () => {
        component.form.patchValue({ device_id: 'd1', from: '2026-03-01T10:00:00', until: '2026-03-01T10:00:00' });
        component.save();
        expect(component.form.controls.until.hasError('untilBeforeFrom')).toBeTrue();
        component.form.patchValue({ until: '2026-02-28T10:00:00' });
        component.save();
        expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('revalidates until when from changes', () => {
        component.form.patchValue({ device_id: 'd1', from: '2026-03-01T10:00:00', until: '2026-03-02T10:00:00' });
        expect(component.form.controls.until.valid).toBeTrue();
        component.form.patchValue({ from: '2026-03-03T10:00:00' });
        expect(component.form.controls.until.hasError('untilBeforeFrom')).toBeTrue();
    });

    it('closes with nothing on cancel', () => {
        component.close();
        expect(dialogRef.close).toHaveBeenCalledOnceWith();
    });
});
