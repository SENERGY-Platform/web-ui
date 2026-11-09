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

import {
    HeatingPlanError,
    daySegments,
    nextSwitch,
    nextSwitchText,
    parseHeatingPlan,
    serialiseSchedule,
    target,
} from './heating-schedule.plan';
import { INVALID_VECTORS, VALID_VECTORS } from './heating-schedule.vectors.fixtures';

const DAY = 86400000;

describe('heating schedule plan', () => {
    for (const vector of VALID_VECTORS) {
        it(`reproduces the process script: ${vector.plan} at ${vector.now}`, () => {
            const plan = parseHeatingPlan(vector.schedule, vector.setback);
            const now = Date.parse(vector.now);
            const next = nextSwitch(plan, now);

            expect(target(plan, now)).toBe(vector.temperature);
            // the script reports a constant plan as now + 7 days with the unchanged temperature
            if (Date.parse(vector.next_at) === now + 7 * DAY && vector.next_temperature === vector.temperature) {
                expect(next).toBeNull();
            } else {
                expect(next).not.toBeNull();
                expect(new Date(next!.at).toISOString()).toBe(vector.next_at);
                expect(next!.temperature).toBe(vector.next_temperature);
            }
        });
    }

    for (const vector of INVALID_VECTORS) {
        it(`rejects ${vector.schedule} with setback ${JSON.stringify(vector.setback)}`, () => {
            expect(() => parseHeatingPlan(vector.schedule, vector.setback)).toThrowError(HeatingPlanError);
        });
    }

    it('keeps a plan unchanged through parse and serialise', () => {
        const text = '{"windows":[{"weekdays":[0,1],"from":"06:00","to":"08:30","temperature":21.5},{"weekdays":[6],"from":"22:00","to":"02:00","temperature":19}]}';

        expect(serialiseSchedule(parseHeatingPlan(text, 17).windows)).toBe(text);
    });

    it('reads a missing weekday list as every day and pads the hour', () => {
        const plan = parseHeatingPlan('{"windows":[{"from":"6:00","to":"7:00","temperature":20}]}', '17');

        expect(plan.windows[0]).toEqual({ weekdays: [0, 1, 2, 3, 4, 5, 6], from: '06:00', to: '07:00', temperature: 20 });
        expect(plan.setback).toBe(17);
    });

    it('lets a window past midnight reach into the next day only', () => {
        const plan = parseHeatingPlan('{"windows":[{"weekdays":[4],"from":"22:00","to":"02:00","temperature":19}]}', 16);

        expect(daySegments(plan, 4)).toEqual([{ from: 0, to: 1320, temperature: 16 }, { from: 1320, to: 1440, temperature: 19 }]);
        expect(daySegments(plan, 5)).toEqual([{ from: 0, to: 120, temperature: 19 }, { from: 120, to: 1440, temperature: 16 }]);
        expect(daySegments(plan, 3)).toEqual([{ from: 0, to: 1440, temperature: 16 }]);
    });

    it('names the date when the next switch is a week ahead', () => {
        const plan = parseHeatingPlan('{"windows":[{"weekdays":[0],"from":"06:00","to":"08:00","temperature":20}]}', 17);
        const monday = Date.parse('2026-11-09T07:00:00Z');

        expect(nextSwitchText(nextSwitch(plan, monday)!, monday)).toBe('20 °C from Mon 16 Nov 06:00');
    });

    it('words the next switch with the weekday only when it is not on the same local day', () => {
        const plan = parseHeatingPlan('{"windows":[{"weekdays":[0,1,2,3,4],"from":"06:00","to":"20:00","temperature":20}]}', 17);
        const friday = Date.parse('2026-11-13T19:00:00Z');
        const monday = Date.parse('2026-11-09T05:00:00Z');

        expect(nextSwitchText(nextSwitch(plan, friday)!, friday)).toBe('20 °C from Mon 06:00');
        expect(nextSwitchText(nextSwitch(plan, monday)!, monday)).toBe('17 °C from 20:00');
    });
});
