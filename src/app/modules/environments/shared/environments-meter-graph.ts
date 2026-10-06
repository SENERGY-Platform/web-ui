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

import { Environment, MeterParent, Zone } from './environments.model';
import { ProblemPath } from './environments-path';
import { SubmeteringOption, submeteringTargets } from './environments-submetering';

/** Weights are compared at this precision so 33.3 + 33.3 + 33.4 counts as 100. */
const WEIGHT_PRECISION = 1e9;

/** Every meter group as a pickable target; the prefix keeps a group apart from an asset of the same name. */
export function meterGroupTargets(environment: Environment, exceptGroupId?: string): SubmeteringOption[] {
    return (environment.meter_groups || [])
        .filter((group) => !!group.id && group.id !== exceptGroupId)
        .map((group) => ({ id: group.id, label: 'Meter group: ' + (group.name || group.id) }));
}

/**
 * What the asset at `location` can name in meter_parents: the assets of its top level zone, as
 * for submetered_by, plus every meter group (the server checks the group's site).
 */
export function meterParentTargets(environment: Environment, location: ProblemPath): SubmeteringOption[] {
    return [...submeteringTargets(environment, location), ...meterGroupTargets(environment)];
}

/**
 * What a meter group's parents can name: every asset of the environment, labelled with its full
 * zone path because the groups' sites differ, plus every other group. Same-site is left to the server.
 */
export function meterGroupParentTargets(environment: Environment, groupId: string): SubmeteringOption[] {
    const results: SubmeteringOption[] = [];
    const walk = (zone: Zone, namePath: string[]): void => {
        const path = [...namePath, zone.name || 'Zone'];
        (zone.assets || []).forEach((asset) => {
            if (asset.id) {
                results.push({ id: asset.id, label: (asset.name || asset.id) + ' (' + path.join(' / ') + ')' });
            }
        });
        (zone.zones || []).forEach((child) => walk(child, path));
    };
    (environment.zones || []).forEach((zone) => walk(zone, []));
    return [...results, ...meterGroupTargets(environment, groupId)];
}

/**
 * What is wrong with one weight on its own, undefined when it is fine or unset. The server
 * stores a whole number and reads 0 as "no weight", so these are also blocked on save (see
 * findOutOfRangeMeterWeights); the sum across rows is meterWeightHint's job.
 */
export function meterWeightProblem(weight: number | undefined): string | undefined {
    if (weight === undefined) {
        return undefined;
    }
    if (!Number.isInteger(weight)) {
        return 'A weight must be a whole number from 1 to 100.';
    }
    if (weight < 1 || weight > 100) {
        return 'A weight must be from 1 to 100; 0 counts as no weight and the server would split equally.';
    }
    return undefined;
}

/**
 * A non-blocking remark on a parent list's weights, undefined when they are fine or all unset
 * (the server then splits equally). The server stays authoritative.
 */
export function meterWeightHint(parents: MeterParent[] | undefined): string | undefined {
    const list = parents || [];
    const weights = list.map((parent) => parent.weight).filter((weight): weight is number => typeof weight === 'number');
    if (weights.length === 0) {
        return undefined;
    }
    if (weights.length < list.length) {
        return 'Set a weight on every parent or on none; the server splits equally only when none has one.';
    }
    const sum = Math.round(weights.reduce((a, b) => a + b, 0) * WEIGHT_PRECISION) / WEIGHT_PRECISION;
    return sum === 100 ? undefined : 'The weights add up to ' + sum + ', they should add up to 100.';
}

/** Every node of the meter graph that lists parents: the assets' meter_parents and the groups' parents. */
function forEachParentList(environment: Environment | undefined, visit: (list: MeterParent[], owner: { assetId?: string; groupId?: string }) => void): void {
    (environment?.meter_groups || []).forEach((group) => visit(group.parents || [], { groupId: group.id }));
    const walk = (zones: Zone[] | undefined): void => {
        (zones || []).forEach((zone) => {
            (zone.assets || []).forEach((asset) => visit(asset.meter_parents || [], { assetId: asset.id }));
            walk(zone.zones);
        });
    };
    walk(environment?.zones);
}

/**
 * How many assets and groups outside the removal still name one of `ids` as a meter parent.
 * `removedAssetIds` are the assets going away with them, whose own lists do not count.
 */
export function countMeterReferences(environment: Environment | undefined, ids: string[], removedAssetIds: string[] = []): number {
    const idSet = new Set(ids);
    const removed = new Set(removedAssetIds);
    let count = 0;
    forEachParentList(environment, (list, owner) => {
        if (owner.assetId && removed.has(owner.assetId)) {
            return;
        }
        if (list.some((parent) => idSet.has(parent.id))) {
            count++;
        }
    });
    return count;
}

/**
 * Drops every parent naming one of `ids` from every list. An asset's list that ends up empty is
 * deleted (empty means "follow submetered_by"); a group keeps its empty `parents`, which the
 * server then reports, since a group needs at least one.
 */
export function removeMeterReferences(environment: Environment | undefined, ids: string[]): void {
    const idSet = new Set(ids);
    (environment?.meter_groups || []).forEach((group) => {
        group.parents = (group.parents || []).filter((parent) => !idSet.has(parent.id));
    });
    const walk = (zones: Zone[] | undefined): void => {
        (zones || []).forEach((zone) => {
            (zone.assets || []).forEach((asset) => {
                if (!asset.meter_parents) {
                    return;
                }
                const kept = asset.meter_parents.filter((parent) => !idSet.has(parent.id));
                if (kept.length === 0) {
                    delete asset.meter_parents;
                } else {
                    asset.meter_parents = kept;
                }
            });
            walk(zone.zones);
        });
    };
    walk(environment?.zones);
}
