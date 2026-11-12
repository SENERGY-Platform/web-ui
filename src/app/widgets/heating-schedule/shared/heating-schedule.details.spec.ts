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

import { DeviceTypeModel } from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import {
    AIR_ASPECT,
    BATTERY_FUNCTION,
    CELSIUS_CHARACTERISTIC,
    HeatingDeviceValues,
    PERCENT_CHARACTERISTIC,
    TARGET_ASPECT,
    TEMPERATURE_FUNCTION,
    instanceStatus,
    lowBatteries,
    manualOverride,
    manualOverrideText,
    matchValueSources,
    meanRoom,
    readCommands,
    valuesFromResponses,
} from './heating-schedule.details';

const variable = (functionId: string, aspectIds: string[], sub: unknown[] = []) => ({ function_id: functionId, aspect_ids: aspectIds, sub_content_variables: sub, is_void: false, serialization_options: [] });
const service = (id: string, ...variables: unknown[]) => ({ id, outputs: variables.map((content_variable) => ({ content_variable })) });
const deviceType = (...services: unknown[]) => ({ id: 'dt', services } as unknown as DeviceTypeModel);

describe('heating schedule device details', () => {
    describe('value sources', () => {
        it('tells room and target apart by aspect, searches nested variables and takes the first match', () => {
            const type = deviceType(
                service('s-other', variable('urn:other', [])),
                service('s-target', variable(TEMPERATURE_FUNCTION, [TARGET_ASPECT])),
                service('s-temp',
                    variable('', [], [variable(TEMPERATURE_FUNCTION, [TARGET_ASPECT]), variable('', [], [variable(TEMPERATURE_FUNCTION, [AIR_ASPECT])])]),
                    variable(TEMPERATURE_FUNCTION, [AIR_ASPECT])),
                service('s-temp2', variable(TEMPERATURE_FUNCTION, [AIR_ASPECT])),
                service('s-battery', variable(BATTERY_FUNCTION, ['urn:aspect:device'])),
            );

            expect(matchValueSources('d1', type)).toEqual([
                { deviceId: 'd1', kind: 'room', serviceId: 's-temp', aspectId: AIR_ASPECT },
                { deviceId: 'd1', kind: 'target', serviceId: 's-target', aspectId: TARGET_ASPECT },
                { deviceId: 'd1', kind: 'battery', serviceId: 's-battery', aspectId: 'urn:aspect:device' },
            ]);
        });

        it('leaves out what the type does not deliver, and the battery aspect when the variable has none', () => {
            const type = deviceType(service('s1', variable(TEMPERATURE_FUNCTION, [TARGET_ASPECT])), service('s2', variable(BATTERY_FUNCTION, [])));

            expect(matchValueSources('d1', type)).toEqual([
                { deviceId: 'd1', kind: 'target', serviceId: 's1', aspectId: TARGET_ASPECT },
                { deviceId: 'd1', kind: 'battery', serviceId: 's2' },
            ]);
        });

        it('builds one read command per source with the characteristic', () => {
            const commands = readCommands([
                { deviceId: 'd1', kind: 'room', serviceId: 's1', aspectId: AIR_ASPECT },
                { deviceId: 'd1', kind: 'battery', serviceId: 's2' },
            ]);

            expect(commands).toEqual([
                { function_id: TEMPERATURE_FUNCTION, device_id: 'd1', service_id: 's1', aspect_id: AIR_ASPECT, characteristic_id: CELSIUS_CHARACTERISTIC },
                { function_id: BATTERY_FUNCTION, device_id: 'd1', service_id: 's2', characteristic_id: PERCENT_CHARACTERISTIC },
            ]);
        });

        it('reads numbers, also as text, and drops entries that are not 200 or not numeric', () => {
            const sources = [
                { deviceId: 'd1', kind: 'room' as const, serviceId: 's' },
                { deviceId: 'd1', kind: 'target' as const, serviceId: 's' },
                { deviceId: 'd1', kind: 'battery' as const, serviceId: 's' },
                { deviceId: 'd2', kind: 'room' as const, serviceId: 's' },
                { deviceId: 'd3', kind: 'room' as const, serviceId: 's' },
            ];
            const values = valuesFromResponses(sources, [
                { status_code: 200, message: 21.5 },
                { status_code: 500, message: 22 },
                { status_code: 200, message: '80' },
                { status_code: 200, message: 'n/a' },
                { status_code: 200, message: null },
            ]);

            expect(values.get('d1')).toEqual({ room: 21.5, battery: 80 });
            expect(values.has('d2')).toBeFalse();
            expect(values.has('d3')).toBeFalse();
        });
    });

    describe('zone values', () => {
        const values = new Map<string, HeatingDeviceValues>([
            ['a', { room: 21, battery: 20 }],
            ['b', { room: 22.5, battery: 21 }],
            ['c', { target: 23, battery: 5.4 }],
        ]);

        it('averages the rooms that report one to one decimal and says null without any', () => {
            expect(meanRoom(['a', 'b', 'c'], values)).toBe(21.8);
            expect(meanRoom(['c'], values)).toBeNull();
            expect(meanRoom([], values)).toBeNull();
        });

        it('names thermostats at or below 20 percent only', () => {
            const devices = ['a', 'b', 'c', 'd'].map((deviceId) => ({ deviceId, label: 'T' + deviceId }));

            expect(lowBatteries(devices, values)).toEqual([{ label: 'Ta', percent: 20 }, { label: 'Tc', percent: 5 }]);
        });
    });

    describe('manual override', () => {
        const now = Date.parse('2026-11-10T20:00:00Z');
        const switched = (minutesAgo: number) => ({ at: now - minutesAgo * 60000, temperature: 21 });
        const point = (...targets: number[]) => new Map<string, HeatingDeviceValues>(targets.map((target, i) => ['d' + i, { target }]));
        const ids = ['d0', 'd1', 'd2'];

        it('needs a set point at least 0.5 degrees off, compared exactly', () => {
            expect(manualOverride(21, ids, point(21.4), now, null)).toBeNull();
            expect(manualOverride(21, ids, point(21.5), now, null)).toEqual({ temperature: 21.5 });
            expect(manualOverride(20.8, ids, point(21.3), now, null)).toEqual({ temperature: 21.3 });
            expect(manualOverride(21, ids, point(20.5), now, null)).toEqual({ temperature: 20.5 });
        });

        it('waits more than 10 minutes after the last switch', () => {
            expect(manualOverride(21, ids, point(23), now, switched(10))).toBeNull();
            expect(manualOverride(21, ids, point(23), now, switched(11))).toEqual({ temperature: 23 });
            expect(manualOverride(21, ids, point(23), now, null)).toEqual({ temperature: 23 });
        });

        it('leaves the value out when the deviating devices differ and ignores devices without a set point', () => {
            expect(manualOverride(21, ids, point(23, 24), now, null)).toEqual({ temperature: null });
            expect(manualOverride(21, ids, point(23, 23, 21), now, null)).toEqual({ temperature: 23 });
            expect(manualOverride(21, ['x'], point(23), now, null)).toBeNull();
        });

        it('words the pill with value and end time as available', () => {
            const next = { at: Date.parse('2026-11-10T21:00:00Z'), temperature: 17 };

            expect(manualOverrideText({ temperature: 23 }, next, now)).toBe('Manual 23 °C until 22:00');
            expect(manualOverrideText({ temperature: null }, next, now)).toBe('Manual until 22:00');
            expect(manualOverrideText({ temperature: 23 }, null, now)).toBe('Manual 23 °C');
        });
    });

    describe('instance status', () => {
        it('lets an error win, then not ready, else running', () => {
            expect(instanceStatus({ ready: true, error: 'boom' })).toEqual({ kind: 'error', text: 'boom', title: null });
            expect(instanceStatus({ ready: false, error: 'boom' }).kind).toBe('error');
            expect(instanceStatus({ ready: false, error: null })).toEqual({ kind: 'starting', text: 'Starting', title: null });
            expect(instanceStatus({ ready: true })).toEqual({ kind: 'running', text: 'Running', title: null });
        });

        it('shortens a long error and keeps the full text as title', () => {
            const long = 'x'.repeat(100);
            const status = instanceStatus({ ready: false, error: long });

            expect(status.text.length).toBeLessThan(long.length);
            expect(status.text.endsWith('…')).toBeTrue();
            expect(status.title).toBe(long);
        });
    });
});
