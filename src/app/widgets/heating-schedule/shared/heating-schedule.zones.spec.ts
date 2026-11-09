/*
 * Copyright (c) 2026 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */


import { HeatingWindow, parseHeatingPlan } from './heating-schedule.plan';
import { ZONE_VECTORS } from './heating-schedule.zones.fixtures';
import { HeatingZone, parseThermostats, parseZoneDocument, resolveSchedule, resolveZones, serialiseZones } from './heating-schedule.zones';

const WORK: HeatingWindow = { weekdays: [0, 1, 2, 3, 4], from: '06:00', to: '20:00', temperature: 20 };

/** the stored shape: one JSON text holding a list of JSON-text options */
const optionText = (id: string, label: string) => JSON.stringify({ device_selection: { device_id: id, service_id: null, path: null }, label });
const thermostatsText = (...ids: string[]) => JSON.stringify(ids.map((id) => optionText(id, 'T ' + id)));

describe('zone resolution of the smart service', () => {
    for (const vector of ZONE_VECTORS) {
        it(vector.name, () => {
            const resolve = () => resolveSchedule(vector.schedule, vector.setback, vector.thermostats);
            if (vector.error !== undefined) {
                expect(resolve).toThrow();
                return;
            }
            expect(resolve().map((zone) => ({ name: zone.name, devices: zone.devices, windows: zone.plan.windows, setback: zone.plan.setback }))).toEqual(
                vector.zones!.map((zone) => ({ name: zone.name, devices: zone.devices, windows: zone.windows, setback: zone.setback })),
            );
        });
    }

    it('keeps the plan logic of one zone the same as the one-plan reading', () => {
        const vector = ZONE_VECTORS[0];

        expect(resolveSchedule(vector.schedule, vector.setback, vector.thermostats)[0].plan).toEqual(parseHeatingPlan(vector.schedule, vector.setback));
    });

    it('shows the labels of the options', () => {
        const zones = resolveSchedule('{"windows":[]}', 17, ZONE_VECTORS[0].thermostats);

        expect(zones[0].labels).toEqual(['Thermostat aaa', 'Thermostat bbb']);
    });

    it('lets the legacy shape stand without a selected thermostat but not the zones shape', () => {
        expect(resolveSchedule('{"windows":[]}', 17, '[]').map((zone) => zone.devices)).toEqual([[]]);
        expect(() => resolveSchedule('{"zones":[{"windows":[]}]}', 17, '[]')).toThrow();
    });
});

describe('thermostat options', () => {
    it('reads the stored JSON text of JSON-text options and a real list alike', () => {
        const expected = [{ deviceId: 'urn:a', label: 'T urn:a' }, { deviceId: 'urn:b', label: 'T urn:b' }];

        expect(parseThermostats(thermostatsText('urn:a', 'urn:b'))).toEqual(expected);
        expect(parseThermostats([optionText('urn:a', 'T urn:a'), { device_selection: { device_id: 'urn:b' }, label: 'T urn:b' }])).toEqual(expected);
    });

    it('takes the device id as label without a label and skips duplicates and options without a device', () => {
        expect(parseThermostats(['{"device_selection":{"device_id":"urn:a"}}', '{"device_selection":{"device_id":"urn:a"},"label":"again"}', '{}'])).toEqual([{ deviceId: 'urn:a', label: 'urn:a' }]);
        expect(parseThermostats(null)).toEqual([]);
        expect(parseThermostats('')).toEqual([]);
    });

    it('refuses what is not a list', () => {
        expect(() => parseThermostats('{"a":1}')).toThrow();
        expect(() => parseThermostats('nope')).toThrow();
    });
});

describe('zone schedule serialisation', () => {
    const roundTrip = (zones: HeatingZone[]) => parseZoneDocument(serialiseZones(zones));

    it('writes one rest zone without an own setback in the legacy shape', () => {
        const text = serialiseZones([{ name: 'Alle', devices: null, windows: [WORK], setback: null }]);

        expect(text).toBe('{"windows":[{"weekdays":[0,1,2,3,4],"from":"06:00","to":"20:00","temperature":20}]}');
        expect(parseZoneDocument(text).legacy).toBeTrue();
    });

    it('writes a renamed lone rest zone in the zones shape so the name survives, an unnamed one in the legacy shape', () => {
        const renamed = serialiseZones([{ name: 'Living', devices: null, windows: [WORK], setback: null }]);

        expect(renamed.startsWith('{"zones":[{"name":"Living","windows"')).toBeTrue();
        expect(parseZoneDocument(renamed).zones[0].name).toBe('Living');
        expect(serialiseZones([{ name: '  ', devices: null, windows: [], setback: null }])).toBe('{"windows":[]}');
        expect(serialiseZones([{ name: ' Alle ', devices: null, windows: [], setback: null }])).toBe('{"windows":[]}');
    });

    it('keeps a device id that is not selected through a round trip', () => {
        const zones: HeatingZone[] = [{ name: 'Bad', devices: ['urn:gone', 'urn:a'], windows: [], setback: null }];

        expect(parseZoneDocument(serialiseZones(zones)).zones).toEqual(zones);
    });

    it('writes zones for one zone with devices, with an own setback, or for several', () => {
        expect(serialiseZones([{ name: 'Bad', devices: ['urn:a'], windows: [], setback: null }])).toBe('{"zones":[{"name":"Bad","devices":["urn:a"],"windows":[]}]}');
        expect(serialiseZones([{ name: 'Alle', devices: null, windows: [], setback: 19 }])).toBe('{"zones":[{"name":"Alle","windows":[],"setback":19}]}');
    });

    it('leaves devices out for the rest zone and setback out when it is not own', () => {
        const text = serialiseZones([
            { name: 'Bad', devices: ['urn:a'], windows: [WORK], setback: 19 },
            { name: 'Rest', devices: null, windows: [], setback: null },
        ]);

        expect(JSON.parse(text).zones[1]).toEqual({ name: 'Rest', windows: [] });
        expect(text).toBe('{"zones":[{"name":"Bad","devices":["urn:a"],"windows":[{"weekdays":[0,1,2,3,4],"from":"06:00","to":"20:00","temperature":20}],"setback":19},{"name":"Rest","windows":[]}]}');
    });

    it('reads back what it wrote, in both shapes', () => {
        const zones: HeatingZone[] = [
            { name: 'Bad', devices: ['urn:a', 'urn:b'], windows: [WORK], setback: 19 },
            { name: 'Rest', devices: null, windows: [{ weekdays: [5, 6], from: '22:00', to: '06:00', temperature: 21.5 }], setback: null },
        ];

        expect(roundTrip(zones)).toEqual({ legacy: false, zones });
        expect(roundTrip([{ name: 'Alle', devices: null, windows: [WORK], setback: null }])).toEqual({
            legacy: true,
            zones: [{ name: 'Alle', devices: null, windows: [WORK], setback: null }],
        });
    });

    it('is understood by the resolution the same way', () => {
        const zones: HeatingZone[] = [
            { name: 'Bad', devices: ['urn:b'], windows: [WORK], setback: 19 },
            { name: 'Rest', devices: null, windows: [], setback: null },
        ];

        const resolved = resolveSchedule(serialiseZones(zones), 17, thermostatsText('urn:a', 'urn:b', 'urn:c'));

        expect(resolved.map((zone) => [zone.name, zone.devices, zone.plan.setback])).toEqual([['Bad', ['urn:b'], 19], ['Rest', ['urn:a', 'urn:c'], 17]]);
    });
});

describe('resolveZones rules', () => {
    const selected = [{ deviceId: 'urn:a', label: 'A' }, { deviceId: 'urn:b', label: 'B' }];

    it('names an unnamed zone by its position', () => {
        expect(resolveZones([{ name: ' ', devices: ['urn:a'], windows: [], setback: null }], 17, selected)[0].name).toBe('Zone 1');
    });

    it('refuses a device in two zones with the label and the zone names', () => {
        expect(() => resolveZones([
            { name: 'X', devices: ['urn:a'], windows: [], setback: null },
            { name: 'Y', devices: ['urn:a'], windows: [], setback: null },
        ], 17, selected)).toThrowError(/A.*X.*Y/);
    });

    it('refuses a second rest zone', () => {
        expect(() => resolveZones([
            { name: 'X', devices: null, windows: [], setback: null },
            { name: 'Y', devices: null, windows: [], setback: null },
        ], 17, selected)).toThrowError(/Only one zone/);
    });

    it('refuses a non-numeric setback of the instance', () => {
        expect(() => resolveZones([{ name: 'X', devices: null, windows: [], setback: null }], 'x', selected)).toThrow();
    });
});
