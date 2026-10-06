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

import { decimalPlaces, hoverColor, valueAxisLabel, withOpacity, xRangeAnnotations } from './chart-look';

describe('valueAxisLabel', () => {
    it('shows decimalsInFloat places as soon as the data has decimals, as "20.000"', () => {
        expect(valueAxisLabel(20, 2, 3)).toBe('20.000');
        expect(valueAxisLabel(51.01, 2, 3)).toBe('51.010');
    });

    it('falls back to the decimal places of the data', () => {
        expect(valueAxisLabel(5, 2)).toBe('5.00');
    });

    it('shows whole numbers for integer data, one place only for ticks between them', () => {
        expect(valueAxisLabel(40, 0, 3)).toBe('40');
        expect(valueAxisLabel(2.5, 0)).toBe('2.5');
    });
});

describe('decimalPlaces', () => {
    it('is the most decimal places of any value, ignoring non-numbers', () => {
        expect(decimalPlaces([1, 2.5, 3.125, null, 'x', NaN])).toBe(3);
        expect(decimalPlaces([1, 2, 3])).toBe(0);
        expect(decimalPlaces([1.5e-7])).toBe(8);
    });
});

describe('withOpacity', () => {
    it('turns a colour into rgba with the series opacity by default', () => {
        expect(withOpacity('#008FFB')).toBe('rgba(0, 143, 251, 0.85)');
        expect(withOpacity('#FF4C4C', 0.4)).toBe('rgba(255, 76, 76, 0.4)');
    });

    it('leaves unparsable colours alone', () => {
        expect(withOpacity('not a colour')).toBe('not a colour');
    });
});

describe('xRangeAnnotations', () => {
    it('shades the range in its colour and labels it white on the colour', () => {
        const [box, label] = xRangeAnnotations(1, 2, '#097969', 0.3, 'Open Window') as any[];
        expect([box.xMin, box.xMax, box.backgroundColor]).toEqual([1, 2, 'rgba(9, 121, 105, 0.3)']);
        expect([label.xValue, label.content, label.color, label.backgroundColor, label.rotation]).toEqual([1, 'Open Window', '#fff', '#097969', -90]);
    });

    it('has no label without text', () => {
        expect(xRangeAnnotations(1, 2, '#FF4C4C', 0.4).length).toBe(1);
    });
});

describe('hoverColor', () => {
    it('doubles the brightness in linear RGB, as the hovered bars looked', () => {
        expect(hoverColor('#4caf50')).toBe('rgba(106, 238, 111, 0.85)');
        expect(hoverColor('#ffffff')).toBe('rgba(255, 255, 255, 0.85)');
    });
});
