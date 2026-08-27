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

import { StateChange, Zone } from './environments.model';

/** One zone or asset the live-state panel can target -- only entities the server already knows, i.e. ones with an id. */
export interface NamedStateTarget {
    id: string;
    name: string;
    initialStates: Record<string, unknown>;
    /** Keys the zone's time_constants also names, so the editor can flag "follows a setpoint" per row. Empty for assets. */
    timeConstantKeys: string[];
}

/** Every zone with an id, recursively through nested zones. A zone without an id is not saved yet and cannot be targeted. */
export function flattenZoneTargets(zones: Zone[] | undefined): NamedStateTarget[] {
    const result: NamedStateTarget[] = [];
    (zones || []).forEach((zone) => {
        if (zone.id) {
            result.push({
                id: zone.id,
                name: zone.name || zone.id,
                initialStates: zone.initial_states || {},
                timeConstantKeys: Object.keys(zone.time_constants || {}),
            });
        }
        result.push(...flattenZoneTargets(zone.zones));
    });
    return result;
}

/** Every asset with an id belonging to any zone in the tree, recursively. */
export function flattenAssetTargets(zones: Zone[] | undefined): NamedStateTarget[] {
    const result: NamedStateTarget[] = [];
    (zones || []).forEach((zone) => {
        (zone.assets || []).forEach((asset) => {
            if (asset.id) {
                result.push({
                    id: asset.id,
                    name: asset.name || asset.id,
                    initialStates: asset.initial_states || {},
                    timeConstantKeys: [],
                });
            }
        });
        result.push(...flattenAssetTargets(zone.zones));
    });
    return result;
}

/**
 * Grows `touched` with every key of `current` whose value differs from `previous`.
 * The key-value editor re-emits every row's value on any single-row edit, so comparing
 * the whole record against what it looked like just before isolates exactly the row
 * that actually changed -- an untouched row's value is unchanged from one emit to the
 * next by construction. Never removes a key: once touched, a key stays touched even if
 * it is edited back to its original value.
 */
export function diffTouchedKeys(previous: Record<string, unknown>, current: Record<string, unknown>, touched: ReadonlySet<string>): Set<string> {
    const next = new Set(touched);
    Object.keys(current).forEach((key) => {
        if (previous[key] !== current[key]) {
            next.add(key);
        }
    });
    return next;
}

/** The subset of `record` whose keys are touched. A key removed from `record` (row deleted) drops out on its own. */
export function pickTouched(record: Record<string, unknown>, touched: ReadonlySet<string>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    Object.keys(record).forEach((key) => {
        if (touched.has(key)) {
            result[key] = record[key];
        }
    });
    return result;
}

/**
 * The subset of `record` whose keys are NOT touched -- pickTouched's complement. A live-state
 * poll merges this into a draft instead of the whole response, so a key the user is mid-edit
 * on (touched, not yet applied) keeps its local value instead of being clobbered by the next
 * poll tick.
 */
export function pickUntouched(record: Record<string, unknown>, touched: ReadonlySet<string>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    Object.keys(record).forEach((key) => {
        if (!touched.has(key)) {
            result[key] = record[key];
        }
    });
    return result;
}

function filterNonEmpty(byId: Record<string, Record<string, unknown>>): Record<string, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = {};
    Object.entries(byId).forEach(([id, values]) => {
        if (Object.keys(values).length > 0) {
            result[id] = values;
        }
    });
    return result;
}

/**
 * Assembles the StateChange to PATCH, already restricted to touched keys by the caller.
 * Returns undefined for an entirely empty change -- the API rejects one with a 400, and
 * this is also what the Apply button's disabled state is driven from.
 */
export function buildStateChange(
    context: Record<string, unknown>,
    zones: Record<string, Record<string, unknown>>,
    assets: Record<string, Record<string, unknown>>,
): StateChange | undefined {
    const change: StateChange = {};
    if (Object.keys(context).length > 0) {
        change.context = context;
    }
    const nonEmptyZones = filterNonEmpty(zones);
    if (Object.keys(nonEmptyZones).length > 0) {
        change.zones = nonEmptyZones;
    }
    const nonEmptyAssets = filterNonEmpty(assets);
    if (Object.keys(nonEmptyAssets).length > 0) {
        change.assets = nonEmptyAssets;
    }
    return Object.keys(change).length > 0 ? change : undefined;
}
