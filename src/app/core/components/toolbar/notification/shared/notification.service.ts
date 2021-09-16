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

import { EventEmitter, Injectable, OnDestroy, Output } from '@angular/core';
import { Observable } from 'rxjs';
import { NotificationModel, NotificationUpdateModel } from './notification.model';
import { environment } from '../../../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { ErrorHandlerService } from '../../../../services/error-handler.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { NotificationDialogComponent } from '../dialog/notification-dialog.component';
import { AuthorizationService } from '../../../../services/authorization.service';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

@Injectable({
    providedIn: 'root',
})
export class NotificationService implements OnDestroy {
    @Output() notificationEmitter: EventEmitter<NotificationModel[]> = new EventEmitter();

    private webSocketSubject: WebSocketSubject<any> | undefined;
    private notifications: NotificationModel[] = [];

    constructor(
        private errorHandlerService: ErrorHandlerService,
        private http: HttpClient,
        private authorizationService: AuthorizationService,
        private dialog: MatDialog,
    ) {
        this.initWs();
    }

    ngOnDestroy() {
        this.webSocketSubject?.complete();
    }

    openDialog(): Observable<void> {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            notifications: this.notifications,
            notificationService: this,
        };
        dialogConfig.minWidth = '700px';
        const dialogRef = this.dialog.open(NotificationDialogComponent, dialogConfig);
        return dialogRef.afterClosed();
    }

    deleteNotification(notification: NotificationModel): Observable<unknown> {
        return this.http.delete(environment.notificationsUrl + '/' + notification._id);
    }

    updateNotification(notification: NotificationModel): Observable<unknown> {
        const n: NotificationUpdateModel = {
            isRead: notification.isRead,
            message: notification.message,
            title: notification.title,
            userId: notification.userId,
            created_at: notification.created_at,
        };
        return this.http.post(environment.notificationsUrl + '/' + notification._id, n);
    }

    private initWs() {
        this.webSocketSubject?.complete();
        this.webSocketSubject = webSocket(environment.notificationsWebsocketUrl);
        this.webSocketSubject.subscribe(
            (msg: { type: string; payload: string | NotificationModel | NotificationModel[] }) => {
                switch (msg.type) {
                case 'please reauthenticate':
                    this.authenticateWs();
                    break;
                case 'authentication confirmed':
                    this.webSocketSubject?.next({ type: 'refresh' });
                    break;
                case 'notification list':
                    this.notifications = msg.payload as NotificationModel[];
                    this.notificationEmitter.emit(this.notifications);
                    break;
                case 'put notification':
                    const n = msg.payload as NotificationModel;
                    const idx = this.notifications.findIndex((no) => no._id === n._id);
                    if (idx === -1) {
                        this.notifications.push(n);
                    } else {
                        this.notifications[idx] = n;
                    }
                    this.notificationEmitter.emit(this.notifications);
                    break;
                case 'delete notification':
                    const id = msg.payload as string;
                    const indx = this.notifications.findIndex((no) => id === no._id);
                    if (indx !== -1) {
                        this.notifications.splice(indx, 1);
                    }
                    this.notificationEmitter.emit(this.notifications);
                    break;
                default:
                    console.log('received unknown message from notification websocket', msg);
                }
            },
            () => setTimeout(() => this.initWs(), 5000),
            () => setTimeout(() => this.initWs(), 5000),
        );
        this.webSocketSubject.next('client hello');
        this.authenticateWs();
    }

    private authenticateWs() {
        this.authorizationService.getToken().then((token) => this.webSocketSubject?.next({ type: 'authentication', payload: token }));
    }
}
