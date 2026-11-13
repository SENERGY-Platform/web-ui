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
    WARMUP_COLUMNS,
    ZoneWarmup,
    hatchSpans,
    learningText,
    nextWindowText,
    parseWarmupRow,
    rowDay,
    stationLine,
    warmingText,
    warmupByZone,
    warmupConfig,
} from './heating-schedule.warmup';
import { berlinParts, temperatureColor } from './heating-schedule.plan';

/** Tuesday 2026-11-10 04:00 local (03:00 UTC); the boundary 06:00 local is 05:00 UTC. */
const NOW = Date.UTC(2026, 10, 10, 3, 0);
const FIVE_UTC = '2026-11-10T05:00:00Z';
const PAST_UTC = '2026-11-10T02:00:00Z';

const stationA = '{"id":"4","name":"Leipzig","distance_km":12.34}';
const stationB = '{"id":"5","name":"Halle","distance_km":8.1}';

/** `[time, ...WARMUP_COLUMNS]` */
function row(values: Partial<Record<typeof WARMUP_COLUMNS[number], unknown>>): unknown[] {
    return ['2026-11-10T02:30:00Z', ...WARMUP_COLUMNS.map((name) => values[name] ?? null)];
}

/** zone 0 has a model, two windows (one past); zone 1 is still learning */
const modelRow = row({
    zone_name: 'Bath', warmup_minutes: 35, next_start: FIVE_UTC, next_target: 21, next_lead_minutes: 35,
    windows: JSON.stringify([
        { start: PAST_UTC, target: 19, outdoor: 3, lead_minutes: 20 },
        { start: FIVE_UTC, target: 21, outdoor: 3, lead_minutes: 35 },
    ]),
    measure_station: stationA, forecast_station: stationB, a: 1.5, b: 0.1, episodes: 5,
});
const learningRow = row({ zone_name: 'Rest', episodes: 2 });

describe('warmupConfig', () => {
    const module = (data: Record<string, unknown>, type = 'widget') => ({ module_type: type, module_data: data });

    it('takes the export and mode of the heating widget module', () => {
        const config = warmupConfig([
            module({ widget_key: 'other', widget_data: { warmup_export_id: 'x', warmup_mode: 'plan' } }),
            module({ widget_key: 'heating_schedule', widget_data: { warmup_export_id: 'e1', warmup_mode: 'plan' } }),
        ]);
        expect(config).toEqual({ exportId: 'e1', mode: 'plan' });
    });

    it('is null for an instance without the keys, as all older ones', () => {
        expect(warmupConfig([module({ widget_key: 'heating_schedule', widget_data: {} })])).toBeNull();
        expect(warmupConfig([module({ widget_key: 'heating_schedule' })])).toBeNull();
        expect(warmupConfig([])).toBeNull();
    });

    it('reads any other mode as show', () => {
        expect(warmupConfig([module({ widget_key: 'heating_schedule', widget_data: { warmup_export_id: 'e1', warmup_mode: 'show' } })])?.mode).toBe('show');
    });
});

describe('warmupByZone', () => {
    it('takes the first row of each zone query and null where a zone has none', () => {
        const zones = warmupByZone([[modelRow], [], [learningRow]], 3);
        expect(zones[0]?.warmupMinutes).toBe(35);
        expect(zones[1]).toBeNull();
        expect(zones[2]?.modelKnown).toBeFalse();
    });

    it('keeps a row whose JSON fields cannot be read, without those fields', () => {
        spyOn(console, 'error');
        const broken = row({ windows: '{not json', measure_station: '[', warmup_minutes: 3 });
        const zone = warmupByZone([[broken]], 1)[0] as ZoneWarmup;
        expect(zone.warmupMinutes).toBe(3);
        expect(zone.windows).toEqual([]);
        expect(zone.measureStation).toEqual({ id: null, name: null, distanceKm: null });
    });

    it('treats trailing columns the answer cut off as missing', () => {
        const zone = warmupByZone([[['2026-11-10T02:30:00Z', 'Bath', 12]]], 1)[0] as ZoneWarmup;
        expect(zone.warmupMinutes).toBe(12);
        expect(zone.nextStart).toBeNull();
        expect(zone.episodes).toBeNull();
    });
});

describe('warmingText', () => {
    const minutes = (value: number | null) => ({ ...parseWarmupRow(learningRow), warmupMinutes: value });

    it('names the target and the remaining time', () => {
        expect(warmingText(minutes(35), 21)).toBe('Warming up to 21 °C, about 35 min left');
        expect(warmingText(minutes(65), 21.5)).toBe('Warming up to 21.5 °C, about 1 h 5 min left');
    });

    it('says almost there under a minute', () => {
        expect(warmingText(minutes(0), 21)).toBe('Warming up to 21 °C, almost there');
    });

    it('says the target is not reachable for -1', () => {
        expect(warmingText(minutes(-1), 21)).toBe('21 °C is not reachable at this outdoor temperature');
    });

    it('shows nothing without a value or a row', () => {
        expect(warmingText(minutes(null), 21)).toBeNull();
        expect(warmingText(null, 21)).toBeNull();
    });
});

describe('nextWindowText', () => {
    const model = parseWarmupRow(modelRow);

    it('plan: heating start from the lead time and the boundary', () => {
        expect(nextWindowText(model, 'plan', NOW)).toBe('Heats from 05:25 for 21 °C at 06:00');
    });

    it('plan: a start already past reads as heating', () => {
        expect(nextWindowText(model, 'plan', Date.UTC(2026, 10, 10, 4, 40))).toBe('Heating for 21 °C at 06:00');
    });

    it('show: needs the lead time', () => {
        expect(nextWindowText(model, 'show', NOW)).toBe('Needs about 35 min to reach 21 °C at 06:00');
    });

    it('ignores a boundary in the past and one without a lead time', () => {
        expect(nextWindowText(model, 'plan', Date.UTC(2026, 10, 10, 5, 1))).toBeNull();
        expect(nextWindowText({ ...model, nextLeadMinutes: null }, 'plan', NOW)).toBeNull();
        expect(nextWindowText(null, 'show', NOW)).toBeNull();
    });
});

describe('learningText', () => {
    it('counts the warm-ups seen so far', () => {
        expect(learningText(parseWarmupRow(learningRow))).toBe('Learning the warm-up time (2 of 3 warm-ups seen)');
    });

    it('has no count without a row or an episode count', () => {
        expect(learningText(null)).toBe('Learning the warm-up time');
        expect(learningText(parseWarmupRow(row({})))).toBe('Learning the warm-up time');
    });

    it('is silent once a model exists', () => {
        expect(learningText(parseWarmupRow(modelRow))).toBeNull();
    });
});

describe('hatchSpans', () => {
    const model = parseWarmupRow(modelRow);
    const today = berlinParts(NOW).day;

    it('draws only the future window, from start - lead to start, in the colour of its temperature', () => {
        const spans = hatchSpans(model, 'plan', NOW, today);
        expect(spans.length).toBe(1);
        expect(spans[0].left).toBeCloseTo((325 / 1440) * 100, 6);
        expect(spans[0].width).toBeCloseTo((35 / 1440) * 100, 6);
        expect(spans[0].color).toBe(temperatureColor(21));
        expect(spans[0].opacity).toBe(1);
    });

    it('is lighter in mode show', () => {
        expect(hatchSpans(model, 'show', NOW, today)[0].opacity).toBeLessThan(1);
    });

    it('clips a phase that crosses midnight to the day of the row', () => {
        const night = { ...model, windows: [{ start: Date.UTC(2026, 10, 10, 23, 10), target: 21, leadMinutes: 30 }] };
        const first = hatchSpans(night, 'plan', NOW, today);
        const second = hatchSpans(night, 'plan', NOW, today + 1);
        // 23:10 UTC is 00:10 local on the next day; the phase runs 23:40 to 00:10 local
        expect(first.length).toBe(1);
        expect(first[0].left).toBeCloseTo((1420 / 1440) * 100, 6);
        expect(first[0].width).toBeCloseTo((20 / 1440) * 100, 6);
        expect(second.length).toBe(1);
        expect(second[0].left).toBe(0);
        expect(second[0].width).toBeCloseTo((10 / 1440) * 100, 6);
    });

    it('skips windows without a lead time', () => {
        expect(hatchSpans({ ...model, windows: [{ start: Date.UTC(2026, 10, 10, 5), target: 21, leadMinutes: 0 }] }, 'plan', NOW, today)).toEqual([]);
        expect(hatchSpans(null, 'plan', NOW, today)).toEqual([]);
    });

    it('maps a week row to the next day with that weekday', () => {
        expect(rowDay(NOW, 1)).toBe(today);
        expect(rowDay(NOW, 2)).toBe(today + 1);
        expect(rowDay(NOW, 0)).toBe(today + 6);
    });
});

describe('stationLine', () => {
    const rows = (values: Parameters<typeof row>[0]) => [parseWarmupRow(row(values))];

    it('names both stations with their distance', () => {
        expect(stationLine(rows({ measure_station: stationA, forecast_station: stationB }))).toBe('Outdoor: Leipzig (12.3 km) · Forecast: Halle (8.1 km)');
    });

    it('says own sensor when no station is in use', () => {
        expect(stationLine(rows({}))).toBe('Outdoor: own sensor');
    });

    it('leaves out an unknown name or distance, and shows nothing when both are unknown', () => {
        expect(stationLine(rows({ measure_station: '{"id":"4","name":null,"distance_km":2}', forecast_station: '{"id":null,"name":"Halle","distance_km":null}' }))).toBe('Outdoor: (2 km) · Forecast: Halle');
        expect(stationLine(rows({ measure_station: '{"id":null,"name":null,"distance_km":null}', forecast_station: '{"id":null,"name":null,"distance_km":null}' }))).toBeNull();
    });

    it('takes the stations of the first zone that has a row, and nothing without rows', () => {
        expect(stationLine([null, parseWarmupRow(row({ measure_station: stationA }))])).toBe('Outdoor: Leipzig (12.3 km)');
        expect(stationLine([null, null])).toBeNull();
    });
});
