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

import { coversPosition, MarkerBox, MarkerOffset, stackMarkers } from './floorplan-marker-layout';

const HEIGHT = 20;
const area = { top: 0, bottom: 400, left: 0, right: 600 };

function marker(x: number, y: number, width = 100): MarkerBox {
    return { x, y, width, height: HEIGHT };
}

function rect(box: MarkerBox, offset: MarkerOffset) {
    return {
        left: box.x - box.height / 2 + offset.dx,
        top: box.y + offset.dy - box.height / 2,
        right: box.x - box.height / 2 + offset.dx + box.width,
        bottom: box.y + offset.dy + box.height / 2,
    };
}

/** The pairs of pills that still cover each other, named by their index. */
function overlapping(boxes: MarkerBox[], offsets: MarkerOffset[]): string[] {
    const rects = boxes.map((box, index) => rect(box, offsets[index]));
    const hits: string[] = [];
    rects.forEach((a, i) => rects.slice(i + 1).forEach((b, j) => {
        if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) {
            hits.push(i + '/' + (i + 1 + j));
        }
    }));
    return hits;
}

describe('stackMarkers', () => {
    it('leaves a lone marker where it belongs', () => {
        expect(stackMarkers([marker(100, 100)], area)).toEqual([{ dx: 0, dy: 0 }]);
    });

    it('leaves markers alone that do not reach into each other', () => {
        const boxes = [marker(50, 100, 40), marker(300, 100, 40)];

        expect(stackMarkers(boxes, area)).toEqual([{ dx: 0, dy: 0 }, { dx: 0, dy: 0 }]);
    });

    it('frees pills that sit on the same spot', () => {
        const boxes = [marker(100, 100), marker(120, 100), marker(140, 105)];
        const offsets = stackMarkers(boxes, area);

        expect(overlapping(boxes, offsets)).toEqual([]);
    });

    it('settles from the top down, so the uppermost pill keeps its place', () => {
        // narrow pills, so neither reaches the position of the other and only the row they share matters
        const boxes = [marker(100, 120, 30), marker(110, 100, 30)];
        const offsets = stackMarkers(boxes, area);

        expect(offsets[1]).toEqual({ dx: 0, dy: 0 });
        expect(offsets[0]).not.toEqual({ dx: 0, dy: 0 });
    });

    it('takes the move nearest to the position, so a label stays in its room', () => {
        const boxes = [marker(100, 100), marker(120, 100)];
        const moved = stackMarkers(boxes, area)[1];

        // a pill height up or down, or one width sideways, is as far as a single neighbour can push it
        expect(Math.abs(moved.dy)).toBeLessThanOrEqual(HEIGHT * 1.5);
        expect(Math.abs(moved.dx)).toBeLessThanOrEqual(HEIGHT * 2);
    });

    it('keeps every pill inside the area', () => {
        const boxes = [marker(100, 10), marker(120, 10), marker(140, 10), marker(160, 10)];
        const offsets = stackMarkers(boxes, area);

        offsets.forEach((offset, index) => {
            const placed = rect(boxes[index], offset);
            expect(placed.top).toBeGreaterThanOrEqual(area.top);
            expect(placed.bottom).toBeLessThanOrEqual(area.bottom);
            expect(placed.left).toBeGreaterThanOrEqual(area.left);
            expect(placed.right).toBeLessThanOrEqual(area.right);
        });
    });

    it('moves a pill off the position of another marker, which keeps a dot of its own', () => {
        // the second marker sits far to the right of the first, whose wide pill would run over it
        const boxes = [marker(100, 100, 200), marker(260, 100, 40)];
        const offsets = stackMarkers(boxes, area);
        const first = rect(boxes[0], offsets[0]);

        const coversTheOther = boxes[1].x >= first.left && boxes[1].x <= first.right
            && boxes[1].y >= first.top && boxes[1].y <= first.bottom;
        expect(coversTheOther).toBeFalse();
    });

    it('keeps clear of what is already written, such as the label of a coloured area', () => {
        const boxes = [marker(100, 100)];
        const offsets = stackMarkers(boxes, area, [marker(100, 100, 120)]);

        expect(offsets[0]).not.toEqual({ dx: 0, dy: 0 });
    });

    it('answers one offset per marker, in the order they were given', () => {
        const boxes = [marker(100, 300), marker(100, 100), marker(100, 200)];

        expect(stackMarkers(boxes, area).length).toBe(3);
        // the one at the top settles first and therefore keeps its place
        expect(stackMarkers(boxes, area)[1]).toEqual({ dx: 0, dy: 0 });
    });
});

describe('coversPosition', () => {
    it('holds while the pill still sits on its position, where the icon marks it', () => {
        expect(coversPosition(marker(100, 100), { dx: 0, dy: 0 })).toBeTrue();
    });

    it('fails once the pill moved away, which is when the dot and the leader are drawn', () => {
        expect(coversPosition(marker(100, 100), { dx: 0, dy: 3 * HEIGHT })).toBeFalse();
        // sideways it takes the whole width of the pill, which runs to the right of the position
        expect(coversPosition(marker(100, 100, 40), { dx: -60, dy: 0 })).toBeFalse();
    });
});
