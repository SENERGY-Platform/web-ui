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
    MARKER_DARK_TEXT,
    MARKER_LIGHT_TEXT,
    markerForeground,
    markerLayout,
    measureMarker,
} from './floorplan-marker-draw';

describe('markerForeground', () => {
    it('writes white on a dark marker and near-black on a light one', () => {
        expect(markerForeground('#1b5e20')).toBe(MARKER_LIGHT_TEXT);
        expect(markerForeground('grey')).toBe(MARKER_LIGHT_TEXT);
        expect(markerForeground('#ffff00')).toBe(MARKER_DARK_TEXT);
        expect(markerForeground('white')).toBe(MARKER_DARK_TEXT);
    });

    it('falls back to white for a colour it cannot read, which is what a marker had before any colouring', () => {
        expect(markerForeground('not a colour')).toBe(MARKER_LIGHT_TEXT);
    });
});

describe('markerLayout', () => {
    const size = 20;

    it('is a circle around the icon while there is no text', () => {
        const layout = markerLayout(size, 14, 0);

        expect(layout.width).toBe(size);
        expect(layout.iconCx).toBe(size / 2);
        expect(layout.textX).toBe(0);
    });

    it('widens to the right for the text and leaves room before the cap', () => {
        const withText = markerLayout(size, 14, 60);

        expect(withText.textX).toBeGreaterThan(withText.iconCx);
        expect(withText.width).toBeGreaterThan(withText.textX + 60);
    });

    it('keeps the icon on the position however long the text grows', () => {
        expect(markerLayout(size, 14, 200).iconCx).toBe(markerLayout(size, 14, 0).iconCx);
    });

    it('scales both fonts with the marker', () => {
        const small = markerLayout(10, 7, 20);
        const large = markerLayout(20, 14, 40);

        expect(large.iconFont).toBe(small.iconFont * 2);
        expect(large.textFont).toBe(small.textFont * 2);
        expect(large.textFont).toBeLessThan(large.iconFont);
    });
});

describe('measureMarker', () => {
    const context = (): CanvasRenderingContext2D => document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
    const marker = (text: string) => ({ x: 0, y: 0, size: 20, background: 'grey', icon: 'thermostat', text, family: 'sans-serif' });

    it('measures a wider pill for a longer text', () => {
        const ctx = context();

        expect(measureMarker(ctx, marker('Kitchen: 20.5 °C')).width).toBeGreaterThan(measureMarker(ctx, marker('20.5')).width);
    });

    it('leaves the context as it found it, so the next marker is not measured in its font', () => {
        const ctx = context();
        ctx.font = '12px serif';
        measureMarker(ctx, marker('Kitchen'));

        expect(ctx.font).toBe('12px serif');
    });
});
