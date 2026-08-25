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

import { Asset, Channel, Environment, Zone, ZoneType } from './environments.model';
import { ProblemPath } from './environments-path';

export type EnvTreeNodeKind = 'environment' | 'zone' | 'asset' | 'channel';

export interface EnvTreeNode {
    kind: EnvTreeNodeKind;
    /** Placeholder label used while the node has no name of its own yet; the tree view reads the live name off `data`. */
    name: string;
    icon: string;
    data: Environment | Zone | Asset | Channel;
    location: ProblemPath;
    /**
     * Stable id for this location, independent of the object identity of `data` or of this
     * node itself. Rebuilding the tree from scratch after a mutation produces new node
     * objects every time, so the mat-tree expansion state and the current selection are
     * tracked by this key instead of by node reference.
     */
    key: string;
    children: EnvTreeNode[];
}

export function locationKey(kind: EnvTreeNodeKind, location: ProblemPath): string {
    return [kind, location.zoneIndexes.join('.'), location.assetIndex ?? '', location.channelIndex ?? ''].join(':');
}

const zoneIcons: Record<ZoneType, string> = {
    site: 'public',
    building: 'apartment',
    floor: 'layers',
    unit: 'door_front',
    hall: 'warehouse',
    room: 'meeting_room',
};

function zoneIcon(type: ZoneType | undefined): string {
    return (type && zoneIcons[type]) || 'apartment';
}

/**
 * Builds the tree shown next to the editor from an Environment document. Pure: it only
 * reads `env` and links each node's `data` to the actual nested object (so mutating it
 * through the editor mutates the document itself), it never copies or changes anything.
 */
export function buildEnvironmentTree(env: Environment): EnvTreeNode {
    const location: ProblemPath = { zoneIndexes: [] };
    return {
        kind: 'environment',
        name: 'Environment',
        icon: 'home_work',
        data: env,
        location,
        key: locationKey('environment', location),
        children: buildZoneNodes(env.zones, []),
    };
}

function buildZoneNodes(zones: Zone[] | undefined, parentZoneIndexes: number[]): EnvTreeNode[] {
    return (zones || []).map((zone, index) => {
        const zoneIndexes = [...parentZoneIndexes, index];
        const location: ProblemPath = { zoneIndexes };
        return {
            kind: 'zone',
            name: 'Zone',
            icon: zoneIcon(zone.type),
            data: zone,
            location,
            key: locationKey('zone', location),
            children: [
                ...buildZoneNodes(zone.zones, zoneIndexes),
                ...buildAssetNodes(zone.assets, zoneIndexes),
            ],
        } as EnvTreeNode;
    });
}

function buildAssetNodes(assets: Asset[] | undefined, zoneIndexes: number[]): EnvTreeNode[] {
    return (assets || []).map((asset, assetIndex) => {
        const location: ProblemPath = { zoneIndexes, assetIndex };
        return {
            kind: 'asset',
            name: 'Asset',
            icon: 'precision_manufacturing',
            data: asset,
            location,
            key: locationKey('asset', location),
            children: buildChannelNodes(asset.channels, zoneIndexes, assetIndex),
        } as EnvTreeNode;
    });
}

function buildChannelNodes(channels: Channel[] | undefined, zoneIndexes: number[], assetIndex: number): EnvTreeNode[] {
    return (channels || []).map((channel, channelIndex) => {
        const location: ProblemPath = { zoneIndexes, assetIndex, channelIndex };
        return {
            kind: 'channel',
            name: 'Channel',
            icon: 'sensors',
            data: channel,
            location,
            key: locationKey('channel', location),
            children: [],
        } as EnvTreeNode;
    });
}

/** Depth-first search for the node with the given key, e.g. to restore a selection after a rebuild. */
export function findNodeByKey(root: EnvTreeNode, key: string): EnvTreeNode | undefined {
    if (root.key === key) {
        return root;
    }
    for (const child of root.children) {
        const found = findNodeByKey(child, key);
        if (found) {
            return found;
        }
    }
    return undefined;
}

/** Every node from the root down to (and including) the node with the given key, root first. */
export function pathToKey(root: EnvTreeNode, key: string): EnvTreeNode[] {
    if (root.key === key) {
        return [root];
    }
    for (const child of root.children) {
        const rest = pathToKey(child, key);
        if (rest.length > 0) {
            return [root, ...rest];
        }
    }
    return [];
}
