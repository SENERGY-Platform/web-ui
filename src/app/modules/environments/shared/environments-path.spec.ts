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

import { locationContains, problemPath, sameLocation } from './environments-path';

describe('problemPath', () => {
    it('parses a bare environment-level field with no indexes', () => {
        expect(problemPath('name')).toEqual({ zoneIndexes: [], suffix: 'name' });
    });

    it('parses a top-level zone field', () => {
        expect(problemPath('zones[0].name')).toEqual({ zoneIndexes: [0], suffix: 'name' });
    });

    it('parses a zone nested two levels deep', () => {
        expect(problemPath('zones[1].zones[0].name')).toEqual({ zoneIndexes: [1, 0], suffix: 'name' });
    });

    it('parses a zone nested three levels deep', () => {
        expect(problemPath('zones[2].zones[1].zones[0].type')).toEqual({ zoneIndexes: [2, 1, 0], suffix: 'type' });
    });

    it('parses an asset below a nested zone', () => {
        expect(problemPath('zones[1].zones[0].assets[2].name')).toEqual({
            zoneIndexes: [1, 0],
            assetIndex: 2,
            suffix: 'name',
        });
    });

    it('parses a channel below an asset, including a dotted source suffix', () => {
        expect(problemPath('zones[0].assets[2].channels[1].source.script.code')).toEqual({
            zoneIndexes: [0],
            assetIndex: 2,
            channelIndex: 1,
            suffix: 'source.script.code',
        });
    });

    it('parses a channel path with no suffix', () => {
        expect(problemPath('zones[0].assets[2].channels[1]')).toEqual({
            zoneIndexes: [0],
            assetIndex: 2,
            channelIndex: 1,
        });
    });

    it('keeps an unparseable path as the suffix instead of throwing', () => {
        expect(problemPath('')).toEqual({ zoneIndexes: [] });
        expect(problemPath('???')).toEqual({ zoneIndexes: [], suffix: '???' });
    });
});

describe('sameLocation', () => {
    it('ignores the suffix', () => {
        const a = problemPath('zones[0].assets[1].channels[2].source.script.code');
        const b = problemPath('zones[0].assets[1].channels[2].interval_seconds');
        expect(sameLocation(a, b)).toBe(true);
    });

    it('is false for different nested zone chains of the same length', () => {
        expect(sameLocation(problemPath('zones[1].zones[0].name'), problemPath('zones[0].zones[1].name'))).toBe(false);
    });
});

describe('locationContains', () => {
    const root = { zoneIndexes: [] };

    it('the environment root contains every location', () => {
        expect(locationContains(root, problemPath('zones[1].zones[0].assets[2].channels[1].source.script.code'))).toBe(true);
        expect(locationContains(root, problemPath('name'))).toBe(true);
    });

    it('a zone contains its own nested sub-zones, assets and channels', () => {
        const zone = { zoneIndexes: [1] };
        expect(locationContains(zone, problemPath('zones[1].zones[0].name'))).toBe(true);
        expect(locationContains(zone, problemPath('zones[1].assets[2].channels[1].source.script.code'))).toBe(true);
        expect(locationContains(zone, problemPath('zones[1].name'))).toBe(true);
    });

    it('a zone does not contain a sibling zone', () => {
        const zone = { zoneIndexes: [1] };
        expect(locationContains(zone, problemPath('zones[0].name'))).toBe(false);
    });

    it('an asset contains its own channels but not a sibling asset', () => {
        const asset = { zoneIndexes: [0], assetIndex: 2 };
        expect(locationContains(asset, problemPath('zones[0].assets[2].channels[1].source.script.code'))).toBe(true);
        expect(locationContains(asset, problemPath('zones[0].assets[3].name'))).toBe(false);
    });

    it('a channel does not contain a sibling channel of the same asset', () => {
        const channel = { zoneIndexes: [0], assetIndex: 2, channelIndex: 1 };
        expect(locationContains(channel, problemPath('zones[0].assets[2].channels[1].source.script.code'))).toBe(true);
        expect(locationContains(channel, problemPath('zones[0].assets[2].channels[0].name'))).toBe(false);
    });
});
