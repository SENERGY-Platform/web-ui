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

import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {
    WidgetModel
} from '../../modules/dashboard/shared/dashboard-widget.model';
import {DeviceDowntimeListService} from './shared/device-downtime-list.service';
import {DeviceDowntimeListModel} from './shared/device-downtime-list.model';
import {Subscription} from 'rxjs';
import {DashboardService} from '../../modules/dashboard/shared/dashboard.service';

@Component({
    selector: 'senergy-device-downtime-list',
    templateUrl: './device-downtime-list.component.html',
    styleUrls: ['./device-downtime-list.component.css'],
})
export class DeviceDowntimeListComponent implements OnInit, OnDestroy {

    devices: DeviceDowntimeListModel[] = [];
    ready = false;
    destroy = new Subscription();

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;

    constructor(private eventListService: DeviceDowntimeListService,
                private processModelListService: DeviceDowntimeListService,
                private dashboardService: DashboardService) {
    }

    ngOnInit() {
        this.getProcesses();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    edit() {
        this.processModelListService.openEditDialog(this.dashboardId, this.widget.id);
    }

    private getProcesses() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.ready = false;
                this.processModelListService.getDevicesDowntime().subscribe((devices: DeviceDowntimeListModel[]) => {
                    this.devices = devices;
                    this.ready = true;
                });
            }
        });
    }
}
