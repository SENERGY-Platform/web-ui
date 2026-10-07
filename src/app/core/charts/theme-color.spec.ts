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


import { themeColor, themeColorMix, themeVar } from './theme-color';

describe('themeColor', () => {
    const root = document.documentElement;
    afterEach(() => root.style.removeProperty('--test-chart-colour'));

    it('reads the variable from the document root, trimmed', () => {
        root.style.setProperty('--test-chart-colour', ' #112233 ');
        expect(themeColor('--test-chart-colour', '#abcdef')).toBe('#112233');
    });

    it('returns the fallback when the variable is not set', () => {
        expect(themeColor('--test-chart-colour', '#abcdef')).toBe('#abcdef');
    });

    it('puts the fallback behind the variable for DOM styles', () => {
        expect(themeVar('--mat-sys-surface', '#fff')).toBe('var(--mat-sys-surface, #fff)');
    });

    it('mixes the variable with transparency, or returns the fallback unmixed', () => {
        expect(themeColorMix('--test-chart-colour', 12, '#e0e0e0')).toBe('#e0e0e0');
        root.style.setProperty('--test-chart-colour', '#201a1a');
        expect(themeColorMix('--test-chart-colour', 12, '#e0e0e0')).toBe('color-mix(in srgb, #201a1a 12%, transparent)');
    });
});
