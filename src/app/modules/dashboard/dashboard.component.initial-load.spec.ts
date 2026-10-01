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

import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from './shared/dashboard.service';
import { DashboardModel } from './shared/dashboard.model';
import { CoreModule } from '../../core/core.module';
import { ResponsiveService } from '../../core/services/responsive.service';
import { DeviceStatusService } from '../../widgets/device-status/shared/device-status.service';

// Separate from dashboard.component.spec.ts: that one disables animations, and then Material
// simulates the tab transition and fires animationDone, which hides the missing first load.
describe('DashboardComponent first load with animations enabled', () => {
    let dashboardServiceSpy: Spy<DashboardService>;

    beforeEach(async () => {
        const responsiveServiceSpy = createSpyFromClass<ResponsiveService>(ResponsiveService);
        responsiveServiceSpy.observeMqAlias.and.nextOneTimeWith('md');
        dashboardServiceSpy = createSpyFromClass<DashboardService>(DashboardService, {
            observablePropsToSpyOn: ['dashboardObservable', 'dashboardWidgetObservable'],
        });
        dashboardServiceSpy.getDashboards.and.nextOneTimeWith([
            { id: 'dashboard-1', name: 'first', widgets: [] },
        ] as unknown as DashboardModel[]);

        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [DashboardComponent],
            imports: [CoreModule, MatTabsModule, MatDialogModule, MatSnackBarModule, MatMenuModule, MatIconModule, MatButtonModule, MatDividerModule],
            providers: [
                provideRouter([]),
                provideHttpClient(withXhr(), withInterceptorsFromDi()),
                provideHttpClientTesting(),
                { provide: DashboardService, useValue: dashboardServiceSpy },
                { provide: ResponsiveService, useValue: responsiveServiceSpy },
                { provide: DeviceStatusService, useValue: createSpyFromClass(DeviceStatusService) },
                { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: false } },
            ],
        }).compileComponents();
    });

    it('sends the widgets their load signal without waiting for a tab animation', async () => {
        const fixture = TestBed.createComponent(DashboardComponent);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(dashboardServiceSpy.reloadAllWidgets).toHaveBeenCalled();
    });
});
