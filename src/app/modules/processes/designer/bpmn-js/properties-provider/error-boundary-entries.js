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

import { textEntry } from './senergy-entries';
import { isErrorBoundary, isOnServiceTask, readErrorVariable, writeErrorVariable } from '../model/error-boundary';

/*
 * Entries of the panel's "Error" group the automation-engine rejects on an error boundary event:
 * it catches every error of the task, without error references or codes (BPMN-19).
 */
const UNSUPPORTED_ERROR_ENTRIES = ['errorRef', 'errorName', 'errorCode', 'errorMessage', 'errorCodeVariable'];

function variableEntry(bpmnjs, id, label, local, description) {
    return textEntry(id, label,
        (element) => readErrorVariable(element, local),
        (modeling, element, value) => writeErrorVariable(modeling, bpmnjs.get('moddle'), element, local, value),
        description);
}

/**
 * The "Error" group of an error boundary event, for both designers: only camunda:errorMessageVariable
 * of the panel's entries, and for a boundary event on a service task the instance variables that get
 * device_id and service_id of a failed device command. Other elements keep their groups.
 */
export function adaptErrorGroup(element, groups, bpmnjs) {
    if (!groups || !isErrorBoundary(element)) {
        return groups;
    }
    var group = groups.find(function (g) {
        return g.id === 'error';
    });
    if (!group) {
        group = { id: 'error', label: 'Error', entries: [] };
        groups.push(group);
    }
    group.entries = group.entries.filter(function (entry) {
        return UNSUPPORTED_ERROR_ENTRIES.indexOf(entry.id) === -1;
    });
    if (isOnServiceTask(element)) {
        group.entries.push(
            variableEntry(bpmnjs, 'error-device-id-variable', 'Device ID variable', 'device_id',
                'Instance variable that gets the device of a failed device command; null if no single device failed.'),
            variableEntry(bpmnjs, 'error-service-id-variable', 'Service ID variable', 'service_id',
                'Instance variable that gets the service of a failed device command; null if no single device failed.'),
        );
    }
    group.shouldOpen = true;
    return groups;
}
