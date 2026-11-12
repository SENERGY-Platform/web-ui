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
import { containsPoint, hasZone, ZONE_CORNERS, zoneCenter, zoneLabelBox, zonePoints } from './floorplan-zone';

function placement(zone?: { x: number; y: number }[]): FloorplanWidgetCapabilityModel {
    return { alias: 'Living room', zone, position: { x: 0.5, y: 0.5 } } as FloorplanWidgetCapabilityModel;
}

const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];

describe('hasZone', () => {
    it('needs at least three corners before an area can be drawn', () => {
        expect(hasZone(placement())).toBeFalse();
        expect(hasZone(placement([]))).toBeFalse();
        expect(hasZone(placement(square.slice(0, ZONE_CORNERS - 1)))).toBeFalse();
        expect(hasZone(placement(square.slice(0, ZONE_CORNERS)))).toBeTrue();
    });
});

describe('zonePoints', () => {
    const image = { naturalWidth: 200, naturalHeight: 100 };

    it('reads the corners as fractions of the image, the way a position is stored', () => {
        const points = zonePoints(placement([{ x: 0.5, y: 0.5 }]), image, { centerShiftX: 0, centerShiftY: 0, ratio: 1 });

        expect(points).toEqual([{ x: 100, y: 50 }]);
    });

    it('follows the image as it is scaled and shifted into the canvas', () => {
        const points = zonePoints(placement([{ x: 0.5, y: 0.5 }]), image, { centerShiftX: 20, centerShiftY: 10, ratio: 0.5 });

        expect(points).toEqual([{ x: 70, y: 35 }]);
    });

    it('answers nothing for a placement without an area', () => {
        expect(zonePoints(placement(), image, { centerShiftX: 0, centerShiftY: 0, ratio: 1 })).toEqual([]);
    });
});

describe('zoneCenter', () => {
    it('is the middle of a rectangular room', () => {
        expect(zoneCenter(square)).toEqual({ x: 5, y: 5 });
    });

    it('stays inside a room whose centroid falls outside it', () => {
        // a U: its centroid lies in the hollow between the two legs, where no value may be written
        const u = [
            { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 },
            { x: 8, y: 10 }, { x: 8, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 10 }, { x: 0, y: 10 },
        ];

        expect(containsPoint(u, zoneCenter(u))).toBeTrue();
    });

    it('falls back to the average for corners that span no area', () => {
        const line = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }];

        expect(zoneCenter(line)).toEqual({ x: 10, y: 0 });
    });
});

describe('containsPoint', () => {
    it('tells inside from outside', () => {
        expect(containsPoint(square, { x: 5, y: 5 })).toBeTrue();
        expect(containsPoint(square, { x: 15, y: 5 })).toBeFalse();
        expect(containsPoint(square, { x: 5, y: -1 })).toBeFalse();
    });
});

describe('zoneLabelBox', () => {
    const ctx = (): CanvasRenderingContext2D => document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
    const zone = (text: string, points = square) => ({ points, background: 'green', text, size: 20, family: 'sans-serif' });

    it('is centred on the middle of the area, where the value is written', () => {
        const box = zoneLabelBox(ctx(), zone('20.5 °C'));

        expect(box).toBeDefined();
        // a pill box starts half its height left of its x, so the label is centred on the area
        expect((box?.x || 0) - 20 / 2 + (box?.width || 0) / 2).toBeCloseTo(5, 5);
        expect(box?.y).toBe(5);
        expect(box?.height).toBe(20);
    });

    it('is nothing to keep clear of when there is no label or no area', () => {
        expect(zoneLabelBox(ctx(), zone(''))).toBeUndefined();
        expect(zoneLabelBox(ctx(), zone('20.5 °C', square.slice(0, 2)))).toBeUndefined();
    });
});
