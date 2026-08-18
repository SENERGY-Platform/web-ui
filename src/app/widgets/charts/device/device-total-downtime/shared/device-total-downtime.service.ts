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
import {ChartsModel} from '../../../shared/charts.model';
import {MonitorService} from '../../../../../modules/processes/monitor/shared/monitor.service';
import {ElementSizeService} from '../../../../../core/services/element-size.service';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DashboardService} from '../../../../../modules/dashboard/shared/dashboard.service';
import {WidgetModel} from '../../../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {ChartDataTableModel} from '../../../../../core/model/chart/chart-data-table.model';
import {DeviceTotalDowntimeEditDialogComponent} from '../dialogs/device-total-downtime-edit-dialog.component';
import {DeviceInstancesService} from '../../../../../modules/devices/device-instances/shared/device-instances.service';
import {
    ResourceHistoricalConnectionStatesModelV2
} from '../../../../../modules/devices/device-instances/shared/device-instances-history.model';
import {catchError, concatMap, map} from 'rxjs/operators';

/** Per device: connection state changes of the current day, ascending as [unix seconds, connected]. */
type ConnectionTimeline = [number, boolean][];

const customColor = '#4484ce'; // /* cc */
const stateTrue = true;
const stateFalse = false;

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

    getTotalDowntime(widgetId: string): Observable<ChartsModel> {
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
                const timelines = this.toConnectionTimelines(histories, midnight);
                if (timelines.length === 0) {
                    return this.setDevicesTotalDowntimeChartValues(widgetId, new ChartDataTableModel([[]]));
                } else {
                    return this.setDevicesTotalDowntimeChartValues(widgetId, this.processTimelineFailureRatio(timelines));
                }
            })
        );
    }

    private toConnectionTimelines(histories: Map<string, ResourceHistoricalConnectionStatesModelV2[]>, since: Date): ConnectionTimeline[] {
        const timelines: ConnectionTimeline[] = [];
        histories.forEach((resourceHistories) => {
            (resourceHistories || []).forEach((history) => {
                const timeline: ConnectionTimeline = [];
                if (history.prev_state !== null) {
                    timeline.push([since.getTime() / 1000, history.prev_state.connected]);
                }
                (history.states || []).forEach((state) => {
                    timeline.push([new Date(state.time).getTime() / 1000, state.connected]);
                });
                if (timeline.length > 0) {
                    timelines.push(timeline);
                }
            });
        });
        return timelines;
    }

    private setDevicesTotalDowntimeChartValues(widgetId: string, dataTable: ChartDataTableModel): ChartsModel {
        const element = this.elementSizeService.getHeightAndWidthByElementId(widgetId);
        return new ChartsModel('AreaChart', dataTable.data, {
            chartArea: {width: element.widthPercentage, height: element.heightPercentage},
            width: element.width,
            height: element.height,
            legend: 'none',
            hAxis: {format: 'HH:mm'},
            vAxis: {format: '#.## %', viewWindow: {min: 0.0}},
            explorer: {
                actions: ['dragToZoom', 'rightClickToReset'],
                axis: 'horizontal',
                keepInBounds: true,
                maxZoomIn: 0.001,
            },
            colors: [customColor],
        });
    }

    private processTimelineFailureRatio(timelines: ConnectionTimeline[]): ChartDataTableModel {
        const today = new Date();
        const intervalDurationInMin = 15;
        const intervalDurationInMs = intervalDurationInMin * 60 * 1000;
        const numberOfIntervals = today.getHours() * (60 / intervalDurationInMin) + Math.ceil(today.getMinutes() / intervalDurationInMin);
        const interval: { stateConnected: number; stateDisconnected: number }[] = [];
        let intervalIndex = 0;
        let timeLeft = intervalDurationInMs;
        let intervalFull = false;

        for (let x = 0; x < numberOfIntervals; x++) {
            interval.push({stateConnected: 0, stateDisconnected: 0});
        }

        timelines.forEach((timeline: ConnectionTimeline) => {
            intervalIndex = 0;
            timeLeft = intervalDurationInMs;
            intervalFull = false;

            const lastIndex = timeline.length - 1;
            const diffToday = today.getTime() - new Date(timeline[lastIndex][0] * 1000).getTime();
            const statusLastIndex = timeline[lastIndex][1];
            spreadIntoTimeZones(statusLastIndex, diffToday);

            for (let z = lastIndex; z >= 1 && !intervalFull; z--) {
                const diffDates = (timeline[z][0] - timeline[z - 1][0]) * 1000;
                const statusBefore = timeline[z - 1][1];
                spreadIntoTimeZones(statusBefore, diffDates);
            }
        });

        return this.prepareArray(interval, today, intervalDurationInMs);

        function spreadIntoTimeZones(state: boolean, time: number) {
            while (time >= timeLeft && intervalIndex < numberOfIntervals - 1) {
                time = time - timeLeft;
                fillIntervalArray(state, timeLeft);
                intervalIndex++;
                timeLeft = intervalDurationInMs;
            }

            if (intervalIndex === numberOfIntervals - 1) {
                if (time > timeLeft) {
                    fillIntervalArray(state, timeLeft);
                    intervalFull = true;
                } else {
                    timeLeft = timeLeft - time;
                    fillIntervalArray(state, time);
                }
            } else {
                timeLeft = timeLeft - time;
                fillIntervalArray(state, time);
            }
        }

        function fillIntervalArray(state: boolean, time: number) {
            switch (state) {
            case stateTrue: {
                interval[intervalIndex].stateConnected += time;
                break;
            }
            case stateFalse: {
                interval[intervalIndex].stateDisconnected += time;
                break;
            }
            }
        }
    }

    private prepareArray(
        interval: { stateConnected: number; stateDisconnected: number }[],
        today: Date,
        intervalDurationInMs: number,
    ): ChartDataTableModel {
        const dataTable = new ChartDataTableModel([['Date', 'Percentage', {role: 'tooltip'}]]);

        if (interval.length !== 0) {
            for (let m = interval.length - 1; m >= 0; m--) {
                const percentage = interval[m].stateDisconnected / (interval[m].stateConnected + interval[m].stateDisconnected);
                const rightPoint = new Date(today.getTime() - m * intervalDurationInMs);
                let leftPoint = new Date(rightPoint.getTime() - intervalDurationInMs);
                if (m === interval.length - 1) {
                    leftPoint = new Date(today);
                    leftPoint.setHours(0, 0);
                }

                dataTable.data.push([leftPoint, percentage, getTooltipText(leftPoint, percentage)]);
                dataTable.data.push([rightPoint, percentage, getTooltipText(rightPoint, percentage)]);
            }
        }
        return dataTable;

        function getTooltipText(date: Date, percentage: number): string {
            const percentageFormatted = Math.round(percentage * 10000) / 100 + '%';
            const timeFormatted = date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            return timeFormatted + '\n' + 'failure ratio: ' + percentageFormatted;
        }
    }
}
