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

import { Scale } from 'chart.js';
import { AxisLabelHitBox, findLabel, getLabelHitBoxes } from './chartjs-axis-click';

/**
 * Builds a scale with the internal label layout that Chart.js keeps after laying out an axis.
 */
const scaleWith = (labels: { label: string; rotation: number; x: number; y: number; width: number; height: number }[]) =>
    ({
        _labelItems: labels.map((l) => ({ label: l.label, options: { rotation: l.rotation, translation: [l.x, l.y] } })),
        _labelSizes: { widths: labels.map((l) => l.width), heights: labels.map((l) => l.height) },
    }) as unknown as Scale;

const upright = { label: '12:00', rotation: 0, x: 100, y: 50, width: 40, height: 10 };
/** A quarter turn keeps the numbers exact: the box ends up right of and below the tick. */
const rotated = { label: '12:00', rotation: -Math.PI / 2, x: 100, y: 50, width: 40, height: 10 };

describe('chartjs axis click', () => {
    describe('getLabelHitBoxes', () => {
        it('returns no boxes while the axis has not been laid out', () => {
            expect(getLabelHitBoxes(undefined)).toEqual([]);
            expect(getLabelHitBoxes({} as Scale)).toEqual([]);
        });

        it('centers the box of an upright label below its tick', () => {
            const [box] = getLabelHitBoxes(scaleWith([upright]));

            expect(box.pivot).toEqual({ x: 100, y: 50 });
            expect(box.bounds).toEqual({ left: -20, right: 20, top: 0, bottom: 10 });
            expect(box.index).toBe(0);
            expect(box.label).toBe('12:00');
        });

        it('ends the box of a rotated label at its tick', () => {
            const [box] = getLabelHitBoxes(scaleWith([rotated]));

            expect(box.bounds).toEqual({ left: -40, right: 0, top: 0, bottom: 10 });
            expect(box.rotation).toBe(-Math.PI / 2);
        });

        it('numbers the boxes in the order of the ticks', () => {
            const boxes = getLabelHitBoxes(scaleWith([upright, { ...upright, label: '13:00', x: 200 }]));

            expect(boxes.map((b: AxisLabelHitBox) => b.index)).toEqual([0, 1]);
            expect(boxes.map((b: AxisLabelHitBox) => b.label)).toEqual(['12:00', '13:00']);
        });
    });

    describe('findLabel', () => {
        it('reports the label a point falls into', () => {
            const boxes = getLabelHitBoxes(scaleWith([upright]));

            expect(findLabel(boxes, { x: 100, y: 55 })).toEqual([true, { label: '12:00', index: 0 }]);
        });

        it('reports no label for a point outside every box', () => {
            const boxes = getLabelHitBoxes(scaleWith([upright]));

            expect(findLabel(boxes, { x: 100, y: 45 })).toEqual([false, null]);
            expect(findLabel(boxes, { x: 75, y: 55 })).toEqual([false, null]);
        });

        it('includes the edges of the box', () => {
            const boxes = getLabelHitBoxes(scaleWith([upright]));

            expect(findLabel(boxes, { x: 80, y: 50 })[0]).toBe(true);
            expect(findLabel(boxes, { x: 120, y: 60 })[0]).toBe(true);
        });

        it('includes the edge of a rotated box despite the rounding of the rotation', () => {
            const tilted = getLabelHitBoxes(scaleWith([{ ...upright, rotation: -Math.PI / 4 }]));

            // on the diagonal through the tick, which is the right edge of the tilted box
            expect(findLabel(tilted, { x: 105, y: 55 })[0]).toBe(true);
        });

        it('applies the rotation of the label', () => {
            const boxes = getLabelHitBoxes(scaleWith([rotated]));

            // inside the rotated box, but outside the box it would have without the rotation
            expect(findLabel(boxes, { x: 105, y: 70 })).toEqual([true, { label: '12:00', index: 0 }]);
            expect(findLabel(boxes, { x: 95, y: 70 })).toEqual([false, null]);
        });

        it('picks the later tick where two rotated boxes overlap', () => {
            const boxes = getLabelHitBoxes(scaleWith([
                { ...rotated, label: '12:00' },
                { ...rotated, label: '13:00' },
            ]));

            expect(findLabel(boxes, { x: 105, y: 70 })).toEqual([true, { label: '13:00', index: 1 }]);
        });

        it('reports no label for an event without coordinates', () => {
            const boxes = getLabelHitBoxes(scaleWith([upright]));

            expect(findLabel(boxes, { x: null, y: null })).toEqual([false, null]);
            expect(findLabel(boxes, { x: 100, y: null })).toEqual([false, null]);
        });

        it('reports no label without boxes or without a point', () => {
            expect(findLabel(undefined, { x: 1, y: 1 })).toEqual([false, null]);
            expect(findLabel([], { x: 1, y: 1 })).toEqual([false, null]);
            expect(findLabel(getLabelHitBoxes(scaleWith([upright])), undefined)).toEqual([false, null]);
        });
    });
});
