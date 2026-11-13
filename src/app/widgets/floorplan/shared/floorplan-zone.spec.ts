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
import { containsPoint, hasZone, labelRoom, ZONE_CORNERS, zoneCenter, zoneLabel, zoneLabelBox, zonePoints } from './floorplan-zone';

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

function room(width: number, height: number): { x: number; y: number }[] {
    return [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }];
}

describe('labelRoom', () => {
    it('measures the room at the height the label sits at', () => {
        expect(labelRoom(room(400, 200), { x: 200, y: 100 })).toBeCloseTo(400, 5);
    });

    it('measures only the leg the label sits in, not the room across the gap', () => {
        // a U with legs of unequal width: at their height, each leg is a stretch of its own
        const u = [
            { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 },
            { x: 60, y: 100 }, { x: 60, y: 20 }, { x: 20, y: 20 }, { x: 20, y: 100 }, { x: 0, y: 100 },
        ];

        expect(labelRoom(u, { x: 10, y: 60 })).toBeCloseTo(20, 5);
        expect(labelRoom(u, { x: 80, y: 60 })).toBeCloseTo(40, 5);
    });
});

describe('zoneLabel', () => {
    const ctx = (): CanvasRenderingContext2D => document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
    const zone = (text: string, points: { x: number; y: number }[]) => ({ points, background: 'green', text, size: 20, family: 'sans-serif' });
    const text = 'SNZB-02P Treppenzimmer: 19.6 °C';

    it('writes a label that fits on one line at the plain size', () => {
        const label = zoneLabel(ctx(), zone(text, room(600, 200)));

        expect(label?.lines).toEqual([text]);
        expect(label?.font).toBeCloseTo(20 * 0.7, 5);
    });

    // a label drawn at its plain size runs over the wall into the neighbouring room, where it reads as that room's value
    it('breaks the label into lines to keep it inside a narrower room', () => {
        const wide = zoneLabel(ctx(), zone(text, room(600, 200)));
        const narrow = zoneLabel(ctx(), zone(text, room(120, 200)));

        expect(narrow?.lines.length).toBeGreaterThan(wide?.lines.length || 0);
        expect(narrow?.lines.join(' ')).toBe(text);
        expect(narrow?.width).toBeLessThanOrEqual(120);
        expect(narrow?.font).toBeCloseTo(wide?.font || 0, 5);
    });

    it('writes the label smaller once breaking it is not enough', () => {
        const label = zoneLabel(ctx(), zone(text, room(60, 200)));

        expect(label?.font).toBeLessThan(20 * 0.7);
        expect(label?.lines.join(' ')).toBe(text);
    });

    it('stops at the smallest size rather than cutting the value short', () => {
        const label = zoneLabel(ctx(), zone(text, room(20, 200)));

        expect(label?.font).toBeCloseTo(20 * 0.48, 5);
        expect(label?.lines.join(' ')).toBe(text);
    });

    it('writes nothing where there is no label or no area', () => {
        expect(zoneLabel(ctx(), zone('', square))).toBeUndefined();
        expect(zoneLabel(ctx(), zone(text, square.slice(0, 2)))).toBeUndefined();
    });
});

describe('zoneLabelBox', () => {
    const ctx = (): CanvasRenderingContext2D => document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
    const zone = (text: string, points = room(400, 200)) => ({ points, background: 'green', text, size: 20, family: 'sans-serif' });

    it('is centred on the middle of the area, where the value is written', () => {
        const box = zoneLabelBox(ctx(), zone('20.5 °C'));

        expect(box).toBeDefined();
        // a pill box starts half its height left of its x, so the label is centred on the area
        expect((box?.x || 0) - (box?.height || 0) / 2 + (box?.width || 0) / 2).toBeCloseTo(200, 5);
        expect(box?.y).toBe(100);
        expect(box?.height).toBe(20);
    });

    it('grows with a label that takes more than one line', () => {
        const box = zoneLabelBox(ctx(), zone('Air-Q-01 Kinderzimmer: 17.9 °C', room(120, 200)));

        expect(box?.height).toBeGreaterThan(20);
    });

    it('is nothing to keep clear of when there is no label or no area', () => {
        expect(zoneLabelBox(ctx(), zone(''))).toBeUndefined();
        expect(zoneLabelBox(ctx(), zone('20.5 °C', square.slice(0, 2)))).toBeUndefined();
    });
});
