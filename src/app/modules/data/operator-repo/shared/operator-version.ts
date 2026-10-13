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

import {IOModel, OperatorModel, OperatorVersionModel} from './operator.model';
import {NodeLinkInfo} from '../../diagram-editor/shared/diagram.model';

export const NEWEST_VERSION = '__newest__';

export interface VersionOption {
    value: string;
    label: string;
}

export interface VersionData {
    image: string;
    inputs: IOModel[];
    outputs: IOModel[];
    config_values: IOModel[];
}

const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/;

/** Compares version labels like "v1.2.0" by semver precedence; a pre-release sorts below its release. */
export function compareVersionLabels(a: string, b: string): number {
    const left = VERSION_PATTERN.exec(a);
    const right = VERSION_PATTERN.exec(b);
    if (left === null || right === null) {
        return a.localeCompare(b, undefined, {numeric: true});
    }
    for (let i = 1; i <= 3; i++) {
        const diff = Number(left[i]) - Number(right[i]);
        if (diff !== 0) {
            return diff;
        }
    }
    if (left[4] === right[4]) {
        return 0;
    }
    if (left[4] === undefined) {
        return 1;
    }
    if (right[4] === undefined) {
        return -1;
    }
    return left[4].localeCompare(right[4], undefined, {numeric: true});
}

/** The highest non-deprecated version of the operator that is newer than the pin, if any. */
export function newerVersionLabel(operator: OperatorModel, pin: string | undefined): string | undefined {
    if (!pin) {
        return undefined;
    }
    let newest: string | undefined;
    for (const version of operator.versions ?? []) {
        if (version.deprecated || compareVersionLabels(version.version, pin) <= 0) {
            continue;
        }
        if (newest === undefined || compareVersionLabels(version.version, newest) > 0) {
            newest = version.version;
        }
    }
    return newest;
}

function findVersion(operator: OperatorModel, label: string | undefined): OperatorVersionModel | undefined {
    if (!label) {
        return undefined;
    }
    return (operator.versions ?? []).find(version => version.version === label);
}

/** Ports and config a node gets for a choice: the labelled version, or the operator's top level for NEWEST_VERSION. */
export function resolveVersionData(operator: OperatorModel, choice: string): VersionData | undefined {
    if (choice === NEWEST_VERSION) {
        return {
            image: operator.image ?? '',
            inputs: operator.inputs ?? [],
            outputs: operator.outputs ?? [],
            config_values: operator.config_values ?? [],
        };
    }
    const version = findVersion(operator, choice);
    if (version === undefined) {
        return undefined;
    }
    return {
        image: version.image,
        inputs: version.inputs ?? [],
        outputs: version.outputs ?? [],
        config_values: version.config_values ?? [],
    };
}

/** "Newest" first, then the versions newest first. */
export function versionOptions(operator: OperatorModel): VersionOption[] {
    const versions = [...(operator.versions ?? [])].sort((a, b) => compareVersionLabels(b.version, a.version));
    return [{value: NEWEST_VERSION, label: 'Newest (follows the operator)'}].concat(
        versions.map(version => ({
            value: version.version,
            label: version.deprecated ? `${version.version} (deprecated)` : version.version,
        })),
    );
}

export function portNames(ios: IOModel[] | undefined): string[] {
    const ports: string[] = [];
    for (const io of ios ?? []) {
        if (io.name !== undefined) {
            ports.push(io.name);
        }
    }
    return ports;
}

/** Port items of a node are identified as "in-<name>" and "out-<name>". */
export function portNameFromItemId(itemId: string): string {
    return itemId.replace(/^(in|out)-/, '');
}

/** The links whose port does not exist in the given port lists. */
export function linksToRemove(links: NodeLinkInfo[], inPorts: string[], outPorts: string[]): NodeLinkInfo[] {
    return links.filter(link => !(link.direction === 'in' ? inPorts : outPorts).includes(link.port));
}

export function versionHint(pin: string | undefined, newer: string | undefined): {text: string; title: string} {
    if (!pin) {
        return {text: '', title: ''};
    }
    if (newer === undefined) {
        return {text: pin, title: `Pinned to ${pin}`};
    }
    return {text: `${pin} - update available`, title: `Pinned to ${pin}, newer version ${newer} available`};
}

const LABEL_PATTERN = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/** The label rule of the operator repository: "vMAJOR.MINOR.PATCH", no leading zeros, no suffix. */
export function isValidVersionLabel(label: string): boolean {
    return LABEL_PATTERN.test(label);
}

/** The versions of an operator, newest first. */
export function versionsNewestFirst(operator: OperatorModel): OperatorVersionModel[] {
    return [...(operator.versions ?? [])].sort((a, b) => compareVersionLabels(b.version, a.version));
}

/** The highest label of the operator by semver, or undefined without versions. */
export function highestVersionLabel(operator: OperatorModel): string | undefined {
    let highest: string | undefined;
    for (const version of operator.versions ?? []) {
        if (LABEL_PATTERN.test(version.version) && (highest === undefined || compareVersionLabels(version.version, highest) > 0)) {
            highest = version.version;
        }
    }
    return highest;
}

/** The current version as the repository defines it: the highest label that is not deprecated, the highest overall if all are. Undefined without versions. */
export function newestVersionLabel(operator: OperatorModel): string | undefined {
    const ordered = versionsNewestFirst(operator);
    return (ordered.find(version => !version.deprecated) ?? ordered[0])?.version;
}

export type ChangeKind = 'major' | 'minor' | 'patch' | 'none';

function typesByName(ios: IOModel[] | undefined): Map<string, Set<string>> {
    const result = new Map<string, Set<string>>();
    for (const io of ios ?? []) {
        if (io.name) {
            result.set(io.name, (result.get(io.name) ?? new Set<string>()).add(io.type));
        }
    }
    return result;
}

function sameTypes(a: Set<string>, b: Set<string>): boolean {
    return a.size === b.size && [...a].every(type => b.has(type));
}

/** A port or config list: a removed or renamed name or a changed type is major, any other change to the list is minor. */
function portsChange(before: IOModel[] | undefined, after: IOModel[] | undefined): ChangeKind {
    const earlier = typesByName(before);
    const later = typesByName(after);
    for (const [name, types] of earlier) {
        const now = later.get(name);
        if (now === undefined || !sameTypes(types, now)) {
            return 'major';
        }
    }
    return JSON.stringify(before ?? []) === JSON.stringify(after ?? []) ? 'none' : 'minor';
}

/** How a version differs from the one before: major for an incompatible port or config change, minor for added ones, patch for the image alone. */
export function classifyChange(before: VersionData, after: VersionData): ChangeKind {
    const kinds = [
        portsChange(before.inputs, after.inputs),
        portsChange(before.outputs, after.outputs),
        portsChange(before.config_values, after.config_values),
    ];
    if (kinds.includes('major')) {
        return 'major';
    }
    if (kinds.includes('minor')) {
        return 'minor';
    }
    return before.image.trim() === after.image.trim() ? 'none' : 'patch';
}

/** The label that follows a label: the major, minor or (for 'patch' and 'none') patch number raised, lower numbers reset. */
export function bumpVersionLabel(label: string, kind: ChangeKind): string {
    const match = LABEL_PATTERN.exec(label);
    if (match === null) {
        return 'v1.0.0';
    }
    const [major, minor, patch] = [Number(match[1]), Number(match[2]), Number(match[3])];
    switch (kind) {
        case 'major':
            return `v${major + 1}.0.0`;
        case 'minor':
            return `v${major}.${minor + 1}.0`;
        default:
            return `v${major}.${minor}.${patch + 1}`;
    }
}

/** The label after the highest existing one with the patch raised, "v1.0.0" if there is none. */
export function nextVersionLabel(operator: OperatorModel): string {
    const highest = highestVersionLabel(operator);
    return highest === undefined ? 'v1.0.0' : bumpVersionLabel(highest, 'patch');
}
