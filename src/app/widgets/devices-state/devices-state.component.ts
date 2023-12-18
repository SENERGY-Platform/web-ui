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

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { WidgetModel } from '../../modules/dashboard/shared/dashboard-widget.model';
import { DevicesStateService } from './shared/devices-state.service';
import { DevicesStateModel } from './shared/devices-state.model';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { DeviceInstancesRouterState, DeviceInstancesRouterStateTabEnum, DeviceInstancesRouterStateTypesEnum } from 'src/app/modules/devices/device-instances/device-instances.component';

@Component({
    selector: 'senergy-devices-state',
    templateUrl: './devices-state.component.html',
    styleUrls: ['./devices-state.component.css'],
})
export class DevicesStateComponent implements OnInit, OnDestroy {
    devicesStatus: DevicesStateModel = { count: 0, connected: 0, disconnected: 0, unknown: 0 };
    ready = false;
    refreshing = false;
    destroy = new Subscription();

    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;

    constructor(private devicesStateService: DevicesStateService, private dashboardService: DashboardService, private router: Router) {}

    ngOnInit() {
        this.setDeviceStatus();
    }

    ngOnDestroy() {
        this.destroy.unsubscribe();
    }

    edit() {
        this.devicesStateService.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization);
    }

    private setDeviceStatus() {
        this.destroy = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.refreshing = true;
                this.devicesStateService.getDevicesStatus().subscribe((devicesStatus: DevicesStateModel) => {
                    this.devicesStatus = devicesStatus;
                    this.ready = true;
                    this.refreshing = false;
                }, () => {}, () => {
                    this.ready = true;
                    this.refreshing = false;
                });
            }
        });
    }

    showOnlineDevices() {
        this.router.navigate(['devices/deviceinstances'], {
            state: { type: DeviceInstancesRouterStateTypesEnum.CONNECTION_STATE, value: DeviceInstancesRouterStateTabEnum.ONLINE } as DeviceInstancesRouterState,
        });
        return false;
    }

    showOfflineDevices() {
        this.router.navigate(['devices/deviceinstances'], {
            state: { type: DeviceInstancesRouterStateTypesEnum.CONNECTION_STATE, value: DeviceInstancesRouterStateTabEnum.OFFLINE } as DeviceInstancesRouterState,
        });
        return false;
    }

    showUnknownDevices() {
        this.router.navigate(['devices/deviceinstances'], {
            state: { type: DeviceInstancesRouterStateTypesEnum.CONNECTION_STATE, value: DeviceInstancesRouterStateTabEnum.UNKNOWN } as DeviceInstancesRouterState,
        });
        return false;
    }
}
