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

/**
 * A location inside an Environment document, expressed as index chains instead of the
 * server's dotted/bracketed path string. Shared between a validation Problem's parsed
 * path and a tree node's own location, which is why `suffix` -- the part of a Problem's
 * path past the last index, e.g. "source.script.code" -- is optional: a node's own
 * location never has one.
 */
export interface ProblemPath {
    /** Index chain of nested zones, root to leaf. Empty for the environment itself. */
    zoneIndexes: number[];
    assetIndex?: number;
    channelIndex?: number;
    suffix?: string;
}

const SEGMENT_RE = /^(zones|assets|channels)\[(\d+)\]\.?/;

/**
 * Parses a server-reported problem path such as "zones[1].zones[0].assets[2].channels[1].source.script.code"
 * into an index chain. Pure and defensive: an unrecognised or empty path yields the root
 * location with the whole (or remaining) string kept as `suffix` rather than throwing,
 * since a problem should still be listable even if its path cannot be placed in the tree.
 */
export function problemPath(path: string): ProblemPath {
    const result: ProblemPath = { zoneIndexes: [] };
    let rest = path;
    let match = SEGMENT_RE.exec(rest);
    while (match) {
        const kind = match[1];
        const index = parseInt(match[2], 10);
        if (kind === 'zones') {
            result.zoneIndexes.push(index);
        } else if (kind === 'assets') {
            result.assetIndex = index;
        } else {
            result.channelIndex = index;
        }
        rest = rest.slice(match[0].length);
        match = SEGMENT_RE.exec(rest);
    }
    if (rest.length > 0) {
        result.suffix = rest;
    }
    return result;
}

function sameIndexes(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((value, i) => value === b[i]);
}

/** Compares two locations, ignoring `suffix` -- the field within the node is not part of its identity. */
export function sameLocation(a: ProblemPath, b: ProblemPath): boolean {
    return sameIndexes(a.zoneIndexes, b.zoneIndexes) && a.assetIndex === b.assetIndex && a.channelIndex === b.channelIndex;
}

/**
 * True if `location` is `ancestor` itself or lies underneath it in the document tree.
 * Used to decide whether a tree node should carry a problem badge: a zone is "within"
 * every location that starts with its own index chain, an asset additionally needs the
 * exact same zone chain, and a channel needs the exact same zone chain and asset index.
 */
export function locationContains(ancestor: ProblemPath, location: ProblemPath): boolean {
    if (location.zoneIndexes.length < ancestor.zoneIndexes.length) {
        return false;
    }
    if (!sameIndexes(location.zoneIndexes.slice(0, ancestor.zoneIndexes.length), ancestor.zoneIndexes)) {
        return false;
    }
    if (ancestor.assetIndex === undefined) {
        return true; // ancestor is the environment root or a zone: the zone-chain prefix match above is enough
    }
    if (!sameIndexes(location.zoneIndexes, ancestor.zoneIndexes) || location.assetIndex !== ancestor.assetIndex) {
        return false;
    }
    if (ancestor.channelIndex === undefined) {
        return true; // ancestor is an asset: any of its own fields or channels count
    }
    return location.channelIndex === ancestor.channelIndex;
}
