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

import { ReportObjectModel } from './reporting.model';
import {
    DynamicFormGroup,
    ReportValidationError,
    applyInputType,
    buildReportObjectForm,
    buildReportObjectsForm,
    collectValidationErrors,
    groupOf,
    joinDuration,
    queryFromForm,
    queryOptionsFromForm,
    reportObjectFromForm,
    reportObjectsFromForm,
    splitDuration,
    supportsQuery
} from './report-object-form';

const completeQuery = () => ({
    columns: [{ name: 'root.value', groupType: 'mean' }],
    deviceId: 'd1',
    serviceId: 's1',
    groupTime: '30months',
    orderColumnIndex: 1,
    orderDirection: 'asc' as const,
    time: { last: '7d' },
});

const queryObject = (query: any = completeQuery()): ReportObjectModel => ({
    name: 'consumption',
    valueType: 'float64',
    value: undefined,
    fields: undefined,
    children: undefined,
    length: undefined,
    query,
    queryOptions: {
        rollingStartDate: undefined,
        rollingEndDate: undefined,
        startOffset: undefined,
        endOffset: undefined,
        resultObject: 'key',
        resultKey: 2,
    },
});

const valueObject = (): ReportObjectModel => ({
    name: 'title',
    valueType: 'string',
    value: 'Report title',
    fields: undefined,
    children: undefined,
    length: undefined,
});

const fields = (errors: ReportValidationError[]) => errors.map((error: ReportValidationError) => error.field);

describe('report object form', () => {
    describe('building', () => {
        it('should detect the input type of the report object', () => {
            const form = buildReportObjectForm(queryObject());

            expect(form.controls['inputType'].value).toBe('query');
            expect(groupOf(form, 'query')?.enabled).toBe(true);
            expect(groupOf(form, 'deviceQuery')?.enabled).toBe(false);
        });

        it('should build a value input for plain types only', () => {
            expect(buildReportObjectForm(valueObject()).controls['value']).toBeDefined();
            expect(buildReportObjectForm({
                name: 'x', valueType: 'object', fields: {},
            } as unknown as ReportObjectModel).controls['value']).toBeUndefined();
        });

        it('should only offer query controls for the supported value types', () => {
            expect(supportsQuery(valueObject())).toBe(true);
            expect(supportsQuery({ name: 'x', valueType: 'object' } as ReportObjectModel)).toBe(false);
            expect(buildReportObjectForm({
                name: 'x', valueType: 'object', fields: {},
            } as unknown as ReportObjectModel).controls['query']).toBeUndefined();
        });

        it('should split the durations of the query into number and unit', () => {
            const query = groupOf(buildReportObjectForm(queryObject()), 'query');

            expect(query?.controls['groupingTimeNumber'].value).toBe('30');
            expect(query?.controls['groupingTimeUnit'].value).toBe('months');
            expect(query?.controls['timeframeNumber'].value).toBe('7');
            expect(query?.controls['timeframeUnit'].value).toBe('d');
        });

        it('should build nested forms for fields and children', () => {
            const object = {
                name: 'table', valueType: 'array', length: 1,
                children: { '0': queryObject() },
            } as unknown as ReportObjectModel;

            const form = buildReportObjectForm(object);

            expect(groupOf(groupOf(form, 'children'), '0')).toBeDefined();
        });
    });

    describe('validation', () => {
        it('should accept a complete query', () => {
            expect(buildReportObjectForm(queryObject()).valid).toBe(true);
        });

        it('should require device, service and path', () => {
            const form = buildReportObjectForm(queryObject({ columns: [{ name: '' }], deviceId: '', serviceId: '' }));

            expect(form.valid).toBe(false);
            expect(fields(collectValidationErrors(buildReportObjectsForm({ a: queryObject({}) }))))
                .toEqual(['Device', 'Service', 'Path']);
        });

        it('should report the message and the path of every missing input', () => {
            const objects = {
                title: valueObject(),
                table: {
                    name: 'table', valueType: 'array', length: 1,
                    children: { '0': queryObject({ columns: [{ name: 'root.value' }], deviceId: 'd1' }) },
                } as unknown as ReportObjectModel,
            };

            const errors = collectValidationErrors(buildReportObjectsForm(objects));

            expect(errors.length).toBe(1);
            expect(errors[0].path).toBe('table.0');
            expect(errors[0].field).toBe('Service');
            expect(errors[0].message).toBe('Service is required');
        });

        it('should ignore the inputs of the inactive input types', () => {
            const object = valueObject();
            const form = buildReportObjectForm(object);

            expect(groupOf(form, 'query')?.disabled).toBe(true);
            expect(form.valid).toBe(true);
            expect(collectValidationErrors(buildReportObjectsForm({ title: object }))).toEqual([]);
        });

        it('should not validate nested objects that are not set to query', () => {
            const objects = {
                group: {
                    name: 'group', valueType: 'object',
                    fields: { title: valueObject() },
                } as unknown as ReportObjectModel,
                table: {
                    name: 'table', valueType: 'array', length: 1,
                    children: { '0': valueObject() },
                } as unknown as ReportObjectModel,
            };

            const form = buildReportObjectsForm(objects);

            expect(collectValidationErrors(form)).toEqual([]);
            expect(form.valid).toBe(true);
        });

        it('should keep the input types of nested objects when the parent switches back to value', () => {
            const objects = {
                table: {
                    name: 'table', valueType: 'array', length: 2,
                    children: { '0': valueObject(), '1': queryObject() },
                } as unknown as ReportObjectModel,
            };
            const form = buildReportObjectsForm(objects);
            const table = groupOf(form, 'table')!;

            table.controls['inputType'].setValue('query');
            applyInputType(table);
            table.controls['inputType'].setValue('value');
            applyInputType(table);

            const children = groupOf(table, 'children');
            expect(groupOf(groupOf(children, '0'), 'query')?.disabled).toBe(true);
            expect(groupOf(groupOf(children, '1'), 'query')?.enabled).toBe(true);
            expect(collectValidationErrors(form)).toEqual([]);
        });

        it('should validate the query as soon as it is the selected input type', () => {
            const form = buildReportObjectForm(valueObject());

            form.controls['inputType'].setValue('query');
            applyInputType(form);

            expect(form.valid).toBe(false);
            expect(fields(collectValidationErrors(wrap(form)))).toEqual(['Device', 'Service', 'Path']);
        });
    });

    describe('applying the form to the report objects', () => {
        it('should build the query from the form', () => {
            const object = queryObject();
            const form = buildReportObjectForm(object);

            const result = reportObjectFromForm(object, form);

            expect(result.query?.deviceId).toBe('d1');
            expect(result.query?.serviceId).toBe('s1');
            expect(result.query?.columns[0].name).toBe('root.value');
            expect(result.query?.columns[0].groupType).toBe('mean');
            expect(result.query?.groupTime).toBe('30months');
            expect(result.query?.time?.last).toBe('7d');
            expect(result.query?.orderColumnIndex).toBe(1);
            expect(result.query?.orderDirection).toBe('asc');
            expect(result.queryOptions?.resultObject).toBe('key');
            expect(result.queryOptions?.resultKey).toBe(2);
        });

        it('should not change the report objects before they are applied', () => {
            const object = queryObject();
            const form = buildReportObjectForm(object);

            groupOf(form, 'query')?.controls['path'].setValue('root.other');

            expect(object.query?.columns[0].name).toBe('root.value');
            expect(reportObjectFromForm(object, form).query?.columns[0].name).toBe('root.other');
        });

        it('should convert the dates and derive the timezone offsets', () => {
            const object = queryObject({ ...completeQuery(), time: { start: '2020-01-15T10:00:00.000Z' } });

            const result = reportObjectFromForm(object, buildReportObjectForm(object));

            expect(result.query?.time?.start).toBe('2020-01-15T10:00:00.000Z');
            expect(result.queryOptions?.startOffset).toBe(new Date('2020-01-15T10:00:00.000Z').getTimezoneOffset());
            expect(result.queryOptions?.endOffset).toBeUndefined();
        });

        it('should drop the query when another input type is selected', () => {
            const object = queryObject();
            const form = buildReportObjectForm(object);

            form.controls['inputType'].setValue('devices');
            applyInputType(form);
            groupOf(form, 'deviceQuery')?.controls['last'].setValue('14d');
            const result = reportObjectFromForm(object, form);

            expect(result.query).toBeUndefined();
            expect(result.queryOptions).toBeUndefined();
            expect(result.deviceQuery).toEqual({ last: '14d' });
        });

        it('should keep the query inputs when switching the input type back', () => {
            const object = queryObject();
            const form = buildReportObjectForm(object);

            form.controls['inputType'].setValue('value');
            applyInputType(form);
            form.controls['inputType'].setValue('query');
            applyInputType(form);

            expect(reportObjectFromForm(object, form).query?.columns[0].name).toBe('root.value');
        });

        it('should keep properties that are not editable', () => {
            const object = { ...valueObject(), extra: 'keep me' } as unknown as ReportObjectModel;

            const result = reportObjectFromForm(object, buildReportObjectForm(object)) as any;

            expect(result.extra).toBe('keep me');
            expect(result.name).toBe('title');
            expect(result.valueType).toBe('string');
        });

        it('should apply nested children and count them', () => {
            const objects = {
                table: {
                    name: 'table', valueType: 'array', length: 2,
                    children: { '0': valueObject(), '1': valueObject() },
                } as unknown as ReportObjectModel,
            };
            const form = buildReportObjectsForm(objects);
            groupOf(groupOf(groupOf(form, 'table'), 'children'), '1')?.controls['value'].setValue('changed');

            const result = reportObjectsFromForm(objects, form);

            expect(result['table'].length).toBe(2);
            expect(result['table'].children?.['0'].value).toBe('Report title');
            expect(result['table'].children?.['1'].value).toBe('changed');
        });

        it('should return the objects unchanged without a form', () => {
            const object = valueObject();

            expect(reportObjectFromForm(object, undefined)).toEqual(object);
            expect(reportObjectsFromForm({ a: object }, undefined)['a'].value).toBe('Report title');
        });
    });

    describe('durations', () => {
        it('should split a duration', () => {
            expect(splitDuration('30months')).toEqual({ number: '30', unit: 'months' });
            expect(splitDuration('7d')).toEqual({ number: '7', unit: 'd' });
            expect(splitDuration('months')).toEqual({ number: '', unit: '' });
            expect(splitDuration(undefined)).toEqual({ number: '', unit: '' });
        });

        it('should join a duration', () => {
            expect(joinDuration('30', 'months')).toBe('30months');
            expect(joinDuration('', 'd')).toBeUndefined();
            expect(joinDuration(undefined, 'd')).toBeUndefined();
            expect(joinDuration('5', undefined)).toBe('5');
        });

        it('should leave out empty durations', () => {
            const object = queryObject({ ...completeQuery(), groupTime: undefined, time: {} });

            const query = queryFromForm(groupOf(buildReportObjectForm(object), 'query'));

            expect(query.groupTime).toBeUndefined();
            expect(query.time?.last).toBeUndefined();
        });

        it('should leave out empty query options', () => {
            const object = { name: 'x', valueType: 'float64', query: {} } as unknown as ReportObjectModel;

            const options = queryOptionsFromForm(groupOf(buildReportObjectForm(object), 'query'));

            expect(options.rollingStartDate).toBeUndefined();
            expect(options.resultObject).toBeUndefined();
            expect(options.resultKey).toBeUndefined();
        });
    });
});

function wrap(form: DynamicFormGroup): DynamicFormGroup {
    return buildReportObjectsFormOf('title', form);
}

function buildReportObjectsFormOf(key: string, form: DynamicFormGroup): DynamicFormGroup {
    const objects = buildReportObjectsForm({});
    objects.addControl(key, form);
    return objects;
}
