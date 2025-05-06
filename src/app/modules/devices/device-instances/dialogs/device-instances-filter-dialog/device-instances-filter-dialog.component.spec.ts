/*
 * Copyright 2025 InfAI (CC SES)
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

import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';
import { DeviceInstancesService } from '../../shared/device-instances.service';

import { DeviceInstancesFilterDialogComponent } from './device-instances-filter-dialog.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('DeviceInstancesFilterDialogComponent', () => {
    let component: DeviceInstancesFilterDialogComponent;
    let fixture: ComponentFixture<DeviceInstancesFilterDialogComponent>;
    const deviceInstanceServiceSpy: Spy<DeviceInstancesService> = createSpyFromClass(DeviceInstancesService);
    deviceInstanceServiceSpy.listUsedDeviceTypeIds.and.returnValue(of(['id']));
    const matDialogRefSpy: Spy<MatDialogRef<DeviceInstancesFilterDialogComponent>> =
  createSpyFromClass<MatDialogRef<DeviceInstancesFilterDialogComponent>>(MatDialogRef);

    beforeEach(async () => {
        await TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    declarations: [DeviceInstancesFilterDialogComponent],
    imports: [MatSnackBarModule, MatDialogModule],
    providers: [
        { provide: DeviceInstancesService, useValue: deviceInstanceServiceSpy },
        { provide: MatDialogRef, useValue: matDialogRefSpy },
        {
            provide: MAT_DIALOG_DATA,
            useValue: {},
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
})
            .compileComponents();

        fixture = TestBed.createComponent(DeviceInstancesFilterDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
