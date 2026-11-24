/*
 * Copyright 2026 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


import { ThingModel, openMeterLinks, parseFactor, parseReadingValue, thingAttributeError } from './things.model';

describe('thingAttributeError', () => {
    const now = new Date('2026-11-12T12:00:00Z');
    const error = (key: string, value: string) => thingAttributeError({ key, value }, now);

    it('accepts decimals with a dot inside the range of the key', () => {
        expect(error('energy/rated-power', '2.5')).toBeNull();
        expect(error('energy/relative-usage', '0')).toBeNull();
        expect(error('energy/relative-usage', '1')).toBeNull();
        expect(error('energy/standby-power', '0')).toBeNull();
        expect(error('energy/annual-consumption', '100000000')).toBeNull();
        expect(error('energy/quantity', '100000')).toBeNull();
        expect(error('energy/build-year', '2027')).toBeNull();
    });

    it('asks for a dot instead of a comma or other text', () => {
        expect(error('energy/capacity', '2,5')).toBe('Enter a number with a dot, e.g. 1.5');
        expect(error('energy/capacity', '')).toBe('Enter a number with a dot, e.g. 1.5');
        expect(error('energy/capacity', '1e3')).toBe('Enter a number with a dot, e.g. 1.5');
    });

    it('asks for a whole number where the key counts or names a year', () => {
        expect(error('energy/quantity', '1.5')).toBe('Enter a whole number');
        expect(error('energy/build-year', '2020.0')).toBe('Enter a whole number');
    });

    it('names the range, with an exclusive lower bound where zero is not allowed', () => {
        expect(error('energy/rated-power', '0')).toBe('Must be greater than 0 and at most 100000');
        expect(error('energy/rated-power', '100000.1')).toBe('Must be greater than 0 and at most 100000');
        expect(error('energy/relative-usage', '1.01')).toBe('Must be between 0 and 1');
        expect(error('energy/standby-power', '-1')).toBe('Must be between 0 and 100000');
        expect(error('energy/quantity', '0')).toBe('Must be between 1 and 100000');
        expect(error('energy/annual-consumption', '100000001')).toBe('Must be greater than 0 and at most 100000000');
    });

    it('lets the year of construction run to the year after the current one', () => {
        expect(error('energy/build-year', '1899')).toBe('Must be between 1900 and 2027');
        expect(error('energy/build-year', '2028')).toBe('Must be between 1900 and 2027');
    });

    it('takes any value for a key outside the list', () => {
        expect(error('power', 'two kW')).toBeNull();
    });
});

describe('openMeterLinks', () => {
    const thing = (kind: ThingModel['kind'], links: { id: string; device_id: string; until: string | null }[]): ThingModel => ({
        id: 't-' + kind + links.length,
        name: 'n',
        kind,
        attributes: [],
        content_variables: [],
        owner_id: 'u',
        device_links: links.map((l) => ({ ...l, from: '2026-01-01T00:00:00Z' })),
    });

    it('finds the open link of the device on a meter and ignores ended links and other devices', () => {
        const meter = thing('meter', [
            { id: 'l1', device_id: 'd1', until: '2026-02-01T00:00:00Z' },
            { id: 'l2', device_id: 'd1', until: null },
            { id: 'l3', device_id: 'd2', until: null },
        ]);
        const found = openMeterLinks([meter], 'd1');
        expect(found.map((f) => f.link.id)).toEqual(['l2']);
    });

    it('ignores consumers and things without kind', () => {
        const open = [{ id: 'l1', device_id: 'd1', until: null }];
        expect(openMeterLinks([thing('consumer', open), thing(undefined, open)], 'd1')).toEqual([]);
    });
});

describe('parseReadingValue and parseFactor', () => {
    it('reads numbers with a dot or a comma and treats an empty entry as no value', () => {
        expect(parseReadingValue('12.5')).toBe(12.5);
        expect(parseReadingValue('12,5')).toBe(12.5);
        expect(parseReadingValue(' ')).toBeUndefined();
        expect(parseReadingValue('abc')).toBeNull();
    });

    it('accepts a factor greater than 0 only', () => {
        expect(parseFactor('40')).toBe(40);
        expect(parseFactor('')).toBeUndefined();
        expect(parseFactor('0')).toBeNull();
        expect(parseFactor('-2')).toBeNull();
    });
});
