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

import { DeviceCommandModel, DeviceCommandResponseModel } from 'src/app/core/services/device-command.service';
import {
    DeviceTypeContentVariableModel,
    DeviceTypeModel,
    contentVariableAspectIds,
} from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import { SmartServiceInstanceModel } from 'src/app/modules/smart-services/instances/shared/instances.model';
import { HeatingSwitch, switchTimeText, temperatureText } from './heating-schedule.plan';

export type HeatingValueKind = 'room' | 'target' | 'battery' | 'heating';

/** The service and variable that deliver one value of one device. */
export interface HeatingValueSource {
    deviceId: string;
    kind: HeatingValueKind;
    serviceId: string;
    /** the aspects the command names; absent for the battery when the variable carries none */
    aspectIds?: string[];
}

/** What a thermostat reports; a missing field is unavailable. */
export interface HeatingDeviceValues {
    room?: number;
    target?: number;
    battery?: number;
    heating?: boolean;
}

export const TEMPERATURE_FUNCTION = 'urn:infai:ses:measuring-function:d19ffeb0-877c-4611-951c-b3fc37d9b9ba';
export const BATTERY_FUNCTION = 'urn:infai:ses:measuring-function:68dae5ce-a9ee-4487-8872-7943a94e2595';
export const AIR_ASPECT = 'urn:infai:ses:aspect:a14c5efb-b0b6-46c3-982e-9fded75b5ab6';
export const READING_ASPECT = 'urn:infai:ses:aspect:ffcdc0a6-0957-49d7-be9a-af912ecbd3cf';
export const TARGET_ASPECT = 'urn:infai:ses:aspect:4f4188b6-f944-45fa-9429-15655f691397';
export const BINARY_STATE_FUNCTION = 'urn:infai:ses:measuring-function:2c284729-9bcd-4cde-b00c-1edbdaaab724';
export const HEATING_ASPECT = 'urn:infai:ses:aspect:1d69d3b6-d16f-430c-bf58-f23b26cd84c4';
export const CELSIUS_CHARACTERISTIC = 'urn:infai:ses:characteristic:5ba31623-0ccb-4488-bfb7-f73b50e03b5a';
export const PERCENT_CHARACTERISTIC = 'urn:infai:ses:characteristic:46f808f4-bb9e-4cc2-bd50-dc33ca74f273';
export const BOOLEAN_CHARACTERISTIC = 'urn:infai:ses:characteristic:7dc1bb7e-b256-408a-a6f9-044dc60fdcf5';

export const LOW_BATTERY_PERCENT = 20;
/** Tenths of a degree from which a device set point counts as deviating. */
const OVERRIDE_TENTHS = 5;
/** The device needs time to report the new set point after a planned switch. */
const OVERRIDE_GRACE_MS = 10 * 60000;

const KINDS: Array<{ kind: HeatingValueKind; functionId: string; characteristicId: string; aspectIds?: string[] }> = [
    { kind: 'room', functionId: TEMPERATURE_FUNCTION, characteristicId: CELSIUS_CHARACTERISTIC, aspectIds: [AIR_ASPECT, READING_ASPECT] },
    { kind: 'target', functionId: TEMPERATURE_FUNCTION, characteristicId: CELSIUS_CHARACTERISTIC, aspectIds: [TARGET_ASPECT] },
    { kind: 'battery', functionId: BATTERY_FUNCTION, characteristicId: PERCENT_CHARACTERISTIC },
    { kind: 'heating', functionId: BINARY_STATE_FUNCTION, characteristicId: BOOLEAN_CHARACTERISTIC, aspectIds: [HEATING_ASPECT] },
];

/** The first variable, searched depth first through the sub variables, with the function and, when given, all of the aspects. */
function findVariable(variable: DeviceTypeContentVariableModel | undefined, functionId: string, aspectIds?: string[]): DeviceTypeContentVariableModel | null {
    if (!variable) {
        return null;
    }
    if (variable.function_id === functionId && (aspectIds === undefined || aspectIds.every((id) => contentVariableAspectIds(variable).includes(id)))) {
        return variable;
    }
    for (const sub of variable.sub_content_variables ?? []) {
        const found = findVariable(sub, functionId, aspectIds);
        if (found !== null) {
            return found;
        }
    }
    return null;
}

/** The sources of the values the device type can deliver; room and target differ only by aspects, so the aspects are matched. */
export function matchValueSources(deviceId: string, deviceType: DeviceTypeModel): HeatingValueSource[] {
    const sources: HeatingValueSource[] = [];
    for (const wanted of KINDS) {
        for (const service of deviceType.services ?? []) {
            const variable = (service.outputs ?? []).map((output) => findVariable(output.content_variable, wanted.functionId, wanted.aspectIds)).find((v) => v !== null);
            if (variable) {
                const aspectIds = wanted.aspectIds ?? contentVariableAspectIds(variable).slice(0, 1);
                sources.push({ deviceId, kind: wanted.kind, serviceId: service.id, ...(aspectIds.length === 0 ? {} : { aspectIds }) });
                break;
            }
        }
    }
    return sources;
}

/** One read command per source; the characteristic makes device-command convert, for example Kelvin to Celsius. */
export function readCommands(sources: HeatingValueSource[]): DeviceCommandModel[] {
    return sources.map((source) => {
        const kind = KINDS.find((k) => k.kind === source.kind);
        return {
            function_id: kind?.functionId ?? TEMPERATURE_FUNCTION,
            device_id: source.deviceId,
            service_id: source.serviceId,
            ...(source.aspectIds === undefined ? {} : { aspect_ids: source.aspectIds }),
            characteristic_id: kind?.characteristicId ?? CELSIUS_CHARACTERISTIC,
        };
    });
}

/** device-command answers a command with the list of its output values; a list of exactly one is that value, any other list is unavailable. */
function single(value: unknown): unknown {
    return Array.isArray(value) ? (value.length === 1 ? value[0] : undefined) : value;
}

function numeric(raw: unknown): number | undefined {
    const value = single(raw);
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}

function boolean(raw: unknown): boolean | undefined {
    const value = single(raw);
    return typeof value === 'boolean' ? value : undefined;
}

/** Device id to values; an entry that is not 200 or not numeric (not boolean for the heating state) leaves its value out. The responses are in the order of the commands. */
export function valuesFromResponses(sources: HeatingValueSource[], responses: DeviceCommandResponseModel[]): Map<string, HeatingDeviceValues> {
    const values = new Map<string, HeatingDeviceValues>();
    sources.forEach((source, i) => {
        const response = responses[i];
        const value = response?.status_code === 200 ? (source.kind === 'heating' ? boolean(response.message) : numeric(response.message)) : undefined;
        if (value !== undefined) {
            values.set(source.deviceId, { ...values.get(source.deviceId), [source.kind]: value });
        }
    });
    return values;
}

/** Mean room temperature of the devices that report one, or null; rounded to one decimal. */
export function meanRoom(deviceIds: string[], values: Map<string, HeatingDeviceValues>): number | null {
    const rooms = deviceIds.map((id) => values.get(id)?.room).filter((room): room is number => room !== undefined);
    if (rooms.length === 0) {
        return null;
    }
    return Math.round((rooms.reduce((sum, room) => sum + room, 0) / rooms.length) * 10) / 10;
}

/** True when at least one of the devices reports that its valve is heating. */
export function zoneHeating(deviceIds: string[], values: Map<string, HeatingDeviceValues>): boolean {
    return deviceIds.some((id) => values.get(id)?.heating === true);
}

export interface LowBattery {
    label: string;
    percent: number;
}

/** The devices at or below the threshold, in the given order. */
export function lowBatteries(devices: Array<{ deviceId: string; label: string }>, values: Map<string, HeatingDeviceValues>): LowBattery[] {
    const low: LowBattery[] = [];
    for (const device of devices) {
        const battery = values.get(device.deviceId)?.battery;
        if (battery !== undefined && battery <= LOW_BATTERY_PERCENT) {
            low.push({ label: device.label, percent: Math.round(battery) });
        }
    }
    return low;
}

export interface ManualOverride {
    /** the deviating set point, or null when the devices deviate to different values */
    temperature: number | null;
}

/**
 * Set points of at least 0.5 degrees from the planned target mark a manual override, unless the last planned switch
 * is less than 10 minutes ago. Compared in tenths so that 0.5 does not depend on float rounding.
 */
export function manualOverride(planned: number, deviceIds: string[], values: Map<string, HeatingDeviceValues>, nowUtcMs: number, lastSwitch: HeatingSwitch | null): ManualOverride | null {
    if (lastSwitch !== null && nowUtcMs - lastSwitch.at <= OVERRIDE_GRACE_MS) {
        return null;
    }
    const deviating = new Set<number>();
    for (const id of deviceIds) {
        const setPoint = values.get(id)?.target;
        if (setPoint !== undefined && Math.abs(Math.round(setPoint * 10) - Math.round(planned * 10)) >= OVERRIDE_TENTHS) {
            deviating.add(Math.round(setPoint * 10));
        }
    }
    if (deviating.size === 0) {
        return null;
    }
    return { temperature: deviating.size === 1 ? [...deviating][0] / 10 : null };
}

/** "Manual 23 °C until 22:00"; without the value when the devices differ, without the time when there is no next switch. */
export function manualOverrideText(override: ManualOverride, next: HeatingSwitch | null, nowUtcMs: number): string {
    return 'Manual' + (override.temperature === null ? '' : ' ' + temperatureText(override.temperature)) + (next === null ? '' : ' until ' + switchTimeText(next.at, nowUtcMs));
}

export type InstanceStatusKind = 'error' | 'starting' | 'running';

export interface InstanceStatus {
    kind: InstanceStatusKind;
    text: string;
    /** the full text when `text` is shortened */
    title: string | null;
}

const MAX_ERROR_LENGTH = 60;

/** An error wins over `ready`; a long error text is shortened and kept in full as the title. */
export function instanceStatus(instance: Pick<SmartServiceInstanceModel, 'ready' | 'error'>): InstanceStatus {
    if (instance.error) {
        const long = instance.error.length > MAX_ERROR_LENGTH;
        return { kind: 'error', text: long ? instance.error.slice(0, MAX_ERROR_LENGTH - 1).trimEnd() + '…' : instance.error, title: long ? instance.error : null };
    }
    return instance.ready === false ? { kind: 'starting', text: 'Starting', title: null } : { kind: 'running', text: 'Running', title: null };
}
