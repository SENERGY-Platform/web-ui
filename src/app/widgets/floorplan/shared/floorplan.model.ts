/*
 * Copyright 2025 InfAI (CC SES)
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
import { environment } from 'src/environments/environment';
import { DeviceGroupCriteriaModel, DeviceGroupModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';
import {
    DeviceTypeAspectNodeModel,
    DeviceTypeCharacteristicsModel,
    DeviceTypeContentVariableModel,
    DeviceTypeModel,
    DeviceTypeServiceModel,
} from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';

export interface FloorplanWidgetPropertiesModel {
    floorplan?: {
        image: string | null;
        placements: FloorplanWidgetCapabilityModel[];
        dotSize: number;
        showUnplacedTable?: boolean;
    }
}

/** A placement without a position is not drawn on the map, but may be listed in the table */
export function isPlaced(p: FloorplanWidgetCapabilityModel): boolean {
    return p.position?.x !== null && p.position?.x !== undefined && p.position?.y !== null && p.position?.y !== undefined;
}

export interface FloorplanWidgetCapabilityModel {
    criteria: DeviceGroupCriteriaWithValueModel;
    tooltipCriteria?: DeviceGroupCriteriaWithValueModel[] | null;
    alias: string;
    showAlias?: boolean;
    showAliasWhenZoomed?: boolean;
    deviceGroupId: string | null;
    position: {
        x: number | null;
        y: number | null;
    },
    coloring: {
        value: number | string;
        icon: string;
        color: string;
        showValue: boolean;
        showValueWhenZoomed: boolean;
    }[],
    /**  @deprecated use @link coloring */
    icon?: string;
    /**  @deprecated use @link coloring */
    valueLow: number | null;
    /**  @deprecated use @link coloring */
    valueHigh: number | null;
    /**  @deprecated use @link coloring */
    colorLow: string | null;
    /**  @deprecated use @link coloring */
    colorHigh: string | null;
}

export interface TooltipCriteria {
    matchDsIndex: number;
    values: {
        description: string,
        label: string,
        /** the criteria the value belongs to, which may operate a control of its own */
        criteria: DeviceGroupCriteriaModel,
    }[];
}

export interface DeviceGroupCriteriaWithValueModel extends DeviceGroupCriteriaModel {
    value?: DeviceCommandResponseModel,
}

export interface DeviceGroupWithValueModel extends DeviceGroupModel {
    criteria?: DeviceGroupCriteriaWithValueModel[];
}

export const controllingFunctionPrefix = 'urn:infai:ses:controlling-function';

export const characteristicTypeText = 'https://schema.org/Text';
export const characteristicTypeInteger = 'https://schema.org/Integer';
export const characteristicTypeFloat = 'https://schema.org/Float';
export const characteristicTypeBoolean = 'https://schema.org/Boolean';
export const characteristicTypeStructure = 'https://schema.org/StructuredValue';
export const characteristicTypeList = 'https://schema.org/ItemList';

/** Inputs a controlling function can be operated with, derived from the base characteristic of its concept */
export enum FloorplanControlInput {
    /** the function takes no input at all, e.g. set on */
    Action = 'action',
    /** switches between two functions without input, e.g. set on and set off */
    Toggle = 'toggle',
    /** a single function taking a boolean */
    Switch = 'switch',
    Slider = 'slider',
    Number = 'number',
    Select = 'select',
    Buttons = 'buttons',
    Text = 'text',
    /** a nested form for structures and lists */
    Form = 'form',
}

/** Up to this many allowed values are offered as a row of buttons, more become a dropdown */
export const controlButtonsLimit = 4;

/** A controlling function of a placement, ready to be rendered */
export interface FloorplanControlModel {
    /** the criteria that is executed */
    criteria: DeviceGroupCriteriaModel;
    /** the criteria switching off, when two functions without input are shown as one toggle */
    offCriteria?: DeviceGroupCriteriaModel;
    label: string;
    icon: string;
    input: FloorplanControlInput;
    /** base characteristic of the function's concept, undefined for functions without input */
    characteristic?: DeviceTypeCharacteristicsModel;
    /** current value of the placement's measuring criteria belonging to the same concept */
    state?: any;
    /**
     * The displayed measurement this control belongs to. Such a control gets no button of its own, the
     * value shown for that criteria acts as the button instead.
     */
    via?: DeviceGroupCriteriaModel;
}

/** Reads and sets a state without ever taking an input, so it is shown as a single toggle */
export interface VoidTogglePair {
    /** measuring function telling whether the state is set */
    state: string;
    on: string;
    off: string;
}

/** The pairs of the platform, named by the semantic keys of the environment */
export function defaultVoidTogglePairs(): VoidTogglePair[] {
    return [
        { state: environment.getOnOffFunctionId, on: environment.setOnFunctionId, off: environment.setOffFunctionId },
        { state: environment.getLockedFunctionId, on: environment.setLockedFunctionId, off: environment.setUnlockedFunctionId },
    ];
}

/**
 * A function a device type declares, together with the service group it belongs to. Device group criteria
 * carry no service group, so this is the only way to tell apart two measuring functions of one concept.
 */
export interface ServiceGroupFunctionModel {
    deviceTypeId: string;
    deviceTypeName: string;
    serviceGroupKey: string;
    serviceId: string;
    serviceName: string;
    /** the names of the content variables leading to the value, as the device type nests them */
    path: string;
    /** an input is set, an output is read */
    isInput: boolean;
    functionId: string;
    aspectId: string;
}

/**
 * Collects the functions of a device type per service group, following the same keys as the mobile app:
 * service group, function and aspect. The service and the path come along, so an ambiguity can be
 * tracked down to the content variable that declares it.
 */
export function serviceGroupFunctions(deviceType: DeviceTypeModel): ServiceGroupFunctionModel[] {
    const result: ServiceGroupFunctionModel[] = [];
    const collect = (service: DeviceTypeServiceModel, isInput: boolean, parentPath: string, variable?: DeviceTypeContentVariableModel) => {
        if (variable === undefined || variable === null) {
            return;
        }
        const path = parentPath === '' ? variable.name || '' : parentPath + '.' + (variable.name || '');
        if (variable.function_id !== undefined && variable.function_id !== null) {
            const entry: ServiceGroupFunctionModel = {
                deviceTypeId: deviceType.id,
                deviceTypeName: deviceType.name,
                serviceGroupKey: service.service_group_key || '',
                serviceId: service.id,
                serviceName: service.name,
                path,
                isInput,
                functionId: variable.function_id,
                aspectId: variable.aspect_id || '',
            };
            if (!result.some(r => r.serviceId === entry.serviceId && r.path === entry.path && r.functionId === entry.functionId)) {
                result.push(entry);
            }
        }
        variable.sub_content_variables?.forEach(sub => collect(service, isInput, path, sub));
    };
    deviceType.services?.forEach(service => {
        service.inputs?.forEach(i => collect(service, true, '', i.content_variable));
        service.outputs?.forEach(o => collect(service, false, '', o.content_variable));
    });
    return result;
}

/**
 * Whether a single device type reads and sets the value through the same content variable. A thermostat
 * that sets its target through value.occupied_heating_setpoint and reads it back from the same path is
 * operating one value, unlike the external temperature input sitting next to it.
 */
export function sharesValuePath(deviceTypes: ServiceGroupFunctionModel[][], a: string, b: string): boolean {
    return deviceTypes.some(functions => functions.some(f => f.functionId === a && f.path !== '' &&
        functions.some(f2 => f2.functionId === b && f2.path === f.path)));
}

/** Every place the device types of a group declare a function, so a warning can be acted on */
export function declarationsOf(functionId: string, serviceGroups: ServiceGroupFunctionModel[][]): ServiceGroupFunctionModel[] {
    return serviceGroups.reduce((all: ServiceGroupFunctionModel[], functions) =>
        all.concat(functions.filter(f => f.functionId === functionId)), []);
}

/**
 * Whether any single device type of the group puts both functions into the same service group. An empty key
 * means the device type has no service groups, which tells the two functions apart just as little as no
 * device type at all. The lists stay separate per device type, so two types cannot share a key by accident.
 */
export function sharesServiceGroup(deviceTypes: ServiceGroupFunctionModel[][], a: string, b: string): boolean {
    return deviceTypes.some(functions => functions.some(f => f.functionId === a && f.serviceGroupKey !== '' &&
        functions.some(f2 => f2.functionId === b && f2.serviceGroupKey === f.serviceGroupKey)));
}

/** One criteria leaves the aspect or the device class open, which matches but says the least */
export const unspecifiedDistance = 2;

/**
 * How closely two criteria describe the same aspect: exactly, through the aspect tree, or with one of
 * them leaving the aspect open. undefined when they cannot mean the same aspect.
 *
 * A device group asked with filter_generic_duplicate_criteria keeps one generic form per function, so a
 * measuring criteria may carry the aspect while the controlling one carries the device class instead.
 * An empty aspect is therefore unspecified rather than a mismatch.
 */
export function aspectDistance(a: string, b: string, aspects: DeviceTypeAspectNodeModel[]): number | undefined {
    if (a === b) {
        return 0;
    }
    if (a === '' || b === '') {
        return unspecifiedDistance;
    }
    const node = aspects.find(n => n.id === a);
    if ((node?.ancestor_ids || []).indexOf(b) !== -1 || (node?.descendent_ids || []).indexOf(b) !== -1) {
        return 1;
    }
    return undefined;
}

/** The same for the device class, which the other criteria of a generic pair carries instead */
export function deviceClassDistance(a: string, b: string): number {
    if (a === b) {
        return 0;
    }
    if (a === '' || b === '') {
        return unspecifiedDistance;
    }
    // both name a device class, and a different one, so they describe different devices
    return unspecifiedDistance + 1;
}

/** What a control needs to find the measuring criteria reporting its current value */
export interface StateSourceContextModel {
    /** every criteria of the device group */
    criteria: DeviceGroupCriteriaModel[];
    /** the criteria the placement reads anyway */
    configured: DeviceGroupCriteriaModel[];
    aspects: DeviceTypeAspectNodeModel[];
    conceptOf: (functionId: string) => string | undefined;
    /** the functions per service group, one entry per device type of the group, empty while unknown */
    serviceGroups: ServiceGroupFunctionModel[][];
    /**
     * Whether the device types were looked up already. Controls are resolved before that as well, and an
     * ambiguity reported from that state would name the wrong reason.
     */
    serviceGroupsLoaded?: boolean;
    /** names a criteria for a log message, falling back to the raw function id */
    describe?: (criteria: DeviceGroupCriteriaModel) => string;
    /**
     * Collects the ambiguities that were reported, so a redraw does not log them again. Without it none
     * are reported: resolving happens on every redraw and on every change detection of a form.
     */
    reportedAmbiguities?: Set<string>;
}

/**
 * Criteria of the group that handle the same concept and aspect as the given one, ranked by how closely
 * they belong together. A motorized curtain reporting 22% is read and set by the pair found this way.
 *
 * Two functions can share a concept - a thermostat measures both the room and the target temperature -
 * which is what the ranking is for.
 */
function rankCounterparts(
    criteria: DeviceGroupCriteriaModel,
    context: StateSourceContextModel,
    wantControlling: boolean,
): { criteria: DeviceGroupCriteriaModel; rank: number[] }[] {
    const conceptId = context.conceptOf(criteria.function_id);
    if (conceptId === undefined || conceptId === '') {
        return [];
    }
    return context.criteria
        .filter(c => isControllingFunction(c.function_id) === wantControlling && c.function_id !== fpCriteriaConnectionStatus)
        .filter(c => context.conceptOf(c.function_id) === conceptId)
        .map(c => ({ criteria: c, aspect: aspectDistance(c.aspect_id, criteria.aspect_id, context.aspects) }))
        .filter(c => c.aspect !== undefined)
        .map(c => ({
            criteria: c.criteria,
            // ranked from the strongest signal to the weakest, see the doc comment
            rank: [
                c.aspect as number,
                deviceClassDistance(c.criteria.device_class_id, criteria.device_class_id),
                sharesServiceGroup(context.serviceGroups, criteria.function_id, c.criteria.function_id) ? 0 : 1,
                // ranked below the service group: a device type may well read and set one value through
                // two different content variables, and then its service groups are what pairs them up
                sharesValuePath(context.serviceGroups, criteria.function_id, c.criteria.function_id) ? 0 : 1,
                context.configured.some(cf => cf.function_id === c.criteria.function_id && cf.aspect_id === c.criteria.aspect_id) ? 0 : 1,
            ],
        }))
        .sort((a, b) => compareRanks(a.rank, b.rank));
}

/**
 * Whether a device type says the two functions belong together, rather than them merely sharing a concept.
 * Many device types say neither - a shutter reading its level from root.v and setting it through level,
 * without service groups - which is why this is only asked once more than one function could be it.
 */
function hasPositiveEvidence(criteria: DeviceGroupCriteriaModel, candidate: DeviceGroupCriteriaModel, context: StateSourceContextModel): boolean {
    return sharesServiceGroup(context.serviceGroups, criteria.function_id, candidate.function_id) ||
        sharesValuePath(context.serviceGroups, criteria.function_id, candidate.function_id);
}

/** The leading rank keys that the criteria themselves answer: the aspect and the device class */
const criteriaRankKeys = 2;

/** The candidates the criteria alone cannot choose between, because they are equally close to it */
function equallyCloseCounterparts(
    criteria: DeviceGroupCriteriaModel,
    context: StateSourceContextModel,
    wantControlling: boolean,
): { criteria: DeviceGroupCriteriaModel; rank: number[] }[] {
    const candidates = rankCounterparts(criteria, context, wantControlling);
    if (candidates.length === 0) {
        return [];
    }
    const best = candidates[0].rank.slice(0, criteriaRankKeys);
    return candidates.filter(c => compareRanks(c.rank.slice(0, criteriaRankKeys), best) === 0);
}

/**
 * The criteria of the group that belongs to the given one. While the aspect and the device class single
 * one out, that is enough. Where they do not, the device type has to point at one of the candidates: a
 * room temperature reading shares its concept with every temperature that can be set, and pairing it up
 * would offer a control that writes something else entirely.
 */
export function findCounterpart(
    criteria: DeviceGroupCriteriaModel,
    context: StateSourceContextModel,
    wantControlling: boolean,
): DeviceGroupCriteriaModel | undefined {
    const equallyClose = equallyCloseCounterparts(criteria, context, wantControlling);
    if (equallyClose.length <= 1) {
        return equallyClose[0]?.criteria;
    }
    const evidenced = equallyClose.filter(c => hasPositiveEvidence(criteria, c.criteria, context));
    if (evidenced.length === 0) {
        warnAboutAmbiguity(criteria, equallyClose, context, wantControlling, false);
        return undefined;
    }
    if (evidenced.length > 1 && compareRanks(evidenced[0].rank, evidenced[1].rank) === 0) {
        warnAboutAmbiguity(criteria, evidenced, context, wantControlling, true);
    }
    return evidenced[0].criteria;
}

/**
 * Reports an ambiguity with everything needed to fix it in the device type: which functions competed, why
 * they could not be told apart, and the service and content variable each of them is declared by.
 */
function warnAboutAmbiguity(
    criteria: DeviceGroupCriteriaModel,
    candidates: { criteria: DeviceGroupCriteriaModel; rank: number[] }[],
    context: StateSourceContextModel,
    wantControlling: boolean,
    /** whether one of them was picked, or none of them could be */
    picked: boolean,
): void {
    if (context.reportedAmbiguities === undefined || context.serviceGroupsLoaded !== true) {
        return;
    }
    // the same situation stays the same across redraws, a changed one is worth reporting again
    const key = [
        wantControlling, picked, criteria.function_id, criteria.aspect_id, criteria.device_class_id,
        ...candidates.map(c => c.criteria.function_id).sort(),
    ].join('|');
    if (context.reportedAmbiguities.has(key)) {
        return;
    }
    context.reportedAmbiguities.add(key);
    const describe = context.describe || ((c: DeviceGroupCriteriaModel) => c.function_id);
    const kind = wantControlling ? 'controlling' : 'measuring';
    const tied = candidates.filter(c => compareRanks(c.rank, candidates[0].rank) === 0);
    const missingDeviceTypes = context.serviceGroups.length === 0
        ? ' No device type could be inspected, so nothing could be checked against.'
        : '';
    console.warn(
        picked
            ? 'Floorplan: Found ' + tied.length + ' equally fitting ' + kind + ' functions for "' + describe(criteria) +
              '", using "' + describe(candidates[0].criteria) + '". They share a service group or a content variable ' +
              'with it, so neither can be ruled out - check the device type.'
            : 'Floorplan: Found ' + candidates.length + ' ' + kind + ' functions of the same concept as "' +
              describe(criteria) + '", but the device type declares none of them next to it - no shared service ' +
              'group and no shared content variable. Leaving it without a control.' + missingDeviceTypes,
        {
            for: {
                criteria,
                description: describe(criteria),
                conceptId: context.conceptOf(criteria.function_id),
                declaredBy: declarationsOf(criteria.function_id, context.serviceGroups),
            },
            // the first one is the one that got used, if any
            candidates: candidates.map(c => ({
                criteria: c.criteria,
                description: describe(c.criteria),
                tied: picked && compareRanks(c.rank, candidates[0].rank) === 0,
                declaredNextToIt: hasPositiveEvidence(criteria, c.criteria, context),
                distance: { aspect: c.rank[0], deviceClass: c.rank[1], serviceGroup: c.rank[2], valuePath: c.rank[3], displayedByPlacement: c.rank[4] },
                declaredBy: declarationsOf(c.criteria.function_id, context.serviceGroups),
            })),
            deviceTypesInspected: context.serviceGroups.length,
        },
    );
}

/** The measuring criteria reporting what a control is currently set to */
export function findStateSource(control: DeviceGroupCriteriaModel, context: StateSourceContextModel): DeviceGroupCriteriaModel | undefined {
    return findCounterpart(control, context, false);
}

/**
 * The controlling criteria a displayed measurement gives access to, so its value can act as the button
 * operating it. Functions without input have no concept to pair them up, the semantic keys name them.
 */
export function impliedControllingCriteria(
    measuring: DeviceGroupCriteriaModel,
    context: StateSourceContextModel,
    pairs: VoidTogglePair[],
): DeviceGroupCriteriaModel[] {
    if (measuring.function_id === fpCriteriaConnectionStatus) {
        return [];
    }
    const pair = pairs.find(p => p.state === measuring.function_id);
    if (pair !== undefined) {
        return context.criteria.filter(c => (c.function_id === pair.on || c.function_id === pair.off) &&
            aspectDistance(c.aspect_id, measuring.aspect_id, context.aspects) !== undefined);
    }
    const counterpart = findCounterpart(measuring, context, true);
    return counterpart === undefined ? [] : [counterpart];
}

function compareRanks(a: number[], b: number[]): number {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return a[i] - b[i];
        }
    }
    return 0;
}

/** Whether the criteria alone cannot choose, so only the device types can - and have to be loaded */
export function needsServiceGroups(criteria: DeviceGroupCriteriaModel, context: StateSourceContextModel, wantControlling: boolean): boolean {
    return equallyCloseCounterparts(criteria, context, wantControlling).length > 1;
}

export function isControllingFunction(functionId: string): boolean {
    return functionId.startsWith(controllingFunctionPrefix);
}

export function isNumericCharacteristic(characteristic?: DeviceTypeCharacteristicsModel): boolean {
    return characteristic?.type === characteristicTypeInteger || characteristic?.type === characteristicTypeFloat;
}

/** Whether the control can be operated with a single click, i.e. without asking for a value first */
export function isOneClickControl(input: FloorplanControlInput): boolean {
    return input === FloorplanControlInput.Action || input === FloorplanControlInput.Toggle || input === FloorplanControlInput.Switch;
}

/** Whether changing the input already sends the command, instead of waiting for a confirmation */
export function sendsOnChange(input: FloorplanControlInput): boolean {
    return input === FloorplanControlInput.Slider || input === FloorplanControlInput.Select ||
        input === FloorplanControlInput.Buttons || input === FloorplanControlInput.Switch;
}

/**
 * Picks the input a controlling function is operated with. Commands are sent by criteria without a
 * characteristic id, so the value goes on the wire as the base characteristic of the function's concept -
 * which is therefore what describes the input. Functions without a concept take no input at all.
 */
export function resolveControlInput(characteristic?: DeviceTypeCharacteristicsModel): FloorplanControlInput {
    if (characteristic === undefined) {
        return FloorplanControlInput.Action;
    }
    switch (characteristic.type) {
        case characteristicTypeBoolean:
            return FloorplanControlInput.Switch;
        case characteristicTypeInteger:
        case characteristicTypeFloat:
            if (hasAllowedValues(characteristic)) {
                return selectOrButtons(characteristic);
            }
            if (isClamped(characteristic)) {
                return FloorplanControlInput.Slider;
            }
            return FloorplanControlInput.Number;
        case characteristicTypeText:
            if (hasAllowedValues(characteristic)) {
                return selectOrButtons(characteristic);
            }
            return FloorplanControlInput.Text;
        case characteristicTypeStructure:
        case characteristicTypeList:
            return FloorplanControlInput.Form;
        default:
            // a characteristic without a known type still takes some value, so ask for it as text
            return FloorplanControlInput.Text;
    }
}

/** Whether the characteristic limits its value to a range a slider can cover */
export function isClamped(characteristic?: DeviceTypeCharacteristicsModel): boolean {
    return characteristic?.min_value !== undefined && characteristic?.min_value !== null &&
        characteristic?.max_value !== undefined && characteristic?.max_value !== null &&
        characteristic.max_value > characteristic.min_value;
}

function hasAllowedValues(characteristic: DeviceTypeCharacteristicsModel): boolean {
    return characteristic.allowed_values !== undefined && characteristic.allowed_values !== null && characteristic.allowed_values.length > 0;
}

function selectOrButtons(characteristic: DeviceTypeCharacteristicsModel): FloorplanControlInput {
    return (characteristic.allowed_values || []).length <= controlButtonsLimit ? FloorplanControlInput.Buttons : FloorplanControlInput.Select;
}

/** Cuts off the artifacts of binary floating point arithmetic, e.g. 3 * 0.1 */
export function roundTo(value: number, decimals: number): number {
    return Number(value.toFixed(decimals));
}

/** The step of a slider, small enough to reach every sensible value of the range without dragging forever */
export function characteristicStep(characteristic?: DeviceTypeCharacteristicsModel): number {
    if (characteristic?.type === characteristicTypeInteger) {
        return 1;
    }
    const range = (characteristic?.max_value || 0) - (characteristic?.min_value || 0);
    if (range <= 5) {
        return 0.1;
    }
    if (range <= 50) {
        return 0.5;
    }
    return 1;
}

export function controlIcon(input: FloorplanControlInput): string {
    switch (input) {
        case FloorplanControlInput.Toggle:
        case FloorplanControlInput.Switch:
            return 'mode_off_on';
        case FloorplanControlInput.Slider:
            return 'tune';
        case FloorplanControlInput.Select:
        case FloorplanControlInput.Buttons:
            return 'list';
        case FloorplanControlInput.Number:
            return 'pin';
        case FloorplanControlInput.Text:
            return 'edit';
        case FloorplanControlInput.Form:
            return 'edit_note';
        default:
            return 'play_arrow';
    }
}

/**
 * Collapses pairs of functions without input into a single toggle, so that a light selected with both
 * its set on and its set off function is operated by one switch instead of two buttons.
 */
export function mergeVoidToggles(controls: FloorplanControlModel[], pairs: VoidTogglePair[]): FloorplanControlModel[] {
    const merged: FloorplanControlModel[] = [];
    const consumed: FloorplanControlModel[] = [];
    controls.forEach(control => {
        if (consumed.indexOf(control) !== -1) {
            return;
        }
        const pair = pairs.find(p => p.on === control.criteria.function_id);
        const off = pair === undefined ? undefined : controls.find(c => c !== control &&
            c.criteria.function_id === pair.off && c.criteria.aspect_id === control.criteria.aspect_id);
        if (off === undefined) {
            merged.push(control);
            return;
        }
        consumed.push(off);
        merged.push({ ...control, offCriteria: off.criteria, input: FloorplanControlInput.Toggle, icon: controlIcon(FloorplanControlInput.Toggle) });
    });
    return merged;
}

/**
 * The commands reading the values the placements display. Controlling criteria are left out, because
 * running a command for one would execute it instead of reading anything.
 */
export function readCommands(
    placements: FloorplanWidgetCapabilityModel[],
    /** the measuring criteria the controls of each placement take their current value from */
    stateSources: DeviceGroupCriteriaModel[][] = [],
): { commands: DeviceCommandModel[]; onlineDeviceGroupIds: string[] } {
    const commands: DeviceCommandModel[] = [];
    const onlineDeviceGroupIds: string[] = [];
    placements.forEach((p, i) => {
        [...(p.tooltipCriteria || []), p.criteria, ...(stateSources[i] || [])].forEach(c => {
            if (c.function_id === fpCriteriaConnectionStatus) {
                if (onlineDeviceGroupIds.indexOf(p.deviceGroupId || '') === -1) {
                    onlineDeviceGroupIds.push(p.deviceGroupId || '');
                }
                return;
            }
            if (isControllingFunction(c.function_id)) {
                return;
            }
            const command: DeviceCommandModel = {
                group_id: p.deviceGroupId || undefined,
                function_id: c.function_id,
                aspect_id: c.aspect_id,
                device_class_id: c.device_class_id,
            };
            // the same criteria can be the value of one placement and the state of a control of another
            if (commands.some(c2 => c2.group_id === command.group_id && c2.function_id === command.function_id &&
                c2.aspect_id === command.aspect_id && c2.device_class_id === command.device_class_id)) {
                return;
            }
            commands.push(command);
        });
    });
    return { commands, onlineDeviceGroupIds };
}

/** Reduces the value a criteria reported for a whole device group to the one the control displays */
export function controlState(value: any, input: FloorplanControlInput): any {
    if (!Array.isArray(value)) {
        return value;
    }
    if (value.length === 0) {
        return undefined;
    }
    if (input === FloorplanControlInput.Toggle || input === FloorplanControlInput.Switch) {
        // the group counts as switched on only while none of its devices is off
        return value.reduce((a, b) => a && b, true);
    }
    return value[0];
}

export const dotSize = 10;

export function image(properties: FloorplanWidgetPropertiesModel): HTMLImageElement {
    const img = new Image();
    img.src = properties.floorplan?.image || '';
    return img;
}

export function draw(canvas: HTMLCanvasElement, properties: FloorplanWidgetPropertiesModel, options?: { color?: string, text?: string }[]): { centerShiftX: number; centerShiftY: number, ratio: number } {
    canvas.width = canvas.parentElement?.offsetWidth || 0;
    canvas.height = canvas.parentElement?.offsetHeight || 0;

    const ctx = canvas.getContext('2d');
    if (ctx === null) {
        return { centerShiftY: NaN, centerShiftX: NaN, ratio: NaN };
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (properties.floorplan?.image === undefined) {
        return { centerShiftY: NaN, centerShiftX: NaN, ratio: NaN };
    }

    const img = image(properties);
    const hRatio = canvas.width / img.naturalWidth;
    const vRatio = canvas.height / img.naturalHeight;

    const ratio = Math.min(hRatio, vRatio);

    const centerShiftX = (canvas.width - img.width * ratio) / 2;
    const centerShiftY = (canvas.height - img.height * ratio) / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);

    properties.floorplan?.placements.forEach((p, i) => {
        if (!isPlaced(p)) {
            return;
        }
        ctx.beginPath();
        const x = (p.position.x || 0) * img.width * ratio + centerShiftX;
        const y = (p.position.y || 0) * img.height * ratio + centerShiftY;
        ctx.arc(x, y, dotSize, 0, 2 * Math.PI);
        ctx.fillStyle = (options || [])[i]?.color || 'darkgrey';
        ctx.fill();
        if ((options || [])[i]?.text !== undefined) {
            ctx.font = '14px Arial';
            ctx.fillStyle = 'black';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillText((options || [])[i].text || '', x, y);
        }
    });

    return { centerShiftX, centerShiftY, ratio };
}


/** Migrates deprecated properties */
export function migrateColoring(properties: FloorplanWidgetPropertiesModel) {
    properties.floorplan?.placements.forEach(p => {
        if (p.coloring === undefined) {
            p.coloring = [];
        }
        if (p.colorLow && p.valueLow) {
            p.coloring.push({ value: p.valueLow, color: p.colorLow, showValue: false, showValueWhenZoomed: false, icon: p.icon || 'circle' });
            p.colorLow = null;
            p.valueLow = null;
        }
        if (p.colorHigh && p.valueHigh) {
            p.coloring.push({ value: Math.max(p.valueHigh, 100000), color: p.colorHigh, showValue: false, showValueWhenZoomed: false, icon: p.icon || 'circle' });
            p.colorHigh = null;
            p.valueHigh = null;
        }
        if (p.icon !== undefined) {
            p.coloring.forEach(c => c.icon = p.icon || 'circle');
            p.icon = undefined;
        }
    });
}

export const fpCriteriaConnectionStatus = 'fpCriteriaConnectionStatus';