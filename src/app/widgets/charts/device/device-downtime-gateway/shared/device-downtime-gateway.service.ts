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

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MonitorService } from '../../../../../modules/processes/monitor/shared/monitor.service';
import { ElementSizeService } from '../../../../../core/services/element-size.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DashboardService } from '../../../../../modules/dashboard/shared/dashboard.service';
import { WidgetModel } from '../../../../../modules/dashboard/shared/dashboard-widget.model';
import { DashboardManipulationEnum } from '../../../../../modules/dashboard/shared/dashboard-manipulation.enum';
import { DeviceDowntimeGatewayEditDialogComponent } from '../dialogs/device-downtime-gateway-edit-dialog.component';
import { NetworksService } from '../../../../../modules/devices/networks/shared/networks.service';
import { downtimePerGateway, GatewayDowntime } from './device-downtime-gateway-chart';

@Injectable({
    providedIn: 'root',
})
export class DeviceDowntimeGatewayService {
    constructor(
        private monitorService: MonitorService,
        private elementSizeService: ElementSizeService,
        private dialog: MatDialog,
        private dashboardService: DashboardService,
        private networksService: NetworksService,
    ) {}

    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean, userHasUpdatePropertiesAuthorization: boolean): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization,
            userHasUpdatePropertiesAuthorization
        };
        const editDialogRef = this.dialog.open(DeviceDowntimeGatewayEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    /** The downtime share of every gateway over the week up to now; undefined without gateways. */
    getDevicesDowntimePerGateway(widget: WidgetModel): Observable<GatewayDowntime[] | undefined> {
        return this.networksService.getNetworksHistory('168h').pipe(
            map((gateways) => (gateways.length === 0 ? undefined : downtimePerGateway(gateways, widget.properties.hideZeroPercentage || false, new Date()))),
        );
    }
}
