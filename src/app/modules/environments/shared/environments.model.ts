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

export type SourceKind = 'script' | 'profile' | 'dataset' | 'formula' | 'aggregate' | 'schedule';

export const SOURCE_KINDS: SourceKind[] = ['script', 'profile', 'dataset', 'formula', 'aggregate', 'schedule'];

const sourceKindLabels: Record<SourceKind, string> = {
    script: 'Script',
    profile: 'Profile',
    dataset: 'Dataset',
    formula: 'Formula',
    aggregate: 'Aggregate',
    schedule: 'Schedule',
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
    aggregate: 'Sums the last values of the sub-metered assets\' channels carrying the same characteristic -- no configuration.',
    schedule: 'A cyclic state machine: named states with a duration and a published value, optionally gated by a context key.',
};

export function sourceKindDescription(kind: SourceKind | undefined): string {
    if (kind === undefined) {
        return '';
    }
    return sourceKindDescriptions[kind] || '';
}

export type FaultKind = 'outage' | 'frozen' | 'spike' | 'meter_exchange';

export const FAULT_KINDS: FaultKind[] = ['outage', 'frozen', 'spike', 'meter_exchange'];

const faultKindLabels: Record<FaultKind, string> = {
    outage: 'Outage',
    frozen: 'Frozen',
    spike: 'Spike',
    meter_exchange: 'Meter exchange',
};

export function faultKindLabel(kind: FaultKind | undefined): string {
    if (kind === undefined) {
        return 'Unknown';
    }
    return faultKindLabels[kind] || kind;
}

const faultKindDescriptions: Record<FaultKind, string> = {
    outage: 'Nothing is sent to the platform while it lasts.',
    frozen: 'The reading of the instant the occurrence began is repeated.',
    spike: 'The reading is multiplied by a factor.',
    meter_exchange: 'A cumulative register restarts at a given value and counts on from there.',
};

export function faultKindDescription(kind: FaultKind | undefined): string {
    if (kind === undefined) {
        return '';
    }
    return faultKindDescriptions[kind] || '';
}

export type DatasetOrigin = 'platform' | 'file' | 'export' | 'endpoint';

// The editor only offers file, platform and export; 'endpoint' has no editor built for it yet.
export const DATASET_ORIGINS: DatasetOrigin[] = ['file', 'platform', 'export'];

const datasetOriginLabels: Record<DatasetOrigin, string> = {
    file: 'Uploaded file',
    platform: 'Platform device',
    export: 'Platform export',
    endpoint: 'Endpoint',
};

export function datasetOriginLabel(origin: DatasetOrigin | undefined): string {
    if (origin === undefined) {
        return 'Unknown';
    }
    return datasetOriginLabels[origin] || origin;
}

/** platform and export both read a live upstream (a device or an export series) that can be polled again; file and endpoint cannot. */
export function isRemoteOrigin(origin: DatasetOrigin | undefined): boolean {
    return origin === 'platform' || origin === 'export';
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
    /** Read-only: the Keycloak user id of whoever created the environment. Absent on documents written before this field existed. */
    owner?: string;
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
    /**
     * Scheduled jump changes: at `at`, `target` jumps to `value`, no interpolation -- before
     * `at` the document's own inline value holds. A context key targeted here is read-only via
     * PATCH .../state (an unchanged value is still accepted, so the GET->PATCH round trip works).
     */
    timeline?: DatedChange[];
    zones?: Zone[];
}

/** One entry of Environment.timeline. target is drawn from a closed, server-validated grammar. */
export interface DatedChange {
    /** RFC3339, whole seconds. */
    at?: string;
    target?: string;
    value?: number;
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
    /** Id of the asset whose meter also captures this one. Empty means this asset attaches to its zone directly (docs/submetering.md). */
    submetered_by?: string;
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
    /** Defects injected into what this channel publishes -- see docs/injected-faults.md in moses. Only meaningful on a sensor channel with interval_seconds > 0. */
    faults?: Fault[];
}

/**
 * One defect injected into a sensor channel's measurement: the value is computed and
 * remembered undisturbed, only what is published carries the fault. Triggered by either a
 * window (from/to) or a rate (per_hour/duration_seconds), never both.
 */
export interface Fault {
    kind: FaultKind;
    /** RFC3339, whole seconds. Window start (inclusive), or the meter_exchange instant. */
    from?: string;
    /** RFC3339, whole seconds, exclusive. Window end; not used by meter_exchange, which is one instant. */
    to?: string;
    /** Rate mode: occurrences per hour, drawn from the environment seed. */
    per_hour?: number;
    /** Rate mode: how long one drawn occurrence lasts, in whole seconds. */
    duration_seconds?: number;
    /** spike only: multiplies the reading. 0 is a real defect and allowed; 1 is refused as invisible in the series. */
    factor?: number;
    /** meter_exchange only: the reading the new register starts counting from. */
    reset_to?: number;
}

export interface Source {
    kind?: SourceKind;
    /** How often the source computes; not the same as how often the channel publishes. */
    interval_seconds?: number;
    script?: ScriptSource;
    profile?: ProfileSource;
    dataset?: DatasetSource;
    formula?: FormulaSource;
    schedule?: ScheduleSource;
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
    /** A platform device id, an uploaded dataset id, an export id or a url, per origin. */
    ref?: string;
    /** Selects the service when origin is platform. */
    service_ref?: string;
    /** The value column: dataset or export column name (empty means the first one), or the platform output variable path. */
    column?: string;
    /** Multiplies every value. Zero means unscaled. */
    scale?: number;
    /** A meter reading keeps counting across a loop boundary instead of jumping back to the first value. */
    cumulative?: boolean;
    resample?: ResampleMode;
    anchor?: AnchorMode;
    /** How much of a platform or export timeseries is fetched, backwards from environment start, e.g. "36h", "7d", "4w", "1y". */
    window?: string;
    /** Keeps a platform or export dataset current after the initial fetch, refetched on follow_every; needs anchor: original and is refused on a file origin (docs/context-and-context-sources.md, "Follow", in moses). */
    follow?: boolean;
    /** How often a following dataset refetches: a duration like window, default 30m, minimum 1m. */
    follow_every?: string;
    /** The widest distance between two neighbouring points the replay still bridges, a duration like window; empty/absent means no bound. Applies to every origin (docs/gaps-in-a-replayed-series.md in moses). */
    max_gap?: string;
    /** Narrows an export that carries more than one series in one table to the rows matching every entry (combined with and). Only for the export origin. */
    filters?: DatasetFilter[];
    /** A second series of the same export, read only inside a gap of this one wider than max_gap. Only for the export origin, needs max_gap, refused with cumulative. */
    fallback?: DatasetFallback;
}

/** Keeps the rows whose column equals value; several entries combine with and. Equality only. */
export interface DatasetFilter {
    column: string;
    value: string;
}

/**
 * Selects the substitute series a dataset source's fallback reads inside a gap wider than
 * max_gap. Carries the selection and nothing else: origin, resample, anchor, window, follow and
 * max_gap are the source's and hold for both series. ref/column empty means the source's own.
 */
export interface DatasetFallback {
    filters: DatasetFilter[];
    ref?: string;
    column?: string;
}

const REPLAY_DURATION_SUFFIX_SECONDS: Record<'d' | 'w' | 'y', number> = {
    d: 86400,
    w: 604800,
    y: 31536000,
};

/** Go's time.ParseDuration units, in nanoseconds; the grammar parseGoDurationNanos below implements. */
const GO_DURATION_UNIT_NANOSECONDS: Record<string, number> = {
    ns: 1,
    us: 1e3,
    'µs': 1e3,
    ms: 1e6,
    s: 1e9,
    m: 60e9,
    h: 3600e9,
};

/** The server's clock bound: moses refuses a duration at or above 2^63 nanoseconds, about 292 years. */
const REPLAY_DURATION_MAX_NANOSECONDS = 2 ** 63;

const DECIMAL_NUMBER = /^\d+(\.\d+)?$/;

/**
 * Go's time.ParseDuration grammar: an optional sign, then one or more <number><unit> segments
 * (units ns/us/µs/ms/s/m/h, composable like "1h30m"), or the bare string "0". Returns
 * nanoseconds, or undefined for text the grammar does not accept.
 */
function parseGoDurationNanos(text: string): number | undefined {
    let rest = text;
    let negative = false;
    if (rest[0] === '-' || rest[0] === '+') {
        negative = rest[0] === '-';
        rest = rest.slice(1);
    }
    if (rest === '0') {
        return 0;
    }
    if (rest === '') {
        return undefined;
    }
    let totalNanoseconds = 0;
    while (rest.length > 0) {
        const digits = /^\d*/.exec(rest)![0];
        rest = rest.slice(digits.length);
        let fraction = '';
        let hasFraction = false;
        if (rest[0] === '.') {
            rest = rest.slice(1);
            fraction = /^\d*/.exec(rest)![0];
            hasFraction = true;
            rest = rest.slice(fraction.length);
        }
        if (digits === '' && !hasFraction) {
            return undefined;
        }
        const unit = /^[^\d.]*/.exec(rest)![0];
        if (unit === '') {
            return undefined;
        }
        rest = rest.slice(unit.length);
        const unitNanoseconds = GO_DURATION_UNIT_NANOSECONDS[unit];
        if (unitNanoseconds === undefined) {
            return undefined;
        }
        const numberText = `${digits || '0'}${hasFraction ? '.' + (fraction || '0') : ''}`;
        totalNanoseconds += parseFloat(numberText) * unitNanoseconds;
    }
    return negative ? -totalNanoseconds : totalNanoseconds;
}

function unreadableWindowMessage(text: string): string {
    return `unreadable window "${text}", use a duration like "36h", "7d", "4w" or "1y"`;
}

function windowTooLongMessage(text: string): string {
    return `the window "${text}" is longer than the clock can hold, about 292 years is the most`;
}

type ReplayDurationOutcome = { seconds: number } | { error: string };

/**
 * Mirrors moses's ParseWindow/ParseFollowEvery (lib/domain/environment.go): a value ending in
 * "d", "w" or "y" is that whole number of days/weeks/years -- the suffix must cover the entire
 * string, so "1d12h" is not a composite of days and hours. Everything else goes through Go's
 * time.ParseDuration grammar. Also enforces the server's clock bound (2^63 nanoseconds).
 */
function replayDurationOutcome(text: string): ReplayDurationOutcome {
    const trimmed = text.trim();
    if (trimmed === '') {
        return { error: unreadableWindowMessage(text) };
    }
    const suffix = trimmed[trimmed.length - 1] as 'd' | 'w' | 'y';
    if (suffix === 'd' || suffix === 'w' || suffix === 'y') {
        const numberText = trimmed.slice(0, -1);
        if (!DECIMAL_NUMBER.test(numberText)) {
            return { error: unreadableWindowMessage(text) };
        }
        const count = parseFloat(numberText);
        if (!(count > 0)) {
            return { error: unreadableWindowMessage(text) };
        }
        const nanoseconds = count * REPLAY_DURATION_SUFFIX_SECONDS[suffix] * 1e9;
        if (nanoseconds >= REPLAY_DURATION_MAX_NANOSECONDS) {
            return { error: windowTooLongMessage(text) };
        }
        const seconds = Math.trunc(nanoseconds) / 1e9;
        if (seconds <= 0) {
            return { error: unreadableWindowMessage(text) };
        }
        return { seconds };
    }
    const nanoseconds = parseGoDurationNanos(trimmed);
    if (nanoseconds === undefined) {
        return { error: unreadableWindowMessage(text) };
    }
    if (Math.abs(nanoseconds) >= REPLAY_DURATION_MAX_NANOSECONDS) {
        return { error: windowTooLongMessage(text) };
    }
    if (nanoseconds <= 0) {
        return { error: unreadableWindowMessage(text) };
    }
    return { seconds: nanoseconds / 1e9 };
}

/**
 * Parses a duration the way window/follow_every accept it (see replayDurationOutcome).
 * Returns seconds, or undefined for anything the server would also refuse.
 */
export function parseReplayDuration(text: string): number | undefined {
    const outcome = replayDurationOutcome(text);
    return 'seconds' in outcome ? outcome.seconds : undefined;
}

const REPLAY_DURATION_MINIMUM_SECONDS = 60;

/**
 * The first server-side rule a following dataset would fail, as the message shown to the
 * user, or undefined if follow is off or every rule is satisfied. Mirrors the checks moses
 * itself makes on save (docs/context-and-context-sources.md, "Follow").
 */
export function followProblem(dataset: DatasetSource | undefined): string | undefined {
    if (!dataset?.follow) {
        return undefined;
    }
    if (dataset.origin === 'file') {
        return 'A file origin has nothing to poll again; follow needs a platform or export origin.';
    }
    if (dataset.anchor !== 'original') {
        return 'Follow needs anchor Original; Loop replays the frozen window it already fetched.';
    }
    if (dataset.follow_every) {
        const outcome = replayDurationOutcome(dataset.follow_every);
        if ('error' in outcome) {
            return outcome.error;
        }
        if (outcome.seconds < REPLAY_DURATION_MINIMUM_SECONDS) {
            return 'Follow every must be at least 1m.';
        }
    }
    return undefined;
}

/** Mirrors moses's MinMaxGap: the instants of a series are whole seconds, so a bound below one second is met by no distance at all. */
const MIN_MAX_GAP_SECONDS = 1;

/** ParseMaxGap's "set" flag (lib/domain/validate.go checkMaxGap): only a non-blank max_gap is a bound, everything else -- including whitespace -- is the unset field. */
function maxGapIsSet(maxGap: string | undefined): boolean {
    return !!maxGap && maxGap.trim() !== '';
}

function maxGapProblem(dataset: DatasetSource): string | undefined {
    if (!maxGapIsSet(dataset.max_gap)) {
        return undefined;
    }
    const outcome = replayDurationOutcome(dataset.max_gap!);
    if ('error' in outcome) {
        return outcome.error;
    }
    if (outcome.seconds < MIN_MAX_GAP_SECONDS) {
        return `Max gap must be at least 1s, got "${dataset.max_gap}".`;
    }
    return undefined;
}

/** The per-entry rules a source's own filters and its fallback's share (checkFilterEntries in validate.go): named column, no padding, a non-blank value. */
function filterEntryProblems(filters: DatasetFilter[] | undefined, label: string): string[] {
    if (!filters) {
        return [];
    }
    const problems: string[] = [];
    filters.forEach((filter, index) => {
        const column = filter.column ?? '';
        const trimmedColumn = column.trim();
        if (trimmedColumn === '') {
            problems.push(`${label} ${index + 1}: must name the column to filter on.`);
        } else if (trimmedColumn !== column) {
            problems.push(`${label} ${index + 1}: column must not be padded with whitespace, the name reaches the query as written.`);
        }
        if ((filter.value ?? '').trim() === '') {
            problems.push(`${label} ${index + 1}: value must not be empty, a filter on nothing keeps nothing.`);
        }
    });
    return problems;
}

function filtersProblems(dataset: DatasetSource): string[] {
    if (!dataset.filters || dataset.filters.length === 0) {
        return [];
    }
    if (dataset.origin !== 'export') {
        return [`Filters only apply to an export, not origin "${dataset.origin}".`];
    }
    return filterEntryProblems(dataset.filters, 'Filter');
}

/** Whether fallback's selection reads the same rows the source itself already does (sameSeries in validate.go): same ref, same column, same filters as an unordered set. */
function fallbackSameAsSource(dataset: DatasetSource, fallback: DatasetFallback): boolean {
    const substituteRef = fallback.ref || dataset.ref;
    const substituteColumn = fallback.column || dataset.column;
    if (substituteRef !== dataset.ref || substituteColumn !== dataset.column) {
        return false;
    }
    const key = (filters: DatasetFilter[] | undefined) =>
        (filters || []).map((f) => JSON.stringify([f.column, f.value])).sort();
    const sourceKey = key(dataset.filters);
    const fallbackKey = key(fallback.filters);
    return sourceKey.length === fallbackKey.length && sourceKey.every((v, i) => v === fallbackKey[i]);
}

function fallbackProblems(dataset: DatasetSource): string[] {
    const fallback = dataset.fallback;
    if (!fallback) {
        return [];
    }
    if (dataset.origin !== 'export') {
        return [`Fallback only applies to an export, not origin "${dataset.origin}".`];
    }
    const problems: string[] = [];
    if (!maxGapIsSet(dataset.max_gap)) {
        problems.push('Fallback needs max_gap: without a bound nothing is a gap, so the fallback series would never be read.');
    }
    if (!fallback.filters || fallback.filters.length === 0) {
        problems.push('Fallback must name the filters that pick the substitute series out of the export.');
    }
    problems.push(...filterEntryProblems(fallback.filters, 'Fallback filter'));
    if (fallback.ref !== undefined && fallback.ref !== '' && fallback.ref.trim() === '') {
        problems.push("Fallback export must not be blank, empty reads the source's own.");
    }
    if (fallback.column !== undefined && fallback.column !== '' && fallback.column.trim() === '') {
        problems.push("Fallback column must not be blank, empty reads the source's own.");
    }
    if (fallbackSameAsSource(dataset, fallback)) {
        problems.push('Fallback must select a different series than the source itself: the same export, column and filters.');
    }
    if (dataset.cumulative) {
        problems.push('Fallback must not be combined with cumulative: the substitute is a different meter, not this one\'s count.');
    }
    return problems;
}

/**
 * Every server-side rule max_gap, filters and fallback would fail, as the messages shown to the
 * user -- several can hold at once, unlike followProblem's single first-hit result. Mirrors the
 * checks moses itself makes on save (lib/domain/validate.go checkMaxGap/checkFilters/checkFallback,
 * docs/gaps-in-a-replayed-series.md and docs/context-and-context-sources.md "One export, several series").
 */
export function datasetGapProblems(dataset: DatasetSource | undefined): string[] {
    if (!dataset) {
        return [];
    }
    const problems: string[] = [];
    const maxGap = maxGapProblem(dataset);
    if (maxGap) {
        problems.push(maxGap);
    }
    problems.push(...filtersProblems(dataset));
    problems.push(...fallbackProblems(dataset));
    return problems;
}

export interface FormulaSource {
    expression?: string;
    /** Maps a name usable in expression to a channel id or context key. */
    inputs?: Record<string, string>;
}

/**
 * A machine programme declared as data: a cycle of named states, each held for a
 * duration and publishing a value of its own. The name of the current state is written
 * into the asset state under state_key, so a formula, the live state endpoint and a
 * dashboard can all read what the plant is doing instead of guessing it from the load.
 */
export interface ScheduleSource {
    /** Run in the order they are written; the last one is followed by the first again unless run_once is set. */
    states?: ScheduleState[];
    /** The asset state key the current state's name is written under. Mandatory. */
    state_key?: string;
    gate?: ScheduleGate;
    /** Holds the last state instead of starting the cycle over -- the shape of a job rather than a running plant. */
    run_once?: boolean;
}

/** One step of the programme. */
export interface ScheduleState {
    /** What is written into the asset state while this step runs. */
    name?: string;
    /** How long the step is held, in whole seconds. */
    duration_seconds?: number;
    /** Varies duration_seconds per cycle, as a percent below 100. */
    duration_spread_percent?: number;
    /** What the channel publishes while the step runs. */
    value?: number;
    /** The random variation around value, per time slot -- the same convention as a profile's spread. */
    spread_percent?: number;
    /** Further asset state values this step declares, e.g. the air demand of a running machine. */
    state_writes?: Record<string, number>;
}

/**
 * Starts the programme from a context key, which is what a shift calendar is: the cycle
 * restarts at the first state every time the key rises above threshold. Threshold is
 * exclusive -- open means strictly greater -- so the default of 0 fits a 0/1 calendar.
 */
export interface ScheduleGate {
    context_key?: string;
    threshold?: number;
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

/** The device-sharing set of an environment: GET/PUT .../shares. devices is response-only -- how many managed devices it applies to. */
export interface EnvironmentShares {
    users: string[];
    groups: string[];
    devices?: number;
}

/** One device permissions-v2 could not update, from a 502 PUT .../shares response. */
export interface SharesDeviceError {
    id: string;
    error: string;
}

/** The 502 PUT .../shares body: some devices failed and nothing was saved -- retrying the same PUT is safe (idempotent). */
export interface SharesFailure {
    devices: SharesDeviceError[];
}

/** Distinguishes the 502 device-error body from the EnvironmentShares also returned by the same PUT (both carry "devices", array vs number). */
export function isSharesFailure(value: unknown): value is SharesFailure {
    return !!value && Array.isArray((value as SharesFailure).devices);
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

export type HistoryState = 'running' | 'done' | 'failed' | 'cancelled';

/** What became of one channel a history run drove -- see HistoryStatus.channels. */
export interface HistoryChannelStatus {
    channel_id?: string;
    asset_id?: string;
    name?: string;
    /** False means this channel never sent a historical reading; see reason. */
    publishable?: boolean;
    /** Why publishable is false, e.g. its platform service has no senergy/time_path. */
    reason?: string;
    published?: number;
    silent?: number;
    failed?: number;
    last_error?: string;
}

/**
 * GET/POST/DELETE .../history: where a history run stands. `state` done means the live
 * simulation is running again on the state the run arrived at; failed/cancelled mean it
 * runs again on the partial state reached, a consistent earlier instant and not a rollback.
 * `to` moves forward while the run chases the present; `position` is the virtual instant
 * actually reached.
 */
export interface HistoryStatus {
    environment_id?: string;
    state?: HistoryState;
    from?: string;
    to?: string;
    started_at?: string;
    finished_at?: string;
    position?: string;
    published?: number;
    failed?: number;
    last_error?: string;
    error?: string;
    channels?: HistoryChannelStatus[];
}

/** One platform device an occupied-window refusal (see HistoryStartRefusal) names, id and optional asset name. */
export interface HistoryOccupiedDevice {
    id: string;
    name?: string;
}

/**
 * Why POST .../history was refused, classified from the 409/503/400 body: occupied (the
 * window's first day already holds readings, force starts anyway), running (a run or backfill
 * of this environment is already going -- reload the status instead of retrying), timeout (the
 * occupied-window check did not answer in time), window (the window itself is invalid, e.g. in
 * the future or too long) or other (anything else).
 */
export interface HistoryStartRefusal {
    kind: 'occupied' | 'running' | 'timeout' | 'window' | 'other';
    message: string;
    devices?: HistoryOccupiedDevice[];
    status: number;
}

/** Distinguishes a start refusal from the HistoryStatus also returned by the same POST. */
export function isHistoryStartRefusal(value: unknown): value is HistoryStartRefusal {
    return !!value && typeof (value as HistoryStartRefusal).kind === 'string';
}

/**
 * GET .../history's outcome, discriminated so a transport failure can never be confused with
 * "no run known" (404): 'none' is the 404, 'status' is a normal answer, 'error' is anything
 * else (including a client-side timeout) -- the poller keeps the last known status on 'error'
 * instead of blanking the view.
 */
export type HistoryPollResult =
    | { kind: 'none' }
    | { kind: 'status'; status: HistoryStatus }
    | { kind: 'error'; message: string; status?: number };

export type EffectsNodeKind = 'context_key' | 'asset' | 'zone' | 'timeline';

/**
 * One node of the effect graph (GET .../effects). id is a stable, kind-prefixed key
 * ("context:<key>", "asset:<id>", "zone:<id>" or the constant "timeline") -- the same
 * shape edges' from/to use to reference it.
 */
export interface EffectsNode {
    id: string;
    kind: EffectsNodeKind;
    label?: string;
    /**
     * context_key only: true for a plain inline value. False together with an empty
     * source_kind means the key is referenced (e.g. by a formula) but declared nowhere in
     * the document -- neither a static value nor a context source.
     */
    static?: boolean;
    /** context_key only: which kind of context source drives it; empty together with static:false means undeclared (see `static`), empty together with static:true means a plain value. */
    source_kind?: SourceKind | '';
    external_ref?: string;
    /** asset/zone only: the zone this node sits in. */
    zone?: string;
    /** asset/zone only: the top-level zone (site/building) this node sits under. */
    site?: string;
    /** asset only. */
    asset_kind?: AssetKind;
}

export type EffectsEdgeKind = 'reads' | 'writes' | 'gates' | 'scales' | 'submeters' | 'aggregates' | 'dated_change';
export type EffectsEdgeVia = 'script' | 'formula' | 'schedule' | 'aggregate' | 'submetered_by' | 'timeline';

/** One edge of the effect graph, direction is data flow: from the producer to the consumer. */
export interface EffectsEdge {
    from: string;
    to: string;
    kind: EffectsEdgeKind;
    via?: EffectsEdgeVia;
    channel?: string;
    key?: string;
    count?: number;
}

/** One expression the graph builder could not resolve, e.g. a formula input naming a channel that no longer exists. */
export interface EffectsUnresolved {
    asset?: string;
    channel?: string;
    expression?: string;
    reason?: string;
}

/** GET /environments/{id}/effects: the whole effect graph for the Effects tab. */
export interface EffectsGraph {
    nodes: EffectsNode[];
    edges: EffectsEdge[];
    unresolved: EffectsUnresolved[];
}

/**
 * GET .../effects's outcome, discriminated the same way HistoryPollResult is: 'unsupported'
 * is a 404 (an older moses without this endpoint) rather than a genuine failure, so the tab
 * can show a short note instead of an error.
 */
export type EffectsResult =
    | { kind: 'graph'; graph: EffectsGraph }
    | { kind: 'unsupported' }
    | { kind: 'error'; message: string; status?: number };

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
