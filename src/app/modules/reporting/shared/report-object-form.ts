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

import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { ReportObjectModel, ReportObjectModelQueryOptions } from './reporting.model';
import {
    QueriesRequestTimeModel,
    QueriesRequestV2ElementTimescaleModel
} from '../../../widgets/shared/export-data.model';

/** Form group with a dynamic set of controls, as needed for the recursive structure of a report. */
export type DynamicFormGroup = FormGroup<{ [key: string]: AbstractControl }>;

export type InputType = 'value' | 'query' | 'devices';

export interface ReportValidationError {
    /** Dot separated keys of the report object the error belongs to, e.g. 'table.0.consumption'. */
    path: string;
    field: string;
    message: string;
}

/**
 * Labels of the editable fields, used for the error messages. A field without an entry falls back to its control name.
 */
export const FIELD_LABELS: { [key: string]: string } = {
    value: 'Value',
    device: 'Device',
    service: 'Service',
    path: 'Path',
    groupType: 'Field Group Type',
    orderColumnIndex: 'Sorting Index',
    orderDirection: 'Sorting',
    resultObject: 'ResultObject',
    resultKey: 'ResultKey',
    groupingTimeNumber: 'Grouping Time',
    groupingTimeUnit: 'Grouping Time Unit',
    timeframeNumber: 'Time Frame',
    timeframeUnit: 'Time Frame Unit',
    start: 'Start Date',
    rollingStartDate: 'Rolling Start Date',
    end: 'End Date',
    rollingEndDate: 'Rolling End Date',
    last: 'Last Days',
};

const VALUE_INPUT_TYPES = ['string', 'float64'];
const QUERY_VALUE_TYPES = ['string', 'float64', 'array'];

/**
 * Whether the report object can be filled by a query or by devices instead of a plain value.
 */
export function supportsQuery(object: ReportObjectModel): boolean {
    return QUERY_VALUE_TYPES.indexOf(object.valueType) !== -1
        || object.query !== undefined
        || object.deviceQuery !== undefined;
}

export function inputTypeOf(object: ReportObjectModel): InputType {
    if (object.deviceQuery !== undefined) {
        return 'devices';
    }
    if (object.query !== undefined) {
        return 'query';
    }
    return 'value';
}

export function buildReportObjectsForm(objects: { [key: string]: ReportObjectModel } | undefined): DynamicFormGroup {
    const controls: { [key: string]: AbstractControl } = {};
    Object.entries(objects || {}).forEach(([key, object]: [string, ReportObjectModel]) => {
        controls[key] = buildReportObjectForm(object);
    });
    return dynamicGroup(controls);
}

/**
 * Builds the form of a single report object. The controls of all input types are built at once and the ones of the
 * inactive input types are disabled, so that switching the input type neither loses inputs nor influences the
 * validity of the form.
 */
export function buildReportObjectForm(object: ReportObjectModel): DynamicFormGroup {
    const controls: { [key: string]: AbstractControl } = {
        inputType: new FormControl<InputType>(inputTypeOf(object), { nonNullable: true }),
    };
    if (VALUE_INPUT_TYPES.indexOf(object.valueType) !== -1) {
        controls['value'] = new FormControl<any>(object.value ?? null);
    }
    if (supportsQuery(object)) {
        controls['query'] = buildQueryForm(object);
        controls['deviceQuery'] = buildDeviceQueryForm(object);
    }
    if (object.fields !== undefined) {
        controls['fields'] = buildReportObjectsForm(object.fields);
    }
    if (object.children !== undefined) {
        controls['children'] = buildReportObjectsForm(object.children);
    }
    const form = dynamicGroup(controls);
    applyInputType(form);
    return form;
}

export function buildQueryForm(object: ReportObjectModel): DynamicFormGroup {
    const query = object.query;
    const options = object.queryOptions;
    const groupingTime = splitDuration(query?.groupTime);
    const timeframe = splitDuration(query?.time?.last);
    return dynamicGroup({
        device: new FormControl<string | null>(emptyToNull(query?.deviceId), Validators.required),
        service: new FormControl<string | null>(emptyToNull(query?.serviceId), Validators.required),
        path: new FormControl<string | null>(emptyToNull(query?.columns?.[0]?.name), Validators.required),
        groupType: new FormControl<string | null>(query?.columns?.[0]?.groupType ?? null),
        orderColumnIndex: new FormControl<number | null>(query?.orderColumnIndex ?? null),
        orderDirection: new FormControl<string | null>(query?.orderDirection ?? null),
        resultObject: new FormControl<string | null>(options?.resultObject ?? null),
        resultKey: new FormControl<number | null>(options?.resultKey ?? null),
        groupingTimeNumber: new FormControl<string>(groupingTime.number, { nonNullable: true }),
        groupingTimeUnit: new FormControl<string>(groupingTime.unit, { nonNullable: true }),
        timeframeNumber: new FormControl<string>(timeframe.number, { nonNullable: true }),
        timeframeUnit: new FormControl<string>(timeframe.unit, { nonNullable: true }),
        start: new FormControl<Date | string | null>(query?.time?.start ?? null),
        rollingStartDate: new FormControl<string | null>(options?.rollingStartDate ?? null),
        end: new FormControl<Date | string | null>(query?.time?.end ?? null),
        rollingEndDate: new FormControl<string | null>(options?.rollingEndDate ?? null),
    });
}

export function buildDeviceQueryForm(object: ReportObjectModel): DynamicFormGroup {
    return dynamicGroup({
        last: new FormControl<string | null>(object.deviceQuery?.last ?? null),
    });
}

/**
 * Enables the controls of the selected input type and disables the others.
 */
export function applyInputType(form: DynamicFormGroup) {
    const inputType = inputTypeValue(form);
    setEnabled(form.controls['query'], inputType === 'query');
    setEnabled(form.controls['deviceQuery'], inputType === 'devices');
    setEnabled(form.controls['value'], inputType === 'value');
    setNestedEnabled(groupOf(form, 'fields'), inputType === 'value');
    setNestedEnabled(groupOf(form, 'children'), inputType === 'value');
}

/**
 * Enabling a form group enables all of its descendants, which would also enable the controls of the inactive input
 * types of the nested report objects. Their input type therefore has to be applied again.
 */
function setNestedEnabled(objects: DynamicFormGroup | undefined, enabled: boolean) {
    if (objects === undefined) {
        return;
    }
    setEnabled(objects, enabled);
    if (!enabled) {
        return;
    }
    Object.keys(objects.controls).forEach((key: string) => {
        const object = groupOf(objects, key);
        if (object !== undefined) {
            applyInputType(object);
        }
    });
}

export function inputTypeValue(form: DynamicFormGroup): InputType {
    return form.controls['inputType']?.value as InputType;
}

export function groupOf(form: DynamicFormGroup | undefined, name: string): DynamicFormGroup | undefined {
    const control = form?.controls[name];
    return control instanceof FormGroup ? control as DynamicFormGroup : undefined;
}

/**
 * Applies the form values to a copy of the given report objects. The objects are only written when the report is
 * saved, so that neither the form nor a query preview changes the stored report.
 */
export function reportObjectsFromForm(
    objects: { [key: string]: ReportObjectModel } | undefined,
    form: DynamicFormGroup | undefined
): { [key: string]: ReportObjectModel } {
    const result: { [key: string]: ReportObjectModel } = {};
    Object.entries(objects || {}).forEach(([key, object]: [string, ReportObjectModel]) => {
        result[key] = reportObjectFromForm(object, groupOf(form, key));
    });
    return result;
}

export function reportObjectFromForm(
    object: ReportObjectModel,
    form: DynamicFormGroup | undefined
): ReportObjectModel {
    const result: ReportObjectModel = { ...object };
    if (form === undefined) {
        return result;
    }
    delete result.query;
    delete result.queryOptions;
    delete result.deviceQuery;
    switch (inputTypeValue(form)) {
    case 'query':
        clearValueFields(result);
        result.query = queryFromForm(groupOf(form, 'query'));
        result.queryOptions = queryOptionsFromForm(groupOf(form, 'query'));
        break;
    case 'devices':
        clearValueFields(result);
        result.deviceQuery = { last: emptyToUndefined(form.get('deviceQuery.last')?.value) };
        break;
    default:
        if (form.controls['value'] !== undefined) {
            result.value = form.controls['value'].value;
        }
        if (object.fields !== undefined) {
            result.fields = reportObjectsFromForm(object.fields, groupOf(form, 'fields'));
        }
        if (object.children !== undefined) {
            result.children = reportObjectsFromForm(object.children, groupOf(form, 'children'));
            result.length = Object.keys(result.children).length;
        }
    }
    return result;
}

export function queryFromForm(form: DynamicFormGroup | undefined): QueriesRequestV2ElementTimescaleModel {
    const value = form?.getRawValue() as { [key: string]: any } || {};
    const time: QueriesRequestTimeModel = {};
    const last = joinDuration(value['timeframeNumber'], value['timeframeUnit']);
    if (last !== undefined) {
        time.last = last;
    }
    const start = toIsoString(value['start']);
    if (start !== undefined) {
        time.start = start;
    }
    const end = toIsoString(value['end']);
    if (end !== undefined) {
        time.end = end;
    }
    const query: QueriesRequestV2ElementTimescaleModel = {
        columns: [{
            name: emptyToUndefined(value['path']),
            groupType: emptyToUndefined(value['groupType']),
        }],
        deviceId: value['device'] || '',
        serviceId: value['service'] || '',
        groupTime: joinDuration(value['groupingTimeNumber'], value['groupingTimeUnit']),
        time,
    };
    if (value['orderColumnIndex'] !== null && value['orderColumnIndex'] !== undefined) {
        query.orderColumnIndex = value['orderColumnIndex'];
    }
    if (value['orderDirection'] === 'asc' || value['orderDirection'] === 'desc') {
        query.orderDirection = value['orderDirection'];
    }
    return query;
}

export function queryOptionsFromForm(form: DynamicFormGroup | undefined): ReportObjectModelQueryOptions {
    const value = form?.getRawValue() as { [key: string]: any } || {};
    return {
        rollingStartDate: emptyToUndefined(value['rollingStartDate']),
        rollingEndDate: emptyToUndefined(value['rollingEndDate']),
        startOffset: timezoneOffsetOf(value['start']),
        endOffset: timezoneOffsetOf(value['end']),
        resultObject: emptyToUndefined(value['resultObject']),
        resultKey: value['resultKey'] ?? undefined,
    };
}

/**
 * Collects the errors of all report objects of the given form. Disabled controls - the ones of the inactive input
 * types - are never invalid and therefore never reported.
 */
export function collectValidationErrors(
    objectsForm: DynamicFormGroup | undefined,
    parentPath = ''
): ReportValidationError[] {
    return Object.keys(objectsForm?.controls || {}).flatMap((key: string) => {
        const path = parentPath === '' ? key : parentPath + '.' + key;
        return collectObjectErrors(groupOf(objectsForm, key), path);
    });
}

export function collectObjectErrors(
    form: DynamicFormGroup | undefined,
    path: string
): ReportValidationError[] {
    if (form === undefined) {
        return [];
    }
    return errorsOfControl(form.controls['value'], 'value', path)
        .concat(errorsOfGroup(groupOf(form, 'query'), path))
        .concat(errorsOfGroup(groupOf(form, 'deviceQuery'), path))
        .concat(collectValidationErrors(groupOf(form, 'fields'), path))
        .concat(collectValidationErrors(groupOf(form, 'children'), path));
}

export function splitDuration(value: string | undefined): { number: string; unit: string } {
    const match = /^(\d+)(.*)$/.exec(value || '');
    if (match === null) {
        return { number: '', unit: '' };
    }
    return { number: match[1], unit: match[2] };
}

export function joinDuration(amount: string | undefined, unit: string | undefined): string | undefined {
    if (amount === undefined || amount === null || amount.toString().trim() === '') {
        return undefined;
    }
    return amount.toString().trim() + (unit || '');
}

function errorsOfGroup(form: DynamicFormGroup | undefined, path: string): ReportValidationError[] {
    return Object.keys(form?.controls || {}).flatMap((name: string) =>
        errorsOfControl(form?.controls[name], name, path)
    );
}

function errorsOfControl(
    control: AbstractControl | undefined,
    name: string,
    path: string
): ReportValidationError[] {
    if (control === undefined || !control.invalid) {
        return [];
    }
    const field = FIELD_LABELS[name] || name;
    return [{ path, field, message: messageOf(field, control.errors) }];
}

/**
 * Message for the first error of a control. New validators only need an entry here if their default message is not
 * good enough.
 */
function messageOf(field: string, errors: { [key: string]: any } | null): string {
    if (errors === null) {
        return field + ' is invalid';
    }
    if (errors['required'] !== undefined) {
        return field + ' is required';
    }
    if (errors['min'] !== undefined) {
        return field + ' must be at least ' + errors['min'].min;
    }
    if (errors['max'] !== undefined) {
        return field + ' must be at most ' + errors['max'].max;
    }
    if (errors['minlength'] !== undefined) {
        return field + ' needs at least ' + errors['minlength'].requiredLength + ' characters';
    }
    if (errors['maxlength'] !== undefined) {
        return field + ' is limited to ' + errors['maxlength'].requiredLength + ' characters';
    }
    if (errors['email'] !== undefined) {
        return field + ' is no valid e-mail address';
    }
    if (errors['pattern'] !== undefined) {
        return field + ' has an invalid format';
    }
    return field + ' is invalid';
}

function clearValueFields(object: ReportObjectModel) {
    delete object.value;
    delete object.fields;
    delete object.children;
    delete object.length;
}

function setEnabled(control: AbstractControl | undefined, enabled: boolean) {
    if (control === undefined) {
        return;
    }
    if (enabled) {
        control.enable({ emitEvent: false });
    } else {
        control.disable({ emitEvent: false });
    }
}

function dynamicGroup(controls: { [key: string]: AbstractControl }): DynamicFormGroup {
    return new FormGroup<{ [key: string]: AbstractControl }>(controls);
}

function emptyToNull(value: string | undefined): string | null {
    return value === undefined || value === null || value === '' ? null : value;
}

function emptyToUndefined(value: any): any {
    return value === null || value === '' ? undefined : value;
}

function toIsoString(value: Date | string | null | undefined): string | undefined {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date.toISOString();
}

function timezoneOffsetOf(value: Date | string | null | undefined): number | undefined {
    if (value === null || value === undefined || value === '') {
        return undefined;
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date.getTimezoneOffset();
}
