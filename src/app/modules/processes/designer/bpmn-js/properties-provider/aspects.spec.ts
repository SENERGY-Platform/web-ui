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

import { aspectsLabel, eventAspectAttributes, eventAspectIds, payloadAspectFields, selectedAspectNodes } from './aspects';

const air = { id: 'urn:infai:ses:aspect:air', name: 'Air' };
const inside = { id: 'urn:infai:ses:aspect:inside', name: 'Inside' };
const water = { id: 'urn:infai:ses:aspect:water', name: 'Water' };

describe('process element aspects', () => {
    describe('selectedAspectNodes', () => {
        it('sorts the list by id', () => {
            expect(selectedAspectNodes({ aspects: [water, air, inside] })).toEqual([air, inside, water]);
        });

        it('reads a payload written before the list as a list of its single aspect', () => {
            expect(selectedAspectNodes({ aspect: inside })).toEqual([inside]);
        });

        it('folds a deprecated aspect missing from the list into it, as the readers of a payload do', () => {
            expect(selectedAspectNodes({ aspect: water, aspects: [inside] })).toEqual([inside, water]);
        });

        it('names an aspect once when the alias repeats a list entry', () => {
            expect(selectedAspectNodes({ aspect: air, aspects: [inside, air] })).toEqual([air, inside]);
        });

        it('is empty for a controlling task, which has no aspect', () => {
            expect(selectedAspectNodes({ aspect: null })).toEqual([]);
            expect(selectedAspectNodes({ aspect: null, aspects: [] })).toEqual([]);
            expect(selectedAspectNodes(undefined)).toEqual([]);
        });

        it('sorts by code unit like the Go services, not by locale', () => {
            // localeCompare puts 'urn:a1' before 'urn:B2'; Go's sort.Strings puts 'B' (0x42) before 'a' (0x61)
            const upper = { id: 'urn:B2', name: 'upper' };
            const lower = { id: 'urn:a1', name: 'lower' };
            expect(selectedAspectNodes({ aspects: [lower, upper] })).toEqual([upper, lower]);
        });
    });

    describe('payloadAspectFields', () => {
        it('writes the alias node and no list without an aspect', () => {
            const fields = payloadAspectFields({ aspect: null, aspects: [] });
            expect(fields).toEqual({ aspect: null });
            expect('aspects' in fields).toBe(false);
        });

        it('writes one aspect in both fields', () => {
            expect(payloadAspectFields({ aspect: air, aspects: [air] })).toEqual({ aspect: air, aspects: [air] });
        });

        it('writes the sorted list and its first node as the alias', () => {
            expect(payloadAspectFields({ aspect: water, aspects: [water, air] })).toEqual({ aspect: air, aspects: [air, water] });
        });
    });

    describe('aspectsLabel', () => {
        it('names a single aspect as before', () => {
            expect(aspectsLabel({ aspect: air, aspects: [air] })).toBe('Air');
            expect(aspectsLabel({ aspect: air })).toBe('Air');
        });

        it('names every aspect of a list, in id order', () => {
            expect(aspectsLabel({ aspect: air, aspects: [water, air] })).toBe('Air, Water');
        });

        it('names nothing without an aspect', () => {
            expect(aspectsLabel({ aspect: null, aspects: [] })).toBeUndefined();
        });
    });

    describe('eventAspectIds', () => {
        it('splits the list attribute and drops blanks the way the process-deployment does', () => {
            expect(eventAspectIds(' a , ,b,', undefined)).toEqual(['a', 'b']);
        });

        it('reads an element written before the list from its single attribute', () => {
            expect(eventAspectIds(undefined, 'a')).toEqual(['a']);
            expect(eventAspectIds('', 'a')).toEqual(['a']);
        });

        it('folds a single attribute missing from the list into it', () => {
            expect(eventAspectIds('b', 'a')).toEqual(['b', 'a']);
            expect(eventAspectIds('a,b', 'a')).toEqual(['a', 'b']);
        });

        it('is empty for an element without either attribute', () => {
            expect(eventAspectIds(undefined, undefined)).toEqual([]);
            expect(eventAspectIds('', ' ')).toEqual([]);
        });

        it('names a repeated id once', () => {
            expect(eventAspectIds('a,a', undefined)).toEqual(['a']);
        });
    });

    describe('eventAspectAttributes', () => {
        it('removes both attributes for an empty selection', () => {
            const attributes = eventAspectAttributes([]);
            expect(attributes).toEqual({ 'senergy:aspects': undefined, 'senergy:aspect': undefined });
            // modeling.updateProperties removes an attribute only when its key is present with undefined
            expect(Object.keys(attributes).sort()).toEqual(['senergy:aspect', 'senergy:aspects']);
            expect(eventAspectAttributes(undefined)).toEqual({ 'senergy:aspects': undefined, 'senergy:aspect': undefined });
            expect(eventAspectAttributes([''])).toEqual({ 'senergy:aspects': undefined, 'senergy:aspect': undefined });
        });

        it('writes a single aspect in both attributes', () => {
            expect(eventAspectAttributes(['a'])).toEqual({ 'senergy:aspects': 'a', 'senergy:aspect': 'a' });
        });

        it('writes the sorted ids without spaces and the first of them as the alias', () => {
            expect(eventAspectAttributes(['c', 'a', 'b'])).toEqual({ 'senergy:aspects': 'a,b,c', 'senergy:aspect': 'a' });
        });
    });
});
