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
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMPTY, of } from 'rxjs';

import { DashboardService } from './dashboard.service';
import { DashboardManipulationModel } from './dashboard-manipulation.model';
import { DashboardWidgetManipulationModel } from './dashboard-widget-manipulation.model';
import { DashboardManipulationEnum } from './dashboard-manipulation.enum';
import { DashboardModel } from './dashboard.model';
import { WidgetModel } from './dashboard-widget.model';
import { DialogsService } from '../../../core/services/dialogs.service';
import { LadonService } from '../../admin/permissions/shared/services/ladom.service';

describe('DashboardService write failures', () => {
    let service: DashboardService;
    let http: HttpTestingController;
    let snackOpen: jasmine.Spy;
    let dialogResult: unknown;
    let dashboardEvents: DashboardManipulationModel[];
    let widgetEvents: DashboardWidgetManipulationModel[];

    const lastSnack = () => snackOpen.calls.mostRecent().args[0] as string;
    const failNext = (method: string, urlPart: string) =>
        http.expectOne((r) => r.method === method && r.url.includes(urlPart)).flush('down', { status: 500, statusText: 'Server Error' });
    const succeedNext = (method: string, urlPart: string, body: object) =>
        http.expectOne((r) => r.method === method && r.url.includes(urlPart)).flush(body);

    beforeEach(() => {
        dialogResult = undefined;
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr(), withInterceptorsFromDi()),
                provideHttpClientTesting(),
                { provide: LadonService, useValue: { getUserAuthorizationsForURI: () => ({}) } },
                { provide: MatSnackBar, useValue: { open: (snackOpen = jasmine.createSpy('open').and.returnValue({ afterDismissed: () => EMPTY })) } },
                { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(dialogResult) }) } },
                { provide: DialogsService, useValue: { openDeleteDialog: () => ({ afterClosed: () => of(true) }) } },
            ],
        });
        service = TestBed.inject(DashboardService);
        http = TestBed.inject(HttpTestingController);
        dashboardEvents = [];
        widgetEvents = [];
        service.dashboardObservable.subscribe((e) => dashboardEvents.push(e));
        service.dashboardWidgetObservable.subscribe((e) => widgetEvents.push(e));
        spyOn(console, 'error');
    });

    afterEach(() => http.verify());

    describe('REST methods answer null on failure', () => {
        it('createDashboard', () => {
            let result: DashboardModel | null | undefined;
            service.createDashboard('d', 0).subscribe((r) => (result = r));
            failNext('POST', '/dashboards');
            expect(result).toBeNull();
        });

        it('updateDashboard', () => {
            let result: DashboardModel | null | undefined;
            service.updateDashboard({ id: 'd1' } as DashboardModel).subscribe((r) => (result = r));
            failNext('PUT', '/dashboards/d1');
            expect(result).toBeNull();
        });

        it('deleteDashboard', () => {
            let result: unknown = 'unset';
            service.deleteDashboard('d1').subscribe((r) => (result = r));
            failNext('DELETE', '/dashboards/d1');
            expect(result).toBeNull();
        });

        it('createWidget', () => {
            let result: WidgetModel | null | undefined;
            service.createWidget('d1', {} as WidgetModel).subscribe((r) => (result = r));
            failNext('POST', '/widgets/d1');
            expect(result).toBeNull();
        });

        it('deleteWidget', () => {
            let result: unknown = 'unset';
            service.deleteWidget('d1', 'w1').subscribe((r) => (result = r));
            failNext('DELETE', '/widgets/d1/w1');
            expect(result).toBeNull();
        });

        it('updateWidgetPosition', () => {
            let result: unknown = 'unset';
            service.updateWidgetPosition([]).subscribe((r) => (result = r));
            failNext('PATCH', '/widgets/positions');
            expect(result).toBeNull();
        });

        it('updateWidgetProperty and updateWidgetName keep the message shape saveWidgetEdits reads', () => {
            const results: unknown[] = [];
            service.updateWidgetProperty('d1', 'w1', [], {}).subscribe((r) => results.push(r));
            failNext('PATCH', '/widgets/properties/d1/w1');
            service.updateWidgetName('d1', 'w1', 'n').subscribe((r) => results.push(r));
            failNext('PATCH', '/widgets/name/d1/w1');
            expect(results).toEqual([{ message: 'error update' }, { message: 'error update' }]);
        });
    });

    describe('dialog flows', () => {
        it('a failed create does not add the dashboard and names the action', () => {
            dialogResult = 'new';
            service.openNewDashboardDialog(0);
            failNext('POST', '/dashboards');
            expect(dashboardEvents).toEqual([]);
            expect(lastSnack()).toContain('Dashboard could not be created');
        });

        it('a successful create adds the dashboard', () => {
            dialogResult = 'new';
            service.openNewDashboardDialog(0);
            succeedNext('POST', '/dashboards', { id: 'd9', name: 'new' });
            expect(dashboardEvents.length).toBe(1);
            expect(dashboardEvents[0].manipulation).toBe(DashboardManipulationEnum.Create);
            expect(dashboardEvents[0].dashboardId).toBe('d9');
        });

        it('a failed delete keeps the dashboard and names the action', () => {
            service.openDeleteDashboardDialog('d1');
            failNext('DELETE', '/dashboards/d1');
            expect(dashboardEvents).toEqual([]);
            expect(lastSnack()).toContain('Dashboard could not be deleted');
        });

        it('a successful delete removes the dashboard', () => {
            service.openDeleteDashboardDialog('d1');
            succeedNext('DELETE', '/dashboards/d1', { message: 'OK' });
            expect(dashboardEvents.map((e) => e.manipulation)).toEqual([DashboardManipulationEnum.Delete]);
        });

        it('a failed edit keeps the dashboard and names the action', () => {
            dialogResult = { id: 'd1', name: 'edited' };
            service.openEditDashboardDialog({ id: 'd1', name: 'old' } as DashboardModel);
            failNext('PUT', '/dashboards/d1');
            expect(dashboardEvents).toEqual([]);
            expect(lastSnack()).toContain('Dashboard could not be updated');
        });

        it('a successful edit updates the dashboard', () => {
            dialogResult = { id: 'd1', name: 'edited' };
            service.openEditDashboardDialog({ id: 'd1', name: 'old' } as DashboardModel);
            succeedNext('PUT', '/dashboards/d1', { id: 'd1', name: 'edited' });
            expect(dashboardEvents.map((e) => e.manipulation)).toEqual([DashboardManipulationEnum.Update]);
        });

        it('a failed widget create adds no widget and names the action', () => {
            dialogResult = { name: 'w' };
            service.openNewWidgetDialog('d1');
            failNext('POST', '/widgets/d1');
            expect(widgetEvents).toEqual([]);
            expect(lastSnack()).toContain('Widget could not be created');
        });

        it('a successful widget create adds the widget', () => {
            dialogResult = { name: 'w' };
            service.openNewWidgetDialog('d1');
            succeedNext('POST', '/widgets/d1', { id: 'w9', name: 'w' });
            expect(widgetEvents.map((e) => e.widgetId)).toEqual(['w9']);
        });
    });
});
