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

import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ToolbarComponent} from './toolbar.component';
import {RouterTestingModule} from '@angular/router/testing';
import {AuthorizationService} from '../../services/authorization.service';
import {AuthorizationServiceMock} from '../../services/authorization.service.mock';
import {MatDialogModule} from '@angular/material/dialog';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatMenuModule} from '@angular/material/menu';
import {MatDividerModule} from '@angular/material/divider';
import {MatIconModule} from '@angular/material/icon';
import {MatToolbarModule} from '@angular/material/toolbar';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {NotificationService} from './notification/shared/notification.service';
import {EventEmitter} from '@angular/core';

describe('ToolbarComponent', () => { // TODO
    let component: ToolbarComponent;
    let fixture: ComponentFixture<ToolbarComponent>;

    const notificationServiceSpy: Spy<NotificationService> = createSpyFromClass(NotificationService);
    notificationServiceSpy.notificationEmitter = new EventEmitter();

    beforeEach((() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule, RouterTestingModule, MatDialogModule, MatSnackBarModule, MatMenuModule, MatDividerModule, MatIconModule, MatToolbarModule],
            declarations: [ ToolbarComponent ],
            providers: [
                { provide: AuthorizationService, useClass: AuthorizationServiceMock },
                {provide: NotificationService, useValue: notificationServiceSpy}
            ]
        })
            .compileComponents();
        fixture = TestBed.createComponent(ToolbarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }));

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should correctly display unread notification counter', () => {
        notificationServiceSpy.notificationEmitter.emit([
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
            }
        ]);
        expect(component.unreadCounter).toBe(2);
        notificationServiceSpy.notificationEmitter.emit([
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
            }
        ]);
        expect(component.unreadCounter).toBe(1);
        notificationServiceSpy.notificationEmitter.emit([
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
            }
        ]);
        expect(component.unreadCounter).toBe(3);
    });
});
