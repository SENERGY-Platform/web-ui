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

import {environment} from '../../../../environments/environment';
import {AcControlElementModel, AcControlPropertiesModel} from './ac-control.model';
import {
    contentVariableAspectIds,
    criteriaAspectIds,
    DeviceTypeContentVariableModel,
    DeviceTypeModel
} from '../../../modules/metadata/device-types-overview/shared/device-type.model';
import {DeviceGroupModel} from '../../../modules/devices/device-groups/shared/device-groups.model';

const INTEGER = 'https://schema.org/Integer';
const FLOAT = 'https://schema.org/Float';

/** A content variable of the device type, or a criteria of the device group, the widget may command. */
export interface AcControlCandidate {
    functionId: string;
    serviceId?: string;
    aspectIds: string[];
    type?: string;
}

export type AcControlElements = Omit<NonNullable<AcControlPropertiesModel['acControl']>, 'deviceId' | 'deviceGroupId' | 'minTarget' | 'maxTarget'>;

/** The functions the widget reads or commands. Read on each call: the environment is filled in after module load. */
function acControlFunctionIds(): string[] {
    return [
        environment.getTemperatureFunctionId,
        environment.setTemperatureFunctionId,
        environment.getBinaryStateFunctionId,
        environment.setOnFunctionId,
        environment.setOffFunctionId,
        environment.getAcModeFunctionId,
        environment.setAcModeFunctionId,
        environment.getFanSpeedLevelFunctionId,
        environment.setFanSpeedLevelFunctionId,
        environment.getFanSpeedLevelAutomaticFunctionId,
        environment.setFanSpeedLevelAutomaticFunctionId,
        environment.getRemainingRelativeDurabilityFunctionId,
    ];
}

/** One candidate per content variable of the widget's functions, in- and outputs of every service. */
export function deviceTypeCandidates(deviceType: DeviceTypeModel): AcControlCandidate[] {
    const functionIds = acControlFunctionIds();
    const candidates: AcControlCandidate[] = [];
    deviceType.services.forEach(s => {
        s.outputs.forEach(o => collect(s.id, o.content_variable, functionIds, candidates));
        s.inputs.forEach(o => collect(s.id, o.content_variable, functionIds, candidates));
    });
    return candidates;
}

function collect(serviceId: string, field: DeviceTypeContentVariableModel | undefined, functionIds: string[], results: AcControlCandidate[]) {
    if (field === undefined || field === null) {
        return;
    }
    if (field.function_id && functionIds.includes(field.function_id)) {
        // one entry per content variable: each entry becomes one device command, sent with all of
        // the variable's aspects so that it matches this variable and no less specific neighbour
        results.push({functionId: field.function_id, serviceId, aspectIds: contentVariableAspectIds(field), type: field.type});
    }
    if (field.type === 'https://schema.org/StructuredValue') {
        field.sub_content_variables?.forEach(innerField => collect(serviceId, innerField, functionIds, results));
    }
}

/** One candidate per criteria of the group with at most one aspect, deduplicated over the interactions. */
export function deviceGroupCandidates(group: DeviceGroupModel): AcControlCandidate[] {
    const candidates: AcControlCandidate[] = [];
    group.criteria
        // this widget offers single-aspect choices only; the backend also generates one
        // criterion per single aspect (with ancestors), so no aspect is lost by dropping these
        ?.filter(c => criteriaAspectIds(c).length <= 1)
        .forEach(c => {
            const aspectIds = criteriaAspectIds(c);
            if (candidates.some(m => m.functionId === c.function_id && m.aspectIds[0] === aspectIds[0])) {
                return; // no duplicates based on interaction
            }
            candidates.push({functionId: c.function_id, aspectIds});
        });
    return candidates;
}

/** Roles of configurations saved before the aspect lists that the widget no longer offers. */
const RETIRED_ROLES = ['getLocked', 'setLocked', 'setUnlocked'];

/**
 * Whether a derived configuration fills every role the earlier one filled, apart from the retired ones. One that
 * does not lost something, through a device type that changed or an environment value that is missing.
 */
export function keepsEveryRole(before: object, after: object): boolean {
    const filled = (acControl: object) => Object.entries(acControl)
        .filter(([, v]) => Array.isArray(v) ? v.some(isElement) : isElement(v))
        .map(([role]) => role);
    const kept = filled(after);
    return filled(before).every(role => RETIRED_ROLES.includes(role) || kept.includes(role));
}

function isElement(v: unknown): v is AcControlElementModel {
    return typeof v === 'object' && v !== null && 'functionId' in v;
}

/**
 * Whether the configuration was saved before the widget addressed its commands by aspect lists. Such a
 * configuration names functions the metadata migration of 2026-10-05 removed, so it has to be derived again.
 */
export function isLegacyAcControl(acControl: NonNullable<AcControlPropertiesModel['acControl']>): boolean {
    return Object.values(acControl)
        .flatMap(v => Array.isArray(v) ? v : [v])
        .some(v => isElement(v) && v.aspectIds === undefined);
}

/** Assigns each candidate the role it plays in the widget. Candidates of other functions are ignored. */
export function acControlElements(candidates: AcControlCandidate[]): AcControlElements {
    const ofFunction = (functionId: string) => candidates.filter(m => m.functionId === functionId);
    const withAspect = (matching: AcControlCandidate[], aspectId: string) => matching.filter(m => m.aspectIds.includes(aspectId));

    // Readings and setpoints share Get-Temperature and Set-Temperature and are told apart by their aspects. A
    // device command or group criteria cannot exclude an aspect, so each is asked for by its own: Reading for a
    // measurement, Target for a setpoint. Without it, a request for the other aspects also matches the variable
    // next to it, such as a thermostat's input for an external room temperature.
    const temperatures = ofFunction(environment.getTemperatureFunctionId);
    const setpoints = withAspect(ofFunction(environment.setTemperatureFunctionId), environment.aspectTargetId);
    // Get-Binary State reads any two-valued state; the device's power state carries Device, a filter's state Filter
    const binaryStates = ofFunction(environment.getBinaryStateFunctionId);
    const setAcMode = ofFunction(environment.setAcModeFunctionId);

    let tempStep = -1;
    if (setpoints.some(m => m.type === INTEGER)) {
        tempStep = 1;
    } else if (setpoints.some(m => m.type === FLOAT)) {
        tempStep = 0.5;
    }

    return {
        tempStep,
        getTemperatureMeasurements: all(withAspect(temperatures, environment.aspectReadingId)),
        getTargetTemperature: all(withAspect(temperatures, environment.aspectTargetId)),
        setTargetTemperature: all(setpoints),
        getOnOff: first(withAspect(binaryStates, environment.aspectDeviceId)),
        getCleaningRequired: first(withAspect(binaryStates, environment.aspectFilterId)),
        setOn: first(ofFunction(environment.setOnFunctionId)),
        setOff: first(ofFunction(environment.setOffFunctionId)),
        getMode: first(ofFunction(environment.getAcModeFunctionId)),
        setModeDry: first(setAcMode, 'DRY'),
        setModeVent: first(setAcMode, 'VENTILATION'),
        setModeHeat: first(setAcMode, 'HEAT'),
        setModeCool: first(setAcMode, 'COOL'),
        setModeAuto: first(setAcMode, 'AUTO'),
        getFanSpeedLevel: first(ofFunction(environment.getFanSpeedLevelFunctionId)),
        setFanSpeedLevel: first(ofFunction(environment.setFanSpeedLevelFunctionId)),
        getFanSpeedLevelAutomatic: first(ofFunction(environment.getFanSpeedLevelAutomaticFunctionId)),
        setFanSpeedLevelAutomatic: first(ofFunction(environment.setFanSpeedLevelAutomaticFunctionId)),
        getBatteryLevel: first(ofFunction(environment.getRemainingRelativeDurabilityFunctionId)),
    };
}

function element(m: AcControlCandidate, value?: any): AcControlElementModel {
    return {
        aspectIds: m.aspectIds,
        serviceId: m.serviceId,
        functionId: m.functionId,
        value
    };
}

function first(matching: AcControlCandidate[], value?: any): AcControlElementModel | undefined {
    return matching.length > 0 ? element(matching[0], value) : undefined;
}

function all(matching: AcControlCandidate[]): AcControlElementModel[] | undefined {
    return matching.length > 0 ? matching.map(m => element(m)) : undefined;
}
