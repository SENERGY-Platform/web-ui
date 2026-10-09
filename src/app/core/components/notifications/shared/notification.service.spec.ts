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
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { NotificationService } from './notification.service';
import { NotificationBrokerModel, NotificationModel } from './notification.model';
import { AuthorizationService } from '../../../services/authorization.service';
import { LadonService } from 'src/app/modules/admin/permissions/shared/services/ladom.service';
import { environment } from '../../../../../environments/environment';

describe('NotificationService write calls', () => {
    let service: NotificationService;
    let http: HttpTestingController;
    let snackBar: jasmine.SpyObj<MatSnackBar>;

    const notification = { _id: 'n1', isRead: false, message: 'm', title: 't', userId: 'u', created_at: new Date() } as unknown as NotificationModel;
    const broker = { id: 'b1' } as NotificationBrokerModel;
    const url = (path: string) => environment.notificationsUrl + path;

    beforeEach(() => {
        // the websocket is not part of these tests
        spyOn(NotificationService.prototype as any, 'initWs');
        spyOn(console, 'error');
        snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: MatSnackBar, useValue: snackBar },
                { provide: MatDialog, useValue: {} },
                { provide: AuthorizationService, useValue: {} },
                { provide: LadonService, useValue: { getUserAuthorizationsForURI: () => ({ GET: true }) } },
            ],
        });
        service = TestBed.inject(NotificationService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    const calls: { name: string; path: string; method: string; call: () => Observable<boolean> }[] = [
        { name: 'deleteNotification', path: '/notifications/n1', method: 'DELETE', call: () => service.deleteNotification(notification) },
        { name: 'deleteNotifications', path: '/notifications', method: 'DELETE', call: () => service.deleteNotifications(['n1']) },
        { name: 'updateNotification', path: '/notifications/n1', method: 'POST', call: () => service.updateNotification(notification) },
        { name: 'createBroker', path: '/brokers', method: 'POST', call: () => service.createBroker(broker) },
        { name: 'updateBroker', path: '/brokers/b1', method: 'PUT', call: () => service.updateBroker(broker) },
        { name: 'deleteBroker', path: '/brokers/b1', method: 'DELETE', call: () => service.deleteBroker('b1') },
        { name: 'updatePlatformBrokerConfig', path: '/platform-broker', method: 'PUT', call: () => service.updatePlatformBrokerConfig({ enabled: true }) },
    ];

    for (const c of calls) {
        it(c.name + ' answers false and names the backend when the request fails', () => {
            let result: boolean | undefined;
            c.call().subscribe((r) => result = r);
            http.expectOne((r) => r.method === c.method && r.url === url(c.path))
                .flush('boom', { status: 500, statusText: 'Internal Server Error' });

            expect(result).toBeFalse();
            expect(snackBar.open.calls.mostRecent().args[0]).toContain('request failed (500)');
        });

        it(c.name + ' answers true without a snack bar when the request succeeds', () => {
            let result: boolean | undefined;
            c.call().subscribe((r) => result = r);
            http.expectOne((r) => r.method === c.method && r.url === url(c.path)).flush(null);

            expect(result).toBeTrue();
            expect(snackBar.open).not.toHaveBeenCalled();
        });
    }
});
