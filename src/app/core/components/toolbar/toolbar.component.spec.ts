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

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToolbarComponent } from './toolbar.component';
import { AuthorizationService } from '../../services/authorization.service';
import { AuthorizationServiceMock } from '../../services/authorization.service.mock';
import { MatDialogModule } from '@angular/material/dialog';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { NotificationService } from './notification/shared/notification.service';
import { of } from 'rxjs';
import { SettingsDialogService } from 'src/app/modules/settings/shared/settings-dialog.service';
import {provideRouter} from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('ToolbarComponent', () => {
    let component: ToolbarComponent;
    let fixture: ComponentFixture<ToolbarComponent>;

    const notificationServiceSpy: Spy<NotificationService> = createSpyFromClass(NotificationService, {
        observablePropsToSpyOn: ['notificationEmitter']
    });
    notificationServiceSpy.userHasReadAuthorization.and.returnValue(of(true));
    const settingsDialogServiceSpy: Spy<SettingsDialogService> = createSpyFromClass(SettingsDialogService);
    settingsDialogServiceSpy.userHasUpdateAuthorization.and.returnValue(of(true));

    beforeEach(() => {
        TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    declarations: [ToolbarComponent],
    imports: [MatDialogModule,
        MatSnackBarModule,
        MatMenuModule,
        MatDividerModule,
        MatIconModule,
        MatToolbarModule],
    providers: [
        provideRouter([]),
        { provide: AuthorizationService, useClass: AuthorizationServiceMock },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: SettingsDialogService, useValue: settingsDialogServiceSpy },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
    ]
}).compileComponents();
        fixture = TestBed.createComponent(ToolbarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should correctly display unread notification counter', () => {
        notificationServiceSpy.notificationEmitter.nextWith([
            {
                _id: '0',
                isRead: false,
                message: '',
                title: '',
                created_at: null,
                userId: '',
            },
            {
                _id: '1',
                isRead: true,
                message: '',
                title: '',
                created_at: null,
                userId: '',
            },
            {
                _id: '2',
                isRead: false,
                message: '',
                title: '',
                created_at: null,
                userId: '',
            },
        ]);
        expect(component.unreadCounter).toBe(2);
        notificationServiceSpy.notificationEmitter.nextWith([
            {
                _id: '0',
                isRead: true,
                message: '',
                title: '',
                created_at: null,
                userId: '',
            },
            {
                _id: '1',
                isRead: true,
                message: '',
                title: '',
                created_at: null,
                userId: '',
            },
            {
                _id: '2',
                isRead: false,
                message: '',
                title: '',
                created_at: null,
                userId: '',
            },
        ]);
        expect(component.unreadCounter).toBe(1);
        notificationServiceSpy.notificationEmitter.nextWith([
            {
                _id: '0',
                isRead: false,
                message: '',
                title: '',
                created_at: null,
                userId: '',
            },
            {
                _id: '1',
                isRead: true,
                message: '',
                title: '',
                created_at: null,
                userId: '',
            },
            {
                _id: '2',
                isRead: false,
                message: '',
                title: '',
                created_at: null,
                userId: '',
            },
            {
                _id: '3',
                isRead: false,
                message: '',
                title: '',
                created_at: null,
                userId: '',
            },
        ]);
        expect(component.unreadCounter).toBe(3);
    });
});
