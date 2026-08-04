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

import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import {
    MAT_DIALOG_DATA,
    MatDialogRef
} from '@angular/material/dialog';
import {
    NotificationBrokerModel,
    NotificationChannel,
    NotificationChannelInfo,
    NotificationChannelTopicConfig,
    NotificationTopic,
    notificationChannelInfos,
    notificationTopicInfos,
} from '../shared/notification.model';
// Type-only: notification.service.ts imports this component to open the dialog, so a value
// import would close the cycle and break module initialization in the test bundle.
import type { NotificationService } from '../shared/notification.service';
import { PageEvent } from '@angular/material/paginator';
import { UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { Subject, concatMap, debounceTime, forkJoin, of, takeUntil } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MatTableDataSource } from '@angular/material/table';
import { environment } from '../../../../../environments/environment';
import { AuthorizationService } from '../../../services/authorization.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';


export enum Modes {
    BROKER_LIST = 1,
    BROKER_EDIT
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

@Component({
    templateUrl: './notification-dialog.component.html',
    styleUrls: ['./notification-dialog.component.css'],
})
export class NotificationDialogComponent implements OnInit, OnDestroy {
    modes = Modes;
    mode = Modes.BROKER_LIST;
    notificationService: NotificationService;
    defaultPageSize = this.preferencesService.pageSize;
    lastBrokerPageEvent: PageEvent = { pageIndex: 0, pageSize: this.defaultPageSize } as PageEvent;
    brokers = new MatTableDataSource<NotificationBrokerModel>();
    totalBrokers = 0;

    topics = notificationTopicInfos;
    channels = notificationChannelInfos;
    docsUrl = 'https://bitnify.atlassian.net/wiki/spaces/SES/pages/194084879/Notifications';

    settingsReady = false;
    loadFailed = false;
    saveState: SaveState = 'idle';

    /** Drives the matrix. Updated optimistically, rolled back to lastSavedConfig when a save fails. */
    channelTopicConfig: NotificationChannelTopicConfig = this.emptyConfig();
    private lastSavedConfig: NotificationChannelTopicConfig = this.emptyConfig();

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

    platformBrokerActive = new UntypedFormControl(false);

    private readonly saveSettings$ = new Subject<void>();
    private readonly destroy$ = new Subject<void>();

    constructor(
        private dialogRef: MatDialogRef<NotificationDialogComponent>,
        private fb: UntypedFormBuilder,
        private authorizationService: AuthorizationService,
        public preferencesService: PreferencesService,
        @Inject(MAT_DIALOG_DATA) data: { notificationService: NotificationService },
    ) {
        this.notificationService = data.notificationService;
    }

    ngOnInit() {
        this.registerSettingsSaver();
        this.loadSettings();

        forkJoin([
            this.notificationService.getPlatformBrokerConfig().pipe(
                map(pb => this.platformBrokerActive.setValue(pb.enabled, { emitEvent: false })),
            ),
            this.notificationService.listBrokers(this.defaultPageSize, 0).pipe(map(list => {
                this.totalBrokers = list.total;
                this.brokers.data = list.brokers;
            })),
        ]).subscribe(() => this.registerPlatformBrokerSaver());
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    close(): void {
        this.dialogRef.close();
    }

    /* ---------------- delivery matrix ---------------- */

    isEnabled(channel: NotificationChannel, topic: NotificationTopic): boolean {
        return this.channelTopicConfig[channel].includes(topic);
    }

    toggle(channel: NotificationChannel, topic: NotificationTopic, enabled: boolean) {
        const topics = this.channelTopicConfig[channel];
        if (enabled && !topics.includes(topic)) {
            this.channelTopicConfig[channel] = [...topics, topic];
        } else if (!enabled) {
            this.channelTopicConfig[channel] = topics.filter(t => t !== topic);
        }
        this.saveSettings$.next();
    }

    channelEnabledCount(channel: NotificationChannel): number {
        return this.channelTopicConfig[channel].length;
    }

    allEnabledForChannel(channel: NotificationChannel): boolean {
        return this.channelEnabledCount(channel) === this.topics.length;
    }

    someEnabledForChannel(channel: NotificationChannel): boolean {
        const count = this.channelEnabledCount(channel);
        return count > 0 && count < this.topics.length;
    }

    toggleChannel(channel: NotificationChannel, enabled: boolean) {
        this.channelTopicConfig[channel] = enabled ? this.topics.map(t => t.topic) : [];
        this.saveSettings$.next();
    }

    /** Warn when a topic is not delivered anywhere, because the platform then drops it silently. */
    isTopicUnreachable(topic: NotificationTopic): boolean {
        return this.channels.every(c => !this.isEnabled(c.channel, topic));
    }

    channelTooltip(channel: NotificationChannelInfo): string {
        return channel.caveat ? channel.description + '\n\n' + channel.caveat : channel.description;
    }

    private registerSettingsSaver() {
        this.saveSettings$.pipe(
            debounceTime(400),
            concatMap(() => {
                this.saveState = 'saving';
                // Every request carries the full config, so the last one to be applied wins.
                const payload = this.cloneConfig(this.channelTopicConfig);
                return this.notificationService.updateSettings({ channel_topic_config: payload }).pipe(
                    map(saved => {
                        this.lastSavedConfig = this.normalizeConfig(saved?.channel_topic_config ?? payload);
                        this.saveState = 'saved';
                    }),
                    // Roll back to the last state the server confirmed, otherwise the UI keeps
                    // showing a setting that was never stored.
                    catchError(() => {
                        this.channelTopicConfig = this.cloneConfig(this.lastSavedConfig);
                        this.saveState = 'error';
                        return of(null);
                    }),
                );
            }),
            takeUntil(this.destroy$),
        ).subscribe();
    }

    private loadSettings() {
        this.notificationService.getSettings().pipe(takeUntil(this.destroy$)).subscribe({
            next: s => {
                this.channelTopicConfig = this.normalizeConfig(s?.channel_topic_config);
                this.lastSavedConfig = this.cloneConfig(this.channelTopicConfig);
                this.settingsReady = true;
            },
            error: () => {
                this.loadFailed = true;
                this.settingsReady = true;
            },
        });
    }

    /** Tolerates a response that omits channels instead of throwing like setValue() would. */
    private normalizeConfig(config?: Partial<NotificationChannelTopicConfig>): NotificationChannelTopicConfig {
        const normalized = this.emptyConfig();
        this.channels.forEach(c => normalized[c.channel] = [...(config?.[c.channel] ?? [])]);
        return normalized;
    }

    private cloneConfig(config: NotificationChannelTopicConfig): NotificationChannelTopicConfig {
        return this.normalizeConfig(config);
    }

    private emptyConfig(): NotificationChannelTopicConfig {
        return { websoket: [], mqtt: [], push: [], email: [] };
    }

    /* ---------------- brokers ---------------- */

    trackBrokerById(_: number, a: NotificationBrokerModel): string {
        return a.id;
    }

    moveBrokerPage($event: PageEvent) {
        this.preferencesService.pageSize = $event.pageSize;
        this.lastBrokerPageEvent = $event;
        this.notificationService.listBrokers($event.pageSize, $event.pageIndex * $event.pageSize).subscribe(list => {
            this.brokers.data = list.brokers;
            this.totalBrokers = list.total;
        });
    }

    gotoBrokerList() {
        this.mode = Modes.BROKER_LIST;
    }

    private registerPlatformBrokerSaver() {
        this.platformBrokerActive.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v =>
            this.notificationService.updatePlatformBrokerConfig({ enabled: v }).subscribe({
                error: () => this.platformBrokerActive.setValue(!v, { emitEvent: false }),
            }),
        );
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
        const save = broker.id === ''
            ? this.notificationService.createBroker(broker)
            : this.notificationService.updateBroker(broker);
        save.subscribe(() => {
            this.gotoBrokerList();
            this.moveBrokerPage(this.lastBrokerPageEvent);
        });
    }
}
