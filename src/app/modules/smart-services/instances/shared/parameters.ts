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

import { SmartServiceExtendedParameterModel, SmartServiceParameterOptionModel } from '../../releases/shared/release.model';
import { SmartServiceParameterModel } from './instances.model';

/**
 * The value types a release parameter can ask for. These are the same schema.org uris the
 * characteristics use, but a parameter carrying a characteristic is rendered by the characteristic
 * itself, so the two sets never have to agree.
 */
export const parameterTypeText = 'https://schema.org/Text';
export const parameterTypeInteger = 'https://schema.org/Integer';
export const parameterTypeFloat = 'https://schema.org/Float';
export const parameterTypeBoolean = 'https://schema.org/Boolean';

/** The input a parameter is collected with */
export enum ParameterInput {
    /** pick one of the resolved options, e.g. one device */
    Select = 'select',
    /** pick any number of the resolved options */
    MultiSelect = 'multi-select',
    /** the parameter names a characteristic and is collected in its shape */
    Characteristic = 'characteristic',
    Text = 'text',
    Number = 'number',
    Boolean = 'boolean',
}

/**
 * Options win over a characteristic: the designer only offers the characteristic while a parameter has
 * no iot selectors, so a parameter with both is not something it can produce, and dropping resolved
 * options would lose the device selection the release asked for.
 *
 * A boolean is the exception. A design may name its two states - enabled and disabled, say - but a
 * toggle says the same thing in one click, so on a boolean the option labels only survive as the
 * value_label.
 */
export function parameterInput(param: SmartServiceExtendedParameterModel): ParameterInput {
    const hasOptions = (param.options || []).length > 0;
    if (param.type === parameterTypeBoolean) {
        return param.multiple && hasOptions ? ParameterInput.MultiSelect : ParameterInput.Boolean;
    }
    if (hasOptions) {
        return param.multiple ? ParameterInput.MultiSelect : ParameterInput.Select;
    }
    if (param.characteristic) {
        return ParameterInput.Characteristic;
    }
    switch (param.type) {
        case parameterTypeInteger:
        case parameterTypeFloat:
            return ParameterInput.Number;
        default:
            return ParameterInput.Text;
    }
}

/** A free input of `type` the user fills in themselves, as opposed to picking from options */
export function isFreeInput(param: SmartServiceExtendedParameterModel): boolean {
    const input = parameterInput(param);
    return input === ParameterInput.Text || input === ParameterInput.Number || input === ParameterInput.Boolean;
}

/** A free input asking for several values, so it is collected as a list the user adds rows to */
export function isFreeInputList(param: SmartServiceExtendedParameterModel): boolean {
    return param.multiple && isFreeInput(param);
}

/**
 * Fills the parameters of a release with the values to start out with. `/releases/{id}/parameters`
 * always reports a null value, so the values of an instance being edited or upgraded have to be
 * merged back in here.
 *
 * Reports which parameters found no value to carry over. On an upgrade that is what decides whether
 * the user has to be asked at all: a release that only added a parameter needs a form, one that
 * changed nothing the user fills in can be switched over silently.
 */
export function initParameterValues(
    params: SmartServiceExtendedParameterModel[],
    existing?: SmartServiceParameterModel[] | null,
): { parameters: SmartServiceExtendedParameterModel[]; unfilled: string[] } {
    const unfilled: string[] = [];
    const parameters = params.map((param) => {
        const previous = (existing || []).find((e) => e.id === param.id);
        if (existing !== undefined && previous === undefined) {
            unfilled.push(param.id);
        }
        const merged: SmartServiceExtendedParameterModel = {
            ...param,
            value: previous !== undefined ? previous.value : param.value,
            value_label: previous !== undefined ? previous.value_label : param.value_label,
        };
        merged.value = initialValue(merged);
        return merged;
    });
    return { parameters, unfilled };
}

/**
 * The value an input starts on. A single mandatory option is not a choice, so it is taken rather than
 * left for the user to confirm.
 */
export function initialValue(param: SmartServiceExtendedParameterModel): any {
    if (param.value !== undefined && param.value !== null) {
        return asNumberIfNumeric(param, param.value);
    }
    if (param.default_value !== undefined && param.default_value !== null) {
        return asNumberIfNumeric(param, param.default_value);
    }
    const options = param.options || [];
    if (!param.optional && !param.multiple && options.length === 1) {
        return options[0].value;
    }
    if (isFreeInputList(param)) {
        return [];
    }
    // A toggle has no unset position: left at null it would read as off while still blocking the
    // submit, so a boolean starts on the off it already shows.
    if (parameterInput(param) === ParameterInput.Boolean) {
        return false;
    }
    return null;
}

/**
 * The options of a parameter that currently apply. An option can require that another parameter is
 * set to the same entity - a service of the device picked further up, say - and is hidden while that
 * is not the case.
 */
export function visibleOptions(
    param: SmartServiceExtendedParameterModel,
    all: SmartServiceExtendedParameterModel[],
): SmartServiceParameterOptionModel[] {
    return (param.options || []).filter((option) => {
        if (!option.needs_same_entity_id_in_parameter) {
            return true;
        }
        const other = all.find((p) => p.id === option.needs_same_entity_id_in_parameter);
        if (other === undefined) {
            return false;
        }
        return selectedEntityIds(other).includes(option.entity_id);
    });
}

/** The entities the parameter is currently set to, one for a single select and any number for a multi select */
function selectedEntityIds(param: SmartServiceExtendedParameterModel): string[] {
    const selected = param.value === undefined || param.value === null ? [] : asArray(param.value);
    return (param.options || [])
        .filter((option) => selected.some((value) => sameValue(value, option.value)))
        .map((option) => option.entity_id);
}

/**
 * Drops values that no longer point at a visible option. Selecting a different device further up can
 * invalidate what was picked below, and so can editing an instance whose device has since been
 * deleted - sending a value the release can no longer resolve is worse than asking the user again.
 *
 * Clearing one value can invalidate the next, and nothing says a parameter is ordered after the one
 * it depends on, so this sweeps until nothing changes. A chain is at most as long as the list.
 */
export function pruneInvalidValues(params: SmartServiceExtendedParameterModel[]): void {
    for (let pass = 0; pass <= params.length; pass++) {
        if (!prunePass(params)) {
            return;
        }
    }
}

/** Returns whether anything was dropped */
function prunePass(params: SmartServiceExtendedParameterModel[]): boolean {
    let changed = false;
    params.forEach((param) => {
        if ((param.options || []).length === 0 || param.value === undefined || param.value === null) {
            return;
        }
        const allowed = visibleOptions(param, params);
        if (param.multiple) {
            const kept = asArray(param.value).filter((value) => allowed.some((option) => sameValue(value, option.value)));
            if (kept.length !== asArray(param.value).length) {
                param.value = kept;
                changed = true;
            }
            return;
        }
        if (!allowed.some((option) => sameValue(param.value, option.value))) {
            param.value = null;
            changed = true;
        }
    });
    return changed;
}

/** Whether the parameter may be submitted as it stands */
export function parameterSatisfied(param: SmartServiceExtendedParameterModel): boolean {
    if (param.has_no_valid_option) {
        return false;
    }
    if (isEmpty(param.value)) {
        return param.optional;
    }
    if (param.multiple) {
        const entries = asArray(param.value);
        // being optional excuses an empty list, but not a row the user opened and left blank
        return entries.length === 0 ? param.optional : entries.every((entry) => entrySatisfied(param, entry));
    }
    return entrySatisfied(param, param.value);
}

function entrySatisfied(param: SmartServiceExtendedParameterModel, value: any): boolean {
    if (isEmpty(value)) {
        return false;
    }
    // only a free input is typed into, an option value and a characteristic value are shaped by their source
    if (param.type === parameterTypeInteger && isFreeInput(param)) {
        return typeof value === 'number' && Number.isInteger(value);
    }
    return true;
}

/**
 * A number parameter whose value arrives as a numeric string becomes a number again. The api stores a
 * parameter value untyped, so a producer can put "42" where a design expects 42; carrying that string
 * into the form would show the value but refuse to submit it.
 */
function asNumberIfNumeric(param: SmartServiceExtendedParameterModel, value: any): any {
    if (typeof value !== 'string' || value.trim() === '' || !isFreeInput(param)) {
        return value;
    }
    if (param.type !== parameterTypeInteger && param.type !== parameterTypeFloat) {
        return value;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
}

/** false and 0 are values a parameter is allowed to have, an empty text is not */
function isEmpty(value: any): boolean {
    return value === undefined || value === null || value === '';
}

export function parametersSatisfied(params: SmartServiceExtendedParameterModel[]): boolean {
    return params.every(parameterSatisfied);
}

/**
 * Reduces the parameter to what the api stores on the instance. The value of an option is opaque -
 * for devices and groups it is a json encoded selection - so the labels of the picked options are
 * sent along as the value_label, which is what the instance list and the mobile app display.
 */
export function toSmartServiceParameter(param: SmartServiceExtendedParameterModel): SmartServiceParameterModel {
    const result: SmartServiceParameterModel = {
        id: param.id,
        value: param.value,
        label: param.label,
    };
    const label = valueLabel(param);
    if (label !== undefined) {
        result.value_label = label;
    }
    return result;
}

export function toSmartServiceParameters(params: SmartServiceExtendedParameterModel[]): SmartServiceParameterModel[] {
    return params.map(toSmartServiceParameter);
}

/** The labels of the picked options, or nothing for a value the user typed in themselves */
export function valueLabel(param: SmartServiceExtendedParameterModel): string | undefined {
    const options = param.options || [];
    if (options.length === 0 || param.value === undefined || param.value === null) {
        return undefined;
    }
    const labels = asArray(param.value)
        .map((value) => options.find((option) => sameValue(value, option.value))?.label)
        .filter((label): label is string => label !== undefined);
    return labels.length === 0 ? undefined : labels.join(', ');
}

function asArray(value: any): any[] {
    return Array.isArray(value) ? value : [value];
}

/**
 * Option values are opaque. Primitives compare directly; a device selection arrives as a json string
 * and so compares directly as well, but an option built from an enum in the design can be an object,
 * and two of those are the same value without being the same reference.
 */
function sameValue(a: any, b: any): boolean {
    if (a === b) {
        return true;
    }
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
        return false;
    }
    return JSON.stringify(a) === JSON.stringify(b);
}
