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

import type { QueriesRequestV2ElementTimescaleModel } from '../../shared/export-data.model';
import { fpCriteriaConnectionStatus, FloorplanWidgetCapabilityModel } from './floorplan.model';

/** One moment of the replay. */
export interface HistoryFrame {
    time: Date;
    /** per placement index the value it showed at this time; undefined as long as nothing is known */
    values: (any | undefined)[];
}

export interface HistoryRequest {
    elements: QueriesRequestV2ElementTimescaleModel[];
    /** per element the index of the placement it belongs to */
    placementOfElement: number[];
}

/** Shape of an answer of queryTimescaleV2, only what is used here. */
export interface HistoryResponseEntry {
    requestIndex: number;
    deviceId?: string;
    data: any[][][];
}

/** Milliseconds per unit, the units the timescale wrapper knows. */
const UNIT_MILLIS: { [unit: string]: number } = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
};

/** Start of the lookup for the value a device had before the window. */
const EPOCH_START = '1970-01-01T00:00:00Z';

/** A duration such as "5m" or "6h" in milliseconds; 0 for anything that is not one. */
export function durationMillis(text: string): number {
    const match = /^(\d+)(ms|s|m|h|d|w)$/.exec((text || '').trim());
    return match ? Number(match[1]) * UNIT_MILLIS[match[2]] : 0;
}

/**
 * The moments of the replay, ascending, the last one being the newest. They are rounded down to
 * multiples of the step since the epoch, because the wrapper lays its buckets the same way.
 */
export function frameTimes(windowText: string, stepText: string, now: Date): Date[] {
    const windowMillis = durationMillis(windowText);
    const step = durationMillis(stepText);
    if (windowMillis === 0 || step === 0) {
        return [];
    }
    const count = Math.max(1, Math.ceil(windowMillis / step));
    const newest = Math.floor(now.getTime() / step) * step;
    return Array.from({ length: count }, (_, i) => new Date(newest - (count - 1 - i) * step));
}

/** Whether history can be asked for: a device group, a measuring criteria and not the connection status. */
export function replayable(placement: FloorplanWidgetCapabilityModel): boolean {
    return !!placement.deviceGroupId
        && !!placement.criteria?.function_id
        && placement.criteria.function_id !== fpCriteriaConnectionStatus;
}

/**
 * Averaging is only meaningful when every colouring step is a number. A switch state or a text must not
 * be averaged, and without a colouring it is unknown what comes back, so the last value is taken.
 */
export function groupTypeFor(placement: FloorplanWidgetCapabilityModel): 'mean' | 'last' {
    const coloring = placement.coloring || [];
    return coloring.length > 0 && coloring.every(c => typeof c.value === 'number') ? 'mean' : 'last';
}

/**
 * Two elements per replayable placement: the grouped values inside the window and the newest value before
 * it, which the grouped one lacks when the device sends rarely. A placement without a measuring criteria
 * adds nothing, since one faulty element makes the wrapper reject the whole request.
 */
export function historyRequest(
    placements: FloorplanWidgetCapabilityModel[],
    windowText: string,
    stepText: string,
    now: Date,
): HistoryRequest {
    const times = frameTimes(windowText, stepText, now);
    const elements: QueriesRequestV2ElementTimescaleModel[] = [];
    const placementOfElement: number[] = [];
    if (times.length === 0) {
        return { elements, placementOfElement };
    }
    placements.forEach((placement, index) => {
        if (!replayable(placement)) {
            return;
        }
        const criteria = { ...placement.criteria };
        delete criteria.value;
        elements.push({
            deviceGroupId: placement.deviceGroupId as string,
            columns: [{ criteria, groupType: groupTypeFor(placement) }],
            groupTime: stepText,
            time: { last: windowText },
        });
        elements.push({
            deviceGroupId: placement.deviceGroupId as string,
            columns: [{ criteria }],
            time: { start: EPOCH_START, end: times[0].toISOString() },
            limit: 1,
            orderColumnIndex: 0,
            orderDirection: 'desc',
        });
        placementOfElement.push(index, index);
    });
    return { elements, placementOfElement };
}

/**
 * The values of every placement at every moment. A value is carried over until the next one arrives; a
 * device without a value yet does not count. Several devices of a group give an array ordered by device id.
 */
export function historyFrames(
    response: HistoryResponseEntry[],
    request: HistoryRequest,
    times: Date[],
    placementCount: number,
): HistoryFrame[] {
    // placement index -> device id -> rows
    const rowsOf: Map<number, Map<string, { time: number; value: any }[]>> = new Map();
    (response || []).forEach(entry => {
        const placement = request.placementOfElement[entry.requestIndex];
        if (placement === undefined) {
            return;
        }
        const devices = rowsOf.get(placement) || new Map();
        rowsOf.set(placement, devices);
        const deviceId = entry.deviceId || '';
        const rows = devices.get(deviceId) || [];
        devices.set(deviceId, rows);
        (entry.data || []).forEach(series => (series || []).forEach(row => {
            const time = Date.parse(row?.[0]);
            if (!isNaN(time) && row[1] !== null && row[1] !== undefined) {
                rows.push({ time, value: row[1] });
            }
        }));
    });

    const cursors = Array.from(rowsOf.entries()).map(([placement, devices]) => ({
        placement,
        devices: Array.from(devices.entries())
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([, rows]) => ({ rows: rows.sort((a, b) => a.time - b.time), next: 0 })),
    }));

    return times.map(time => {
        const values: (any | undefined)[] = new Array(placementCount).fill(undefined);
        cursors.forEach(({ placement, devices }) => {
            if (placement < 0 || placement >= placementCount) {
                return;
            }
            const known: any[] = [];
            devices.forEach(device => {
                while (device.next < device.rows.length && device.rows[device.next].time <= time.getTime()) {
                    device.next++;
                }
                if (device.next > 0) {
                    known.push(device.rows[device.next - 1].value);
                }
            });
            values[placement] = known.length === 0 ? undefined : known.length === 1 ? known[0] : known;
        });
        return { time, values };
    });
}
