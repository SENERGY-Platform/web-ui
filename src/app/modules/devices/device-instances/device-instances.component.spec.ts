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
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { KeycloakService } from 'keycloak-angular';
import { MockKeycloakService } from '../../../core/services/keycloak.mock';
import { CoreModule } from '../../../core/core.module';
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { DevicesModule } from '../devices.module';
import { Router } from '@angular/router';

describe('DeviceInstancesComponent', () => {
    let component: DeviceInstancesComponent;
    let fixture: ComponentFixture<DeviceInstancesComponent>;

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                imports: [
                    MatDialogModule,
                    HttpClientTestingModule,
                    MatSnackBarModule,
                    CoreModule,
                    MatTabsModule,
                    InfiniteScrollModule,
                    DevicesModule,
                ],
                declarations: [DeviceInstancesComponent],
                providers: [
                    { provide: KeycloakService, useClass: MockKeycloakService },
                    { provide: Router, useClass: RouterStub },
                ],
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
