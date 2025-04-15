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
