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
/** A marker as it would be drawn without regard for its neighbours. */
export interface MarkerBox {
    /** the position the marker belongs to */
    x: number;
    y: number;
    /** the pill, which starts at x minus half its height and runs to the right */
    width: number;
    height: number;
}

export interface MarkerArea {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

/** How far a pill moved off its position, in pixels. */
export interface MarkerOffset {
    dx: number;
    dy: number;
}

interface Rect {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** Gap kept between two pills, as a share of the pill height. */
const GAP = 0.25;

/** The dot that holds a position once its pill moved away, as a share of the pill height. */
const ANCHOR = 0.4;

/** How far sideways a pill may be carried, in steps of its own height. */
const REACH = 3;

function pillRect(marker: MarkerBox, offset: MarkerOffset): Rect {
    return {
        left: marker.x - marker.height / 2 + offset.dx,
        top: marker.y + offset.dy - marker.height / 2,
        width: marker.width,
        height: marker.height,
    };
}

function anchorRect(marker: MarkerBox): Rect {
    const size = marker.height * ANCHOR;
    return { left: marker.x - size / 2, top: marker.y - size / 2, width: size, height: size };
}

function intersects(a: Rect, b: Rect, gap: number): boolean {
    return a.left - gap < b.left + b.width && b.left < a.left + a.width + gap
        && a.top - gap < b.top + b.height && b.top < a.top + a.height + gap;
}

/**
 * The moves a pill may try, nearest first, so it ends up as close to its position as it can. The list
 * depends only on the pill height and the area, so it is built once for all markers of a draw rather
 * than per marker - the chart redraws on hover, and this runs on every one of those.
 */
function candidates(height: number, area: MarkerArea): MarkerOffset[] {
    const across = height;
    const down = height * (1 + GAP) / 2;
    const rows = Math.ceil((area.bottom - area.top) / down);
    const seen = new Set<string>();
    const offsets: MarkerOffset[] = [];
    for (let column = 0; column <= REACH; column++) {
        for (let row = 0; row <= rows; row++) {
            [column, -column].forEach(sideways => [row, -row].forEach(vertical => {
                const offset = { dx: sideways * across, dy: vertical * down };
                const key = offset.dx + '|' + offset.dy;
                if (!seen.has(key)) {
                    seen.add(key);
                    offsets.push(offset);
                }
            }));
        }
    }
    return offsets.sort((a, b) => (a.dx * a.dx + a.dy * a.dy) - (b.dx * b.dx + b.dy * b.dy));
}

/**
 * How far each pill has to move so that none of them covers another, in the order the markers are given.
 *
 * Every marker keeps its position - only the pill moves, and the caller draws a leader to the position
 * once the pill no longer covers it. Markers are settled from the top down, and each one takes the move
 * nearest to its position that frees it, sideways as readily as up or down: leaders that all run
 * straight down end up on top of each other, while a pill carried to the side pulls its leader clear of
 * its neighbours. What a pill has to clear is the pills settled before it, the positions of all the
 * other markers, which keep a dot of their own, the labels of the coloured areas, and the edges. A pill that cannot be freed
 * at all stays on its position rather than being dropped, since a hidden value reads as a missing one.
 */
export function stackMarkers(markers: MarkerBox[], area: MarkerArea, occupied: MarkerBox[] = []): MarkerOffset[] {
    const order = markers.map((marker, index) => ({ marker, index })).sort((a, b) => a.marker.y - b.marker.y || a.index - b.index);
    const offsets: MarkerOffset[] = markers.map(() => ({ dx: 0, dy: 0 }));
    const anchors = markers.map(anchorRect);
    // labels of the coloured areas, which are written where they are and never move
    const settled: Rect[] = occupied.map(box => pillRect(box, { dx: 0, dy: 0 }));
    const moves = markers.length === 0 ? [] : candidates(markers[0].height, area);
    order.forEach(({ marker, index }) => {
        const gap = marker.height * GAP;
        // its own position sits under its pill by design, the icon marks it there
        const obstacles = [...settled, ...anchors.filter((_anchor, other) => other !== index)];
        const inside = (rect: Rect): boolean => rect.left >= area.left && rect.left + rect.width <= area.right
            && rect.top >= area.top && rect.top + rect.height <= area.bottom;
        const free = moves.find((offset) => {
            const rect = pillRect(marker, offset);
            return inside(rect) && !obstacles.some(other => intersects(rect, other, gap));
        });
        const offset = free || { dx: 0, dy: 0 };
        offsets[index] = offset;
        settled.push(pillRect(marker, offset));
    });
    return offsets;
}

/** Whether the pill still covers its own position, which is then marked by the icon rather than a dot. */
export function coversPosition(marker: MarkerBox, offset: MarkerOffset): boolean {
    const rect = pillRect(marker, offset);
    return marker.x >= rect.left && marker.x <= rect.left + rect.width
        && marker.y >= rect.top && marker.y <= rect.top + rect.height;
}

