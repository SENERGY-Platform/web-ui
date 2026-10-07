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

import { NetworksHistoryModel } from '../../../../../modules/devices/networks/shared/networks-history.model';
import { DeviceDowntimeGatewayModel } from './device-downtime-gateway.model';

export const deviceDowntimeGatewayColumnColor = '#4484ce';
/** The window the downtime is computed over, ending at "now". */
export const deviceDowntimeGatewayWindowMs = 86400000 * 7;

export interface GatewayDowntime {
    name: string;
    /** disconnected share of the window, rounded to 4 decimals; null when nothing is known about the gateway */
    failureRatio: number | null;
    /** the label above the column, e.g. "12.34%"; empty without a ratio */
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
        const diffToday = Math.max(0, now.getTime() - timeline[lastIndex][0]);
        addTimeToConnectionStatus(timeline[lastIndex][1], diffToday);

        for (let x = lastIndex; x >= 1; x--) {
            // a change stamped after the next one (clocks out of step) adds no time instead of a negative one
            const diff = Math.max(0, timeline[x][0] - timeline[x - 1][0]);
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

/**
 * One column per gateway in listing order; hideZeroPercentage drops the gateways without any downtime. now is the end
 * of the window, the time of the call; a gateway without any known time has no ratio and no label.
 */
export function downtimePerGateway(gateways: NetworksHistoryModel[], hideZeroPercentage: boolean, now: Date): GatewayDowntime[] {
    const result: GatewayDowntime[] = [];
    gateways.forEach((gateway) => {
        const ratio = gatewayDowntime(gateway, now).failureRatio;
        const failureRatio = Number.isFinite(ratio) ? Math.round(ratio * 10000) / 10000 : null;
        const label = failureRatio === null ? '' : Math.round(failureRatio * 10000) / 100 + '%';
        if (!hideZeroPercentage || (failureRatio !== null && failureRatio > 0)) {
            result.push({ name: gateway.network.name, failureRatio, label });
        }
    });
    return result;
}

