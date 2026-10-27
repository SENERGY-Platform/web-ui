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

import { debugState } from './debug-state.mock';
import {
    applyDebugMessage,
    describeActivity,
    diagramMarks,
    liveUrl,
    MARKER_ACTIVE,
    MARKER_INCIDENT,
    MARKER_PASSED,
    MARKER_WAITING,
    MARKER_WOULD_TRIGGER,
} from './debug-state';

describe('applyDebugMessage', () => {
    it('replaces active, waits and incidents only when marked as changed', () => {
        const state = debugState();
        const kept = applyDebugMessage(state, { type: 'delta', seq: 5, active: [] });
        expect(kept.active.length).toBe(1);

        const replaced = applyDebugMessage(state, {
            type: 'delta',
            seq: 5,
            active_changed: true,
            waits_changed: true,
            waits: [{ element_id: 'Catch', kind: 'message', since: '2026-10-27T10:00:05Z' }],
            incidents_changed: true,
        });
        expect(replaced.active).toEqual([]);
        expect(replaced.waits.length).toBe(1);
        expect(replaced.incidents).toEqual([]);
        expect(replaced.seq).toBe(5);
    });

    it('upserts variables and elements, drops removed variables and keeps the order of the store', () => {
        const state = debugState();
        const result = applyDebugMessage(state, {
            type: 'delta',
            seq: 6,
            variables: { a: { value: 2, type: 'number', updated_at: '2026-10-27T10:00:06Z' }, c: { value: true, type: 'boolean', updated_at: '2026-10-27T10:00:06Z' } },
            removed_variables: ['b'],
            elements: [
                { element_id: 'Task_A', run: 1, count: 2, last_at: '2026-10-27T10:00:06Z' },
                { element_id: 'Flow_1', run: 1, count: 1, last_at: '2026-10-27T10:00:06Z' },
            ],
            activities: [
                { instance_id: 'i-1', run: 1, seq: 5, time: '2026-10-27T10:00:05Z', kind: 'element_left' },
                { instance_id: 'i-1', run: 1, seq: 6, time: '2026-10-27T10:00:06Z', kind: 'flow_taken' },
            ],
        });
        expect(Object.keys(result.variables).sort()).toEqual(['a', 'c']);
        expect(result.variables['a'].value).toBe(2);
        expect(result.elements.map((e) => e.element_id + ':' + e.count)).toEqual(['Flow_1:1', 'Start:1', 'Task_A:2']);
        expect(result.time).toBe('2026-10-27T10:00:06Z');
    });

    it('leaves the state passed in unchanged', () => {
        const state = debugState();
        applyDebugMessage(state, {
            type: 'delta',
            seq: 9,
            variables: { a: { value: 3, type: 'number', updated_at: '' } },
            removed_variables: ['b'],
            elements: [{ element_id: 'Task_A', run: 1, count: 5, last_at: '' }],
        });
        expect(state.seq).toBe(4);
        expect(state.variables['a'].value).toBe(1);
        expect(state.variables['b']).toBeDefined();
        expect(state.elements[1].count).toBe(1);
    });
});

describe('liveUrl', () => {
    it('turns the engine URL into a WebSocket URL without a token', () => {
        expect(liveUrl('https://api.example.org/automation-engine/', 'smart-services', 'a/b', 0, false, 'https://ui.example.org/')).toBe(
            'wss://api.example.org/automation-engine/namespaces/smart-services/instances/a%2Fb/live',
        );
        expect(liveUrl('http://localhost:8080', 'processes', 'i-1', 12, true, 'http://localhost:4200/')).toBe(
            'ws://localhost:8080/namespaces/processes/instances/i-1/live?after=12&evaluate_events=true',
        );
    });

    it('keeps a WebSocket scheme of the base', () => {
        expect(liveUrl('wss://ws.example.org', 'processes', 'i-1', 0, false, 'http://localhost:4200/')).toBe(
            'wss://ws.example.org/namespaces/processes/instances/i-1/live',
        );
        expect(liveUrl('ws://localhost:8080/', 'processes', 'i-1', 0, false, 'https://ui.example.org/')).toBe(
            'ws://localhost:8080/namespaces/processes/instances/i-1/live',
        );
    });

    it('resolves a base without scheme against the page', () => {
        expect(liveUrl('/engine', 'processes', 'i-1', 0, false, 'https://ui.example.org/processes/monitor')).toBe(
            'wss://ui.example.org/engine/namespaces/processes/instances/i-1/live',
        );
    });
});

describe('diagramMarks', () => {
    it('marks passed, active, waiting, triggering and failed elements', () => {
        const marks = diagramMarks(
            debugState({
                waits: [
                    {
                        element_id: 'Catch',
                        kind: 'message',
                        since: '',
                        message: { name: 'm', events: [{ event_description_id: 'e', script: '', value_variable: 'v', current: { triggered: true } }] },
                    },
                    { element_id: 'Timer', kind: 'timer', since: '' },
                ],
                incidents: [{ id: 'inc', instance_id: 'i-1', run: 1, deployment_version: 2, element_id: 'Task_A', message: 'failed', time: '' }],
            }),
        );
        expect(marks.markers.get('Start')).toEqual([MARKER_PASSED]);
        expect(marks.markers.get('Task_A')).toEqual([MARKER_PASSED, MARKER_ACTIVE, MARKER_INCIDENT]);
        expect(marks.markers.get('Catch')).toEqual([MARKER_WAITING, MARKER_WOULD_TRIGGER]);
        expect(marks.markers.get('Timer')).toEqual([MARKER_WAITING]);
        expect(marks.counts.get('Start')).toBe(1);
    });

    it('counts only the latest run the state holds counters for', () => {
        const marks = diagramMarks(
            debugState({
                active: [],
                elements: [
                    { element_id: 'Start', run: 1, count: 1, last_at: '' },
                    { element_id: 'Task_A', run: 1, count: 3, last_at: '' },
                    { element_id: 'Start', run: 2, count: 1, last_at: '' },
                ],
            }),
        );
        expect(marks.counts.get('Start')).toBe(1);
        expect(marks.counts.has('Task_A')).toBeFalse();
        expect(marks.markers.has('Task_A')).toBeFalse();
    });
});

describe('describeActivity', () => {
    it('names the kind and the data, cut when long', () => {
        expect(describeActivity({ instance_id: 'i', run: 1, seq: 1, time: '', kind: 'run_started' })).toBe('run started');
        expect(describeActivity({ instance_id: 'i', run: 1, seq: 2, time: '', kind: 'variable_set', data: { name: 'a', value: 1 } })).toBe(
            'variable set {"name":"a","value":1}',
        );
        const long = describeActivity({ instance_id: 'i', run: 1, seq: 3, time: '', kind: 'script_log', data: { message: 'x'.repeat(400) } });
        expect(long.endsWith('...')).toBeTrue();
        expect(long.length).toBeLessThan(330);
    });
});
