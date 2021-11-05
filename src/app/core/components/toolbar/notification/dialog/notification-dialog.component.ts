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
import {NotificationBrokerModel, NotificationModel} from '../shared/notification.model';
import {NotificationService} from '../shared/notification.service';
import {PageEvent} from '@angular/material/paginator';
import {FormBuilder, FormControl, Validators} from '@angular/forms';
import {forkJoin, Observable} from 'rxjs';
import {map} from 'rxjs/internal/operators';
import {MatTableDataSource} from '@angular/material/table';
import {environment} from '../../../../../../environments/environment';
import {AuthorizationService} from '../../../../services/authorization.service';

// eslint-disable-next-line no-shadow
export enum Modes {
    NOTIFICATIONS = 1,
    SETTINGS,
    BROKER_EDIT
}

@Component({
    templateUrl: './notification-dialog.component.html',
    styleUrls: ['./notification-dialog.component.css'],
})
export class NotificationDialogComponent implements OnInit {
    modes = Modes;
    mode = Modes.NOTIFICATIONS;
    notifications: NotificationModel[] = [];
    notificationService: NotificationService;
    defaultPageSize = 25;
    lastNotificationPageEvent: PageEvent | undefined;
    lastBrokerPageEvent: PageEvent = {pageIndex: 0, pageSize: this.defaultPageSize} as PageEvent;
    brokers = new MatTableDataSource<NotificationBrokerModel>();
    totalBrokers = 0;

    brokerEditGroup = this.fb.group({
        id: [''],
        address: ['', Validators.required],
        enabled: true,
        user: [''],
        password: [''],
        topic: [''],
        qos: [0, [Validators.min(0), Validators.max(2)]],
        created_at: [undefined],
        updated_at: [undefined],
    });

    platformBrokerTooltip = environment.brokerExportBroker + ', Topic: notifications/' + this.authorizationService.getUserId() + ', Use platform credentials';

    platformBrokerActive = new FormControl(false);

    constructor(
        private dialogRef: MatDialogRef<NotificationDialogComponent>,
        private fb: FormBuilder,
        private authorizationService: AuthorizationService,
        @Inject(MAT_DIALOG_DATA) data: { notifications: NotificationModel[]; notificationService: NotificationService },
    ) {
        this.notifications = data.notifications;
        this.notificationService = data.notificationService;
        const init: Observable<any>[] = [];
        init.push(this.notificationService.getPlatformBrokerConfig().pipe(map(pb => this.platformBrokerActive.setValue(pb.enabled))));
        init.push(this.notificationService.listBrokers(this.defaultPageSize, 0).pipe(map(list => {
            this.totalBrokers = list.total;
            this.brokers.data = list.brokers;
        })));
        forkJoin(init).subscribe(() => this.registerChanges());
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

    trackNotificationById(_: number, a: NotificationModel): string {
        return a._id;
    }

    trackBrokerById(_: number, a: NotificationBrokerModel): string {
        return a.id;
    }

    getNotificationPage(): NotificationModel[] {
        if (this.lastNotificationPageEvent === undefined) {
            return this.notifications.slice(0, this.defaultPageSize);
        } else {
            return this.notifications.slice(this.lastNotificationPageEvent.pageIndex * this.lastNotificationPageEvent.pageSize,
                (this.lastNotificationPageEvent.pageIndex + 1) * this.lastNotificationPageEvent.pageSize);
        }
    }

    moveNotificationPage($event: PageEvent) {
        this.lastNotificationPageEvent = $event;
    }

    moveBrokerPage($event: PageEvent) {
        this.lastBrokerPageEvent = $event;
        this.notificationService.listBrokers($event.pageSize, $event.pageIndex * $event.pageSize).subscribe(list => {
            this.brokers.data = list.brokers;
            this.totalBrokers = list.total;
        });
    }

    toggleSettings() {
        if (this.mode !== Modes.SETTINGS) {
            this.mode = Modes.SETTINGS;
        } else {
            this.mode = Modes.NOTIFICATIONS;
        }
    }

    private registerChanges() {
        this.platformBrokerActive.valueChanges.subscribe(v => this.notificationService.updatePlatformBrokerConfig({enabled: v}).subscribe());
    }

    editBroker(element: NotificationBrokerModel) {
        this.mode = Modes.BROKER_EDIT;
        this.brokerEditGroup.setValue(element);
    }

    deleteBroker(element: NotificationBrokerModel) {
        this.notificationService.deleteBroker(element.id).subscribe(() => this.moveBrokerPage(this.lastBrokerPageEvent));
    }

    addBroker() {
        this.mode = Modes.BROKER_EDIT;
        this.brokerEditGroup.patchValue({
            id: '',
            address: '',
            enabled: true,
            user: '',
            password: '',
            topic: '',
            qos: 0,
            created_at: undefined,
            updated_at: undefined,
        });
    }

    saveBroker() {
        const broker = this.brokerEditGroup.value as NotificationBrokerModel;
        if (broker.id === '') {
            this.notificationService.createBroker(broker).subscribe(() => {
                this.toggleSettings();
                this.moveBrokerPage(this.lastBrokerPageEvent);
            });
        } else {
            this.notificationService.updateBroker(broker).subscribe(() => {
                this.toggleSettings();
                this.moveBrokerPage(this.lastBrokerPageEvent);
            });
        }
    }
}
