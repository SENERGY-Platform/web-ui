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

import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BehaviorSubject, of } from 'rxjs';

import { NotificationsComponent } from './notifications.component';
import { NotificationService } from './shared/notification.service';
import { NotificationModel } from './shared/notification.model';
import { DialogsService } from '../../services/dialogs.service';
import { PreferencesService } from '../../services/preferences.service';
import { SearchbarService } from '../searchbar/shared/searchbar.service';
import { UrlStateService } from '../../services/url-state.service';

describe('NotificationsComponent list', () => {
    let fixture: ComponentFixture<NotificationsComponent>;
    let router: jasmine.SpyObj<Router>;

    const incident = { _id: 'a', isRead: false, title: 'Incident in process', message: 'it broke', topic: 'incident', created_at: new Date(2000) } as unknown as NotificationModel;
    const plain = { _id: 'b', isRead: true, title: 'Hello', message: 'just so', topic: 'developer', created_at: new Date(1000) } as unknown as NotificationModel;

    function init() {
        router = jasmine.createSpyObj<Router>('Router', ['navigate']);
        const service = jasmine.createSpyObj<NotificationService>('NotificationService', ['getNotifications', 'openDialog', 'updateNotification', 'deleteNotification', 'deleteNotifications']);
        service.getNotifications.and.returnValue(of([incident, plain]));
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, MatDialogModule, MatSnackBarModule, NotificationsComponent],
            providers: [
                { provide: NotificationService, useValue: service },
                { provide: DialogsService, useValue: {} },
                { provide: Router, useValue: router },
                // the router is a stub, so the URL state is one as well
                { provide: UrlStateService, useValue: { get: () => null, getPage: () => 0, set: () => undefined, setPage: () => undefined } },
                { provide: SearchbarService, useValue: { currentSearchText: new BehaviorSubject(''), changeMessage: () => undefined } },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(NotificationsComponent);
        fixture.detectChanges();
        tick(400);
        fixture.detectChanges();
    }

    const rows = () => Array.from(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row, tr[mat-row]')) as HTMLElement[];

    it('has no refresh button because the list is live', fakeAsync(() => {
        init();

        expect(fixture.nativeElement.querySelector('senergy-searchbar button')).toBeNull();
    }));

    it('offers settings, mark all as read and delete all in the page header', fakeAsync(() => {
        init();

        const labels = Array.from(fixture.nativeElement.querySelectorAll('senergy-page-header button')).map((b) => (b as HTMLElement).textContent!.trim());
        expect(labels.join('|')).toContain('Settings');
        expect(labels.join('|')).toContain('Mark all as read');
        expect(labels.join('|')).toContain('Delete all');
    }));

    it('marks unread notifications and shows the topic as a chip', fakeAsync(() => {
        init();

        const [first, second] = rows();
        expect(first.querySelector('.unread-dot')).not.toBeNull();
        expect(second.querySelector('.unread-dot')).toBeNull();
        expect(first.querySelector('.type-chip')?.textContent).toContain('Incidents');
    }));

    it('opens the notification action on a row click and ignores rows without one', fakeAsync(() => {
        init();

        const [first, second] = rows();
        second.click();
        expect(router.navigate).not.toHaveBeenCalled();
        expect(second.classList).not.toContain('clickable-row');

        first.click();
        expect(router.navigate).toHaveBeenCalledWith(['/processes/monitor']);
    }));

    it('uses one action column instead of one column per action', fakeAsync(() => {
        init();

        expect(fixture.componentInstance.displayedColumns).toEqual(['select', 'title', 'topic', 'created_at', 'actions']);
    }));
});
