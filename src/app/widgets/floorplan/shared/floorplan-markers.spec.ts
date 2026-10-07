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

import { FloorplanWidgetCapabilityModel } from './floorplan.model';
import { markerText, placementMarker, placementPosition, tooltipValueLabel } from './floorplan-markers';

type Coloring = FloorplanWidgetCapabilityModel['coloring'][number];

function band(value: number | string, color: string, icon = 'circle', showValue = false, showValueWhenZoomed = false): Coloring {
    return { value, color, icon, showValue, showValueWhenZoomed };
}

function placement(message: any, coloring: Coloring[], extra: Partial<FloorplanWidgetCapabilityModel> = {}): FloorplanWidgetCapabilityModel {
    return {
        criteria: { function_id: 'f', value: message === undefined ? undefined : { status_code: 200, message } },
        alias: 'Lamp',
        deviceGroupId: 'g',
        position: { x: 0.5, y: 0.25 },
        coloring,
        valueLow: null, valueHigh: null, colorLow: null, colorHigh: null,
        ...extra,
    } as FloorplanWidgetCapabilityModel;
}

describe('placementMarker', () => {
    const thresholds = [band(10, 'blue', 'ac_unit'), band(25, 'green', 'thermostat', true), band(100, 'red', 'local_fire_department', true, true)];

    it('takes the first band a number does not exceed', () => {
        expect(placementMarker(placement(5, thresholds), undefined).color).toBe('blue');
        expect(placementMarker(placement(10, thresholds), undefined).color).toBe('blue');
        expect(placementMarker(placement(10.5, thresholds), undefined).color).toBe('green');
        expect(placementMarker(placement(26, thresholds), undefined)).toEqual({
            icon: 'local_fire_department', color: 'red', showValue: true, showValueWhenZoomed: true, label: '26',
        });
    });

    it('takes the last band for numbers above all of them', () => {
        expect(placementMarker(placement(1000, thresholds), undefined).color).toBe('red');
    });

    it('matches other values as regular expression against the bands, the last band without match', () => {
        const states = [band('^on$', 'yellow', 'lightbulb'), band('off', 'grey', 'light_off')];
        expect(placementMarker(placement('on', states), undefined).icon).toBe('lightbulb');
        expect(placementMarker(placement('switched off', states), undefined).icon).toBe('light_off');
        expect(placementMarker(placement('unknown', states), undefined).icon).toBe('light_off');
        expect(placementMarker(placement(true, [band('true', 'yellow'), band('x', 'grey')]), undefined).color).toBe('yellow');
    });

    it('joins list values with ", " before matching and labelling', () => {
        const marker = placementMarker(placement(['a', 'b'], [band('a, b', 'pink')]), undefined);
        expect(marker.color).toBe('pink');
        expect(marker.label).toBe('a, b');
        expect(placementMarker(placement([7], thresholds), undefined).color).toBe('blue');
    });

    it('is a grey circle without colouring, listing values joined by a bare comma', () => {
        expect(placementMarker(placement(['a', 'b'], []), undefined)).toEqual({
            icon: 'circle', color: 'grey', showValue: false, showValueWhenZoomed: false, label: 'a,b',
        });
    });

    it('appends the unit to a value, never to a missing one', () => {
        expect(placementMarker(placement(21.5, thresholds), '°C').label).toBe('21.5 °C');
        expect(placementMarker(placement(0, thresholds), '°C').label).toBe('0 °C');
        expect(placementMarker(placement(undefined, thresholds), '°C').label).toBe('');
        expect(placementMarker(placement(null, thresholds), '°C').label).toBe('');
    });

    // SNRGY-4848 item 14: a band value that is no valid regular expression threw a SyntaxError and stopped the drawing.
    it('lets a band value that is no valid regular expression match nothing', () => {
        expect(placementMarker(placement('x', [band('(', 'red'), band('x', 'green'), band('.*', 'blue')]), undefined).color).toBe('green');
        expect(placementMarker(placement('(', [band('(', 'red'), band('y', 'green')]), undefined).color).toBe('green');
    });
});

describe('placementPosition', () => {
    it('scales the relative position onto the drawn image and shifts it into place', () => {
        const position = placementPosition(placement(1, []), { naturalWidth: 1000, naturalHeight: 800 }, { centerShiftX: 10, centerShiftY: -5, ratio: 0.5 });
        expect(position).toEqual({ x: 0.5 * 1000 * 0.5 + 10, y: 0.25 * 800 * 0.5 - 5 });
    });

    it('puts an unplaced placement at the origin of the image', () => {
        const position = placementPosition(placement(1, [], { position: { x: null, y: null } }), { naturalWidth: 1000, naturalHeight: 800 }, { centerShiftX: 10, centerShiftY: 20, ratio: 1 });
        expect(position).toEqual({ x: 10, y: 20 });
    });
});

describe('markerText', () => {
    it('shows alias and value as configured for the widget size', () => {
        const p = placement(1, [], { showAlias: true, showAliasWhenZoomed: false });
        expect(markerText(p, '21 °C', false, true, false)).toBe('Lamp: 21 °C');
        expect(markerText(p, '21 °C', true, true, false)).toBe('');
        expect(markerText(p, '21 °C', true, false, true)).toBe('21 °C');
        expect(markerText(p, '21 °C', false, false, true)).toBe('Lamp');
    });
});

describe('tooltipValueLabel', () => {
    it('joins lists, unwraps single values and appends the unit', () => {
        expect(tooltipValueLabel(['a', 'b'], undefined)).toBe('a, b');
        expect(tooltipValueLabel([5], 'W')).toBe('5 W');
        expect(tooltipValueLabel(true, undefined)).toBe('true');
        expect(tooltipValueLabel(0, '%')).toBe('0 %');
    });
});
