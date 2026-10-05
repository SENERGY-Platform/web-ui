/*
 * Copyright 2026 InfAI (CC SES)
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

import { ChartDataTableModel } from '../../../../../core/model/chart/chart-data-table.model';
import { NetworksHistoryModel } from '../../../../../modules/devices/networks/shared/networks-history.model';
import { ChartElementSize, ChartsModel } from '../../../shared/charts.model';
import { DeviceDowntimeGatewayModel } from './device-downtime-gateway.model';

export const deviceDowntimeGatewayColumnColor = '#4484ce';
/** The window the downtime is computed over, ending at "now". */
export const deviceDowntimeGatewayWindowMs = 86400000 * 7;

export interface GatewayDowntime {
    name: string;
    /** disconnected share of the window, rounded to 4 decimals */
    failureRatio: number;
    /** the label above the column, e.g. "12.34%" */
    label: string;
}

/** Connected and disconnected time of one gateway within the window that ends at now. */
export function gatewayDowntime(item: NetworksHistoryModel, now: Date): DeviceDowntimeGatewayModel {
    const itemStatus = new DeviceDowntimeGatewayModel(0, 0, 0, 0, 0, 0, item.network.name);

    /** connection state changes within the window, ascending as [time in ms, connected];
     *  prev_state covers the time between the window start and the first change */
    const timeline: [number, boolean][] = [];
    if (item.history?.prev_state) {
        timeline.push([now.getTime() - deviceDowntimeGatewayWindowMs, item.history.prev_state.connected]);
    }
    (item.history?.states || []).forEach((state) => {
        timeline.push([new Date(state.time).getTime(), state.connected]);
    });

    if (timeline.length === 0) {
        switch (item.network.connection_state) {
        case 'online': {
            addTimeConnected(deviceDowntimeGatewayWindowMs);
            break;
        }
        case 'offline': {
            addTimeDisconnected(deviceDowntimeGatewayWindowMs);
            break;
        }
        }
    } else {
        /** calculate delta from last index time till now*/
        const lastIndex: number = timeline.length - 1;
        const diffToday = now.getTime() - timeline[lastIndex][0];
        addTimeToConnectionStatus(timeline[lastIndex][1], diffToday);

        for (let x = lastIndex; x >= 1; x--) {
            const diff = timeline[x][0] - timeline[x - 1][0];
            addTimeToConnectionStatus(timeline[x - 1][1], diff);
        }
    }
    itemStatus.timeConnectedInS = Math.round(itemStatus.timeConnectedInMs / 60000);
    itemStatus.timeDisconnectedInMin = Math.round(itemStatus.timeDisconnectedInMs / 60000);
    itemStatus.failureRatio = itemStatus.timeDisconnectedInMs / (itemStatus.timeDisconnectedInMs + itemStatus.timeConnectedInMs);

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
        case true: {
            addTimeConnected(time);
            break;
        }
        case false: {
            addTimeDisconnected(time);
            break;
        }
        default: {
            throw new Error('Unknown state.');
        }
        }
    }
}

/** One column per gateway in listing order; hideZeroPercentage drops the gateways without any downtime. */
export function downtimePerGateway(gateways: NetworksHistoryModel[], hideZeroPercentage: boolean, now: Date): GatewayDowntime[] {
    const result: GatewayDowntime[] = [];
    gateways.forEach((gateway) => {
        const failureRatio = Math.round(gatewayDowntime(gateway, now).failureRatio * 10000) / 10000;
        const label = Math.round(failureRatio * 10000) / 100 + '%';
        if (!hideZeroPercentage || failureRatio > 0) {
            result.push({ name: gateway.network.name, failureRatio, label });
        }
    });
    return result;
}

/** Google data table: the ratio as column value, the percentage text as label above the column. */
export function downtimePerGatewayTable(rows: GatewayDowntime[]): ChartDataTableModel {
    const dataTable = new ChartDataTableModel([['Name', 'Percentage', { role: 'annotation' }, { role: 'style' }]]);
    rows.forEach((row) => dataTable.data.push([row.name, row.failureRatio, row.label, deviceDowntimeGatewayColumnColor]));
    return dataTable;
}

export function downtimePerGatewayChart(dataTable: ChartDataTableModel, element: ChartElementSize): ChartsModel {
    return new ChartsModel('ColumnChart', dataTable.data, {
        chartArea: { width: element.widthPercentage, height: element.heightPercentage },
        width: element.width,
        height: element.height,
        legend: 'none',
        vAxis: { format: '#.## %' },
        tooltip: { trigger: 'none' },
    });
}
