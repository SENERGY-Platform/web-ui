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

import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {NotificationModel} from '../shared/notification.model';
import {NotificationService} from '../shared/notification.service';
import {PageEvent} from '@angular/material/paginator';

@Component({
    templateUrl: './notification-dialog.component.html',
    styleUrls: ['./notification-dialog.component.css'],
})
export class NotificationDialogComponent implements OnInit {
    notifications: NotificationModel[] = [];
    notificationService: NotificationService;
    defaultPageSize = 25;
    lastPageEvent: PageEvent | undefined;

    constructor(
        private dialogRef: MatDialogRef<NotificationDialogComponent>,
        @Inject(MAT_DIALOG_DATA) data: { notifications: NotificationModel[]; notificationService: NotificationService },
    ) {
        this.notifications = data.notifications;
        this.notificationService = data.notificationService;
    }

    ngOnInit() {
    }

    close(): void {
        this.dialogRef.close();
    }

    deleteMessage(index: number) {
        this.notificationService.deleteNotification(this.notifications[index]).subscribe();
    }

    setRead(index: number, status: boolean) {
        const n = this.notifications[index];
        if (n.isRead !== status) {
            n.isRead = status;
            this.notificationService.updateNotification(n).subscribe();
        }
    }

    deleteAllMessages() {
        this.notificationService.deleteNotifications(this.notifications.map(x => x._id)).subscribe();
    }

    setAllRead() {
        for (let i = 0; i < this.notifications.length; i++) {
            this.setRead(i, true);
        }
    }

    trackById(_: number, a: NotificationModel): string {
        return a._id;
    }

    getPage(): NotificationModel[] {
        if (this.lastPageEvent === undefined) {
            return this.notifications.slice(0, this.defaultPageSize);
        } else {
            return this.notifications.slice(this.lastPageEvent.pageIndex * this.lastPageEvent.pageSize,
                (this.lastPageEvent.pageIndex + 1) * this.lastPageEvent.pageSize);
        }
    }

    movePage($event: PageEvent) {
        this.lastPageEvent = $event;
    }
}
