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
import { buildReportObjectsForm, collectValidationErrors, groupOf } from './report-object-form';
import {
    ReportObjectNode,
    buildReportObjectNodes,
    copyReportObjectItem,
    errorCountsByPath,
    findNode,
    flattenNodes,
    isContainer,
    removeReportObjectItem
} from './report-object-node';

const queryObject = (deviceId = 'd1', serviceId = 's1', path = 'root.value'): ReportObjectModel => ({
    name: 'consumption', valueType: 'float64',
    query: { columns: [{ name: path }], deviceId, serviceId },
} as ReportObjectModel);

const objects = (): { [key: string]: ReportObjectModel } => ({
    title: { name: 'title', valueType: 'string', value: 'a' } as ReportObjectModel,
    group: {
        name: 'group', valueType: 'object',
        fields: { inner: queryObject() },
    } as unknown as ReportObjectModel,
    table: {
        name: 'table', valueType: 'array', length: 2,
        children: { '0': queryObject(), '1': queryObject('d1', 's1', 'root.time') },
    } as unknown as ReportObjectModel,
});

const build = (data = objects()) => {
    const form = buildReportObjectsForm(data);
    return { data, form, nodes: buildReportObjectNodes(data, form) };
};

describe('report object nodes', () => {
    it('should build a node per report object with its path and form', () => {
        const { nodes } = build();

        expect(nodes.map((node: ReportObjectNode) => node.path)).toEqual(['title', 'group', 'table']);
        expect(flattenNodes(nodes).map((node: ReportObjectNode) => node.path))
            .toEqual(['title', 'group', 'group.inner', 'table', 'table.0', 'table.1']);
        expect(findNode(nodes, 'table.1')?.form.get('query.path')?.value).toBe('root.time');
    });

    it('should mark containers and array items', () => {
        const { nodes } = build();

        expect(isContainer(findNode(nodes, 'group')!)).toBe(true);
        expect(isContainer(findNode(nodes, 'table')!)).toBe(true);
        expect(isContainer(findNode(nodes, 'title')!)).toBe(false);
        expect(findNode(nodes, 'table.0')!.item).toBe(true);
        expect(findNode(nodes, 'group.inner')!.item).toBe(false);
        expect(findNode(nodes, 'title')!.item).toBe(false);
    });

    it('should count the errors of an object including its nested objects', () => {
        const data = objects();
        (data['table'].children!['0'].query as any).serviceId = '';
        const { form } = build(data);

        const counts = errorCountsByPath(collectValidationErrors(form));

        expect(counts.get('table.0')).toBe(1);
        expect(counts.get('table')).toBe(1);
        expect(counts.get('group')).toBeUndefined();
    });

    describe('array items', () => {
        it('should copy an item with its current inputs', () => {
            const { data, nodes } = build();
            const item = findNode(nodes, 'table.0')!;
            item.form.get('query.path')?.setValue('root.changed');

            const path = copyReportObjectItem(item);

            expect(path).toBe('table.2');
            expect(Object.keys(data['table'].children!)).toEqual(['0', '1', '2']);
            expect(data['table'].length).toBe(3);
            const children = groupOf(findNode(nodes, 'table')!.form, 'children');
            expect(groupOf(children, '2')?.get('query.path')?.value).toBe('root.changed');
        });

        it('should remove an item from the form and the report objects', () => {
            const { data, nodes } = build();

            expect(removeReportObjectItem(findNode(nodes, 'table.0')!)).toBe(true);

            expect(Object.keys(data['table'].children!)).toEqual(['1']);
            expect(data['table'].length).toBe(1);
            expect(groupOf(groupOf(findNode(nodes, 'table')!.form, 'children'), '0')).toBeUndefined();
        });

        it('should not touch objects that are no array item', () => {
            const { nodes } = build();

            expect(copyReportObjectItem(findNode(nodes, 'title')!)).toBeUndefined();
            expect(removeReportObjectItem(findNode(nodes, 'title')!)).toBe(false);
        });
    });
});
