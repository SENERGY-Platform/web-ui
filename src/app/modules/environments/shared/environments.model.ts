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

export const ZONE_TYPES: ZoneType[] = ['site', 'building', 'floor', 'unit', 'hall', 'room'];

const zoneTypeLabels: Record<ZoneType, string> = {
    site: 'Site',
    building: 'Building',
    floor: 'Floor',
    unit: 'Unit',
    hall: 'Hall',
    room: 'Room',
};

export function zoneTypeLabel(type: ZoneType | undefined): string {
    if (type === undefined) {
        return 'Unknown';
    }
    return zoneTypeLabels[type] || type;
}

export type AssetKind = 'meter' | 'inverter' | 'machine' | 'sensor' | 'actuator';

export const ASSET_KINDS: AssetKind[] = ['meter', 'inverter', 'machine', 'sensor', 'actuator'];

const assetKindLabels: Record<AssetKind, string> = {
    meter: 'Meter',
    inverter: 'Inverter',
    machine: 'Machine',
    sensor: 'Sensor',
    actuator: 'Actuator',
};

export function assetKindLabel(kind: AssetKind | undefined): string {
    if (kind === undefined) {
        return 'Unknown';
    }
    return assetKindLabels[kind] || kind;
}

export type Direction = 'sensor' | 'actuator';

export const DIRECTIONS: Direction[] = ['sensor', 'actuator'];

const directionLabels: Record<Direction, string> = {
    sensor: 'Sensor',
    actuator: 'Actuator',
};

export function directionLabel(direction: Direction | undefined): string {
    if (direction === undefined) {
        return 'Unknown';
    }
    return directionLabels[direction] || direction;
}

export type SourceKind = 'script' | 'profile' | 'dataset' | 'formula';

export const SOURCE_KINDS: SourceKind[] = ['script', 'profile', 'dataset', 'formula'];

const sourceKindLabels: Record<SourceKind, string> = {
    script: 'Script',
    profile: 'Profile',
    dataset: 'Dataset',
    formula: 'Formula',
};

export function sourceKindLabel(kind: SourceKind | undefined): string {
    if (kind === undefined) {
        return 'Unknown';
    }
    return sourceKindLabels[kind] || kind;
}

const sourceKindDescriptions: Record<SourceKind, string> = {
    script: 'Own JavaScript that computes the value -- for anything the other three kinds cannot express.',
    profile: 'A repeating daily pattern, e.g. higher power on weekday afternoons and near-zero overnight.',
    dataset: 'Replays real, previously recorded measurements, e.g. a week of actual power readings.',
    formula: 'Computed live from other channels or context values, e.g. °F from a °C reading.',
};

export function sourceKindDescription(kind: SourceKind | undefined): string {
    if (kind === undefined) {
        return '';
    }
    return sourceKindDescriptions[kind] || '';
}

export type DatasetOrigin = 'platform' | 'file' | 'endpoint';

// The editor only offers file and platform; 'endpoint' has no editor built for it yet.
export const DATASET_ORIGINS: DatasetOrigin[] = ['file', 'platform'];

const datasetOriginLabels: Record<DatasetOrigin, string> = {
    file: 'Uploaded file',
    platform: 'Platform device',
    endpoint: 'Endpoint',
};

export function datasetOriginLabel(origin: DatasetOrigin | undefined): string {
    if (origin === undefined) {
        return 'Unknown';
    }
    return datasetOriginLabels[origin] || origin;
}

export type ResampleMode = 'hold' | 'linear' | 'distribute';

export const RESAMPLE_MODES: ResampleMode[] = ['hold', 'linear', 'distribute'];

const resampleModeLabels: Record<ResampleMode, string> = {
    hold: 'Hold',
    linear: 'Linear',
    distribute: 'Distribute',
};

const resampleModeHints: Record<ResampleMode, string> = {
    hold: 'Hold: keeps the last value, for state-like data (e.g. on/off).',
    linear: 'Linear: interpolates between values, for continuously varying data (e.g. temperature).',
    distribute: 'Distribute: spreads a value over time, for cumulative quantities (e.g. energy).',
};

export function resampleModeLabel(mode: ResampleMode | undefined): string {
    if (mode === undefined) {
        return 'Unknown';
    }
    return resampleModeLabels[mode] || mode;
}

export function resampleModeHint(mode: ResampleMode | undefined): string {
    if (mode === undefined) {
        return '';
    }
    return resampleModeHints[mode] || '';
}

export type AnchorMode = 'loop' | 'original';

export const ANCHOR_MODES: AnchorMode[] = ['loop', 'original'];

const anchorModeLabels: Record<AnchorMode, string> = {
    loop: 'Loop',
    original: 'Original',
};

export function anchorModeLabel(mode: AnchorMode | undefined): string {
    if (mode === undefined) {
        return 'Unknown';
    }
    return anchorModeLabels[mode] || mode;
}

const anchorModeHints: Record<AnchorMode, string> = {
    loop: 'Loop: when the dataset repeats, it starts over from its first point again.',
    original: 'Original: when the dataset repeats, it continues from its own original timestamps.',
};

export function anchorModeHint(mode: AnchorMode | undefined): string {
    if (mode === undefined) {
        return '';
    }
    return anchorModeHints[mode] || '';
}

/**
 * A device type from the MOSES catalog (GET /device-types): only what an asset's channels
 * need, with readable names, so an editor can offer a machine to pick instead of typing ids.
 */
export interface CatalogDeviceType {
    id?: string;
    name?: string;
    services?: CatalogService[];
}

/** One of a catalog device type's services, i.e. what one channel of an asset built from it looks like. */
export interface CatalogService {
    id?: string;
    name?: string;
    direction?: Direction;
    characteristic_id?: string;
    value_path?: string;
}

/** The platform device created for a simulated asset (POST /devices). */
export interface CatalogDevice {
    id?: string;
    local_id?: string;
    name?: string;
    device_type_id?: string;
}

export interface Environment {
    id?: string;
    name?: string;
    type?: EnvironmentType;
    /**
     * Server-counted write generation, for optimistic locking. The client sends back the
     * version it read on every PUT unchanged; if another write landed since, the server
     * answers 409 instead of applying the edit. 0 or absent means unchecked (an older
     * client, or a document from before this field existed) -- the server accepts the
     * write regardless. A successful PUT's response carries the new version.
     */
    version?: number;
    /** Every stochastic source derives from seed, so the same environment and clock produce the same values. */
    seed?: number;
    /** Shared surroundings every zone below can read: outdoor temperature, irradiation, calendar. Initial values only. */
    context?: Record<string, unknown>;
    /**
     * Drives context keys over time: outdoor temperature follows a day cycle, irradiance
     * follows the sun. Without a source a context key keeps its initial value until somebody
     * sets it by hand. Keyed by the context key the source writes; only 'profile' and
     * 'dataset' kinds are accepted here, each with a mandatory interval_seconds -- a context
     * source has no channel publish tick to piggyback on.
     */
    context_sources?: { [key: string]: Source };
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
    /**
     * Whether the simulation created external_ref's platform device itself (true, so it also
     * removes it when the asset or the environment is deleted) or the user linked an existing
     * one (false/absent, never touched by a delete). Decided entirely server-side -- the
     * client sending it back on save has no effect. Older servers do not send this field yet;
     * treat undefined the same as false.
     */
    external_managed?: boolean;
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

/** Distinguishes a 400 validation body from the Environment also returned by the same PUT. */
export function isValidationError(value: unknown): value is ValidationError {
    return !!value && Array.isArray((value as ValidationError).problems);
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

/** A describable failure body for an endpoint that has no structured error type of its own (a plain message, e.g. "line 12: ..."). */
export interface ApiError {
    message: string;
    /** The HTTP status the server answered with, when known -- e.g. 409 for an optimistic-locking conflict on a save. */
    status?: number;
}

export function isApiError(value: unknown): value is ApiError {
    return !!value && typeof (value as ApiError).message === 'string';
}

/**
 * The GET /environments/{id}/state answer: the same shape as the PATCH input (StateChange),
 * plus whether the simulation is running at all and when this snapshot was taken. running:
 * false means the simulation is not running -- context/zones/assets are omitted, there is
 * nothing live to show.
 */
export interface EnvironmentState extends StateChange {
    running: boolean;
    as_of: string;
}

/**
 * The zone type a new environment starts with. The api refuses an environment
 * without a zone, so the create dialog has to seed one, and seeding the level a
 * site of that kind actually starts at saves the first correction.
 */
export function defaultZoneTypeFor(type: EnvironmentType): ZoneType {
    switch (type) {
        case 'industrial_site':
            return 'site';
        case 'apartment':
            return 'unit';
        default:
            return 'building';
    }
}
