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

import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMPTY } from 'rxjs';
import { DialogsService } from '../../../core/services/dialogs.service';
import { LadonService } from '../../admin/permissions/shared/services/ladom.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService dashboard list cache', () => {
    let service: DashboardService;
    let http: HttpTestingController;

    const cacheKey = DashboardService.name + '/getDashboards';
    const lastModified = 'Tue, 13 Oct 2026 10:00:00 GMT';
    const epoch = new Date(0).toUTCString();
    const cache = (id: string) => sessionStorage.setItem(cacheKey, JSON.stringify({ dashboards: [{ id }], lastModified }));
    const nextGet = () => http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/dashboards'));

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
                { provide: LadonService, useValue: { getUserAuthorizationsForURI: () => ({}) } },
                { provide: MatSnackBar, useValue: { open: () => ({ afterDismissed: () => EMPTY }) } },
                { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => EMPTY }) } },
                { provide: DialogsService, useValue: { openDeleteDialog: () => ({ afterClosed: () => EMPTY }) } },
            ],
        });
        service = TestBed.inject(DashboardService);
        http = TestBed.inject(HttpTestingController);
        sessionStorage.removeItem(cacheKey);
    });

    afterEach(() => {
        http.verify();
        sessionStorage.removeItem(cacheKey);
    });

    it('forgets the cached list when a dashboard is deleted, which a 304 cannot tell', () => {
        cache('gone');
        service.deleteDashboard('gone').subscribe();
        http.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/dashboards/gone')).flush({ message: 'ok' });

        service.getDashboards().subscribe();
        const req = nextGet();
        expect(req.request.headers.get('If-Modified-Since')).toBe(epoch);
        req.flush([]);
    });

    it('forgets the cached list when a widget is deleted', () => {
        cache('dash');
        service.deleteWidget('dash', 'widget').subscribe();
        http.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/widgets/dash/widget')).flush({ message: 'ok' });

        service.getDashboards().subscribe();
        const req = nextGet();
        expect(req.request.headers.get('If-Modified-Since')).toBe(epoch);
        req.flush([]);
    });
});
