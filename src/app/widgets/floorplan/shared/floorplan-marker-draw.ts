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
import { MarkerOffset } from './floorplan-marker-layout';

/** Proportions of a marker, each a share of its height. */
const ICON_FONT = 0.66;
const TEXT_FONT = 0.58;
/** Space between icon and text. */
const GAP = 0.14;
/** Space between the text and the right cap. */
const RIGHT_PAD = 0.38;
/** The ring that lifts the marker off the map. */
const RING = 0.09;
const SHADOW_BLUR = 0.22;
const SHADOW_DROP = 0.06;

export const MARKER_RING_COLOR = 'rgba(255, 255, 255, 0.9)';
export const MARKER_SHADOW_COLOR = 'rgba(0, 0, 0, 0.35)';
/** Text on a light marker; near-black rather than black, which reads harsh on a saturated fill. */
export const MARKER_DARK_TEXT = '#1b1b1b';
export const MARKER_LIGHT_TEXT = '#ffffff';

export interface MarkerLayout {
    /** width of the pill; its height is the marker size */
    width: number;
    /** centre of the icon, measured from the left edge */
    iconCx: number;
    /** where the text starts, measured from the left edge; 0 without text */
    textX: number;
    iconFont: number;
    textFont: number;
}

/** Text and icon colour that stays readable on the marker: white on a dark fill, near-black on a light one. */
export function markerForeground(background: string): string {
    try {
        return Color(background).luminosity() > 0.5 ? MARKER_DARK_TEXT : MARKER_LIGHT_TEXT;
    } catch (_) {
        // an unreadable colour is drawn as given; white is what the marker had before any colouring
        return MARKER_LIGHT_TEXT;
    }
}

/**
 * The pill of a marker: a circle around the icon, widened to the right by the text. The icon keeps the
 * centre, so the marker points at its position however long the text grows.
 */
export function markerLayout(size: number, iconWidth: number, textWidth: number): MarkerLayout {
    const iconCx = size / 2;
    const fonts = { iconFont: size * ICON_FONT, textFont: size * TEXT_FONT };
    if (textWidth <= 0) {
        return { width: size, iconCx, textX: 0, ...fonts };
    }
    const textX = iconCx + iconWidth / 2 + size * GAP;
    return { width: textX + textWidth + size * RIGHT_PAD, iconCx, textX, ...fonts };
}

export interface MarkerDraw {
    /** the position the marker belongs to, where its icon is centred */
    x: number;
    y: number;
    /** height of the pill */
    size: number;
    background: string;
    icon: string;
    /** alias, value or both; empty draws the icon alone */
    text: string;
    /** font family of the text, the icon always uses the Material Symbols font */
    family: string;
}

/** What a marker takes up, so neighbouring pills can be kept apart before any of them is drawn. */
export function measureMarker(ctx: CanvasRenderingContext2D, marker: MarkerDraw): MarkerLayout {
    ctx.save();
    ctx.font = marker.size * ICON_FONT + 'px "Material Symbols Outlined"';
    const iconWidth = ctx.measureText(marker.icon).width;
    ctx.font = marker.size * TEXT_FONT + 'px ' + marker.family;
    const textWidth = marker.text.length > 0 ? ctx.measureText(marker.text).width : 0;
    ctx.restore();
    return markerLayout(marker.size, iconWidth, textWidth);
}

/** Radius of the dot that keeps marking the position when the pill moved away from it. */
const ANCHOR = 0.16;

/**
 * Draws the leader and the dot that hold a marker's position once its pill moved off it. Nothing is
 * drawn while the pill still covers the position.
 */
export function drawMarkerLeader(ctx: CanvasRenderingContext2D, marker: MarkerDraw, offset: MarkerOffset = { dx: 0, dy: 0 }): void {
    const { x, y, size, background } = marker;
    ctx.save();
    // down the column first, then across into the pill: a diagonal cuts through the floorplan at an
    // angle that reads as part of the drawing
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + offset.dy);
    ctx.lineTo(x + offset.dx, y + offset.dy);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(size * 0.05, 1);
    ctx.strokeStyle = background;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, size * ANCHOR, 0, 2 * Math.PI);
    ctx.fillStyle = background;
    ctx.fill();
    ctx.lineWidth = Math.max(size * RING * 0.5, 1);
    ctx.strokeStyle = MARKER_RING_COLOR;
    ctx.stroke();
    ctx.restore();
}

/**
 * Draws the pill of one marker. Every leader is drawn before any pill, so a leader crossing a
 * neighbour ends up under its text rather than over it.
 */
export function drawMarker(ctx: CanvasRenderingContext2D, marker: MarkerDraw, offset: MarkerOffset = { dx: 0, dy: 0 }): void {
    const { x, y, size, background, icon, text, family } = marker;
    const foreground = markerForeground(background);
    const layout = measureMarker(ctx, marker);
    const pillX = x + offset.dx;
    const pillY = y + offset.dy;
    ctx.save();

    const left = pillX - layout.iconCx;
    const top = pillY - size / 2;
    ctx.beginPath();
    ctx.roundRect(left, top, layout.width, size, size / 2);

    ctx.shadowColor = MARKER_SHADOW_COLOR;
    ctx.shadowBlur = size * SHADOW_BLUR;
    ctx.shadowOffsetY = size * SHADOW_DROP;
    ctx.fillStyle = background;
    ctx.fill();
    // the ring is stroked without the shadow, which would otherwise be drawn twice and darken the edge
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.lineWidth = size * RING;
    ctx.strokeStyle = MARKER_RING_COLOR;
    ctx.stroke();

    ctx.fillStyle = foreground;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = layout.iconFont + 'px "Material Symbols Outlined"';
    ctx.fillText(icon, left + layout.iconCx, pillY);
    if (layout.textX > 0) {
        ctx.textAlign = 'left';
        ctx.font = layout.textFont + 'px ' + family;
        ctx.fillText(text, left + layout.textX, pillY);
    }
    ctx.restore();
}
