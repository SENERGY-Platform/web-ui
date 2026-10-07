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


/** The value of a theme variable on the document root, e.g. '--mat-sys-on-surface'; `fallback` when it is unset (no theme loaded, as in unit tests). */
export function themeColor(variable: string, fallback: string): string {
    const value = typeof document === 'undefined' ? '' : getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    return value !== '' ? value : fallback;
}

/** The theme colour at the given opacity (percent) as a canvas-safe colour; unmixed `fallback` when the variable is unset. Keeps hairlines neutral where the theme tints its greys. */
export function themeColorMix(variable: string, percent: number, fallback: string): string {
    const value = themeColor(variable, '');
    return value !== '' ? 'color-mix(in srgb, ' + value + ' ' + percent + '%, transparent)' : fallback;
}

/** A CSS value for DOM styles that follows the theme by itself: the variable with `fallback` behind it. */
export function themeVar(variable: string, fallback: string): string {
    return 'var(' + variable + ', ' + fallback + ')';
}
