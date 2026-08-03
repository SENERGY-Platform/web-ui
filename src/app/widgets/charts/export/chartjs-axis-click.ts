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

/**
 * Hit testing for the tick labels of a chart axis, so that a click on a label can be resolved to
 * the tick it belongs to. Chart.js does not report label clicks itself, so the boxes are derived
 * from the layout it keeps on the scale.
 */

/** The part of the internal scale layout the hit test reads. Not covered by the public typings. */
interface ScaleLabelLayout {
    _labelItems?: {
        label: string | string[];
        options: { rotation: number; translation: [number, number] };
    }[];
    _labelSizes?: { widths: number[]; heights: number[] };
}

export interface AxisLabelHitBox {
    index: number;
    label: string | string[];
    /** Point the label is rotated around, which is where the tick meets the axis. */
    pivot: { x: number; y: number };
    /** Extent of the label box in its own unrotated frame, relative to the pivot. */
    bounds: { left: number; right: number; top: number; bottom: number };
    /** Rotation of the label in radians. */
    rotation: number;
}

export interface AxisLabelHit {
    label: string | string[];
    index: number;
}

/**
 * Builds one box per tick label of the given axis. Returns an empty list while the axis has not
 * been laid out yet.
 */
export const getLabelHitBoxes = (scale: Scale | undefined): AxisLabelHitBox[] => {
    const layout = scale as unknown as ScaleLabelLayout | undefined;
    const items = layout?._labelItems;
    const sizes = layout?._labelSizes;
    if (items === undefined || sizes === undefined) {
        return [];
    }
    return items.map((item, index: number) => {
        const width = sizes.widths[index];
        const rotation = item.options.rotation;
        const [x, y] = item.options.translation;
        // Chart.js centers an upright label below its tick, but right aligns a rotated one, so the
        // translation is the top center of the box in the first case and its top right in the second.
        return {
            index,
            label: item.label,
            pivot: { x, y },
            bounds: {
                left: rotation === 0 ? -width / 2 : -width,
                right: rotation === 0 ? width / 2 : 0,
                top: 0,
                bottom: sizes.heights[index],
            },
            rotation,
        };
    });
};

/**
 * Finds the label the given point falls into. The boxes of rotated labels can overlap; the last
 * match wins, which keeps the tick closer to the end of the axis.
 */
export const findLabel = (
    boxes: AxisLabelHitBox[] | undefined,
    point: { x: number | null; y: number | null } | undefined
): [boolean, AxisLabelHit | null] => {
    // Chart.js reports events without coordinates, for example a click triggered from the keyboard.
    if (boxes === undefined || point === undefined || point.x === null || point.y === null) {
        return [false, null];
    }
    const x = point.x;
    const y = point.y;
    let hit: AxisLabelHit | null = null;
    boxes.forEach((box: AxisLabelHitBox) => {
        if (contains(box, x, y)) {
            hit = { label: box.label, index: box.index };
        }
    });
    return [hit !== null, hit];
};

/**
 * Tolerance for the bounds check. Rotating a point on the edge of a box leaves a rounding error of a
 * few multiples of the machine epsilon, which without the tolerance would drop clicks on the edge.
 */
const EDGE_TOLERANCE = 1e-9;

/**
 * Rotates the point back into the frame of the label instead of rotating the box, which reduces the
 * test to a comparison against the bounds. The edges count as inside.
 */
function contains(box: AxisLabelHitBox, x: number, y: number): boolean {
    const dx = x - box.pivot.x;
    const dy = y - box.pivot.y;
    const cos = Math.cos(box.rotation);
    const sin = Math.sin(box.rotation);
    const localX = dx * cos + dy * sin;
    const localY = dy * cos - dx * sin;
    return localX >= box.bounds.left - EDGE_TOLERANCE && localX <= box.bounds.right + EDGE_TOLERANCE
        && localY >= box.bounds.top - EDGE_TOLERANCE && localY <= box.bounds.bottom + EDGE_TOLERANCE;
}
