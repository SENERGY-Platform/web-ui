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

import { ActiveElement, Chart, ChartData, ChartOptions, Plugin, TooltipItem } from 'chart.js';
import { cssFont, frameArea, GoogleFrame, rawPluginOptions } from './google-chartjs';
import { googleCategoryLabelColor, googleDecimal, googlePalette, googleSliceShare } from './google-look';
import { GoogleTooltipView, googleTooltip } from './google-tooltip';

export interface PieSlice {
    label: string;
    value: number;
    color: string;
}

/** The slice Google grouped all slices below the visibility threshold into. */
export const otherSliceLabel = 'Sonstiges';
export const otherSliceColor = '#cccccc';
/** Google's default sliceVisibilityThreshold: slices under half a degree. */
export const defaultSliceThreshold = 1 / 720;

/**
 * The slices as Google drew them: colours from the palette unless given, slices below the threshold share of the total
 * merged into one grey "Sonstiges" slice at the end, empty and negative slices left out.
 */
export function pieSlices(rows: { label: string; value: number; color?: string }[], threshold = defaultSliceThreshold): PieSlice[] {
    const coloured = rows.map((r, i) => ({ label: r.label, value: Number(r.value), color: r.color || googlePalette[i % googlePalette.length] }));
    const positive = coloured.filter((s) => Number.isFinite(s.value) && s.value > 0);
    const total = positive.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) {
        return [];
    }
    const shown = positive.filter((s) => s.value / total >= threshold);
    const rest = positive.filter((s) => s.value / total < threshold).reduce((sum, s) => sum + s.value, 0);
    return rest > 0 ? [...shown, { label: otherSliceLabel, value: rest, color: otherSliceColor }] : shown;
}

export interface PieLabel {
    slice: number;
    side: 'left' | 'right';
    dot: { x: number; y: number };
    lineY: number;
    elbowX: number;
    edgeX: number;
    name: string;
    share: string;
}

/**
 * The labeled legend: a dot at three quarters of the radius in the middle of each slice, a line to the chart area edge
 * with an elbow 12px outside the pie, the name above and the share below the line; labels on one side are moved
 * apart symmetrically around their cluster until they are 2.9 font sizes apart, within the chart area.
 */
export function pieLabels(slices: PieSlice[], centre: { x: number; y: number }, radius: number, area: { left: number; top: number; right: number; bottom: number },
    fontSize: number): PieLabel[] {
    const total = slices.reduce((sum, s) => sum + s.value, 0);
    let start = 0;
    const labels: PieLabel[] = slices.map((s, i) => {
        const angle = ((start + s.value / 2) / total) * 2 * Math.PI;
        start += s.value;
        const side: 'left' | 'right' = angle < Math.PI ? 'right' : 'left';
        const dot = { x: Math.round(centre.x + 0.75 * radius * Math.sin(angle)) + 0.5, y: Math.round(centre.y - 0.75 * radius * Math.cos(angle)) + 0.5 };
        return {
            slice: i, side, dot, lineY: dot.y,
            elbowX: side === 'right' ? centre.x + radius + 12 : centre.x - radius - 12,
            edgeX: side === 'right' ? area.right + 0.5 : area.left + 0.5,
            name: s.label, share: googleSliceShare(s.value / total),
        };
    });
    const spacing = 2.9 * fontSize;
    const minY = area.top + 1.4 * fontSize;
    const maxY = area.bottom - 1.3 * fontSize;
    (['left', 'right'] as const).forEach((side) => {
        const group = labels.filter((l) => l.side === side).sort((a, b) => a.dot.y - b.dot.y);
        // clusters of overlapping labels are spread around their mean until no two clusters overlap
        let clusters = group.map((l) => ({ members: [l], y: l.dot.y }));
        let merged = true;
        while (merged) {
            merged = false;
            for (let i = 0; i + 1 < clusters.length; i++) {
                const a = clusters[i];
                const b = clusters[i + 1];
                const aEnd = a.y + ((a.members.length - 1) * spacing) / 2;
                const bStart = b.y - ((b.members.length - 1) * spacing) / 2;
                if (bStart - aEnd < spacing) {
                    const members = [...a.members, ...b.members];
                    const y = members.reduce((sum, m) => sum + m.dot.y, 0) / members.length;
                    clusters.splice(i, 2, { members, y });
                    merged = true;
                    break;
                }
            }
        }
        clusters = clusters.map((c) => {
            const half = ((c.members.length - 1) * spacing) / 2;
            return { ...c, y: Math.min(Math.max(c.y, minY + half), Math.max(minY + half, maxY - half)) };
        });
        clusters.forEach((c) => c.members.forEach((m, i) => (m.lineY = Math.round(c.y - ((c.members.length - 1) * spacing) / 2 + i * spacing - 0.5) + 0.5)));
    });
    return labels;
}

interface PieOptions {
    frame: GoogleFrame;
    slices: PieSlice[];
}

function pieGeometry(chart: Chart): { centre: { x: number; y: number }; radius: number } | undefined {
    const arc = chart.getDatasetMeta(0)?.data?.[0] as unknown as { x: number; y: number; outerRadius: number } | undefined;
    return arc === undefined ? undefined : { centre: { x: arc.x, y: arc.y }, radius: arc.outerRadius };
}

function labelsOf(chart: Chart, options: PieOptions): PieLabel[] {
    const geometry = pieGeometry(chart);
    if (geometry === undefined) {
        return [];
    }
    return pieLabels(options.slices, geometry.centre, geometry.radius, frameArea(options.frame), options.frame.fontSize);
}

/** The labeled legend and the hover ring of a former Google pie; configured by options.plugins.googlePie. */
export const googlePiePlugin: Plugin = {
    id: 'googlePie',
    afterDatasetsDraw(chart: Chart) {
        const options = rawPluginOptions<PieOptions>(chart, 'googlePie');
        const geometry = pieGeometry(chart);
        if (options === undefined || geometry === undefined) {
            return;
        }
        const ctx = chart.ctx;
        const fs = options.frame.fontSize;
        const active = new Set(chart.getActiveElements().map((e: ActiveElement) => e.index));
        ctx.save();
        active.forEach((index) => {
            const arc = chart.getDatasetMeta(0).data[index] as unknown as { startAngle: number; endAngle: number };
            ctx.strokeStyle = options.slices[index].color;
            ctx.globalAlpha = 0.3;
            ctx.lineWidth = 6.5;
            ctx.beginPath();
            ctx.arc(geometry.centre.x, geometry.centre.y, geometry.radius + 3.75, arc.startAngle, arc.endAngle);
            ctx.stroke();
            ctx.globalAlpha = 1;
        });
        labelsOf(chart, options).forEach((l) => {
            const hovered = active.has(l.slice);
            ctx.strokeStyle = 'rgba(99,99,99,0.7)';
            ctx.fillStyle = 'rgba(99,99,99,0.7)';
            ctx.lineWidth = hovered ? 2 : 1;
            ctx.beginPath();
            ctx.moveTo(l.dot.x, l.dot.y);
            ctx.lineTo(l.elbowX, l.dot.y);
            ctx.lineTo(l.elbowX, l.lineY);
            ctx.lineTo(l.edgeX, l.lineY);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(l.dot.x, l.dot.y, hovered ? 4 : 2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.font = cssFont(fs);
            ctx.textAlign = l.side === 'right' ? 'right' : 'left';
            ctx.textBaseline = 'alphabetic';
            const x = l.side === 'right' ? l.edgeX - 0.5 : l.edgeX - 0.5;
            ctx.fillStyle = googleCategoryLabelColor();
            ctx.fillText(l.name, x, l.lineY - 0.5 * fs);
            ctx.fillStyle = '#9e9e9e';
            ctx.fillText(l.share, x, l.lineY + 1.12 * fs);
        });
        ctx.restore();
    },
};

/** The tooltip of a slice: its name, and value with share in bold, e.g. "42 (50,9%)". */
export function pieTooltipView(slices: PieSlice[], index: number, tip: { x: number; y: number }, side: 'left' | 'right' = 'right'): GoogleTooltipView | undefined {
    const slice = slices[index];
    if (slice === undefined) {
        return undefined;
    }
    const total = slices.reduce((sum, s) => sum + s.value, 0);
    return { lines: [[{ text: slice.label }], [{ text: googleDecimal(slice.value) + ' (' + googleSliceShare(slice.value / total) + ')', bold: true }]], tip, side, below: true };
}

/** The tail of a slice's tooltip pointed at the pie's edge in the middle of the slice; the box leans away from the pie's middle. */
function sliceTip(item: TooltipItem<'pie'>): { tip: { x: number; y: number }; side: 'left' | 'right' } {
    const arc = item.element as unknown as { x: number; y: number; startAngle: number; endAngle: number; outerRadius: number };
    const angle = (arc.startAngle + arc.endAngle) / 2;
    const tip = { x: arc.x + (arc.outerRadius + 0.5) * Math.cos(angle), y: arc.y + (arc.outerRadius + 0.5) * Math.sin(angle) };
    return { tip, side: tip.x < arc.x ? 'left' : 'right' };
}

export interface GooglePieConfig {
    data: ChartData<'pie', number[], string>;
    options: ChartOptions<'pie'>;
}

/** A Google pie without slice texts and with the labeled legend, in the given frame. */
export function googlePieConfig(slices: PieSlice[], frame: GoogleFrame): GooglePieConfig {
    return {
        data: {
            labels: slices.map((s) => s.label),
            datasets: [{
                data: slices.map((s) => s.value),
                backgroundColor: slices.map((s) => s.color),
                hoverBackgroundColor: slices.map((s) => s.color),
                borderColor: '#ffffff',
                hoverBorderColor: '#ffffff',
                borderWidth: 1,
                hoverOffset: 0,
            }],
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { left: frame.area.left, top: frame.area.top, right: frame.width - frame.area.left - frame.area.width, bottom: frame.height - frame.area.top - frame.area.height } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: false,
                    external: googleTooltip((items: TooltipItem<'pie'>[]) => {
                        if (items.length === 0) {
                            return undefined;
                        }
                        const { tip, side } = sliceTip(items[0]);
                        return pieTooltipView(slices, items[0].dataIndex, tip, side);
                    }, () => frame.fontSize),
                },
                googlePie: { frame, slices },
            } as any,
        },
    };
}
