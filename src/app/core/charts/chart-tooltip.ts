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

import { Chart, ChartType, Tooltip, TooltipItem, TooltipModel, TooltipPositionerFunction } from 'chart.js';
import { chartFontFamily, chartTextColor } from './chart-look';

export interface TooltipRow {
    color: string;
    label: string;
    value: string;
}

/** What an HTML tooltip shows; every text is set as text, never parsed as HTML. */
export interface TooltipView {
    /** grey header above the rows, usually the formatted x value */
    title?: string;
    rows?: TooltipRow[];
    /** a single line with a bold label */
    line?: { label: string; value: string };
    /** a bar of a time range: its series name in the series colour above "category: start - end" */
    range?: { name: string; color: string; category: string; start: string; end: string };
    /** shown in a bubble below the x axis at the hovered x value */
    axisLabel?: string;
}

declare module 'chart.js' {
    interface TooltipPositionerMap {
        cursor: TooltipPositionerFunction<ChartType>;
    }
}

/** Places the tooltip at the mouse pointer instead of the hovered element, for tooltips that follow the cursor. */
Tooltip.positioners.cursor = (_elements, eventPosition) => eventPosition;

const boxClass = 'senergy-chart-tooltip';
const bubbleClass = 'senergy-chart-axis-tooltip';

function child(parent: HTMLElement, className: string, style: Partial<CSSStyleDeclaration>): HTMLElement {
    let element = Array.from(parent.children).find((c) => c.classList.contains(className)) as HTMLElement | undefined;
    if (element === undefined) {
        element = document.createElement('div');
        element.classList.add(className);
        Object.assign(element.style, style);
        parent.appendChild(element);
    }
    return element;
}

function span(text: string, style: Partial<CSSStyleDeclaration> = {}): HTMLSpanElement {
    const element = document.createElement('span');
    element.textContent = text;
    Object.assign(element.style, style);
    return element;
}

function div(style: Partial<CSSStyleDeclaration>, ...children: Node[]): HTMLDivElement {
    const element = document.createElement('div');
    Object.assign(element.style, style);
    children.forEach((c) => element.appendChild(c));
    return element;
}

/** Replaces the content of the tooltip box with the view. */
export function renderTooltipView(box: HTMLElement, view: TooltipView) {
    box.replaceChildren();
    if (view.title !== undefined) {
        box.appendChild(div({ padding: '6px', background: '#ECEFF1', borderBottom: '1px solid #ddd', marginBottom: '4px' }, span(view.title)));
    }
    (view.rows || []).forEach((row) => {
        const marker = span('', { display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: row.color, marginRight: '10px' });
        box.appendChild(div({ display: 'flex', alignItems: 'center', padding: '6px 10px 5px' },
            marker, span(row.label + ': '), span(row.value, { fontWeight: '600', marginLeft: '5px' })));
    });
    if (view.line !== undefined) {
        box.appendChild(div({ padding: '3px 5px' }, span(view.line.label, { fontWeight: '700' }), span(' ' + view.line.value)));
    }
    if (view.range !== undefined) {
        const range = view.range;
        box.appendChild(div({ padding: '5px 8px' },
            div({}, span(range.name + ':', { fontWeight: '700', color: range.color, display: 'block', marginBottom: '5px' })),
            div({}, span(range.category + ': ', { fontWeight: '600', color: '#777' }), span(range.start, { fontWeight: '700' }), span(' - '),
                span(range.end, { fontWeight: '700' }))));
    }
}

/**
 * An external tooltip handler drawing an HTML box next to the hovered point, and the x value in a
 * bubble under the axis, the way the charts showed tooltips before. The canvas parent must be positioned;
 * with followCursor the tooltip option position must be 'cursor'.
 */
export function htmlTooltip(view: (items: TooltipItem<any>[]) => TooltipView | undefined, followCursor = false) {
    return (context: { chart: Chart; tooltip: TooltipModel<any> }) => {
        const { chart, tooltip } = context;
        const parent = chart.canvas.parentElement;
        if (parent === null) {
            return;
        }
        const box = child(parent, boxClass, {
            position: 'absolute', pointerEvents: 'none', zIndex: '12', whiteSpace: 'nowrap', borderRadius: '5px', border: '1px solid #e3e3e3',
            background: 'rgba(255, 255, 255, 0.96)', boxShadow: '2px 2px 6px -4px #999', fontFamily: chartFontFamily, fontSize: '12px', color: chartTextColor,
        });
        const bubble = child(parent, bubbleClass, {
            position: 'absolute', pointerEvents: 'none', zIndex: '12', whiteSpace: 'nowrap', borderRadius: '2px', border: '1px solid #90A4AE',
            background: '#ECEFF1', padding: '9px 10px', fontFamily: chartFontFamily, fontSize: '13px', color: chartTextColor,
        });
        const content = tooltip.opacity === 0 ? undefined : view(tooltip.dataPoints || []);
        if (content === undefined) {
            box.style.display = 'none';
            bubble.style.display = 'none';
            return;
        }
        renderTooltipView(box, content);
        box.style.display = 'block';
        const offsetX = chart.canvas.offsetLeft;
        const offsetY = chart.canvas.offsetTop;
        const width = box.offsetWidth;
        const height = box.offsetHeight;
        let left: number;
        let top: number;
        if (followCursor) {
            left = tooltip.caretX - width + 14;
            top = tooltip.caretY - height + 7;
        } else {
            left = tooltip.caretX + 13;
            if (left + width > chart.width) {
                left = tooltip.caretX - width - 13;
            }
            top = tooltip.caretY - 25;
        }
        box.style.left = offsetX + Math.max(0, left) + 'px';
        box.style.top = offsetY + Math.max(0, Math.min(top, chart.height - height)) + 'px';

        if (content.axisLabel === undefined) {
            bubble.style.display = 'none';
            return;
        }
        bubble.replaceChildren(
            span(content.axisLabel),
            span('', { position: 'absolute', left: '50%', top: '-12px', marginLeft: '-6px', border: '6px solid transparent', borderBottomColor: '#90A4AE' }),
            span('', { position: 'absolute', left: '50%', top: '-11px', marginLeft: '-6px', border: '6px solid transparent', borderBottomColor: '#ECEFF1' }),
        );
        bubble.style.display = 'block';
        bubble.style.left = offsetX + tooltip.caretX - bubble.offsetWidth / 2 + 'px';
        bubble.style.top = offsetY + chart.chartArea.bottom + 8 + 'px';
    };
}
