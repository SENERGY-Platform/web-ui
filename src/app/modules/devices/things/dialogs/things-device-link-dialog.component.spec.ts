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
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ThingsDeviceLinkDialogComponent } from './things-device-link-dialog.component';
import { DeviceTypeService } from '../../../metadata/device-types-overview/shared/device-type.service';
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
                    { id: 'd1', name: 'raw-1', display_name: 'Meter one', device_type_id: 'dt1' },
                    { id: 'd2', name: 'raw-2', display_name: '', device_type_id: 'dt1' },
                ],
                total: 2,
            }),
        );
        const deviceTypeService = jasmine.createSpyObj('DeviceTypeService', ['getDeviceType', 'getValuePathsAndContentVariables']);
        deviceTypeService.getDeviceType.and.returnValue(of(null));
        await TestBed.configureTestingModule({
            imports: [ThingsDeviceLinkDialogComponent, NoopAnimationsModule],
            providers: [
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: DeviceInstancesService, useValue: deviceInstancesService },
                { provide: DeviceTypeService, useValue: deviceTypeService },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(ThingsDeviceLinkDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('lists the devices with display name or name', () => {
        expect(component.devices).toEqual([
            { id: 'd1', label: 'Meter one', deviceTypeId: 'dt1' },
            { id: 'd2', label: 'raw-2', deviceTypeId: 'dt1' },
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

describe('ThingsDeviceLinkDialogComponent for a meter', () => {
    let component: ThingsDeviceLinkDialogComponent;
    let fixture: ComponentFixture<ThingsDeviceLinkDialogComponent>;
    let dialogRef: jasmine.SpyObj<MatDialogRef<ThingsDeviceLinkDialogComponent>>;
    const energy = 'urn:infai:ses:measuring-function:474471c3-e401-4b54-8963-53739a3b1de4';

    beforeEach(async () => {
        dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
        const deviceInstancesService = jasmine.createSpyObj('DeviceInstancesService', ['getDeviceInstances']);
        deviceInstancesService.getDeviceInstances.and.returnValue(
            of({ result: [{ id: 'd1', name: 'raw-1', display_name: 'Meter one', device_type_id: 'dt1' }], total: 1 }),
        );
        const deviceTypeService = jasmine.createSpyObj('DeviceTypeService', ['getDeviceType', 'getValuePathsAndContentVariables']);
        deviceTypeService.getDeviceType.and.returnValue(
            of({ id: 'dt1', services: [{ id: 's1', name: 'Meter', outputs: [{ content_variable: {} }] }] }),
        );
        deviceTypeService.getValuePathsAndContentVariables.and.returnValue([
            { path: 'metrics.energy', contentVariable: { function_id: energy } },
            { path: 'metrics.voltage', contentVariable: { function_id: 'urn:infai:ses:measuring-function:voltage' } },
        ]);
        await TestBed.configureTestingModule({
            imports: [ThingsDeviceLinkDialogComponent, NoopAnimationsModule],
            providers: [
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { meter: true } },
                { provide: DeviceInstancesService, useValue: deviceInstancesService },
                { provide: DeviceTypeService, useValue: deviceTypeService },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(ThingsDeviceLinkDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        component.form.patchValue({ device_id: 'd1' });
        fixture.detectChanges();
    });

    it('offers a reading row per energy column of the device and no other column', () => {
        expect(component.columnsKnown).toBeTrue();
        expect(component.rows.map((r) => r.column)).toEqual(['metrics.energy']);
        expect(fixture.nativeElement.textContent).toContain('Meter: metrics.energy');
    });

    it('sends readings and factor of a meter link', () => {
        component.rows[0].from = '1234,5';
        component.factor = '40';
        component.save();
        expect(dialogRef.close).toHaveBeenCalledOnceWith({
            device_id: 'd1',
            readings: [{ service_id: 's1', column: 'metrics.energy', from_value: 1234.5 }],
            factor: 40,
        });
    });

    it('drops a row without a reading and sends no factor when empty', () => {
        component.save();
        expect(dialogRef.close).toHaveBeenCalledOnceWith({ device_id: 'd1' });
    });

    it('refuses a reading that is not a number and a factor of 0', () => {
        component.rows[0].from = 'abc';
        component.save();
        expect(component.meterError()).toContain('numbers');
        component.rows[0].from = '1';
        component.factor = '0';
        component.save();
        expect(component.meterError()).toContain('greater than 0');
        expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('falls back to entering service and column by hand when no energy column is found', () => {
        const typeService = TestBed.inject(DeviceTypeService) as jasmine.SpyObj<DeviceTypeService>;
        typeService.getValuePathsAndContentVariables.and.returnValue([]);
        component.form.patchValue({ device_id: null });
        component.form.patchValue({ device_id: 'd1' });
        expect(component.columnsKnown).toBeFalse();
        expect(component.rows.length).toBe(1);
        component.rows[0] = { service_id: 's9', column: 'x', from: '5', until: '' };
        component.save();
        expect(dialogRef.close).toHaveBeenCalledOnceWith({
            device_id: 'd1',
            readings: [{ service_id: 's9', column: 'x', from_value: 5 }],
        });
    });
});
