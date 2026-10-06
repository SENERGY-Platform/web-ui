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

import { ScheduleSource } from './environments.model';

/** One state's slot in the preview timeline, in seconds elapsed since the programme started. */
export interface ScheduleBlock {
    name: string;
    startSeconds: number;
    endSeconds: number;
    value: number;
}

/** The schedule preview as drawn: one row per state name, every block in one colour. */
export interface SchedulePreview {
    rows: string[];
    blocks: ScheduleBlock[];
    color: string;
}

const MAX_PREVIEW_SECONDS = 24 * 3600;
const MAX_PREVIEW_CYCLES = 3;

/**
 * Lays out the states of a schedule back to back, starting at t=0, for at least one full
 * cycle -- even one that alone exceeds 24h, since cutting a state mid-way would show a
 * block the schedule never actually produces. A second and third cycle are only appended
 * while the programme is still inside the 24h window; whichever of the two limits (3
 * cycles, 24h) is hit first stops the layout, but only ever between whole cycles.
 *
 * A state with duration_seconds <= 0 is dropped before laying out anything: keeping it
 * would either add a zero-width block or, at worst, loop without ever advancing time.
 * Deliberately ignores every spread field and the gate -- this is "what the programme
 * looks like on paper", not a simulation of a particular run.
 */
export function schedulePreviewBlocks(schedule: ScheduleSource): ScheduleBlock[] {
    const states = (schedule.states || []).filter((s) => (s.duration_seconds ?? 0) > 0);
    if (states.length === 0) {
        return [];
    }
    const cycleSeconds = states.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);

    const blocks: ScheduleBlock[] = [];
    let t = 0;
    for (let cycle = 0; cycle < MAX_PREVIEW_CYCLES; cycle++) {
        // The first cycle is laid out unconditionally; every further one only if it still
        // fits inside the 24h window as a whole -- a cycle that would cross the mark is
        // left out entirely rather than cut into a partial, misleading block.
        if (cycle > 0 && t + cycleSeconds > MAX_PREVIEW_SECONDS) {
            break;
        }
        for (const state of states) {
            const duration = state.duration_seconds ?? 0;
            const start = t;
            const end = t + duration;
            blocks.push({ name: state.name || '', startSeconds: start, endSeconds: end, value: state.value ?? 0 });
            t = end;
        }
    }
    return blocks;
}

/** Formats seconds elapsed since the programme started as "H:mm", not wrapped at 24h -- this is elapsed time, not a clock. */
export function formatElapsed(totalSeconds: number): string {
    const totalMinutes = Math.round(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours + ':' + String(minutes).padStart(2, '0');
}

/**
 * The schedule's timeline preview: one row per state name in order of first appearance, spanning every
 * occurrence across the laid-out cycles, the same way the platform's own timeline chart renders a state
 * history. Undefined when there is nothing to lay out, so the editor can show its empty-state hint instead.
 */
export function schedulePreview(schedule: ScheduleSource): SchedulePreview | undefined {
    const blocks = schedulePreviewBlocks(schedule);
    if (blocks.length === 0) {
        return undefined;
    }
    const rows: string[] = [];
    blocks.forEach((b) => {
        if (!rows.includes(b.name)) {
            rows.push(b.name);
        }
    });
    return { rows, blocks, color: '#008FFB' };
}
