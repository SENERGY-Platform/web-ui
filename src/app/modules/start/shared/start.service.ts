/*
 * Copyright 2018 InfAI (CC SES)
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
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {catchError, map} from 'rxjs/internal/operators';

import {environment} from '../../../../environments/environment';
import {StartDeviceModel} from './start-device.model';
import {StartDevicesStatusModel} from './start-devices-status.model';
import {PermissionsService} from '../../permissions/shared/permissions.service';
import {PermissionsProcessModel} from '../../permissions/shared/permissions-process.model';
import {StartProcessModel} from './start-process.model';
import {StartItemStatusModel} from './start-item-status.model';
import {ChartModel} from '../../../core/components/chart/chart.model';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {MonitorService} from '../../processes/monitor/shared/monitor.service';
import {MonitorProcessModel} from '../../processes/monitor/shared/monitor-process.model';
import {ElementSizeService} from '../../../core/services/element-size.service';
import {StartGatewayModel} from './start-gateway.model';
import {ChartDataTableModel} from '../../../core/components/chart/chart-data-table.model';

const stateConnected = 'connected';
const stateDisconnected = 'disconnected';
const stateTrue = true;
const stateFalse = false;
const dayInMs = 86400000;
const failureTimeInMs = dayInMs * 7;
const today = new Date();
const customColor = '#4484ce'; // /* cc */
const intervalDurationInMin = 15;
const intervalDurationInMs = intervalDurationInMin * 60 * 1000;
const numberOfIntervals = today.getHours() * (60 / intervalDurationInMin) + Math.ceil(today.getMinutes() / intervalDurationInMin);

@Injectable({
    providedIn: 'root'
})
export class StartService {

    constructor(private http: HttpClient,
                private permissionsService: PermissionsService,
                private errorHandlerService: ErrorHandlerService,
                private monitorService: MonitorService,
                private elementSizeService: ElementSizeService) {
    }

    getDeviceHistory(duration: string): Observable<StartDeviceModel[]> {
        return this.http.get<StartDeviceModel[]>(environment.apiAggregatorUrl + '/history/devices/' + duration).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(StartService.name, 'getDeviceHistory', []))
        );
    }

    getGatewayHistory(duration: string): Observable<StartGatewayModel[]> {
        return this.http.get<StartGatewayModel[]>(environment.apiAggregatorUrl + '/history/gateways/' + duration).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(StartService.name, 'getGatewayHistory', []))
        );
    }

    getDevicesStatus(): Observable<StartDevicesStatusModel> {
        return new Observable<StartDevicesStatusModel>((observer) => {
            this.getDeviceHistory('7d').subscribe((devices: StartDeviceModel[]) => {
                observer.next(this.sumDevicesStatus(devices));
                observer.complete();
            });
        });
    }

    getLatestProcesses(): Observable<StartProcessModel[]> {
        return new Observable<StartProcessModel[]>((observer) => {
            this.permissionsService.getProcessModels('', 10, 0, 'date', 'desc').subscribe((processes: PermissionsProcessModel[]) => {
                observer.next(this.prettifyProcessData(processes));
                observer.complete();
            });
        });
    }

    getDevicesDowntime(): Observable<StartItemStatusModel[]> {
        return new Observable<StartItemStatusModel[]>((observer) => {
            this.getDeviceHistory('7d').subscribe((devices: StartDeviceModel[]) => {
                observer.next(this.calcDevicesConnectionTime(devices));
                observer.complete();
            });
        });
    }

    getProcessInstancesStatus(): Observable<ChartModel> {
        return new Observable<ChartModel>((observer) => {
            this.monitorService.getAllHistoryInstances().subscribe((processes: MonitorProcessModel[]) => {
                    observer.next(this.setProcessInstancesStatusValues(this.sumUpProcessStatuses(processes)));
                    observer.complete();
                }
            );
        });
    }

    getProcessDeployments(): Observable<ChartModel> {
        return new Observable<ChartModel>((observer) => {
            this.monitorService.getAllHistoryInstances().subscribe((processes: MonitorProcessModel[]) => {
                observer.next(this.setProcessDeploymentValues(this.sumUpProcessDeployments(processes)));
                observer.complete();
            });
        });
    }

    getDevicesPerGateway(): Observable<ChartModel> {
        return new Observable<ChartModel>((observer) => {
                this.getGatewayHistory('7d').subscribe((gateways: StartGatewayModel[]) => {
                    observer.next(this.setDevicesPerGatewayChartValues(this.getGatewayDataTableArray(gateways)));
                    observer.complete();
                });
            }
        );
    }

    getDevicesDowntimePerGateway(): Observable<ChartModel> {
        return new Observable<ChartModel>((observer) => {
            this.getGatewayHistory('7d').subscribe((gateways) => {
                observer.next(this.setDevicesDowntimePerGatewayChartValues(this.getGatewayDowntimeDataTableArray(gateways)));
                observer.complete();
            });

        });
    }

    getTotalDowntime(): Observable<ChartModel> {
        return new Observable<ChartModel>((observer) => {
            this.getDeviceHistory('7d').subscribe((devices: StartDeviceModel[]) => {
                observer.next(this.setDevicesTotalDowntimeChartValues(this.processTimelineFailureRatio(devices)));
                observer.complete();
            });
        });
    }

    private sumUpProcessDeployments(processes: MonitorProcessModel[]): ChartDataTableModel {

        processes.sort((a, b) => {
            if (a.startTime > b.startTime) {
                return 1;
            }
            if (a.startTime < b.startTime) {
                return -1;
            }
            return 0;
        });

        const dateCount: Map<string, number> = new Map();
        processes.forEach((process: MonitorProcessModel) => {
            const key = process.startTime.substring(0, 10);
            const value = (dateCount.get(key) || 0) + 1;
            dateCount.set(key, value);
        });

        const dataTable = new ChartDataTableModel([['Date', 'Count', {role: 'tooltip'}]]);
        dateCount.forEach((count, date) => {
                const dateNew = new Date(date);
                dataTable.data.push([dateNew, count, getTooltipText(dateNew, count)]);
            }
        );
        return dataTable;

        function getTooltipText(date: Date, count: number): string {
            return date.toLocaleDateString() + '\n' + 'count: ' + count; // todo: translation
        }
    }

    private setProcessDeploymentValues(dataTable: ChartDataTableModel): ChartModel {
        const element = this.elementSizeService.getHeightAndWidthByElementId('processDeploymentsChartId');
        return new ChartModel(
            'ColumnChart',
            dataTable.data,
            {
                chartArea: {left: 40, top: 10, width: '85%', height: '80%'},
                width: element.width,
                height: element.height,
                legend: 'none',
                hAxis: {format: 'd.M.yy'},
                colors: [customColor],
            }
        );
    }

    private setDevicesTotalDowntimeChartValues(dataTable: ChartDataTableModel): ChartModel {
        const element = this.elementSizeService.getHeightAndWidthByElementId('devicesDowntimePerGatewayChartId');
        return new ChartModel(
            'AreaChart',
            dataTable.data,
            {
                chartArea: {left: 70, top: 10, width: '85%', height: '82%'},
                width: element.width,
                height: element.height,
                legend: 'none',
                hAxis: {format: 'HH:mm'},
                vAxis: {format: '#.## %'},
                colors: [customColor],
            }
        );
    }

    private prepareArray(interval: { stateConnected: number, stateDisconnected: number }[]): ChartDataTableModel {
        const dataTable = new ChartDataTableModel([['Date', 'Percentage', {role: 'tooltip'}]]);

        if (interval.length !== 0) {
            for (let m = (interval.length - 1); m >= 0; m--) {
                const percentage = interval[m].stateDisconnected / (interval[m].stateConnected + interval[m].stateDisconnected);
                const rightPoint = new Date(today.getTime() - (m * intervalDurationInMs));
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
            return timeFormatted + '\n' + 'failure ratio: ' + percentageFormatted; // todo: translation
        }
    }

    private processTimelineFailureRatio(devices: StartDeviceModel[]): ChartDataTableModel {
        const interval: { stateConnected: number, stateDisconnected: number }[] = [];
        let intervalIndex = 0;
        let timeLeft = intervalDurationInMs;
        let intervalFull = false;

        for (let x = 0; x < numberOfIntervals; x++) {
            interval.push({stateConnected: 0, stateDisconnected: 0});
        }

        devices.forEach((device: StartDeviceModel) => {

            intervalIndex = 0;
            timeLeft = intervalDurationInMs;
            intervalFull = false;

            if (device.log_history.values !== null) {

                const lastIndex = device.log_history.values.length - 1;
                const diffToday = today.getTime() - new Date(device.log_history.values[lastIndex][0] * 1000).getTime();
                const statusLastIndex = device.log_history.values[lastIndex][1];
                spreadIntoTimeZones(statusLastIndex, diffToday);

                for (let z = lastIndex; z >= 1 && intervalFull === false; z--) {
                    const diffDates = (device.log_history.values[z][0] - device.log_history.values[z - 1][0]) * 1000;
                    const statusBefore = device.log_history.values[z - 1][1];
                    spreadIntoTimeZones(statusBefore, diffDates);
                }
            }

            if (device.log_edge !== null && intervalFull === false) {
                const statusEdge: boolean = <boolean>device.log_edge[1];
                spreadIntoTimeZones((statusEdge), dayInMs);
            }
        });

        return this.prepareArray(interval);

        function spreadIntoTimeZones(state: boolean, time: number) {
            while (time >= timeLeft && intervalIndex < (numberOfIntervals - 1)) {
                time = time - timeLeft;
                fillIntervalArray(state, timeLeft);
                intervalIndex++;
                timeLeft = intervalDurationInMs;
            }

            if (intervalIndex === (numberOfIntervals - 1)) {
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

    private setDevicesDowntimePerGatewayChartValues(dataTable: ChartDataTableModel): ChartModel {

        const element = this.elementSizeService.getHeightAndWidthByElementId('devicesDowntimePerGatewayChartId');
        return new ChartModel(
            'ColumnChart',
            dataTable.data,
            {
                chartArea: {left: 70, top: 10, width: '85%', height: '75%'},
                width: element.width,
                height: element.height,
                legend: 'none',
                vAxis: {format: '#.## %'},
                tooltip: {trigger: 'none'}
            }
        );
    }

    private setDevicesPerGatewayChartValues(dataTable: ChartDataTableModel): ChartModel {

        const element = this.elementSizeService.getHeightAndWidthByElementId('devicesPerGatewayChartId');
        return new ChartModel(
            'ColumnChart',
            dataTable.data,
            {
                chartArea: {left: 70, top: 10, width: '85%', height: '75%'},
                width: element.width,
                height: element.height,
                legend: 'none',
                tooltip: {trigger: 'none'}
            }
        );
    }

    private getGatewayDataTableArray(gateways: StartGatewayModel[]): ChartDataTableModel {
        const dataTable = new ChartDataTableModel([['Name', 'Count', {role: 'annotation'}, {role: 'style'}]]);
        gateways.forEach((gateway) => {
            const count = gateway.devices === null ? 0 : gateway.devices.length;
            dataTable.data.push([gateway.name, count, count, customColor]);
        });
        return dataTable;
    }

    private getGatewayDowntimeDataTableArray(gateways: StartGatewayModel[]): ChartDataTableModel {
        const dataTable = new ChartDataTableModel([['Name', 'Percentage', {role: 'annotation'}, {role: 'style'}]]);
        gateways.forEach((gateway) => {
            const time = this.calcDisconnectedTime(gateway).failureRatio;
            const text = Math.round(time * 10000) / 100 + '%';
            dataTable.data.push([gateway.name, time, text, customColor]);
        });
        return dataTable;
    }

    private sumUpProcessStatuses(processes: MonitorProcessModel[]): ChartDataTableModel {
        const dataTable = new ChartDataTableModel([['Status', 'Count']]);
        const status = {active: 0, suspended: 0, completed: 0, externallyTerminated: 0, internallyTerminated: 0};
        processes.forEach(process => {
            switch (process.state) {
                case 'ACTIVE': {
                    status.active++;
                    break;
                }
                case 'SUSPENDED': {
                    status.suspended++;
                    break;
                }
                case 'COMPLETED': {
                    status.completed++;
                    break;
                }
                case 'EXTERNALLY_TERMINATED': {
                    status.externallyTerminated++;
                    break;
                }
                case 'INTERNALLY_TERMINATED': {
                    status.internallyTerminated++;
                    break;
                }
                default: {
                    throw new Error('Unknown process state.');
                }
            }
        });
        dataTable.data.push(['Active', status.active]);
        dataTable.data.push(['Suspended', status.suspended]);
        dataTable.data.push(['Completed', status.completed]);
        dataTable.data.push(['ExternallyTerminated', status.externallyTerminated]);
        dataTable.data.push(['InternallyTerminated', status.internallyTerminated]);
        return dataTable;
    }

    private setProcessInstancesStatusValues(dataTable: ChartDataTableModel): ChartModel {

        // const element = this.elementSizeService.getHeightAndWidthByElementId('processInstancesStatusChartId1');

        return new ChartModel(
            'PieChart',
            dataTable.data,
            {
                chartArea: {left: 30, top: 20, width: '80%', height: '80%'},
                height: 200,
                width: 200,
                pieSliceText: 'value',
                legend: 'none',
            });
    }

    private calcDevicesConnectionTime(devices: StartDeviceModel[]): StartItemStatusModel[] {
        const deviceArray: StartItemStatusModel[] = [];
        if (devices !== null) {
            devices.forEach(device => {
                deviceArray.push(this.calcDisconnectedTime(device));
            });
            deviceArray.sort((a, b) => {
                return b.timeDisconnectedInMs - (a.timeDisconnectedInMs || b.failureRate - a.failureRate);
            });
        }
        return deviceArray.slice(0, 50);
    }

    private prettifyProcessData(processes: PermissionsProcessModel[]): StartProcessModel[] {
        const processesArray: StartProcessModel[] = [];
        if (processes !== null) {
            processes.forEach(process => {
                processesArray.push(new StartProcessModel(process.name, process.id, new Date(process.date)));
            });
        }
        return processesArray;
    }

    private sumDevicesStatus(devices: StartDeviceModel[]): StartDevicesStatusModel {
        const devicesStatus = new StartDevicesStatusModel(0, 0, 0, 0);
        devices.forEach(device => {
            switch (device.log_state) {
                case stateConnected: {
                    devicesStatus.connected++;
                    break;
                }
                case stateDisconnected: {
                    devicesStatus.disconnected++;
                    break;
                }
                default: {
                    devicesStatus.unknown++;
                    break;
                }
            }
            devicesStatus.count++;
        });
        return devicesStatus;
    }

    private calcDisconnectedTime(item: StartDeviceModel | StartGatewayModel): StartItemStatusModel {

        const itemStatus = new StartItemStatusModel(0, 0, 0, 0, 0, 0, item.name);
        if (item.log_history.values === null) {
            switch (item.log_state) {
                case stateConnected: {
                    addTimeConnected(failureTimeInMs);
                    break;
                }
                case stateDisconnected: {
                    addTimeDisconnected(failureTimeInMs);
                    break;
                }
            }
        } else {
            /** calculate delta from last index time till now*/
            const lastIndex: number = item.log_history.values.length - 1;
            const diffToday = today.getTime() - new Date(item.log_history.values[lastIndex]['0'] * 1000).getTime();
            addTimeToConnectionStatus(item.log_history.values[lastIndex]['1'], diffToday);


            for (let x = lastIndex; x >= 1; x--) {
                const diff = (item.log_history.values[x]['0'] - item.log_history.values[x - 1]['0']) * 1000;
                addTimeToConnectionStatus(item.log_history.values[x - 1]['1'], diff);
            }

            /** check if input object existed before first index of log history */
            if (item.log_edge !== null) {
                const timeDiff = failureTimeInMs - itemStatus.timeDisconnectedInMs - itemStatus.timeConnectedInMs;
                addTimeToConnectionStatus((item.log_edge[1] === true), timeDiff);
            }
        }
        itemStatus.timeConnectedInS = Math.round(itemStatus.timeConnectedInMs / 60000);
        itemStatus.timeDisconnectedInMin = Math.round(itemStatus.timeDisconnectedInMs / 60000);
        itemStatus.failureRatio =
            itemStatus.timeDisconnectedInMs / (itemStatus.timeDisconnectedInMs + itemStatus.timeConnectedInMs);

        return itemStatus;

        function addTimeConnected(time: number) {
            itemStatus.timeConnectedInMs += time;
        }

        function addTimeDisconnected(time: number) {
            itemStatus.timeDisconnectedInMs += time;
            itemStatus.failureRate++;
        }

        function addTimeToConnectionStatus(status: boolean, time: number) {
            switch (status) {
                case stateTrue: {
                    addTimeConnected(time);
                    break;
                }
                case stateFalse: {
                    addTimeDisconnected(time);
                    break;
                }
                default: {
                    throw new Error('Unknown state.');
                }
            }
        }

    }
}

