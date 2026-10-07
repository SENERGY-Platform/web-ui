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

import { Chart, TooltipItem, TooltipModel } from 'chart.js';
import { googleFont } from './google-look';
import { textWidth } from './google-chartjs';

/** One text run of a tooltip line. */
export interface TooltipRun {
    text: string;
    bold?: boolean;
}

/** What a Google tooltip shows: lines of runs, and where its tail points to. */
export interface GoogleTooltipView {
    lines: TooltipRun[][];
    /** the point the tail touches when the box is above it, in canvas px */
    tip: { x: number; y: number };
    /** the point the tail touches when the box has to go below; the same as tip if not given */
    tipBelow?: { x: number; y: number };
    /** the side the box leans to from the tip */
    side: 'left' | 'right';
    /** the box goes below the tip, and above it only where the chart's bottom leaves no room (pie slices) */
    below?: boolean;
}

/** "label: value" with the value bold, as Google's default tooltip line read. */
export function labelledLine(label: string, value: string): TooltipRun[] {
    return [{ text: label + ': ' }, { text: value, bold: true }];
}

export interface TooltipBox {
    left: number;
    top: number;
    width: number;
    height: number;
    /** the outline of box and tail relative to left/top, as an SVG path */
    path: string;
    /** baseline of each line relative to the box top */
    baselines: number[];
    padding: number;
}

/**
 * The geometry of Google's tooltip: lines 1.3 font sizes apart, a 12px wide tail whose tip is 12px beside the box
 * centre, the box above the tip, or below it where it would come closer than 5px to the top of the chart.
 */
export function tooltipBox(view: GoogleTooltipView, fontSize: number, chartWidth: number, measure: (run: TooltipRun) => number, chartHeight = Infinity): TooltipBox {
    const padding = Math.round(1.08 * fontSize) / 2;
    const lineHeight = Math.round(1.3 * fontSize);
    const width = Math.round(Math.max(0, ...view.lines.map((l) => l.reduce((w, run) => w + measure(run), 0))) + 2 * padding);
    const height = view.lines.length * lineHeight + fontSize - 1;
    const tail = 12;
    const above = view.below ? view.tip.y + tail + height + 1 > chartHeight : view.tip.y - tail - height >= 5;
    const tip = above ? view.tip : view.tipBelow || view.tip;
    let side = view.side;
    let centre = tip.x + (side === 'right' ? tail : -tail);
    if (side === 'left' && centre - width / 2 < 0) {
        side = 'right';
        centre = tip.x + tail;
    } else if (side === 'right' && centre + width / 2 > chartWidth) {
        side = 'left';
        centre = tip.x - tail;
    }
    // a box wider than the room beside the tip is moved into the chart, its tail base kept on its edge
    const left = Math.round(Math.max(0, Math.min(chartWidth - width - 1, centre - width / 2))) + 0.5;
    const top = Math.round(above ? tip.y - tail - height : tip.y + tail) + 0.5;
    // tail base: from the box centre 12px away from the tip, the tip 12px beside the base
    const c = Math.max(tail, Math.min(width - tail, centre - left));
    const baseFrom = side === 'right' ? c : c - tail;
    const baseTo = side === 'right' ? c + tail : c;
    const tipX = tip.x - left;
    const tipY = tip.y - top;
    const path = above
        ? `M0,${height}L0,0L${width},0L${width},${height}L${baseTo},${height}L${tipX},${tipY}L${baseFrom},${height}Z`
        : `M0,${height}L0,0L${baseFrom},0L${tipX},${tipY}L${baseTo},0L${width},0L${width},${height}Z`;
    const baselines = view.lines.map((_, i) => 5.9 + 0.905 * fontSize + i * lineHeight);
    return { left, top, width, height, path, baselines, padding };
}

const svgNs = 'http://www.w3.org/2000/svg';
const tooltipClass = 'senergy-google-tooltip';

function svgElement<K extends keyof SVGElementTagNameMap>(name: K, attributes: Record<string, string | number>): SVGElementTagNameMap[K] {
    const element = document.createElementNS(svgNs, name);
    Object.entries(attributes).forEach(([k, v]) => element.setAttribute(k, String(v)));
    return element;
}

/** The width the browser lays a run out with in SVG, which is wider than canvas measuring and the width Google's boxes had. */
function svgTextWidth(svg: SVGSVGElement, run: TooltipRun, fontSize: number): number {
    const text = svgElement('text', { 'font-family': googleFont, 'font-size': fontSize, 'font-weight': run.bold ? 'bold' : 'normal' });
    text.setAttribute('xml:space', 'preserve');
    text.style.whiteSpace = 'pre';
    text.textContent = run.text;
    svg.appendChild(text);
    const width = text.getComputedTextLength();
    text.remove();
    return width > 0 ? width : textWidth(run.text, fontSize, run.bold === true);
}

let tooltipCount = 0;

/** Draws the tooltip into an SVG over the canvas; all texts are set as text content. */
export function renderGoogleTooltip(parent: HTMLElement, offsetX: number, offsetY: number, view: GoogleTooltipView | undefined, fontSize: number, chartWidth: number, chartHeight = Infinity) {
    let svg = parent.querySelector(':scope > svg.' + tooltipClass) as SVGSVGElement | null;
    if (view === undefined) {
        if (svg !== null) {
            svg.style.display = 'none';
        }
        return;
    }
    if (svg === null) {
        // url(#id) resolves document-wide, so each tooltip needs a shadow filter id of its own
        svg = svgElement('svg', { class: tooltipClass, 'data-shadow-id': 'senergy-google-tooltip-shadow-' + ++tooltipCount });
        Object.assign(svg.style, { position: 'absolute', pointerEvents: 'none', zIndex: '12', overflow: 'visible' });
        parent.appendChild(svg);
    }
    svg.replaceChildren();
    svg.style.display = 'block';
    const box = tooltipBox(view, fontSize, chartWidth, (run) => svgTextWidth(svg!, run, fontSize), chartHeight);
    svg.style.left = offsetX + box.left + 'px';
    svg.style.top = offsetY + box.top + 'px';
    svg.setAttribute('width', String(box.width + 1));
    svg.setAttribute('height', String(box.height + 1));
    const shadowId = svg.getAttribute('data-shadow-id') as string;
    const defs = svgElement('defs', {});
    const filter = svgElement('filter', { id: shadowId, x: '-10%', y: '-10%', width: '130%', height: '140%' });
    filter.appendChild(svgElement('feDropShadow', { dx: 1, dy: 1, stdDeviation: 1, 'flood-color': '#000', 'flood-opacity': 0.25 }));
    defs.appendChild(filter);
    svg.appendChild(defs);
    svg.appendChild(svgElement('path', { d: box.path, stroke: '#cccccc', 'stroke-width': 1, fill: '#ffffff', filter: 'url(#' + shadowId + ')' }));
    view.lines.forEach((line, i) => {
        const t = svgElement('text', { x: box.padding, y: box.baselines[i], 'font-family': googleFont, 'font-size': fontSize, fill: '#000000' });
        line.forEach((run) => {
            const span = svgElement('tspan', run.bold ? { 'font-weight': 'bold' } : {});
            // spaces at run ends would collapse in SVG
            span.setAttribute('xml:space', 'preserve');
            span.style.whiteSpace = 'pre';
            span.textContent = run.text;
            t.appendChild(span);
        });
        svg!.appendChild(t);
    });
}

/**
 * An external tooltip handler drawing Google's tooltip for the hovered items; the canvas parent must be positioned.
 * view returns undefined for items without a tooltip.
 */
export function googleTooltip(view: (items: TooltipItem<any>[], chart: Chart) => GoogleTooltipView | undefined, fontSize: () => number) {
    return (context: { chart: Chart; tooltip: TooltipModel<any> }) => {
        const { chart, tooltip } = context;
        const parent = chart.canvas.parentElement;
        if (parent === null) {
            return;
        }
        const content = tooltip.opacity === 0 ? undefined : view(tooltip.dataPoints || [], chart);
        renderGoogleTooltip(parent, chart.canvas.offsetLeft, chart.canvas.offsetTop, content, fontSize(), chart.width, chart.height);
    };
}
