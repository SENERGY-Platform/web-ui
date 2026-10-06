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

import { humidityPoints, ventilationRanges } from './bad-ventilation-chart';
import { VentilationResult } from './model';

const minute = 60000;
const t0 = Date.UTC(2026, 9, 5, 8);
const at = (minutes: number) => t0 + minutes * minute;
const iso = (minutes: number) => new Date(at(minutes)).toISOString();

function result(minutes: number, windowOpen: boolean, highHumidityAt?: number): VentilationResult {
    return { timestamp: iso(minutes), window_open: windowOpen, humidity_too_fast_too_high: highHumidityAt === undefined ? '' : iso(highHumidityAt) };
}

describe('humidityPoints', () => {
    it('plots every value at its timestamp', () => {
        expect(humidityPoints([{ timestamp: iso(0), value: 55.5 }, { timestamp: iso(1), value: 60 }])).toEqual([
            { x: at(0), y: 55.5 },
            { x: at(1), y: 60 },
        ]);
    });
});

describe('ventilationRanges', () => {
    it('marks an open window from its opening until it was closed', () => {
        expect(ventilationRanges([result(20, false), result(10, true)])).toEqual([
            { from: at(10), to: at(20), color: '#097969', label: 'Open Window' },
        ]);
    });

    it('marks a high humidity increase from the closed window before it', () => {
        expect(ventilationRanges([result(30, false, 28), result(20, false), result(10, true)])).toEqual([
            { from: at(20), to: at(28), color: '#EE4B2B', label: 'High Humidity Increase' },
            { from: at(10), to: at(20), color: '#097969', label: 'Open Window' },
        ]);
    });

    it('ignores a high humidity increase right after an open window', () => {
        expect(ventilationRanges([result(30, false, 28), result(20, true)])).toEqual([]);
    });

    it('ignores two closed windows in a row and an open window as newest result', () => {
        expect(ventilationRanges([result(30, false), result(20, false)])).toEqual([]);
        expect(ventilationRanges([result(30, true), result(20, false)])).toEqual([]);
    });

    it('needs an older result to mark anything', () => {
        expect(ventilationRanges([])).toEqual([]);
        expect(ventilationRanges([result(30, false, 28)])).toEqual([]);
    });
});
