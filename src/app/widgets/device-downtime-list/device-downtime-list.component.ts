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

import { Component, Input, OnDestroy, OnInit, ChangeDetectionStrategy, LOCALE_ID, inject } from '@angular/core';
import { WidgetModel } from '../../modules/dashboard/shared/dashboard-widget.model';
import { DeviceDowntimeListService } from './shared/device-downtime-list.service';
import { Subscription } from 'rxjs';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { duration } from '../../core/time/iso-duration';
import { humanizeDuration } from '../../core/time/humanize-duration';
import { OfflineSinceModel } from 'src/app/modules/devices/device-instances/shared/device-instances.model';
import { ConnectionHistoryDialogComponent } from '../shared/connection-history-dialog/connection-history-dialog.component';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';

function minutesSince(d: Date): number {
    return (Date.now() - new Date(d).getTime()) / 6e4;
}

@Component({
    selector: 'senergy-device-downtime-list',
    templateUrl: './device-downtime-list.component.html',
    styleUrls: ['./device-downtime-list.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class DeviceDowntimeListComponent implements OnInit, OnDestroy {
    offlineSinceList: OfflineSinceModel[] = [];
    ready = false;
    refreshing = false;
    destroy = new Subscription();

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;

    private localeId = inject(LOCALE_ID);

    constructor(
        private deviceDowntimeListService: DeviceDowntimeListService,
        private dashboardService: DashboardService,
        private dialog: MatDialog,
    ) {}

    ngOnInit() {
         this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.refreshing = true;
                this.deviceDowntimeListService.getDevicesDowntime(this.widget.properties).subscribe((devices: OfflineSinceModel[]) => {
                    this.offlineSinceList = devices;
                    this.ready = true;
                    this.refreshing = false;
                }, () => {}, () => this.ready = true);
            }
        });
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    edit() {
        this.deviceDowntimeListService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }

    humanizeDuration(d: Date): string {
        return humanizeDuration(duration(minutesSince(d), 'minutes'), this.localeId);
    }

    format(d: Date): {icon: string; color: string} {
        const durationInMin = minutesSince(d);
        if (durationInMin < (this.widget.properties?.deviceDowntimeList?.minutes_green || 60)) {
            return { icon: 'sentiment_very_satisfied', color: 'green' };
        } else if (durationInMin < (this.widget.properties?.deviceDowntimeList?.minutes_yellow || 240)) {
            return { icon: 'sentiment_neutral', color: 'yellow' };
        } else {
            return { icon: 'sentiment_very_dissatisfied', color: 'red' };
        }
    }

    showConnectionHistoryChart(id: string) {
        const dialogConfig = new MatDialogConfig();
              dialogConfig.width = '75vw';
              dialogConfig.disableClose = false;
              dialogConfig.data = {
                id,
              };
              this.dialog.open(ConnectionHistoryDialogComponent, dialogConfig);
              return;
    }
}
