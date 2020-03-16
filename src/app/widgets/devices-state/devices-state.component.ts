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
import {MatIconRegistry} from '@angular/material/icon';
import {DomSanitizer} from '@angular/platform-browser';
import {DevicesStateService} from './shared/devices-state.service';
import {DevicesStateModel} from './shared/devices-state.model';
import {DashboardService} from '../../modules/dashboard/shared/dashboard.service';
import {Subscription} from 'rxjs';

@Component({
    selector: 'senergy-devices-state',
    templateUrl: './devices-state.component.html',
    styleUrls: ['./devices-state.component.css'],
})
export class DevicesStateComponent implements OnInit, OnDestroy {

    devicesStatus: DevicesStateModel = {count: 0, connected: 0, disconnected: 0, unknown: 0};
    ready = false;
    destroy = new Subscription();

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;

    constructor(private iconRegistry: MatIconRegistry,
                private sanitizer: DomSanitizer,
                private devicesStateService: DevicesStateService,
                private dashboardService: DashboardService) {
    }

    ngOnInit() {
        this.setDeviceStatus();
        this.registerIcons();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    registerIcons() {
        this.iconRegistry.addSvgIcon('online', this.sanitizer.bypassSecurityTrustResourceUrl('src/img/connect_white.svg'));
        this.iconRegistry.addSvgIcon('offline', this.sanitizer.bypassSecurityTrustResourceUrl('src/img/disconnect_white.svg'));
    }

    edit() {
        this.devicesStateService.openEditDialog(this.dashboardId, this.widget.id);
    }

    private setDeviceStatus() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.ready = false;
                this.devicesStateService.getDevicesStatus().subscribe((devicesStatus: DevicesStateModel) => {
                    this.devicesStatus = devicesStatus;
                    this.ready = true;
                });
            }
        });
    }
}
