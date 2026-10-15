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
 *  limitations under the License.
 */

import {OperatorModel} from './operator.model';
import {
    bumpVersionLabel,
    classifyChange,
    compareVersionLabels,
    highestVersionLabel,
    isValidVersionLabel,
    linksToRemove,
    newerVersionLabel,
    newestVersionLabel,
    nextVersionLabel,
    NEWEST_VERSION,
    portNameFromItemId,
    portNames,
    resolveVersionData,
    VersionData,
    versionHint,
    versionOptions,
    versionsNewestFirst,
} from './operator-version';

const text = 'https://schema.org/Text';

function operator(): OperatorModel {
    return {
        _id: 'op',
        name: 'op',
        image: 'img:v1.2.0',
        description: undefined,
        deploymentType: 'cloud',
        userId: undefined,
        inputs: [{name: 'a', type: text}, {name: 'b', type: text}],
        outputs: [{name: 'o', type: text}],
        config_values: [{name: 'c', type: text}],
        versions: [
            {version: 'v1.0.0', image: 'img:v1.0.0', inputs: [{name: 'a', type: text}], outputs: [{name: 'o', type: text}]},
            {version: 'v1.2.0', image: 'img:v1.2.0', inputs: [{name: 'a', type: text}, {name: 'b', type: text}],
                outputs: [{name: 'o', type: text}], config_values: [{name: 'c', type: text}]},
            {version: 'v1.10.0', image: 'img:v1.10.0', deprecated: true},
            {version: 'v1.1.0', image: 'img:v1.1.0'},
        ],
    };
}

describe('operator-version', () => {
    describe('compareVersionLabels', () => {
        it('compares numerically per segment', () => {
            expect(compareVersionLabels('v1.10.0', 'v1.2.0')).toBeGreaterThan(0);
            expect(compareVersionLabels('v1.2.0', 'v1.10.0')).toBeLessThan(0);
            expect(compareVersionLabels('v2.0.0', 'v1.99.99')).toBeGreaterThan(0);
            expect(compareVersionLabels('v1.2.0', 'v1.2.0')).toBe(0);
        });

        it('sorts a pre-release below its release', () => {
            expect(compareVersionLabels('v1.2.0-rc1', 'v1.2.0')).toBeLessThan(0);
            expect(compareVersionLabels('v1.2.0', 'v1.2.0-rc1')).toBeGreaterThan(0);
        });
    });

    describe('newerVersionLabel', () => {
        it('returns the highest non-deprecated version above the pin', () => {
            // v1.10.0 is higher but deprecated
            expect(newerVersionLabel(operator(), 'v1.0.0')).toBe('v1.2.0');
        });

        it('returns undefined when the pin is the newest usable version', () => {
            expect(newerVersionLabel(operator(), 'v1.2.0')).toBeUndefined();
        });

        it('returns undefined for an unpinned node', () => {
            expect(newerVersionLabel(operator(), undefined)).toBeUndefined();
            expect(newerVersionLabel(operator(), '')).toBeUndefined();
        });

        it('returns undefined for an operator without versions', () => {
            const op = operator();
            op.versions = undefined;
            expect(newerVersionLabel(op, 'v1.0.0')).toBeUndefined();
        });
    });

    describe('versionOptions', () => {
        it('lists newest first, then the versions newest first, marking deprecated ones', () => {
            expect(versionOptions(operator())).toEqual([
                {value: NEWEST_VERSION, label: 'Newest (follows the operator)'},
                {value: 'v1.10.0', label: 'v1.10.0 (deprecated)'},
                {value: 'v1.2.0', label: 'v1.2.0'},
                {value: 'v1.1.0', label: 'v1.1.0'},
                {value: 'v1.0.0', label: 'v1.0.0'},
            ]);
        });
    });

    describe('resolveVersionData', () => {
        it('takes the top level for newest', () => {
            const data = resolveVersionData(operator(), NEWEST_VERSION);
            expect(portNames(data?.inputs)).toEqual(['a', 'b']);
            expect(data?.image).toBe('img:v1.2.0');
        });

        it('takes the labelled version and defaults missing lists to empty', () => {
            const data = resolveVersionData(operator(), 'v1.1.0');
            expect(data).toEqual({image: 'img:v1.1.0', inputs: [], outputs: [], config_values: []});
        });

        it('returns undefined for an unknown label', () => {
            expect(resolveVersionData(operator(), 'v9.9.9')).toBeUndefined();
        });
    });

    describe('links', () => {
        const links = [
            {id: 'l1', direction: 'in' as const, port: 'b', peerName: 'x'},
            {id: 'l2', direction: 'out' as const, port: 'o', peerName: 'y'},
            {id: 'l3', direction: 'in' as const, port: 'o', peerName: 'z'},
        ];

        it('removes links whose port is missing in the matching direction only', () => {
            const removed = linksToRemove(links, ['a'], ['o']);
            expect(removed.map(link => link.id)).toEqual(['l1', 'l3']);
        });

        it('keeps every link when all ports exist', () => {
            expect(linksToRemove(links, ['a', 'b', 'o'], ['o'])).toEqual([]);
        });

        it('derives the port name from a port item id', () => {
            expect(portNameFromItemId('in-a')).toBe('a');
            expect(portNameFromItemId('out-in-x')).toBe('in-x');
        });
    });

    describe('versionHint', () => {
        it('is empty for an unpinned node', () => {
            expect(versionHint(undefined, undefined)).toEqual({text: '', title: ''});
        });

        it('shows the pin', () => {
            expect(versionHint('v1.0.0', undefined)).toEqual({text: 'v1.0.0', title: 'Pinned to v1.0.0'});
        });

        it('names the newer version', () => {
            const hint = versionHint('v1.0.0', 'v1.2.0');
            expect(hint.text).toContain('update available');
            expect(hint.title).toContain('v1.2.0');
        });
    });

    describe('isValidVersionLabel', () => {
        it('accepts vMAJOR.MINOR.PATCH', () => {
            for (const label of ['v0.0.0', 'v1.0.0', 'v10.20.30']) {
                expect(isValidVersionLabel(label)).withContext(label).toBeTrue();
            }
        });

        it('refuses a missing v, leading zeros, a suffix and anything else', () => {
            for (const label of ['', '1.0.0', 'v1.0', 'v01.0.0', 'v1.00.0', 'v1.0.00', 'v1.0.0-rc1', 'v1.0.0 ', 'V1.0.0', 'v1.0.x']) {
                expect(isValidVersionLabel(label)).withContext(label).toBeFalse();
            }
        });
    });

    describe('nextVersionLabel', () => {
        const withVersions = (...labels: string[]) => ({versions: labels.map(version => ({version, image: 'i:' + version}))} as OperatorModel);

        it('starts at v1.0.0', () => {
            expect(nextVersionLabel({} as OperatorModel)).toBe('v1.0.0');
            expect(nextVersionLabel(withVersions())).toBe('v1.0.0');
        });

        it('raises the patch of the highest label, compared numerically and regardless of order', () => {
            expect(nextVersionLabel(withVersions('v1.2.0', 'v1.10.3', 'v1.9.9'))).toBe('v1.10.4');
            expect(nextVersionLabel(withVersions('v0.0.9'))).toBe('v0.0.10');
        });

        it('counts a deprecated version too', () => {
            const op = withVersions('v1.0.0', 'v1.1.0');
            op.versions![1].deprecated = true;
            expect(nextVersionLabel(op)).toBe('v1.1.1');
        });
    });

    describe('classifyChange', () => {
        const io = (name: string, type = 'float') => ({name, type});
        const data = (extra: Partial<VersionData> = {}): VersionData => ({
            image: 'img:1', inputs: [io('a')], outputs: [io('o')], config_values: [io('c', 'string')], ...extra,
        });

        it('is patch for a new image alone and none without a change', () => {
            expect(classifyChange(data(), data({image: 'img:2'}))).toBe('patch');
            expect(classifyChange(data(), data({image: ' img:1 '}))).toBe('none');
            expect(classifyChange(data(), data())).toBe('none');
        });

        it('is minor when inputs, outputs or config values were only added', () => {
            expect(classifyChange(data(), data({inputs: [io('a'), io('b')]}))).toBe('minor');
            expect(classifyChange(data(), data({outputs: [io('o'), io('p')]}))).toBe('minor');
            expect(classifyChange(data(), data({config_values: [io('c', 'string'), io('d')]}))).toBe('minor');
            expect(classifyChange(data({inputs: undefined as any}), data())).toBe('minor');
        });

        it('is major when a port or config value was removed, renamed or retyped', () => {
            expect(classifyChange(data(), data({inputs: []}))).toBe('major');
            expect(classifyChange(data(), data({outputs: [io('renamed')]}))).toBe('major');
            expect(classifyChange(data(), data({inputs: [io('a', 'string')]}))).toBe('major');
            expect(classifyChange(data(), data({config_values: []}))).toBe('major');
            expect(classifyChange(data(), data({config_values: [io('c', 'int')]}))).toBe('major');
        });

        it('takes the largest change when several kinds are mixed', () => {
            expect(classifyChange(data(), data({image: 'img:2', inputs: [io('a'), io('b')], outputs: []}))).toBe('major');
            expect(classifyChange(data(), data({image: 'img:2', inputs: [io('a'), io('b')]}))).toBe('minor');
        });

        it('does not count a blank row as a port that was removed or added', () => {
            expect(classifyChange(data({inputs: [io('a'), io('')]}), data())).toBe('minor');
            expect(classifyChange(data(), data({inputs: [io('a'), io('')]}))).toBe('minor');
        });
    });

    describe('bumpVersionLabel', () => {
        it('raises the part for the kind and resets the lower ones', () => {
            expect(bumpVersionLabel('v1.4.7', 'major')).toBe('v2.0.0');
            expect(bumpVersionLabel('v1.4.7', 'minor')).toBe('v1.5.0');
            expect(bumpVersionLabel('v1.4.7', 'patch')).toBe('v1.4.8');
            expect(bumpVersionLabel('v1.4.9', 'none')).toBe('v1.4.10');
        });

        it('starts over at v1.0.0 from a label it cannot read', () => {
            expect(bumpVersionLabel('v1.0.0-rc1', 'minor')).toBe('v1.0.0');
        });
    });

    describe('highestVersionLabel and newestVersionLabel', () => {
        const withVersions = (...labels: string[]) => ({versions: labels.map(version => ({version, image: 'i:' + version}))} as OperatorModel);

        it('compare numerically and regardless of order', () => {
            expect(highestVersionLabel(withVersions('v1.2.0', 'v1.10.0', 'v1.9.9'))).toBe('v1.10.0');
            expect(newestVersionLabel(withVersions('v1.2.0', 'v1.10.0', 'v1.9.9'))).toBe('v1.10.0');
        });

        it('newest skips deprecated versions, but names the highest one when all are deprecated', () => {
            const op = withVersions('v1.0.0', 'v1.1.0', 'v2.0.0');
            op.versions![2].deprecated = true;
            expect(newestVersionLabel(op)).toBe('v1.1.0');
            expect(highestVersionLabel(op)).toBe('v2.0.0');
            op.versions!.forEach(version => (version.deprecated = true));
            expect(newestVersionLabel(op)).toBe('v2.0.0');
        });

        it('are undefined without versions', () => {
            expect(highestVersionLabel({} as OperatorModel)).toBeUndefined();
            expect(newestVersionLabel({} as OperatorModel)).toBeUndefined();
        });
    });

    describe('versionsNewestFirst', () => {
        it('sorts by precedence without touching the operator', () => {
            const op = {versions: [{version: 'v1.2.0'}, {version: 'v1.10.0'}, {version: 'v1.0.0'}]} as OperatorModel;
            expect(versionsNewestFirst(op).map(version => version.version)).toEqual(['v1.10.0', 'v1.2.0', 'v1.0.0']);
            expect(op.versions!.map(version => version.version)).toEqual(['v1.2.0', 'v1.10.0', 'v1.0.0']);
            expect(versionsNewestFirst({} as OperatorModel)).toEqual([]);
        });
    });
});
