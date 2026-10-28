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

import { EngineDebugState } from '../../model/automation-engine.model';

/** a running instance at step 4, active at Task_A, for specs */
export function debugState(overrides: Partial<EngineDebugState> = {}): EngineDebugState {
    return {
        instance: {
            id: 'i-1',
            namespace: 'processes',
            owner: 'u',
            deployment_id: 'd-1',
            deployment_name: 'D',
            deployment_version: 2,
            run: 1,
            state: 'running',
            started_at: '2026-10-27T10:00:00Z',
        },
        seq: 4,
        time: '2026-10-27T10:00:04Z',
        active: [{ element_id: 'Task_A', element_type: 'serviceTask', since: '2026-10-27T10:00:03Z', tokens: 1 }],
        waits: [],
        variables: { a: { value: 1, type: 'number', updated_at: '2026-10-27T10:00:01Z' }, b: { value: 'x', type: 'string', updated_at: '2026-10-27T10:00:02Z' } },
        incidents: [],
        elements: [
            { element_id: 'Start', run: 1, count: 1, last_at: '2026-10-27T10:00:01Z' },
            { element_id: 'Task_A', run: 1, count: 1, last_at: '2026-10-27T10:00:03Z' },
        ],
        ...overrides,
    };
}
