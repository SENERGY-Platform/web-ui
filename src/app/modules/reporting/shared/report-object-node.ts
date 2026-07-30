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
    InputType,
    ReportValidationError,
    buildReportObjectForm,
    groupOf,
    inputTypeValue,
    reportObjectFromForm
} from './report-object-form';

/**
 * A report object together with its form, as shown in the tree of the report editor.
 */
export interface ReportObjectNode {
    key: string;
    /** Dot separated keys up to this object, e.g. 'table.0.consumption'. */
    path: string;
    data: ReportObjectModel;
    form: DynamicFormGroup;
    /** Nested fields or array items. */
    children: ReportObjectNode[];
    /** Container of this object, undefined for the top level. */
    parent?: ReportObjectNode;
    /** Whether this object is an item of an array and can therefore be copied and removed. */
    item: boolean;
}

export function buildReportObjectNodes(
    objects: { [key: string]: ReportObjectModel } | undefined,
    form: DynamicFormGroup | undefined,
    parent?: ReportObjectNode
): ReportObjectNode[] {
    const nodes: ReportObjectNode[] = [];
    Object.entries(objects || {}).forEach(([key, data]: [string, ReportObjectModel]) => {
        const objectForm = groupOf(form, key);
        if (objectForm === undefined) {
            return;
        }
        const node: ReportObjectNode = {
            key,
            path: parent === undefined ? key : parent.path + '.' + key,
            data,
            form: objectForm,
            children: [],
            parent,
            item: parent?.data.children !== undefined,
        };
        const nested = data.fields !== undefined ? 'fields' : 'children';
        node.children = buildReportObjectNodes(data.fields || data.children, groupOf(objectForm, nested), node);
        nodes.push(node);
    });
    return nodes;
}

export function isContainer(node: ReportObjectNode): boolean {
    return node.data.fields !== undefined || node.data.children !== undefined;
}

export function inputTypeOfNode(node: ReportObjectNode): InputType {
    return inputTypeValue(node.form);
}

export function flattenNodes(nodes: ReportObjectNode[]): ReportObjectNode[] {
    return nodes.flatMap((node: ReportObjectNode) => [node].concat(flattenNodes(node.children)));
}

export function findNode(nodes: ReportObjectNode[], path: string): ReportObjectNode | undefined {
    return flattenNodes(nodes).find((node: ReportObjectNode) => node.path === path);
}

/**
 * Number of validation errors per object, including the ones of its nested objects.
 */
export function errorCountsByPath(errors: ReportValidationError[]): Map<string, number> {
    const counts = new Map<string, number>();
    errors.forEach((error: ReportValidationError) => {
        const keys = error.path.split('.');
        for (let i = 1; i <= keys.length; i++) {
            const path = keys.slice(0, i).join('.');
            counts.set(path, (counts.get(path) || 0) + 1);
        }
    });
    return counts;
}

/**
 * Adds a copy of the given array item to its array. Returns the path of the copy.
 */
export function copyReportObjectItem(node: ReportObjectNode): string | undefined {
    const parent = node.parent;
    const children = groupOf(parent?.form, 'children');
    if (parent === undefined || parent.data.children === undefined || children === undefined) {
        return undefined;
    }
    const copy = reportObjectFromForm(node.data, node.form);
    const keys = Object.keys(parent.data.children).map(Number).filter((key: number) => !isNaN(key));
    const nextKey = (keys.length === 0 ? 0 : Math.max(...keys) + 1).toString();
    parent.data.children[nextKey] = copy;
    parent.data.length = Object.keys(parent.data.children).length;
    children.addControl(nextKey, buildReportObjectForm(copy));
    return parent.path + '.' + nextKey;
}

export function removeReportObjectItem(node: ReportObjectNode): boolean {
    const parent = node.parent;
    const children = groupOf(parent?.form, 'children');
    if (parent === undefined || parent.data.children === undefined || children === undefined) {
        return false;
    }
    children.removeControl(node.key);
    delete parent.data.children[node.key];
    parent.data.length = Object.keys(parent.data.children).length;
    return true;
}
