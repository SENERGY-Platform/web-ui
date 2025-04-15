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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DeviceInstancesComponent } from './device-instances.component';
import { MatDialogModule } from '@angular/material/dialog';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { KeycloakService } from 'keycloak-angular';
import { MockKeycloakService } from '../../../core/services/keycloak.mock';
import { CoreModule } from '../../../core/core.module';
import { MatTabsModule } from '@angular/material/tabs';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { DevicesModule } from '../devices.module';
import { Router } from '@angular/router';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { DeviceInstancesService } from './shared/device-instances.service';
import { of } from 'rxjs';
import { DeviceTypeService } from '../../metadata/device-types-overview/shared/device-type.service';
import { ExportDataService } from 'src/app/widgets/shared/export-data.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('DeviceInstancesComponent', () => {
    let component: DeviceInstancesComponent;
    let fixture: ComponentFixture<DeviceInstancesComponent>;
    const deviceInstanceServiceSpy: Spy<DeviceInstancesService> = createSpyFromClass(DeviceInstancesService);
    deviceInstanceServiceSpy.userHasUpdateAuthorization.and.returnValue(true);
    deviceInstanceServiceSpy.userHasDeleteAuthorization.and.returnValue(true);
    deviceInstanceServiceSpy.userHasReadAuthorization.and.returnValue(true);
    deviceInstanceServiceSpy.userHasCreateAuthorization.and.returnValue(true);
    deviceInstanceServiceSpy.listUsedDeviceTypeIds.and.returnValue(of());
    const deviceTypeServiceSpy: Spy<DeviceTypeService> = createSpyFromClass(DeviceTypeService);
    deviceTypeServiceSpy.userHasListAuthorization.and.returnValue(true);

    const exportDataServiceSpy: Spy<ExportDataService> = createSpyFromClass(ExportDataService);
    exportDataServiceSpy.userHasUsageAuthroization.and.returnValue(false);

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    declarations: [DeviceInstancesComponent],
    imports: [MatDialogModule,
        MatSnackBarModule,
        CoreModule,
        MatTabsModule,
        InfiniteScrollModule,
        DevicesModule],
    providers: [
        { provide: KeycloakService, useClass: MockKeycloakService },
        { provide: Router, useClass: RouterStub },
        { provide: DeviceInstancesService, useValue: deviceInstanceServiceSpy },
        { provide: DeviceTypeService, useValue: deviceTypeServiceSpy },
        { provide: ExportDataService, useValue: exportDataServiceSpy },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
}).compileComponents();
        }),
    );

    beforeEach(() => {
        fixture = TestBed.createComponent(DeviceInstancesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

class RouterStub {
    getCurrentNavigation() {
        return {
            extras: {
                state: {
                    locationId: 'someId',
                    locationName: 'someName',
                },
            },
        };
    }
}
