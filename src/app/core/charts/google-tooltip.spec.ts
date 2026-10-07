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

import { renderGoogleTooltip, tooltipBox } from './google-tooltip';

describe('tooltipBox', () => {
    // fixed run widths as Arial 12px had them
    const widths: Record<string, number> = { '04.10.2026, 22:00:00': 122, 'Feuchte: ': 46, '55': 13.3 };
    const measure = (run: { text: string; bold?: boolean }) => widths[run.text];
    const lines = [[{ text: '04.10.2026, 22:00:00', bold: true }], [{ text: 'Feuchte: ' }, { text: '55', bold: true }]];

    it('puts the box above the point, its centre 12px left of the tip, as Google did for a line point', () => {
        const box = tooltipBox({ lines, tip: { x: 294.4, y: 149 }, side: 'left' }, 12, 605, measure);
        expect([box.left, box.top, box.width, box.height]).toEqual([215.5, 94.5, 135, 43]);
        expect(box.baselines.map((b) => Math.round(b * 10) / 10)).toEqual([16.8, 32.8]);
    });

    it('leans right of the tip when the box would leave the chart on the left', () => {
        const box = tooltipBox({ lines, tip: { x: 20, y: 149 }, side: 'left' }, 12, 605, measure);
        expect(box.left).toBe(0.5);
        expect(box.path).toContain('L19.5,');
    });

    it('goes below the tip when it would come closer than 5px to the top', () => {
        const box = tooltipBox({ lines, tip: { x: 300, y: 50 }, tipBelow: { x: 300, y: 57 }, side: 'left' }, 12, 605, measure);
        expect(box.top).toBe(69.5);
    });

    it('goes below the tip when asked to, and above only where the chart ends beneath', () => {
        const view = { lines, tip: { x: 300, y: 150 }, side: 'right' as const, below: true };
        expect(tooltipBox(view, 12, 605, measure, 305).top).toBe(162.5);
        expect(tooltipBox({ ...view, tip: { x: 300, y: 270 } }, 12, 605, measure, 305).top).toBe(215.5);
    });

    it('spaces lines 1.3 font sizes apart and pads by half a font size', () => {
        const box = tooltipBox({ lines, tip: { x: 300, y: 150 }, side: 'left' }, 11, 400, measure);
        expect([box.height, box.padding]).toEqual([38, 6]);
    });
});

describe('renderGoogleTooltip', () => {
    it('writes the texts as text, never as markup', () => {
        const parent = document.createElement('div');
        renderGoogleTooltip(parent, 0, 0, { lines: [[{ text: '<b>x</b>' }]], tip: { x: 100, y: 100 }, side: 'left' }, 12, 605);
        expect(parent.querySelector('svg text')?.textContent).toBe('<b>x</b>');
        expect(parent.querySelector('b')).toBeNull();
    });

    it('sizes the box by the width the browser lays the text out with in the SVG', () => {
        spyOn(SVGTextContentElement.prototype, 'getComputedTextLength').and.returnValue(100);
        const parent = document.createElement('div');
        renderGoogleTooltip(parent, 0, 0, { lines: [[{ text: 'x' }]], tip: { x: 300, y: 100 }, side: 'left' }, 12, 605);
        // 100px of text plus 2 * 6.5px padding, and the pixel of the outline
        expect(parent.querySelector('svg')?.getAttribute('width')).toBe('114');
    });

    it('gives every tooltip its own shadow filter, which its outline refers to, also after a redraw', () => {
        const view = { lines: [[{ text: 'a' }]], tip: { x: 100, y: 100 }, side: 'left' as const };
        const parents = [document.createElement('div'), document.createElement('div')];
        parents.forEach((p) => renderGoogleTooltip(p, 0, 0, view, 12, 605));
        renderGoogleTooltip(parents[0], 0, 0, view, 12, 605);
        const ids = parents.map((p) => p.querySelector('filter')?.id);
        expect(ids[0]).not.toBe(ids[1]);
        parents.forEach((p, i) => expect(p.querySelector('path')?.getAttribute('filter')).toBe('url(#' + ids[i] + ')'));
    });

    it('hides the box when there is nothing to show', () => {
        const parent = document.createElement('div');
        renderGoogleTooltip(parent, 0, 0, { lines: [[{ text: 'a' }]], tip: { x: 100, y: 100 }, side: 'left' }, 12, 605);
        renderGoogleTooltip(parent, 0, 0, undefined, 12, 605);
        expect((parent.querySelector('svg') as SVGElement).style.display).toBe('none');
    });
});
