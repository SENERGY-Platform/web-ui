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

import { EngineActivity, EngineDebugMessage, EngineDebugState, EngineElementStats } from '../../model/automation-engine.model';

/**
 * Merges a delta of the live stream into a state, as debug.Apply of the automation-engine does: Active,
 * Waits and Incidents are replaced when marked as changed, Variables and Elements are upserted,
 * RemovedVariables are dropped. The state passed in is not changed.
 */
export function applyDebugMessage(state: EngineDebugState, delta: EngineDebugMessage): EngineDebugState {
    const result: EngineDebugState = { ...state, seq: delta.seq, variables: { ...state.variables }, elements: [...(state.elements || [])] };
    if (delta.instance) {
        result.instance = delta.instance;
    }
    if (delta.active_changed) {
        result.active = delta.active || [];
    }
    if (delta.waits_changed) {
        result.waits = delta.waits || [];
    }
    if (delta.incidents_changed) {
        result.incidents = delta.incidents || [];
    }
    Object.entries(delta.variables || {}).forEach(([name, v]) => (result.variables[name] = v));
    (delta.removed_variables || []).forEach((name) => delete result.variables[name]);
    (delta.elements || []).forEach((e) => {
        const i = result.elements.findIndex((old) => old.element_id === e.element_id);
        if (i >= 0) {
            result.elements[i] = e;
        } else {
            result.elements.push(e);
        }
    });
    result.elements.sort((a, b) => a.run - b.run || (a.element_id < b.element_id ? -1 : a.element_id > b.element_id ? 1 : 0));
    const activities = delta.activities || [];
    if (activities.length > 0) {
        result.time = activities[activities.length - 1].time;
    }
    return result;
}

/**
 * URL of the live stream of an instance. The token is not part of it: it goes as subprotocol, so it
 * does not end up in access logs. A base URL without scheme is resolved against the page; http and https
 * become ws and wss.
 */
export function liveUrl(websocketUrl: string, namespace: string, id: string, after: number, evaluateEvents: boolean, page: string): string {
    const url = new URL(websocketUrl.replace(/\/+$/, '') + '/namespaces/' + encodeURIComponent(namespace) + '/instances/' + encodeURIComponent(id) + '/live', page);
    if (url.protocol === 'https:' || url.protocol === 'wss:') {
        url.protocol = 'wss:';
    } else {
        url.protocol = 'ws:';
    }
    if (after > 0) {
        url.searchParams.set('after', String(after));
    }
    if (evaluateEvents) {
        url.searchParams.set('evaluate_events', 'true');
    }
    return url.toString();
}

/** instance states in which the engine still changes the instance */
export function instanceIsRunning(state: string | undefined): boolean {
    return state === 'running' || state === 'pending';
}

export const MARKER_PASSED = 'debug-passed';
export const MARKER_ACTIVE = 'debug-active';
export const MARKER_WAITING = 'debug-waiting';
export const MARKER_WOULD_TRIGGER = 'debug-would-trigger';
export const MARKER_INCIDENT = 'debug-incident';

export interface DiagramMarks {
    /** markers per BPMN element id, for elements and sequence flows */
    markers: Map<string, string[]>;
    /** passes per BPMN element id in the latest run of the state */
    counts: Map<string, number>;
}

/**
 * What the diagram shows for a state: passed elements and taken sequence flows with their count, active
 * and waiting elements, waiting events whose current value would trigger them, and open incidents.
 * Counts are those of the latest run the state holds counters for.
 */
export function diagramMarks(state: EngineDebugState): DiagramMarks {
    const markers = new Map<string, string[]>();
    const counts = new Map<string, number>();
    const mark = (id: string | undefined, marker: string) => {
        if (!id) {
            return;
        }
        const list = markers.get(id) || [];
        if (!list.includes(marker)) {
            list.push(marker);
        }
        markers.set(id, list);
    };
    latestRunElements(state.elements || []).forEach((e) => {
        if (e.count > 0) {
            counts.set(e.element_id, e.count);
            mark(e.element_id, MARKER_PASSED);
        }
    });
    (state.active || []).forEach((a) => mark(a.element_id, MARKER_ACTIVE));
    (state.waits || []).forEach((w) => {
        mark(w.element_id, MARKER_WAITING);
        if ((w.message?.events || []).some((e) => e.current?.triggered)) {
            mark(w.element_id, MARKER_WOULD_TRIGGER);
        }
    });
    (state.incidents || []).forEach((i) => mark(i.element_id, MARKER_INCIDENT));
    return { markers, counts };
}

function latestRunElements(elements: EngineElementStats[]): EngineElementStats[] {
    const run = elements.reduce((max, e) => Math.max(max, e.run), 0);
    return elements.filter((e) => e.run === run);
}

/** A line for an activity entry: its kind in words and the data it carries. */
export function describeActivity(activity: EngineActivity): string {
    let text = activity.kind.replace(/_/g, ' ');
    if (activity.data && Object.keys(activity.data).length > 0) {
        let data = JSON.stringify(activity.data);
        if (data.length > 300) {
            data = data.substring(0, 300) + '...';
        }
        text += ' ' + data;
    }
    return text;
}
