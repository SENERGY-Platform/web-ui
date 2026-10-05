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
import { ConnectionStateModelV2 } from '../../../../../modules/devices/device-instances/shared/device-instances-history.model';
import { downtimePerGateway, downtimePerGatewayTable, gatewayDowntime } from './device-downtime-gateway-chart';

const hour = 3600000;
const day = 24 * hour;
const now = new Date(2026, 9, 5, 12, 0, 0);

function at(offsetMs: number): string {
    return new Date(now.getTime() + offsetMs).toISOString();
}

function gateway(
    name: string,
    connectionState: 'online' | 'offline' | '',
    prev?: boolean,
    states?: ConnectionStateModelV2[] | null,
): NetworksHistoryModel {
    const history = prev === undefined && states === undefined ? null : {
        id: name,
        next_state: null,
        prev_state: prev === undefined ? null : { connected: prev, time: at(-8 * day) },
        states: states === undefined ? [] : states,
    };
    return { network: { id: name, name, connection_state: connectionState } as any, history };
}

describe('gatewayDowntime', () => {
    it('takes the whole week from the connection state when nothing changed', () => {
        expect(gatewayDowntime(gateway('a', 'online'), now).failureRatio).toBe(0);
        expect(gatewayDowntime(gateway('b', 'offline'), now).failureRatio).toBe(1);
    });

    it('counts the time before the first change in the window with prev_state', () => {
        const status = gatewayDowntime(gateway('a', 'online', true, [{ connected: false, time: at(-day) }]), now);
        expect(status.timeConnectedInMs).toBe(6 * day);
        expect(status.timeDisconnectedInMs).toBe(day);
        expect(status.failureRatio).toBeCloseTo(1 / 7, 12);
    });

    it('ignores the time before the first change when there is no prev_state', () => {
        const status = gatewayDowntime(gateway('a', 'online', undefined, [
            { connected: true, time: at(-2 * day) },
            { connected: false, time: at(-day) },
        ]), now);
        expect(status.timeConnectedInMs).toBe(day);
        expect(status.timeDisconnectedInMs).toBe(day);
        expect(status.failureRatio).toBe(0.5);
    });

    it('spans the whole week with prev_state alone, even when states is null', () => {
        expect(gatewayDowntime(gateway('a', 'online', false, null), now).failureRatio).toBe(1);
    });
});

describe('downtimePerGateway', () => {
    it('rounds the ratio to 4 decimals and labels it as percentage with up to 2 decimals', () => {
        const rows = downtimePerGateway([gateway('Hub', 'online', true, [{ connected: false, time: at(-day) }])], false, now);
        expect(rows).toEqual([{ name: 'Hub', failureRatio: 0.1429, label: '14.29%' }]);
    });

    it('labels whole percentages without decimals', () => {
        const rows = downtimePerGateway([gateway('Up', 'online'), gateway('Down', 'offline'), gateway('Half', 'online', undefined, [
            { connected: true, time: at(-2 * day) },
            { connected: false, time: at(-day) },
        ])], false, now);
        expect(rows.map((r) => r.label)).toEqual(['0%', '100%', '50%']);
        expect(rows.map((r) => r.name)).toEqual(['Up', 'Down', 'Half']);
    });

    it('drops gateways without downtime when hideZeroPercentage is set', () => {
        const rows = downtimePerGateway([gateway('Up', 'online'), gateway('Down', 'offline')], true, now);
        expect(rows.map((r) => r.name)).toEqual(['Down']);
    });

    // A gateway with neither history nor a known state divides 0 by 0.
    it('labels a gateway without history and without connection state as NaN%', () => {
        const rows = downtimePerGateway([gateway('Unknown', '')], false, now);
        expect(rows.length).toBe(1);
        expect(rows[0].failureRatio).toBeNaN();
        expect(rows[0].label).toBe('NaN%');
        expect(downtimePerGateway([gateway('Unknown', '')], true, now)).toEqual([]);
    });

    // The service passes the time its module was loaded as now, so a change after that yields a negative share.
    it('yields a negative share for a change after now', () => {
        const rows = downtimePerGateway([gateway('Hub', 'online', true, [{ connected: false, time: at(hour) }])], false, now);
        expect(rows).toEqual([{ name: 'Hub', failureRatio: -0.006, label: '-0.6%' }]);
    });
});

describe('downtimePerGatewayTable (Google)', () => {
    it('uses the ratio as value, the percentage text as column label and #4484ce as colour', () => {
        expect(downtimePerGatewayTable([{ name: 'Hub', failureRatio: 0.1429, label: '14.29%' }]).data).toEqual([
            ['Name', 'Percentage', { role: 'annotation' }, { role: 'style' }],
            ['Hub', 0.1429, '14.29%', '#4484ce'],
        ]);
    });
});
