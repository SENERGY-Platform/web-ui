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

/*
 * Waiting for the completion of a module task (process_deployment, device_repository).
 *
 * The task stores its output done_event (e.g. deployment_done_<id>) in the variable
 * <taskId>_done_event. A message catch event waits for it by senergy:messageName, a JavaScript
 * expression for the message name, here just that variable. The engine queues the message for the
 * instance, so it arrives even if the task completed before the event waits.
 *
 * Designs of the Camunda time name the message ${<taskId>_done_event} through a bpmn:Message;
 * the engine converts them at deploy, and they are still recognized here.
 */

export const MESSAGE_NAME_ATTRIBUTE = 'senergy:messageName';

/** the variable the output done_event of a task is stored in, and the message name expression */
export function doneEventVariable(taskId: string): string {
    return taskId + '_done_event';
}

interface ModdleObject {
    $type?: string;
    $attrs?: Record<string, unknown>;
    eventDefinitions?: { $type?: string; messageRef?: { name?: string } }[];
    get?: (name: string) => unknown;
}

/** the senergy:messageName of a business object, undefined if it has none */
export function messageNameExpression(bo: ModdleObject | null | undefined): string | undefined {
    if (!bo) {
        return undefined;
    }
    const value = typeof bo.get === 'function' ? bo.get(MESSAGE_NAME_ATTRIBUTE) : bo.$attrs?.[MESSAGE_NAME_ATTRIBUTE];
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/**
 * Whether the business object is an intermediate message catch event that waits for the done event of
 * the task, by senergy:messageName or by a message named ${<taskId>_done_event}.
 */
export function waitsForDoneEvent(bo: ModdleObject | null | undefined, taskId: string): boolean {
    if (!bo || bo.$type !== 'bpmn:IntermediateCatchEvent') {
        return false;
    }
    const definition = bo.eventDefinitions?.[0];
    if (!definition || definition.$type !== 'bpmn:MessageEventDefinition') {
        return false;
    }
    const variable = doneEventVariable(taskId);
    const expression = messageNameExpression(bo);
    if (expression !== undefined) {
        return expression === variable;
    }
    return definition.messageRef?.name === '${' + variable + '}';
}
