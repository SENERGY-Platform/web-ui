/*
 * Copyright 2018 InfAI (CC SES)
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

import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import {NotificationModel} from '../shared/notification.model';
import {NotificationService} from '../shared/notification.service';

@Component({
    templateUrl: './notification-dialog.component.html',
    styleUrls: ['./notification-dialog.component.css'],
})
export class NotificationDialogComponent implements OnInit {
    notifications: NotificationModel[] = [];
    notificationService: NotificationService;

    constructor(private dialogRef: MatDialogRef<NotificationDialogComponent>,
                @Inject(MAT_DIALOG_DATA) data: {notifications: NotificationModel[], notificationService: NotificationService}) {
        this.notifications = data.notifications;
        this.notificationService = data.notificationService;
    }

    ngOnInit() {}

    close(): void {
        this.dialogRef.close();
    }

    deleteMessage(index: number) {
        this.notificationService.deleteNotification(this.notifications[index]).subscribe(() => {
            this.notifications.splice(index, 1);
        });
    }

    setRead(index: number, status: boolean) {
        const n = this.notifications[index];
        if (n.isRead !== status) {
            n.isRead = status;
            this.notificationService.updateNotification(n).subscribe(() => this.notifications[index] = n);
        }
    }

    deleteAllMessages() {
        const notificationCopy = this.notifications;
        for (let i = 0; i < notificationCopy.length; i++) {
            this.deleteMessage(i);
        }
        this.notifications = [];
    }

    setAllRead() {
        for (let i = 0; i < this.notifications.length; i++) {
            this.setRead(i, true);
        }
    }
}
