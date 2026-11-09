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

import Map from 'ol/Map';
import { basemapAttribution, mapSnapshot, moveIntoSection } from './floorplan-map';

describe('mapSnapshot', () => {
    /** a map of 40 x 20 CSS pixels whose single layer canvas has twice the resolution, left half red, right half blue */
    const fakeMap = (): Map => {
        const viewport = document.createElement('div');
        const layer = document.createElement('div');
        layer.className = 'ol-layer';
        const canvas = document.createElement('canvas');
        canvas.width = 80;
        canvas.height = 40;
        canvas.style.transform = 'matrix(0.5, 0, 0, 0.5, 0, 0)';
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, 40, 40);
        ctx.fillStyle = '#0000ff';
        ctx.fillRect(40, 0, 40, 40);
        layer.appendChild(canvas);
        viewport.appendChild(layer);
        let rendered: (() => void) | undefined;
        return {
            once: (_: string, listener: () => void) => rendered = listener,
            render: () => rendered?.(),
            getSize: () => [40, 20],
            getViewport: () => viewport,
        } as unknown as Map;
    };

    it('draws the layers at one pixel per CSS pixel', async () => {
        const img = new Image();
        img.src = await mapSnapshot(fakeMap());
        await img.decode();

        expect([img.naturalWidth, img.naturalHeight]).toEqual([40, 20]);
        const canvas = document.createElement('canvas');
        canvas.width = 40;
        canvas.height = 20;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const left = ctx.getImageData(5, 10, 1, 1).data;
        const right = ctx.getImageData(35, 10, 1, 1).data;
        expect(left[0]).toBeGreaterThan(200);
        expect(left[2]).toBeLessThan(50);
        expect(right[2]).toBeGreaterThan(200);
        expect(right[0]).toBeLessThan(50);
    });

    it('writes the attribution into the bottom right corner', async () => {
        const img = new Image();
        img.src = await mapSnapshot(fakeMap(), basemapAttribution(2026));
        await img.decode();

        const canvas = document.createElement('canvas');
        canvas.width = 40;
        canvas.height = 20;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        // the light box behind the text lies over the blue half, the top of that half stays blue
        expect(ctx.getImageData(38, 18, 1, 1).data[0]).toBeGreaterThan(150);
        expect(ctx.getImageData(38, 2, 1, 1).data[0]).toBeLessThan(50);
    });
});

describe('basemapAttribution', () => {
    it('names basemap.de and the year', () => {
        expect(basemapAttribution(2026)).toBe('© 2026 basemap.de / BKG | Datenquellen: © GeoBasis-DE');
    });
});

describe('moveIntoSection', () => {
    it('keeps the position when the section stays the same', () => {
        const section = [12.3, 51.3, 12.4, 51.4];

        const moved = moveIntoSection({ x: 0.25, y: 0.75 }, section, section);

        expect(moved.x).toBeCloseTo(0.25, 9);
        expect(moved.y).toBeCloseTo(0.75, 9);
    });

    it('follows the spot when the section is narrowed to its eastern half', () => {
        const moved = moveIntoSection({ x: 0.75, y: 0.4 }, [10, 50, 12, 52], [11, 50, 12, 52]);

        expect(moved.x).toBeCloseTo(0.5, 9);
        expect(moved.y).toBeCloseTo(0.4, 9);
    });

    it('puts the equator at the bottom edge of the northern half', () => {
        const moved = moveIntoSection({ x: 0.5, y: 0.5 }, [0, -10, 10, 10], [0, 0, 10, 10]);

        expect(moved.y).toBeCloseTo(1, 9);
    });

    it('measures the vertical position in Web Mercator, not in degrees', () => {
        // halfway down the image between 0° and 80° is about 57°, not 40°
        const moved = moveIntoSection({ x: 0.5, y: 0.5 }, [0, 0, 10, 80], [0, 40, 10, 80]);

        expect(moved.y).toBeCloseTo(0.728, 2);
    });

    it('returns to the original position when moved back', () => {
        const a = [8, 49, 9, 50];
        const b = [8.2, 49.1, 9.4, 50.3];

        const back = moveIntoSection(moveIntoSection({ x: 0.6, y: 0.3 }, a, b), b, a);

        expect(back.x).toBeCloseTo(0.6, 9);
        expect(back.y).toBeCloseTo(0.3, 9);
    });

    it('drops the position of a spot outside the new section', () => {
        expect(moveIntoSection({ x: 0.1, y: 0.5 }, [10, 50, 12, 52], [11, 50, 12, 52])).toEqual({ x: null, y: null });
    });

    it('leaves an element without a position as it is', () => {
        expect(moveIntoSection({ x: null, y: null }, [10, 50, 12, 52], [11, 50, 12, 52])).toEqual({ x: null, y: null });
    });
});
