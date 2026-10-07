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

import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {MonitorService} from '../../../../../modules/processes/monitor/shared/monitor.service';
import {ElementSizeService} from '../../../../../core/services/element-size.service';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DashboardService} from '../../../../../modules/dashboard/shared/dashboard.service';
import {WidgetModel} from '../../../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {DeviceTotalDowntimeEditDialogComponent} from '../dialogs/device-total-downtime-edit-dialog.component';
import {DeviceInstancesService} from '../../../../../modules/devices/device-instances/shared/device-instances.service';
import {
    ResourceHistoricalConnectionStatesModelV2
} from '../../../../../modules/devices/device-instances/shared/device-instances-history.model';
import {catchError, concatMap, map} from 'rxjs/operators';
import {FailureRatioInterval, failureRatioIntervals, toConnectionTimelines} from './device-total-downtime-chart';

@Injectable({
    providedIn: 'root',
})
export class DeviceTotalDowntimeService {
    constructor(
        private monitorService: MonitorService,
        private elementSizeService: ElementSizeService,
        private dialog: MatDialog,
        private dashboardService: DashboardService,
        private deviceInstancesService: DeviceInstancesService,
    ) {
    }

    openEditDialog(dashboardId: string, widgetId: string, userHasUpdateNameAuthorization: boolean): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId,
            dashboardId,
            userHasUpdateNameAuthorization
        };
        const editDialogRef = this.dialog.open(DeviceTotalDowntimeEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    /** The failure ratio intervals of today up to now; undefined when no device has a history. */
    getTotalDowntime(): Observable<FailureRatioInterval[] | undefined> {
        const midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        return this.deviceInstancesService.getDeviceInstances({limit: 9999, offset: 0}).pipe(
            concatMap((devices) => {
                const ids = devices.result.map((device) => device.id);
                if (ids.length === 0) {
                    return of(new Map<string, ResourceHistoricalConnectionStatesModelV2[]>());
                }
                return this.deviceInstancesService.getHistory({ids, since: midnight});
            }),
            catchError(() => of(new Map<string, ResourceHistoricalConnectionStatesModelV2[]>())),
            map((histories) => {
                const timelines = toConnectionTimelines(histories, midnight);
                return timelines.length === 0 ? undefined : failureRatioIntervals(timelines, new Date());
            })
        );
    }
}
