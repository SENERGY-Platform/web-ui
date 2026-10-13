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
    compareVersionLabels,
    linksToRemove,
    newerVersionLabel,
    NEWEST_VERSION,
    portNameFromItemId,
    portNames,
    resolveVersionData,
    versionHint,
    versionOptions,
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
});
