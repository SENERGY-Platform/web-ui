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
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, of, throwError } from 'rxjs';

import { NotificationDialogComponent } from './notification-dialog.component';
import { AuthorizationService } from '../../../services/authorization.service';
import { PreferencesService } from '../../../services/preferences.service';
import type { NotificationService } from '../shared/notification.service';
import {
    NotificationChannelTopicConfig,
    NotificationSettingsModel,
    notificationTopicProcesses,
    notificationTopicUnknown,
} from '../shared/notification.model';

/** Stands in for the notifier REST API, the only boundary these tests need to fake. */
class NotificationServiceStub {
    settingsResponse: Partial<NotificationSettingsModel> = {
        channel_topic_config: { websoket: [], mqtt: [], push: [], email: [] },
    };
    saved: NotificationChannelTopicConfig[] = [];
    failNextSave = false;

    getSettings(): Observable<NotificationSettingsModel> {
        return of(this.settingsResponse as NotificationSettingsModel);
    }

    updateSettings(settings: NotificationSettingsModel): Observable<NotificationSettingsModel> {
        if (this.failNextSave) {
            this.failNextSave = false;
            return throwError(() => new Error('notifier unavailable'));
        }
        this.saved.push(settings.channel_topic_config);
        return of(settings);
    }

    getPlatformBrokerConfig() {
        return of({ enabled: false });
    }

    updatePlatformBrokerConfig(config: { enabled: boolean }) {
        return of(config);
    }

    listBrokers() {
        return of({ total: 0, limit: 20, offset: 0, brokers: [] });
    }
}

describe('NotificationDialogComponent', () => {
    let component: NotificationDialogComponent;
    let fixture: ComponentFixture<NotificationDialogComponent>;
    let service: NotificationServiceStub;

    beforeEach(async () => {
        service = new NotificationServiceStub();

        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [NotificationDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: { close: () => undefined } },
                { provide: AuthorizationService, useValue: { getUserId: () => 'user-1' } },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: { notificationService: service as unknown as NotificationService },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(NotificationDialogComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('sends the whole config when a topic is enabled for a channel', fakeAsync(() => {
        component.ngOnInit();
        component.toggle('email', notificationTopicProcesses, true);
        tick(400);

        expect(service.saved.length).toBe(1);
        expect(service.saved[0].email).toEqual([notificationTopicProcesses]);
        expect(service.saved[0].mqtt).toEqual([]);
        expect(component.saveState).toBe('saved');
    }));

    it('collapses rapid toggles into a single request carrying the final state', fakeAsync(() => {
        component.ngOnInit();
        component.toggle('email', notificationTopicProcesses, true);
        component.toggle('push', notificationTopicProcesses, true);
        component.toggle('email', notificationTopicProcesses, false);
        tick(400);

        expect(service.saved.length).toBe(1);
        expect(service.saved[0].email).toEqual([]);
        expect(service.saved[0].push).toEqual([notificationTopicProcesses]);
    }));

    it('reverts the matrix to the last saved state when a save fails', fakeAsync(() => {
        component.ngOnInit();
        service.failNextSave = true;
        component.toggle('email', notificationTopicProcesses, true);
        tick(400);

        expect(component.isEnabled('email', notificationTopicProcesses)).toBeFalse();
        expect(component.saveState).toBe('error');
    }));

    it('keeps accepting changes after a failed save', fakeAsync(() => {
        component.ngOnInit();
        service.failNextSave = true;
        component.toggle('email', notificationTopicProcesses, true);
        tick(400);

        component.toggle('mqtt', notificationTopicProcesses, true);
        tick(400);

        expect(service.saved.length).toBe(1);
        expect(service.saved[0].mqtt).toEqual([notificationTopicProcesses]);
        expect(component.saveState).toBe('saved');
    }));

    it('enables and clears a whole channel column at once', fakeAsync(() => {
        component.ngOnInit();
        component.toggleChannel('push', true);
        tick(400);

        expect(service.saved[0].push.length).toBe(component.topics.length);
        expect(component.allEnabledForChannel('push')).toBeTrue();

        component.toggleChannel('push', false);
        tick(400);

        expect(service.saved[1].push).toEqual([]);
        expect(component.someEnabledForChannel('push')).toBeFalse();
    }));

    it('fills in channels that the settings response omits', () => {
        service.settingsResponse = { channel_topic_config: { email: [notificationTopicProcesses] } as NotificationChannelTopicConfig };
        component.ngOnInit();

        expect(component.channelTopicConfig.email).toEqual([notificationTopicProcesses]);
        expect(component.channelTopicConfig.websoket).toEqual([]);
        expect(component.channelTopicConfig.mqtt).toEqual([]);
        expect(component.channelTopicConfig.push).toEqual([]);
    });

    it('reports a topic as unreachable while no channel delivers it', fakeAsync(() => {
        component.ngOnInit();
        expect(component.isTopicUnreachable(notificationTopicUnknown)).toBeTrue();

        component.toggle('websoket', notificationTopicUnknown, true);
        tick(400);

        expect(component.isTopicUnreachable(notificationTopicUnknown)).toBeFalse();
    }));
});
