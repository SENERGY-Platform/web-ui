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
 *  limitations under the License.
 */

import {HttpErrorResponse} from '@angular/common/http';
import {OperatorModel, OperatorUsage, OperatorsInUseResponse, UsageReference} from './operator.model';

function count(n: number, noun: string): string {
    return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

function listed(refs: UsageReference[] | undefined): string {
    return refs !== undefined && refs.length > 0 ? ` (${refs.map(ref => ref.name).join(', ')})` : '';
}

/** "2 flows (A, B) and 1 pipeline (X)"; the names are the ones the caller may read. */
export function describeUsage(usage: OperatorUsage): string {
    const parts: string[] = [];
    if (usage.flows > 0) {
        parts.push(count(usage.flows, 'flow') + listed(usage.readable));
    }
    if (usage.pipelines > 0) {
        parts.push(count(usage.pipelines, 'pipeline') + listed(usage.readable_pipelines));
    }
    return parts.join(' and ');
}

function body(error: HttpErrorResponse): any {
    if (typeof error.error !== 'string') {
        return error.error;
    }
    try {
        return JSON.parse(error.error);
    } catch {
        return undefined;
    }
}

/** The text for a refused delete of the given operators (one for a single delete). */
export function deleteErrorMessage(error: HttpErrorResponse, operators: OperatorModel[]): string {
    const label = (id: string | undefined) => operators.find(operator => operator._id === id)?.name ?? id ?? '';
    if (error.status === 502) {
        return 'Could not check whether the operator is in use, nothing was deleted';
    }
    if (error.status === 409) {
        const response = body(error);
        if (Array.isArray((response as OperatorsInUseResponse)?.operators)) {
            const inUse = (response as OperatorsInUseResponse).operators.map(usage => `${label(usage.id)}: ${describeUsage(usage)}`);
            return 'Operators in use, nothing was deleted: ' + inUse.join('; ');
        }
        if (typeof response?.flows === 'number' || typeof response?.pipelines === 'number') {
            return `Operator "${label(operators[0]?._id)}" is in use by ${describeUsage(response)}, it was not deleted`;
        }
        return 'Operator is in use and was not deleted';
    }
    return 'Could not delete operator';
}

/** The text for a refused delete of one version of an operator. */
export function deleteVersionErrorMessage(error: HttpErrorResponse, label: string): string {
    switch (error.status) {
        case 400:
            return typeof error.error === 'string' && error.error.trim() !== ''
                ? error.error.trim()
                : 'An operator keeps at least one version; delete the operator instead';
        case 403:
            return 'You may not delete versions of this operator';
        case 404:
            return `Version ${label} does not exist (anymore)`;
        case 409: {
            const response = body(error);
            if (typeof response?.flows === 'number' || typeof response?.pipelines === 'number') {
                return `Version ${label} is in use by ${describeUsage(response)}, it was not deleted`;
            }
            return `The operator was changed at the same time, version ${label} was not deleted. Reload and try again`;
        }
        case 502:
            return `Could not check whether version ${label} is in use, nothing was deleted`;
        default:
            return `Could not delete version ${label}`;
    }
}
