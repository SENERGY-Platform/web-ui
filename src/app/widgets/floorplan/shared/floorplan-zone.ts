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

import Color from 'color';
import type { FloorplanWidgetCapabilityModel } from './floorplan.model';

/** A point in canvas pixels. */
export interface ZonePoint {
    x: number;
    y: number;
}

/** How much of the area's colour is laid over the floorplan. */
const FILL_ALPHA = 0.3;
/** Outline width, as a share of the marker size. */
const OUTLINE = 0.12;
/** Label sizes, as shares of the marker size: the plain one first, then what a narrow room falls back to. */
const LABEL_FONTS = [0.7, 0.58, 0.48];
/** How much of the room's width at the label the label itself may take. */
const LABEL_FIT = 0.92;
/** Distance between two lines of a wrapped label, as a share of its font size. */
const LINE_HEIGHT = 1.15;
/** The halo that keeps the label readable over the floorplan, as a share of the label size. */
const HALO = 0.22;

/** The fewest corners an area needs before it can be drawn. */
export const ZONE_CORNERS = 3;

/** Whether the placement colours an area instead of showing a pill at a point. */
export function hasZone(placement: FloorplanWidgetCapabilityModel): boolean {
    return (placement.zone || []).length >= ZONE_CORNERS;
}

/**
 * The corners of an area in canvas pixels. They are stored as fractions of the image, the same way a
 * position is, so an area keeps its place when the widget is resized or the image is replaced by one
 * of another size.
 */
export function zonePoints(
    placement: FloorplanWidgetCapabilityModel,
    image: { naturalWidth: number; naturalHeight: number },
    drawShift: { centerShiftX: number; centerShiftY: number; ratio: number },
): ZonePoint[] {
    return (placement.zone || []).map(corner => ({
        x: corner.x * image.naturalWidth * drawShift.ratio + drawShift.centerShiftX,
        y: corner.y * image.naturalHeight * drawShift.ratio + drawShift.centerShiftY,
    }));
}

/**
 * The stretches of the room along the given height. Edges are counted as they cross the line, so the
 * stretches between the first and second crossing, the third and fourth and so on are the ones inside
 * the room.
 */
function chords(points: ZonePoint[], y: number): { from: number; to: number }[] {
    const crossings: number[] = [];
    points.forEach((corner, index) => {
        const next = points[(index + 1) % points.length];
        if ((corner.y > y) === (next.y > y)) {
            return;
        }
        crossings.push(corner.x + (y - corner.y) * (next.x - corner.x) / (next.y - corner.y));
    });
    crossings.sort((a, b) => a - b);
    const inside: { from: number; to: number }[] = [];
    for (let i = 0; i + 1 < crossings.length; i += 2) {
        inside.push({ from: crossings[i], to: crossings[i + 1] });
    }
    return inside;
}

/** The middle of the longest stretch of the room along the given height, or undefined where that height crosses no part of it. */
function widestChord(points: ZonePoint[], y: number): ZonePoint | undefined {
    let widest: ZonePoint | undefined;
    let width = 0;
    chords(points, y).forEach(chord => {
        if (chord.to - chord.from > width) {
            width = chord.to - chord.from;
            widest = { x: (chord.from + chord.to) / 2, y };
        }
    });
    return widest;
}

/**
 * Where the value of an area is written, and where its point sits so that hovering the label opens the
 * tooltip. The centroid of the polygon, which for an L- or U-shaped room falls outside it - the middle
 * of its widest stretch is taken then, which lies in the room itself rather than in the gap it spans.
 */
export function zoneCenter(points: ZonePoint[]): ZonePoint {
    const average = points.reduce((sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }), { x: 0, y: 0 });
    let area = 0;
    let x = 0;
    let y = 0;
    points.forEach((point, index) => {
        const next = points[(index + 1) % points.length];
        const cross = point.x * next.y - next.x * point.y;
        area += cross;
        x += (point.x + next.x) * cross;
        y += (point.y + next.y) * cross;
    });
    if (area === 0) {
        return average;
    }
    const centroid = { x: x / (3 * area), y: y / (3 * area) };
    if (containsPoint(points, centroid)) {
        return centroid;
    }
    const tops = points.map(point => point.y);
    const middle = (Math.min(...tops) + Math.max(...tops)) / 2;
    return widestChord(points, centroid.y) || widestChord(points, middle) || average;
}

/**
 * How wide the room is where its label is written: the stretch the label sits in rather than the room's
 * full extent, so a label in one leg of an L-shaped room is not measured against the other leg as well.
 */
export function labelRoom(points: ZonePoint[], center: ZonePoint): number {
    const stretches = chords(points, center.y);
    const here = stretches.find(chord => center.x >= chord.from && center.x <= chord.to);
    return here !== undefined ? here.to - here.from : Math.max(0, ...stretches.map(chord => chord.to - chord.from));
}

/** Whether a point lies inside the polygon, by the even-odd rule. */
export function containsPoint(points: ZonePoint[], point: ZonePoint): boolean {
    let inside = false;
    points.forEach((corner, index) => {
        const previous = points[(index + points.length - 1) % points.length];
        const crosses = (corner.y > point.y) !== (previous.y > point.y)
            && point.x < (previous.x - corner.x) * (point.y - corner.y) / (previous.y - corner.y) + corner.x;
        if (crosses) {
            inside = !inside;
        }
    });
    return inside;
}

export interface ZoneDraw {
    points: ZonePoint[];
    /** the colour the placement's colouring picked for its value */
    background: string;
    /** alias, value or both, as configured for the zoom state */
    text: string;
    /** the marker size, which the outline and the label are measured against */
    size: number;
    family: string;
}

/** The label of an area as it is written: broken into lines and sized to the room it belongs to. */
export interface ZoneLabel {
    lines: string[];
    /** the middle of the area, which the block of lines is centred on */
    center: ZonePoint;
    /** font size in canvas pixels */
    font: number;
    /** distance between two lines in canvas pixels */
    lineHeight: number;
    /** the widest of the lines */
    width: number;
}

/** Breaks the text at its spaces so every line fits the width, keeping a word whole even where it does not. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, room: number): string[] {
    const lines: string[] = [];
    text.split(' ').filter(word => word.length > 0).forEach(word => {
        const last = lines.length - 1;
        const joined = last < 0 ? word : lines[last] + ' ' + word;
        if (last < 0 || ctx.measureText(joined).width > room) {
            lines.push(word);
        } else {
            lines[last] = joined;
        }
    });
    return lines.length > 0 ? lines : [text];
}

/**
 * How the label of an area is written. It is broken into lines and, where that is not enough, written
 * smaller, until it fits the room at the height it sits at: a label drawn at its plain size runs over
 * the walls of a small room into the neighbouring one, where it reads as that room's value. Below the
 * smallest size it stays as it is rather than being cut, since half a value reads as another one.
 */
export function zoneLabel(ctx: CanvasRenderingContext2D, zone: ZoneDraw): ZoneLabel | undefined {
    if (zone.points.length < ZONE_CORNERS || zone.text.length === 0) {
        return undefined;
    }
    const center = zoneCenter(zone.points);
    const room = labelRoom(zone.points, center) * LABEL_FIT;
    ctx.save();
    let label: ZoneLabel | undefined;
    LABEL_FONTS.forEach(share => {
        if (label !== undefined && label.width <= room) {
            return;
        }
        const font = zone.size * share;
        ctx.font = font + 'px ' + zone.family;
        const lines = wrapText(ctx, zone.text, room);
        const width = Math.max(...lines.map(line => ctx.measureText(line).width));
        label = { lines, center, font, lineHeight: font * LINE_HEIGHT, width };
    });
    ctx.restore();
    return label;
}

/**
 * Fills the area in the colour of its value and writes the value into it. The fill stays translucent so
 * the floorplan underneath keeps showing through, and the label carries a halo rather than a box: a box
 * large enough for a room name would cover what the area is meant to show.
 */
export function drawZone(ctx: CanvasRenderingContext2D, zone: ZoneDraw): void {
    const { points, background, size, family } = zone;
    if (points.length < ZONE_CORNERS) {
        return;
    }
    ctx.save();
    ctx.beginPath();
    points.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
    ctx.closePath();
    try {
        ctx.fillStyle = Color(background).alpha(FILL_ALPHA).string();
    } catch (_) {
        ctx.fillStyle = background;
    }
    ctx.fill();
    ctx.lineWidth = size * OUTLINE;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = background;
    ctx.stroke();

    const label = zoneLabel(ctx, zone);
    if (label !== undefined) {
        const top = label.center.y - (label.lines.length - 1) * label.lineHeight / 2;
        ctx.font = label.font + 'px ' + family;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = label.font * HALO;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        // every halo first, so none of them is laid over the line above it
        label.lines.forEach((line, index) => ctx.strokeText(line, label.center.x, top + index * label.lineHeight));
        try {
            ctx.fillStyle = Color(background).darken(0.25).hex();
        } catch (_) {
            ctx.fillStyle = background;
        }
        label.lines.forEach((line, index) => ctx.fillText(line, label.center.x, top + index * label.lineHeight));
    }
    ctx.restore();
}

/** What the label of an area takes up, so the pills of other placements can keep clear of it. */
export function zoneLabelBox(ctx: CanvasRenderingContext2D, zone: ZoneDraw): { x: number; y: number; width: number; height: number } | undefined {
    const label = zoneLabel(ctx, zone);
    if (label === undefined) {
        return undefined;
    }
    const height = Math.max(zone.size, label.lines.length * label.lineHeight);
    // the box of a pill starts half its height left of its x, and the label is centred on the area
    return { x: label.center.x - label.width / 2 + height / 2, y: label.center.y, width: label.width, height };
}
