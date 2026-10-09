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


import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { NotificationsComponent } from './notifications.component';
import { NotificationService } from './shared/notification.service';
import { NotificationModel } from './shared/notification.model';
import { DialogsService } from '../../services/dialogs.service';
import { PreferencesService } from '../../services/preferences.service';
import { SearchbarService } from '../searchbar/shared/searchbar.service';

describe('NotificationsComponent write failures', () => {
    let component: NotificationsComponent;
    let service: jasmine.SpyObj<NotificationService>;
    let snackBar: jasmine.SpyObj<MatSnackBar>;
    let notifications: NotificationModel[];

    const snackText = () => snackBar.open.calls.mostRecent().args[0];

    beforeEach(() => {
        notifications = [
            { _id: 'a', isRead: false, title: 'A', message: 'a', created_at: new Date(1) } as unknown as NotificationModel,
            { _id: 'b', isRead: true, title: 'B', message: 'b', created_at: new Date(2) } as unknown as NotificationModel,
        ];
        service = jasmine.createSpyObj<NotificationService>('NotificationService', [
            'getNotifications', 'updateNotification', 'deleteNotification', 'deleteNotifications',
        ]);
        service.getNotifications.and.returnValue(of(notifications));
        snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
        const dialogs = jasmine.createSpyObj<DialogsService>('DialogsService', ['openDeleteDialog']);
        dialogs.openDeleteDialog.and.returnValue({ afterClosed: () => of(true) } as any);

        TestBed.configureTestingModule({
            imports: [NotificationsComponent],
            schemas: [NO_ERRORS_SCHEMA],
            providers: [
                { provide: NotificationService, useValue: service },
                { provide: DialogsService, useValue: dialogs },
                { provide: SearchbarService, useValue: { currentSearchText: new BehaviorSubject(''), changeMessage: () => undefined } },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: MatDialog, useValue: {} },
                { provide: Router, useValue: {} },
                { provide: MatSnackBar, useValue: snackBar },
            ],
        });
        component = TestBed.createComponent(NotificationsComponent).componentInstance;
        component.ngOnInit();
    });

    it('restores the read state and reports when marking a notification fails', () => {
        service.updateNotification.and.returnValue(of(false));
        const n = component.notifications.find((x) => x._id === 'a')!;

        component.toggleReadStatus(n);

        expect(n.isRead).toBeFalse();
        expect(snackText()).toContain('Could not mark the notification as read');
    });

    it('keeps the new read state when marking a notification succeeds', () => {
        service.updateNotification.and.returnValue(of(true));
        const n = component.notifications.find((x) => x._id === 'a')!;

        component.toggleReadStatus(n);

        expect(n.isRead).toBeTrue();
        expect(snackBar.open).not.toHaveBeenCalled();
    });

    it('restores the read state and reports when marking all as read fails', () => {
        service.updateNotification.and.returnValue(of(false));

        component.markAllRead();

        expect(component.notifications.find((x) => x._id === 'a')!.isRead).toBeFalse();
        expect(snackText()).toContain('Could not mark all notifications as read');
    });

    it('keeps the selection and reports when deleting a notification fails', () => {
        service.deleteNotification.and.returnValue(of(false));
        const n = component.notifications[0];
        component.selection.select(n);

        component.deleteNotification(n);

        expect(component.selection.isSelected(n)).toBeTrue();
        expect(snackText()).toContain('Could not delete the notification');
    });

    it('deselects after a successful delete', () => {
        service.deleteNotification.and.returnValue(of(true));
        const n = component.notifications[0];
        component.selection.select(n);

        component.deleteNotification(n);

        expect(component.selection.isSelected(n)).toBeFalse();
        expect(snackBar.open).not.toHaveBeenCalled();
    });

    it('keeps the selection and reports when deleting the selected notifications fails', () => {
        service.deleteNotifications.and.returnValue(of(false));
        component.selection.select(component.notifications[0]);

        component.deleteSelectedNotifications();

        expect(component.selection.selected.length).toBe(1);
        expect(snackText()).toContain('Could not delete the selected notifications');
    });

    it('keeps the selection and reports when deleting all notifications fails', () => {
        service.deleteNotifications.and.returnValue(of(false));
        component.selection.select(component.notifications[0]);

        component.deleteAll();

        expect(component.selection.selected.length).toBe(1);
        expect(snackText()).toContain('Could not delete all notifications');
    });

    it('clears the selection after deleting all notifications succeeds', () => {
        service.deleteNotifications.and.returnValue(of(true));
        component.selection.select(component.notifications[0]);

        component.deleteAll();

        expect(component.selection.selected.length).toBe(0);
    });
});
