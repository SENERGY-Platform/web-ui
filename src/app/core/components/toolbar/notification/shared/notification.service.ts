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

import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {NotificationModel, NotificationServiceResponse, NotificationUpdateModel} from './notification.model';
import {environment} from '../../../../../../environments/environment';
import {catchError, map} from 'rxjs/operators';
import {DeploymentsService} from '../../../../../modules/processes/deployments/shared/deployments.service';
import {HttpClient} from '@angular/common/http';
import {ErrorHandlerService} from '../../../../services/error-handler.service';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {NotificationDialogComponent} from '../dialog/notification-dialog.component';

@Injectable({
    providedIn: 'root'
})


export class NotificationService {

    constructor(private errorHandlerService: ErrorHandlerService,
                private http: HttpClient,
                private dialog: MatDialog) {
    }

    getNotifications(): Observable<NotificationModel[]> {
        return this.http.get<NotificationServiceResponse>(environment.notificationsUrl)
            .pipe(map(resp => resp.notifications || []),
                catchError(this.errorHandlerService.handleError(DeploymentsService.name, 'getNotifications', []))
            );
    }

    openDialog(notifications: NotificationModel[]): Observable<void> {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            notifications: notifications,
            notificationService: this,
        };
        dialogConfig.minWidth = '700px';
        const dialogRef = this.dialog.open(NotificationDialogComponent, dialogConfig);
        return dialogRef.afterClosed();
    }

    deleteNotification(notification: NotificationModel): Observable<Object> {
        return this.http.delete(environment.notificationsUrl + '/' + notification._id);
    }

    updateNotification(notification: NotificationModel): Observable<Object> {
        const n: NotificationUpdateModel = {
            isRead: notification.isRead,
            message: notification.message,
            title: notification.title,
            userId: notification.userId
        };
        return this.http.post(environment.notificationsUrl + '/' + notification._id, n);
    }

}
