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

import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatInputModule } from '@angular/material/input';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { DashboardService } from './shared/dashboard.service';
import { DashboardComponent } from './dashboard.component';
import { CoreModule } from '../../core/core.module';
import { ResponsiveService } from '../../core/services/responsive.service';
import { DeviceStatusService } from '../../widgets/device-status/shared/device-status.service';
import { DashboardModel } from './shared/dashboard.model';
import { DashboardManipulationModel } from './shared/dashboard-manipulation.model';
import { DashboardWidgetManipulationModel } from './shared/dashboard-widget-manipulation.model';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { GridsterModule } from 'angular-gridster2';
import { MatButtonModule } from '@angular/material/button';

describe('DashboardComponent', () => {
    let component: DashboardComponent;
    let fixture: ComponentFixture<DashboardComponent>;

    const responsiveServiceSpy: Spy<ResponsiveService> = createSpyFromClass<ResponsiveService>(ResponsiveService);
    const dashboardServiceSpy: Spy<DashboardService> = createSpyFromClass<DashboardService>(DashboardService, {
        observablePropsToSpyOn: ['dashboardObservable', 'dashboardWidgetObservable']
    });
    dashboardServiceSpy.userHasCreateDashboardAuthorization.and.returnValue(of(true))
    dashboardServiceSpy.userHasUpdateDashboardAuthorization.and.returnValue(of(true))
    dashboardServiceSpy.userHasDeleteDashboardAuthorization.and.returnValue(of(true))
    const deviceStatusServiceSpy: Spy<DeviceStatusService> = createSpyFromClass<DeviceStatusService>(DeviceStatusService);

    beforeEach(
        waitForAsync(() => {
            responsiveServiceSpy.observeMqAlias.and.nextOneTimeWith('md');
            dashboardServiceSpy.getDashboards.and.nextOneTimeWith([
                {
                    id: 'dashboard-1',
                    name: 'test-dashboard',
                },
            ] as DashboardModel[]);

            TestBed.configureTestingModule({
                imports: [
                    CoreModule,
                    RouterTestingModule,
                    HttpClientTestingModule,
                    MatSnackBarModule,
                    MatDialogModule,
                    MatIconModule,
                    MatExpansionModule,
                    MatInputModule,
                    MatMenuModule,
                    ReactiveFormsModule,
                    MatTabsModule,
                    MatDividerModule,
                    GridsterModule,
                    MatButtonModule,
                ],
                declarations: [DashboardComponent],
                providers: [
                    { provide: DashboardService, useValue: dashboardServiceSpy },
                    { provide: ResponsiveService, useValue: responsiveServiceSpy },
                    { provide: DeviceStatusService, useValue: deviceStatusServiceSpy },
                ],
            }).compileComponents();
            fixture = TestBed.createComponent(DashboardComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
        }),
    );

    it(
        'should create the app',
        waitForAsync(() => {
            expect(component).toBeTruthy();
        }),
    );

    it(
        'should toggle dragMode',
        waitForAsync(() => {
            component.toggleDragMode();
            expect(component.inDragMode).toBeTrue();
            component.toggleDragMode();
            expect(component.inDragMode).toBeFalse();
        }),
    );
});
