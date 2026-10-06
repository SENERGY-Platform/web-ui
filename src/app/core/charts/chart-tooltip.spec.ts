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

import { renderTooltipView } from './chart-tooltip';

describe('renderTooltipView', () => {
    let box: HTMLElement;

    beforeEach(() => (box = document.createElement('div')));

    it('shows the title above a row per series with its name and bold value', () => {
        renderTooltipView(box, { title: '02.10', rows: [{ color: 'red', label: 'Normal Consumption', value: '8.280' }] });
        expect(box.textContent).toBe('02.10Normal Consumption: 8.280');
        expect(box.querySelectorAll('span')[3].style.fontWeight).toBe('600');
    });

    it('shows a range as series name and "category: start - end"', () => {
        renderTooltipView(box, { range: { name: 'An', color: 'green', category: 'Pump', start: '05.10 06:30:00', end: '05.10 07:45:00' } });
        expect(box.textContent).toBe('An:Pump: 05.10 06:30:00 - 05.10 07:45:00');
    });

    it('shows a single line with its label bold', () => {
        renderTooltipView(box, { line: { label: 'Device Output:', value: '95.20' } });
        expect(box.textContent).toBe('Device Output: 95.20');
    });

    it('never parses texts as HTML', () => {
        renderTooltipView(box, { rows: [{ color: 'red', label: '<img src=x onerror=alert(1)>', value: '<b>1</b>' }] });
        expect(box.querySelector('img')).toBeNull();
        expect(box.querySelector('b')).toBeNull();
    });
});
