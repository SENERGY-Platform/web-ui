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

import {
    DeviceTypeContentVariableModel,
    DeviceTypeFunctionModel,
    DeviceTypeModel,
    DeviceTypeServiceModel
} from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import {
    AutomationSuggestion,
    SET_DEVICE_OFF_FUNCTION_ID,
    SET_DEVICE_ON_FUNCTION_ID,
    SuggestionTarget,
    SuggestionTrigger
} from './automation-suggestion.model';

/**
 * What the resolver needs from the device repository, already loaded by the service.
 * Keys: device ids; measuredFunctionIds by measuredFunctionKey().
 */
export interface AutomationCatalog {
    deviceNames: Map<string, string>;
    deviceTypes: Map<string, DeviceTypeModel>;
    measuredFunctionIds: Map<string, string>;
    functionsById: Map<string, DeviceTypeFunctionModel>;
    controllingFunctionsByConcept: Map<string, DeviceTypeFunctionModel[]>;
}

/** One target the automation can act on: the command is resolved and its input characteristic known. */
export interface ResolvedTarget {
    deviceId: string;
    deviceName: string;
    value: boolean | number | string;
    /** true for on/off targets, which use Set Device On/Off */
    binary: boolean;
    /** the control service of the device type that takes the command */
    serviceId: string;
    functionId: string;
    characteristicId: string;
    /** set for true binary targets whose Set Device Off resolves: the command may sit on another service */
    offFunctionId?: string;
    offServiceId?: string;
    offCharacteristicId?: string;
    offValue?: boolean;
}

export interface ResolvedSuggestion {
    suggestion: AutomationSuggestion;
    triggerDeviceName: string;
    targets: ResolvedTarget[];
    label: string;
    /** true when the suggestion carries auto_off_s and a true target has a resolvable Set Device Off: only then the switch is offered */
    autoOffAvailable: boolean;
}

export function measuredFunctionKey(deviceId: string, serviceId: string, path: string): string {
    return [deviceId, serviceId, path].join('|');
}

/**
 * The device-type path of an analytics path: the analytics prefix `value.` is removed exactly once.
 * Device types have roots like `value`, `root`, `sensor`, `state` or `POWER`, so the root is not stripped.
 */
export function devicePath(analyticsPath: string): string {
    const prefix = 'value.';
    return analyticsPath.startsWith(prefix) ? analyticsPath.slice(prefix.length) : analyticsPath;
}

/**
 * Resolves the suggestion against the catalog. Targets without a resolvable command are dropped; a
 * suggestion without any remaining target returns null and is hidden.
 */
export function resolveSuggestion(suggestion: AutomationSuggestion, catalog: AutomationCatalog): ResolvedSuggestion | null {
    const targets: ResolvedTarget[] = [];
    for (const target of suggestion.targets) {
        const resolved = resolveTarget(target, catalog);
        if (resolved !== null) {
            targets.push(resolved);
        }
    }
    if (targets.length === 0) {
        return null;
    }
    const triggerDeviceName = catalog.deviceNames.get(suggestion.trigger.device_id) ?? suggestion.trigger.device_id;
    return {
        suggestion,
        triggerDeviceName,
        targets,
        label: suggestionLabel(suggestion, triggerDeviceName, targets),
        autoOffAvailable: suggestion.auto_off_s !== null && targets.some((t) => t.binary && t.value === true && t.offFunctionId !== undefined),
    };
}

export function resolveTarget(target: SuggestionTarget, catalog: AutomationCatalog): ResolvedTarget | null {
    const deviceType = catalog.deviceTypes.get(target.device_id);
    if (deviceType === undefined) {
        return null;
    }
    const deviceName = catalog.deviceNames.get(target.device_id) ?? target.device_id;

    if (typeof target.value === 'boolean') {
        const functionId = target.value ? SET_DEVICE_ON_FUNCTION_ID : SET_DEVICE_OFF_FUNCTION_ID;
        const input = findControlInput(functionId, serviceOrder(deviceType, target.service_id));
        if (input === null) {
            return null;
        }
        const resolved: ResolvedTarget = {
            deviceId: target.device_id,
            deviceName,
            value: target.value,
            binary: true,
            serviceId: input.serviceId,
            functionId,
            characteristicId: input.characteristicId,
        };
        // only an on-target can be switched back; without a resolvable Set Device Off it stays visible without one
        if (target.value === true) {
            const off = findControlInput(SET_DEVICE_OFF_FUNCTION_ID, serviceOrder(deviceType, target.service_id));
            if (off !== null) {
                resolved.offFunctionId = SET_DEVICE_OFF_FUNCTION_ID;
                resolved.offServiceId = off.serviceId;
                resolved.offCharacteristicId = off.characteristicId;
                resolved.offValue = false;
            }
        }
        return resolved;
    }

    // Concept-based: the measured function owns its concept, the controlling functions of the same concept are the commands.
    const measuredId = catalog.measuredFunctionIds.get(measuredFunctionKey(target.device_id, target.service_id, devicePath(target.path)));
    if (measuredId === undefined) {
        return null;
    }
    const conceptId = catalog.functionsById.get(measuredId)?.concept_id;
    if (conceptId === undefined || conceptId === '') {
        return null;
    }
    const candidates = catalog.controllingFunctionsByConcept.get(conceptId) ?? [];
    // a binary concept takes a boolean only: a text or number value never reaches Set Device On/Off
    if (candidates.some((c) => c.id === SET_DEVICE_ON_FUNCTION_ID || c.id === SET_DEVICE_OFF_FUNCTION_ID)) {
        return null;
    }
    for (const candidate of candidates) {
        const input = findControlInput(candidate.id, serviceOrder(deviceType, target.service_id));
        if (input !== null) {
            return {
                deviceId: target.device_id,
                deviceName,
                value: target.value,
                binary: false,
                serviceId: input.serviceId,
                functionId: candidate.id,
                characteristicId: input.characteristicId,
            };
        }
    }
    return null;
}

/**
 * The first of the given services that takes the function as input, with the characteristic of that input.
 * Set Device On/Off take no value, and device types often leave their input without a characteristic
 * (empty string); the process never sends an input for them, so for those two none is required.
 */
export function findControlInput(
    functionId: string,
    services: DeviceTypeServiceModel[],
): { serviceId: string; characteristicId: string } | null {
    const flag = functionId === SET_DEVICE_ON_FUNCTION_ID || functionId === SET_DEVICE_OFF_FUNCTION_ID;
    for (const service of services) {
        for (const input of service.inputs ?? []) {
            const variable = findVariableByFunction(input.content_variable, functionId);
            if (variable !== undefined && (flag || variable.characteristic_id)) {
                return { serviceId: service.id, characteristicId: variable.characteristic_id ?? '' };
            }
        }
    }
    return null;
}

/**
 * Order in which a command is searched: the service that carries the measured value first, then the
 * services of its service group, then the rest of the device type in its order. On a multi-channel
 * device this picks the channel of the measured value, not the first channel of the type.
 */
export function serviceOrder(deviceType: DeviceTypeModel, measuredServiceId: string): DeviceTypeServiceModel[] {
    const services = deviceType.services ?? [];
    const measured = services.find((s) => s.id === measuredServiceId);
    const group = measured?.service_group_key;
    const sameGroup = (s: DeviceTypeServiceModel) => !!group && s.service_group_key === group;
    return [
        ...services.filter((s) => s.id === measuredServiceId),
        ...services.filter((s) => s.id !== measuredServiceId && sameGroup(s)),
        ...services.filter((s) => s.id !== measuredServiceId && !sameGroup(s)),
    ];
}

function findVariableByFunction(variable: DeviceTypeContentVariableModel | undefined, functionId: string): DeviceTypeContentVariableModel | undefined {
    if (variable === undefined) {
        return undefined;
    }
    if (variable.function_id === functionId) {
        return variable;
    }
    for (const sub of variable.sub_content_variables ?? []) {
        const found = findVariableByFunction(sub, functionId);
        if (found !== undefined) {
            return found;
        }
    }
    return undefined;
}

function suggestionLabel(suggestion: AutomationSuggestion, triggerDeviceName: string, targets: ResolvedTarget[]): string {
    const targetPhrases = targets.map((t) => t.binary ? `${t.deviceName} ${t.value ? 'on' : 'off'}` : `${t.deviceName} = ${t.value}`);
    return `${triggerPhrase(suggestion.trigger, triggerDeviceName)} → ${targetPhrases.join(', ')}`;
}

function triggerPhrase(trigger: SuggestionTrigger, triggerDeviceName: string): string {
    if (trigger.kind === 'power') {
        return trigger.to === 'on'
            ? `${triggerDeviceName} power on (> ${trigger.on_above_w} W)`
            : `${triggerDeviceName} power off (< ${trigger.off_below_w} W)`;
    }
    return `${triggerDeviceName} ${trigger.to}`;
}

/**
 * The variables of the accept_suggestion procedure. All values are strings; structured values are
 * JSON. Only resolved targets are sent. autoOffS is the delay the user chose, null for none. The off keys
 * are present only when a delay is sent and the target has a resolvable Set Device Off.
 */
export function acceptVariables(resolved: ResolvedSuggestion, autoOffS: number | null): Record<string, string> {
    const s = resolved.suggestion;
    // a delay without a resolvable Set Device Off would ask the process for a switch-off it cannot run
    const delay = autoOffS !== null && resolved.autoOffAvailable ? autoOffS : null;
    const targets = resolved.targets.map((t) => {
        const payload: Record<string, unknown> = {
            device_id: t.deviceId,
            service_id: t.serviceId,
            function_id: t.functionId,
            characteristic_id: t.characteristicId,
            value: t.value,
        };
        if (delay !== null && t.offFunctionId !== undefined) {
            payload['off_function_id'] = t.offFunctionId;
            payload['off_service_id'] = t.offServiceId;
            payload['off_characteristic_id'] = t.offCharacteristicId;
            payload['off_value'] = t.offValue;
        }
        return payload;
    });
    return {
        suggestion_id: s.id,
        label: resolved.label,
        trigger: JSON.stringify({
            device_id: s.trigger.device_id,
            service_id: s.trigger.service_id,
            path: s.trigger.path,
            kind: s.trigger.kind,
            from: s.trigger.from,
            to: s.trigger.to,
            ...powerThresholds(s.trigger),
        }),
        window: JSON.stringify({
            from: s.window.from,
            to: s.window.to,
            weekdays: s.window.weekdays,
            tz: s.window.tz,
        }),
        targets: JSON.stringify(targets),
        auto_off_s: delay === null ? '' : String(delay),
    };
}

/** The thresholds of a power trigger, passed on unchanged; other kinds carry none. */
function powerThresholds(trigger: SuggestionTrigger): Partial<Pick<SuggestionTrigger, 'on_above_w' | 'off_below_w' | 'hold_s'>> {
    if (trigger.kind !== 'power') {
        return {};
    }
    return { on_above_w: trigger.on_above_w, off_below_w: trigger.off_below_w, hold_s: trigger.hold_s };
}
