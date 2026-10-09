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

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MonitorService } from '../../../../../modules/processes/monitor/shared/monitor.service';
import { ElementSizeService } from '../../../../../core/services/element-size.service';
import { MatDialog } from '@angular/material/dialog';
import { DashboardService } from '../../../../../modules/dashboard/shared/dashboard.service';
import { openWidgetEditDialog } from '../../../../../modules/dashboard/shared/open-widget-edit-dialog';
import { ErrorHandlerService } from '../../../../../core/services/error-handler.service';
import { DeviceGatewayEditDialogComponent } from '../dialogs/device-gateway-edit-dialog.component';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { NetworksService } from '../../../../../modules/devices/networks/shared/networks.service';
import { devicesPerGateway, GatewayDeviceCount } from './device-gateway-chart';

@Injectable({
    providedIn: 'root',
})
export class DeviceGatewayService {
    private http = inject(HttpClient);
    private monitorService = inject(MonitorService);
    private elementSizeService = inject(ElementSizeService);
    private dialog = inject(MatDialog);
    private dashboardService = inject(DashboardService);
    private errorHandlerService = inject(ErrorHandlerService);
    private networksService = inject(NetworksService);


    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean): void {
        openWidgetEditDialog(this.dialog, this.dashboardService, DeviceGatewayEditDialogComponent, {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization
        });
    }

    /** The device count of every gateway, in listing order; empty without gateways. */
    getDevicesPerGateway(): Observable<GatewayDeviceCount[]> {
        return this.networksService.listExtendedHubs({ limit: 10000, offset: 0 }).pipe(map((hubs) => devicesPerGateway(hubs.result || [])));
    }
}
