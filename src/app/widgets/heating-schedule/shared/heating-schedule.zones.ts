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

import { HeatingPlan, HeatingPlanError, HeatingWindow, parseSetback, parseWindows, serialiseSchedule, windowsJson } from './heating-schedule.plan';

/** A thermostat the instance controls, from its `thermostats` option. */
export interface HeatingThermostat {
    deviceId: string;
    label: string;
}

/**
 * A zone as stored. `devices` null is the rest zone, which takes every selected thermostat no other zone names;
 * `setback` null means the setback parameter applies.
 */
export interface HeatingZone {
    name: string;
    devices: string[] | null;
    windows: HeatingWindow[];
    setback: number | null;
}

/** The stored schedule; `legacy` is the older shape `{"windows":[...]}`, which stands for one zone with every thermostat. */
export interface HeatingZoneDocument {
    legacy: boolean;
    zones: HeatingZone[];
}

/** A zone that gets a process: its thermostats are resolved and its setback is final. */
export interface ResolvedZone {
    /** position in the stored zones list; the smart service keys its zone `zone:<index>`, also when earlier zones are left out */
    index: number;
    name: string;
    devices: string[];
    labels: string[];
    plan: HeatingPlan;
}

export const LEGACY_ZONE_NAME = 'Alle';

/** The name shown for a zone: the trimmed name, else "Zone N" with N the 1-based position. */
export function zoneLabel(name: unknown, index: number): string {
    return typeof name === 'string' && name.trim() !== '' ? name.trim() : 'Zone ' + (index + 1);
}

function parseJson(text: string, what: string): unknown {
    try {
        return JSON.parse(text);
    } catch (error) {
        throw new HeatingPlanError(what + (error instanceof Error ? ': ' + error.message : ' is not valid JSON.'));
    }
}

/**
 * The selected thermostats of the `thermostats` parameter: a JSON text (or a list) of options, each a JSON text
 * (or an object) with `device_selection.device_id` and `label`. Options without a device id are skipped.
 */
export function parseThermostats(value: unknown): HeatingThermostat[] {
    let list: unknown = typeof value === 'string' ? (value.trim() === '' ? [] : parseJson(value, 'The thermostats')) : value;
    if (list === null || list === undefined) {
        list = [];
    }
    if (!Array.isArray(list)) {
        throw new HeatingPlanError('The thermostats must be a list.');
    }
    const thermostats: HeatingThermostat[] = [];
    for (const entry of list) {
        const option = (typeof entry === 'string' ? parseJson(entry, 'A thermostat') : entry) as { device_selection?: { device_id?: unknown }; label?: unknown } | null;
        const id = option?.device_selection?.device_id;
        if (typeof id === 'string' && id !== '' && !thermostats.some((known) => known.deviceId === id)) {
            thermostats.push({ deviceId: id, label: typeof option?.label === 'string' && option.label !== '' ? option.label : id });
        }
    }
    return thermostats;
}

/** Reads the schedule text in either shape with the rules of the smart service. Throws HeatingPlanError. */
export function parseZoneDocument(schedule: string): HeatingZoneDocument {
    const document = parseJson(schedule, 'The schedule') as { zones?: unknown; windows?: unknown } | null;
    if (document && Array.isArray(document.windows) && !Array.isArray(document.zones)) {
        return { legacy: true, zones: [{ name: LEGACY_ZONE_NAME, devices: null, windows: parseWindows(document.windows), setback: null }] };
    }
    if (!document || !Array.isArray(document.zones)) {
        throw new HeatingPlanError('The schedule needs a list "zones" or a list "windows".');
    }
    const zones = (document.zones as Array<{ name?: unknown; devices?: unknown; windows?: unknown; setback?: unknown } | null>).map((raw, index): HeatingZone => {
        const label = zoneLabel(raw?.name, index);
        if (!raw || !Array.isArray(raw.windows)) {
            throw new HeatingPlanError(label + ': the list "windows" is missing.');
        }
        const windows = parseWindows(raw.windows, label + ', ');
        const setback = raw.setback === undefined || raw.setback === null ? null : parseSetback(raw.setback, label + ': the setback');
        if (raw.devices !== undefined && raw.devices !== null && !Array.isArray(raw.devices)) {
            throw new HeatingPlanError(label + ': devices must be a list.');
        }
        const devices = raw.devices === undefined || raw.devices === null ? null : (raw.devices as unknown[]).map(String);
        return { name: typeof raw.name === 'string' ? raw.name : '', devices, windows, setback };
    });
    return { legacy: false, zones };
}

/**
 * Gives every zone its thermostats exactly as the smart service does: a device a zone names but the instance does
 * not select is dropped, the rest zone takes what no zone names, a zone without a device is left out. With
 * `keepEmpty` the zones without a device stay and no zone is required to have one. Throws HeatingPlanError.
 */
export function resolveZones(zones: HeatingZone[], setback: unknown, thermostats: HeatingThermostat[], keepEmpty = false): ResolvedZone[] {
    const low = parseSetback(setback);
    const labelOf = (id: string) => thermostats.find((thermostat) => thermostat.deviceId === id)?.label ?? id;
    const named = new Map<string, string>();
    let restIndex = -1;
    const resolved = zones.map((zone, index) => {
        const label = zoneLabel(zone.name, index);
        const devices: string[] = [];
        if (zone.devices === null) {
            if (restIndex >= 0) {
                throw new HeatingPlanError('Only one zone may take all other thermostats.');
            }
            restIndex = index;
        } else {
            for (const id of zone.devices) {
                const other = named.get(id);
                if (other !== undefined) {
                    throw new HeatingPlanError('Thermostat ' + labelOf(id) + ' is in the zones ' + other + ' and ' + label + '.');
                }
                named.set(id, label);
                if (thermostats.some((thermostat) => thermostat.deviceId === id)) {
                    devices.push(id);
                }
            }
        }
        return { index, name: label, devices, plan: { windows: zone.windows, setback: zone.setback ?? low } };
    });
    if (restIndex >= 0) {
        resolved[restIndex].devices = thermostats.map((thermostat) => thermostat.deviceId).filter((id) => !named.has(id));
    }
    const kept = keepEmpty ? resolved : resolved.filter((zone) => zone.devices.length > 0);
    if (kept.length === 0) {
        throw new HeatingPlanError('No zone has a thermostat.');
    }
    return kept.map((zone) => ({ ...zone, labels: zone.devices.map(labelOf) }));
}

/** Zone resolution from the three stored parameter values; the legacy shape never fails for lack of thermostats. */
export function resolveSchedule(schedule: string, setback: unknown, thermostats: unknown): ResolvedZone[] {
    const document = parseZoneDocument(schedule);
    return resolveZones(document.zones, setback, parseThermostats(thermostats), document.legacy);
}

/**
 * The compact JSON text of the zones. One unnamed or "Alle" rest zone without own setback is written in the legacy
 * shape, which older app versions read; a renamed one is not, so the name survives.
 */
export function serialiseZones(zones: HeatingZone[]): string {
    const lone = zones.length === 1 && zones[0].devices === null && zones[0].setback === null;
    if (lone && ['', LEGACY_ZONE_NAME].includes(zones[0].name.trim())) {
        return serialiseSchedule(zones[0].windows);
    }
    return JSON.stringify({
        zones: zones.map((zone) => {
            const out: Record<string, unknown> = { name: zone.name };
            if (zone.devices !== null) {
                out['devices'] = zone.devices;
            }
            out['windows'] = windowsJson(zone.windows);
            if (zone.setback !== null) {
                out['setback'] = zone.setback;
            }
            return out;
        }),
    });
}
