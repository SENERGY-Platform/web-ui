/*
 * Copyright 2026 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Attribute } from '../../device-instances/shared/device-instances.model';
import { DeviceTypeContentVariableModel } from '../../../metadata/device-types-overview/shared/device-type.model';

/** Permissions-v2 topic of things in the device-repository. */
export const THING_TOPIC = 'things';

/**
 * A consumer without measurements of its own. The device-repository manages `device_links` only through
 * their own endpoints: a create or update ignores them and keeps the stored links.
 */
export interface ThingModel {
    id: string;
    name: string;
    attributes: Attribute[];
    content_variables: DeviceTypeContentVariableModel[];
    owner_id: string;
    device_links: ThingDeviceLinkModel[];
}

/** A device measures the thing during the half-open period [from, until); `until` null means open. RFC3339 times. */
export interface ThingDeviceLinkModel {
    id: string;
    device_id: string;
    from: string;
    until: string | null;
}

/** Body of a new device link: `from` defaults to now, `until` to open. */
export interface ThingDeviceLinkCreateModel {
    device_id: string;
    from?: string;
    until?: string;
}

export interface ThingTotalModel {
    result: ThingModel[];
    total: number;
}

/**
 * An attribute key every writer of things uses alike (SNRGY-5133): the key fixes the unit, the value is a decimal
 * with a dot. The smartador-ems dashboard estimates a thing's energy from them, the meter-extractor fills them.
 */
export interface ThingAttributeKey {
    key: string;
    label: string;
    unit?: string;
    hint?: string;
    min: number;
    /** The value has to be greater than `min`, not equal to it. */
    minExclusive?: boolean;
    /** A function where the bound moves with the date. */
    max: number | ((now: Date) => number);
    integer?: boolean;
}

export const THING_ATTRIBUTE_KEYS: ThingAttributeKey[] = [
    { key: 'energy/rated-power', label: 'Rated power', unit: 'kW', hint: 'Per unit', min: 0, minExclusive: true, max: 100000 },
    { key: 'energy/quantity', label: 'Quantity', hint: 'Number of identical units', min: 1, max: 100000, integer: true },
    { key: 'energy/relative-usage', label: 'Utilization', hint: 'Share of the year at rated power, 0 to 1', min: 0, max: 1 },
    { key: 'energy/standby-power', label: 'Standby power', unit: 'kW', min: 0, max: 100000 },
    {
        key: 'energy/annual-consumption',
        label: 'Annual consumption',
        unit: 'kWh/a',
        hint: 'As stated on the nameplate or energy label',
        min: 0,
        minExclusive: true,
        max: 1e8,
    },
    { key: 'energy/capacity', label: 'Storage capacity', unit: 'kWh', min: 0, minExclusive: true, max: 100000 },
    { key: 'energy/build-year', label: 'Year of construction', min: 1900, max: (now) => now.getFullYear() + 1, integer: true },
];

export function thingAttributeKey(key: string): ThingAttributeKey | undefined {
    return THING_ATTRIBUTE_KEYS.find((k) => k.key === key);
}

/** Why the value breaks the contract of its key, or null; a key outside THING_ATTRIBUTE_KEYS takes any value. */
export function thingAttributeError(attr: Pick<Attribute, 'key' | 'value'>, now = new Date()): string | null {
    const known = thingAttributeKey(attr.key);
    if (!known) {
        return null;
    }
    const value = attr.value ?? '';
    if (known.integer && !/^-?\d+$/.test(value)) {
        return 'Enter a whole number';
    }
    if (!/^-?\d+(\.\d+)?$/.test(value)) {
        return 'Enter a number with a dot, e.g. 1.5';
    }
    const n = Number(value);
    const max = typeof known.max === 'function' ? known.max(now) : known.max;
    if ((known.minExclusive ? n <= known.min : n < known.min) || n > max) {
        return known.minExclusive ? `Must be greater than ${known.min} and at most ${max}` : `Must be between ${known.min} and ${max}`;
    }
    return null;
}
