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

// Types below mirror the MOSES openapi spec (domain.* / repo.*) field for field.
// Field names stay snake_case as sent over the wire.

export type EnvironmentType =
    | 'industrial_site'
    | 'office_building'
    | 'apartment_building'
    | 'single_family_home'
    | 'apartment';

export const ENVIRONMENT_TYPES: EnvironmentType[] = [
    'industrial_site',
    'office_building',
    'apartment_building',
    'single_family_home',
    'apartment',
];

const environmentTypeLabels: Record<EnvironmentType, string> = {
    industrial_site: 'Industrial Site',
    office_building: 'Office Building',
    apartment_building: 'Apartment Building',
    single_family_home: 'Single Family Home',
    apartment: 'Apartment',
};

export function environmentTypeLabel(type: EnvironmentType | undefined): string {
    if (type === undefined) {
        return 'Unknown';
    }
    return environmentTypeLabels[type] || type;
}

export type ZoneType = 'site' | 'building' | 'floor' | 'unit' | 'hall' | 'room';

export type AssetKind = 'meter' | 'inverter' | 'machine' | 'sensor' | 'actuator';

export type Direction = 'sensor' | 'actuator';

export type SourceKind = 'script' | 'profile' | 'dataset' | 'formula';

export type DatasetOrigin = 'platform' | 'file' | 'endpoint';

export type ResampleMode = 'hold' | 'linear' | 'distribute';

export type AnchorMode = 'loop' | 'original';

export interface Environment {
    id?: string;
    name?: string;
    type?: EnvironmentType;
    /** Every stochastic source derives from seed, so the same environment and clock produce the same values. */
    seed?: number;
    /** Shared surroundings every zone below can read: outdoor temperature, irradiation, calendar. Initial values only. */
    context?: Record<string, unknown>;
    zones?: Zone[];
}

export interface Zone {
    id?: string;
    name?: string;
    type?: ZoneType;
    /** Carries what the fixed type list deliberately does not, so a new kind of space does not require a new enum value. */
    tags?: string[];
    zones?: Zone[];
    assets?: Asset[];
    /** Seeds the runtime state at start. Live values are not here. */
    initial_states?: Record<string, unknown>;
    /** A state value follows a set point instead of jumping to it, in seconds per state key. */
    time_constants?: Record<string, number>;
}

export interface Asset {
    id?: string;
    name?: string;
    kind?: AssetKind;
    /** Preserved verbatim across a migration: it keeps the existing timeseries in timescale attached to this asset. */
    external_ref?: string;
    external_type_id?: string;
    initial_states?: Record<string, unknown>;
    channels?: Channel[];
}

export interface Channel {
    id?: string;
    name?: string;
    unit?: string;
    /** From the device type's content variable. Unit is denormalised so an exported document stays readable. */
    characteristic_id?: string;
    direction?: Direction;
    /** How often a sensor channel emits. Zero means the channel is only driven from outside. */
    interval_seconds?: number;
    /** The platform service id this channel publishes to. */
    external_ref?: string;
    source?: Source;
}

export interface Source {
    kind?: SourceKind;
    /** How often the source computes; not the same as how often the channel publishes. */
    interval_seconds?: number;
    script?: ScriptSource;
    profile?: ProfileSource;
    dataset?: DatasetSource;
    formula?: FormulaSource;
}

export interface ScriptSource {
    code?: string;
}

export interface ProfileSource {
    base?: number;
    /** 24 entries. */
    hour_factors?: number[];
    /** 7 entries, starting at monday. */
    weekday_factors?: number[];
    /** The random variation around the resulting value. */
    spread_percent?: number;
    /** Turns the profile into a meter reading that keeps counting up. */
    cumulative?: boolean;
}

export interface DatasetSource {
    origin?: DatasetOrigin;
    /** A platform device id, an uploaded dataset id or a url, per origin. */
    ref?: string;
    /** Selects the service when origin is platform. */
    service_ref?: string;
    /** The value column: dataset column name (empty means the first one), or the platform output variable path. */
    column?: string;
    /** Multiplies every value. Zero means unscaled. */
    scale?: number;
    /** A meter reading keeps counting across a loop boundary instead of jumping back to the first value. */
    cumulative?: boolean;
    resample?: ResampleMode;
    anchor?: AnchorMode;
    /** How much of a platform timeseries is fetched, backwards from environment start, e.g. "36h", "7d", "4w". */
    window?: string;
}

export interface FormulaSource {
    expression?: string;
    /** Maps a name usable in expression to a channel id or context key. */
    inputs?: Record<string, string>;
}

export interface Problem {
    path?: string;
    message?: string;
}

export interface ValidationError {
    problems?: Problem[];
}

export interface StateChange {
    context?: Record<string, unknown>;
    zones?: Record<string, Record<string, unknown>>;
    assets?: Record<string, Record<string, unknown>>;
}

export interface DatasetColumn {
    name?: string;
    from_unix?: number;
    to_unix?: number;
    points?: number;
}

export interface DatasetMeta {
    id?: string;
    name?: string;
    timezone?: string;
    size_bytes?: number;
    created_unix?: number;
    columns?: DatasetColumn[];
}
