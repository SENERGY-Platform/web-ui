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

import { Asset, Environment, Zone } from './environments.model';
import { ProblemPath } from './environments-path';

export interface SubmeteringOption {
    id: string;
    label: string;
}

export interface SubmeteredChild {
    id: string;
    name: string;
    hasMatchingChannel: boolean;
}

function sameIndexChain(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((value, i) => value === b[i]);
}

/** Walks a chain of nested-zone indexes (below `root`) to the zone it names. */
function zoneAtChain(root: Zone, chain: number[]): Zone | undefined {
    let zone: Zone | undefined = root;
    for (const index of chain) {
        zone = zone?.zones?.[index];
    }
    return zone;
}

/** Compare key mirroring the server's strings.TrimSpace on characteristic_id. */
function trimmed(value: string | undefined): string {
    return (value || '').trim();
}

/**
 * Every asset with an id under the same top level zone as `location`, excluding the asset
 * at `location` itself, by index and (defensively) by id -- mirrors the server's same-site
 * rule for submetered_by (docs/submetering.md: a reference may not leave its top level zone).
 * The label carries the path of zone names below the top level zone, joined by " / ", so two
 * same-named nested zones stay distinguishable; an asset directly in the top level zone falls
 * back to that zone's own name.
 */
export function submeteringTargets(environment: Environment, location: ProblemPath): SubmeteringOption[] {
    const topZone = (environment.zones || [])[location.zoneIndexes[0]];
    if (!topZone) {
        return [];
    }
    const selfZone = zoneAtChain(topZone, location.zoneIndexes.slice(1));
    const selfId = location.assetIndex !== undefined ? selfZone?.assets?.[location.assetIndex]?.id : undefined;
    const results: SubmeteringOption[] = [];
    const walk = (zone: Zone, zoneIndexes: number[], namePath: string[]): void => {
        (zone.assets || []).forEach((asset, assetIndex) => {
            const isSelf =
                (sameIndexChain(zoneIndexes, location.zoneIndexes) && assetIndex === location.assetIndex) ||
                (!!asset.id && asset.id === selfId);
            if (asset.id && !isSelf) {
                const zoneLabel = namePath.length > 0 ? namePath.join(' / ') : zone.name || 'Zone';
                results.push({ id: asset.id, label: (asset.name || asset.id) + ' (' + zoneLabel + ')' });
            }
        });
        (zone.zones || []).forEach((child, childIndex) => walk(child, [...zoneIndexes, childIndex], [...namePath, child.name || 'Zone']));
    };
    walk(topZone, [location.zoneIndexes[0]], []);
    return results;
}

/**
 * Every asset anywhere in the environment whose submetered_by names `asset`, i.e. the set an
 * aggregate channel on `asset` sums over. hasMatchingChannel says whether that asset actually
 * carries a channel with `characteristicId` (compared trimmed, like the server) -- an
 * aggregate reads only those, so a sub-metered asset without one contributes nothing despite
 * being in the tree.
 */
export function submeteredChildren(environment: Environment, asset: Asset, characteristicId: string | undefined): SubmeteredChild[] {
    if (!asset.id) {
        return [];
    }
    const wanted = trimmed(characteristicId);
    const results: SubmeteredChild[] = [];
    const walk = (zone: Zone): void => {
        (zone.assets || []).forEach((candidate) => {
            if (candidate.submetered_by === asset.id) {
                const hasMatchingChannel =
                    wanted !== '' && (candidate.channels || []).some((channel) => trimmed(channel.characteristic_id) === wanted);
                results.push({ id: candidate.id || '', name: candidate.name || candidate.id || 'Asset', hasMatchingChannel });
            }
        });
        (zone.zones || []).forEach(walk);
    };
    (environment.zones || []).forEach(walk);
    return results;
}
