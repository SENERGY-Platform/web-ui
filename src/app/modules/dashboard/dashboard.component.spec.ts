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
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { of } from 'rxjs';
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
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { GridsterModule } from 'angular-gridster2';
import { MatButtonModule } from '@angular/material/button';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

describe('DashboardComponent', () => {
    let component: DashboardComponent;
    let fixture: ComponentFixture<DashboardComponent>;

    // the spies are rebuilt per test on purpose: each one holds a single ReplaySubject that
    // nextOneTimeWith completes, so a spy kept across tests replays the first test's value to all the
    // others - which handed every component the same dashboard object to mutate
    let responsiveServiceSpy: Spy<ResponsiveService>;
    let dashboardServiceSpy: Spy<DashboardService>;
    let deviceStatusServiceSpy: Spy<DeviceStatusService>;

    beforeEach(
        waitForAsync(() => {
            responsiveServiceSpy = createSpyFromClass<ResponsiveService>(ResponsiveService);
            dashboardServiceSpy = createSpyFromClass<DashboardService>(DashboardService, {
                observablePropsToSpyOn: ['dashboardObservable', 'dashboardWidgetObservable']
            });
            dashboardServiceSpy.userHasCreateDashboardAuthorization.and.returnValue(of(true));
            dashboardServiceSpy.userHasUpdateDashboardAuthorization.and.returnValue(of(true));
            dashboardServiceSpy.userHasDeleteDashboardAuthorization.and.returnValue(of(true));
            deviceStatusServiceSpy = createSpyFromClass<DeviceStatusService>(DeviceStatusService);

            responsiveServiceSpy.observeMqAlias.and.nextOneTimeWith('md');
            dashboardServiceSpy.getDashboards.and.nextOneTimeWith([
                {
                    id: 'dashboard-1',
                    name: 'test-dashboard',
                    widgets: [{ id: 'widget-1', x: 0, y: 0, w: 1, h: 1 }, { id: 'widget-2', x: 1, y: 0, w: 1, h: 1 }],
                },
                {
                    id: 'dashboard-2',
                    name: 'other-dashboard',
                    widgets: [{ id: 'widget-3', x: 0, y: 0, w: 1, h: 1 }],
                },
            ] as DashboardModel[]);

            TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    declarations: [DashboardComponent],
    imports: [CoreModule,
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
        NoopAnimationsModule,
        MatButtonModule],
    providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: dashboardServiceSpy },
        { provide: ResponsiveService, useValue: responsiveServiceSpy },
        { provide: DeviceStatusService, useValue: deviceStatusServiceSpy },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
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

    describe('moving a widget to another dashboard', () => {
        const widgetIds = (dashboard: DashboardModel) => dashboard.widgets.map((widget) => widget.id);

        it('takes the widget off the dashboard it came from', () => {
            dashboardServiceSpy.updateWidgetPosition.and.nextOneTimeWith({ message: 'ok' });
            component.moveWidgetToDashboard('gridstack-item-widget-2', 1).subscribe();
            expect(widgetIds(component.dashboards[0])).toEqual(['widget-1']);
        });

        it('puts the widget on the dashboard it was dropped on', () => {
            dashboardServiceSpy.updateWidgetPosition.and.nextOneTimeWith({ message: 'ok' });
            component.moveWidgetToDashboard('gridstack-item-widget-2', 1).subscribe();
            expect(widgetIds(component.dashboards[1])).toEqual(['widget-3', 'widget-2']);
        });

        it('puts the widget above everything already on that dashboard, not below it', () => {
            dashboardServiceSpy.updateWidgetPosition.and.nextOneTimeWith({ message: 'ok' });
            component.dashboards[1].widgets = [
                { id: 'widget-3', x: 0, y: 0, w: 2, h: 2 },
                { id: 'widget-4', x: 0, y: 2, w: 1, h: 3 },
            ] as any;
            component.moveWidgetToDashboard('widget-2', 1).subscribe();
            const moved = component.dashboards[1].widgets.find((widget) => widget.id === 'widget-2');
            // the grid pushes it down onto the first free spot from here - anything below the widgets
            // already there is off the bottom of the page on a dashboard of any size
            expect(moved?.x).toBe(0);
            expect(moved?.y).toBe(0);
        });

        it('sends the position it was given, not the one it came from', () => {
            dashboardServiceSpy.updateWidgetPosition.and.nextOneTimeWith({ message: 'ok' });
            component.moveWidgetToDashboard('widget-2', 1).subscribe();
            const [updates] = dashboardServiceSpy.updateWidgetPosition.calls.mostRecent().args;
            expect(updates[0].x).toBe(0);
            expect(updates[0].y).toBe(0);
        });

        it('tells the service which dashboard the widget came from and went to', () => {
            dashboardServiceSpy.updateWidgetPosition.and.nextOneTimeWith({ message: 'ok' });
            component.moveWidgetToDashboard('widget-2', 1).subscribe();
            const [updates] = dashboardServiceSpy.updateWidgetPosition.calls.mostRecent().args;
            expect(updates.length).toBe(1);
            expect(updates[0].id).toBe('widget-2');
            expect(updates[0].dashboardOrigin).toBe('dashboard-1');
            expect(updates[0].dashboardDestination).toBe('dashboard-2');
        });

        it('leaves both dashboards alone when the target index is the dashboard already shown', () => {
            component.moveWidgetToDashboard('widget-2', 0).subscribe();
            expect(widgetIds(component.dashboards[0])).toEqual(['widget-1', 'widget-2']);
            expect(widgetIds(component.dashboards[1])).toEqual(['widget-3']);
        });

        it('leaves both dashboards alone when the target index does not exist', () => {
            component.moveWidgetToDashboard('widget-2', 7).subscribe();
            expect(widgetIds(component.dashboards[0])).toEqual(['widget-1', 'widget-2']);
            expect(widgetIds(component.dashboards[1])).toEqual(['widget-3']);
        });
    });
});
