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

/**
 * A run of grouping intervals between two buckets that the query returned nothing for.
 * `from` and `to` are the timestamps of the buckets on either side of the run.
 */
export interface BucketGap {
    from: number;
    to: number;
    count: number;
    /** true when the run was longer than the scan limit, so count is a lower bound */
    truncated: boolean;
}

const timeRgx = /(\d+)(ms|s|months|m|h|d|w|y)/;

/** keeps a pathological grouping interval from spinning for a long time */
const scanLimit = 10000;

/**
 * Timestamps of the buckets in a chart dataTable, oldest first. The first row is the header.
 */
export function bucketTimes(dataTable: (Date | string | number | { role: string } | null)[][]): number[] {
    return dataTable
        .slice(1)
        .map((row) => (row[0] as Date)?.valueOf())
        .filter((time) => time !== undefined && !isNaN(time))
        .sort((a, b) => a - b);
}

/**
 * Finds the runs of missing buckets between the given bucket timestamps.
 *
 * Steps the grouping interval with calendar arithmetic rather than a fixed number of milliseconds,
 * so months and years step correctly. Two buckets count as adjacent when they are within half an
 * interval of each other, which keeps a daylight saving shift from reading as a missing bucket.
 */
export function findBucketGaps(times: number[], groupTime: string | null): BucketGap[] {
    const rgxRes = timeRgx.exec(groupTime || '');
    if (rgxRes === null || times.length < 2) {
        return [];
    }
    const amount = Number(rgxRes[1]);
    const unit = rgxRes[2];
    if (isNaN(amount) || amount <= 0) {
        return [];
    }

    const gaps: BucketGap[] = [];
    for (let i = 0; i < times.length - 1; i++) {
        const cursor = new Date(times[i]);
        addInterval(cursor, amount, unit);
        const intervalMs = cursor.valueOf() - times[i];
        if (intervalMs <= 0) {
            continue;
        }
        const adjacentWithin = intervalMs / 2;

        let count = 0;
        while (cursor.valueOf() < times[i + 1] - adjacentWithin && count < scanLimit) {
            count++;
            addInterval(cursor, amount, unit);
        }
        if (count > 0) {
            gaps.push({ from: times[i], to: times[i + 1], count, truncated: count === scanLimit });
        }
    }
    return gaps;
}

const unitNames: { [unit: string]: string } = {
    ms: 'millisecond',
    s: 'second',
    m: 'minute',
    h: 'hour',
    d: 'day',
    w: 'week',
    months: 'month',
    y: 'year',
};

/**
 * Names a gap in the reader's terms: how much time went unreported, rather than how many
 * buckets are missing. The two only differ when the grouping interval is a multiple.
 */
export function describeBucketGap(gap: BucketGap, groupTime: string | null): string {
    const rgxRes = timeRgx.exec(groupTime || '');
    if (rgxRes === null) {
        return 'no data';
    }
    const missing = gap.count * Number(rgxRes[1]);
    const unit = unitNames[rgxRes[2]] || 'interval';
    return 'no data for ' + (gap.truncated ? 'over ' : '') + missing + ' ' + (missing === 1 ? unit : unit + 's');
}

/** Chart.js widens the zero-width range of a single data time by this much on each side and puts a tick on each end. */
export const chartjsPaddingMs = 1;

/** The data time nearest to the given time when it lies within the tolerance, otherwise the time itself. */
export function snapToData(time: number, dataTimes: number[], toleranceMs: number): number {
    let best = time;
    let bestDistance = Infinity;
    dataTimes.forEach(t => {
        const distance = Math.abs(t - time);
        if (distance <= toleranceMs && distance < bestDistance) {
            best = t;
            bestDistance = distance;
        }
    });
    return best;
}

const fixedUnitMs: { [unit: string]: number } = { ms: 1, s: 1000, m: 60 * 1000, h: 60 * 60 * 1000 };
const dstShiftMs = 60 * 60 * 1000;

/**
 * The bucket a clicked tick stands for, as [from, to) in milliseconds. It starts at the bucket start the backend returned,
 * since exports and devices align buckets differently, and spans one grouping interval: by the local calendar for
 * d/w/months/y, in milliseconds below.
 */
export function clickedBucket(tick: number, dataTimes: number[], groupTime: string | null): { from: number; to: number } | null {
    const rgxRes = timeRgx.exec(groupTime || '');
    if (rgxRes === null || isNaN(tick)) {
        return null;
    }
    const amount = Number(rgxRes[1]);
    const unit = rgxRes[2];
    if (isNaN(amount) || amount <= 0) {
        return null;
    }
    const end = (start: number): number => {
        const unitMs = fixedUnitMs[unit];
        if (unitMs !== undefined) {
            return start + amount * unitMs;
        }
        const d = new Date(start);
        addInterval(d, amount, unit);
        return d.valueOf();
    };
    let from = snapToData(tick, dataTimes, chartjsPaddingMs);
    if (!dataTimes.includes(from)) {
        // Chart.js puts ticks on data points; should one fall between them, it stands for the bucket it lies in
        const containing = dataTimes.filter(t => t <= tick && tick < end(t));
        from = containing.length > 0 ? containing.reduce((latest, t) => Math.max(latest, t), -Infinity) : tick;
    }
    let to = end(from);
    if (fixedUnitMs[unit] === undefined) {
        // a next bucket within the DST hour of the calendar end is the backend's own boundary, e.g. of UTC-aligned buckets
        const next = dataTimes.filter(t => t > from).reduce((earliest, t) => Math.min(earliest, t), Infinity);
        if (Math.abs(next - to) <= dstShiftMs) {
            to = next;
        }
    }
    return { from, to };
}

function addInterval(date: Date, amount: number, unit: string): void {
    switch (unit) {
        case 'ms':
            date.setMilliseconds(date.getMilliseconds() + amount);
            return;
        case 's':
            date.setSeconds(date.getSeconds() + amount);
            return;
        case 'm':
            date.setMinutes(date.getMinutes() + amount);
            return;
        case 'h':
            date.setHours(date.getHours() + amount);
            return;
        case 'd':
            date.setDate(date.getDate() + amount);
            return;
        case 'w':
            date.setDate(date.getDate() + 7 * amount);
            return;
        case 'months':
            date.setMonth(date.getMonth() + amount);
            return;
        case 'y':
            date.setFullYear(date.getFullYear() + amount);
            return;
    }
}
