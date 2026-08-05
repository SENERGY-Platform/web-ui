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

import { BucketGap, bucketTimes, describeBucketGap, findBucketGaps } from './chartjs-bucket-gaps';

const gapOf = (count: number, truncated = false): BucketGap => ({ from: 0, to: 1, count, truncated });

/** Local midnight, so the expectations do not depend on the machine's zone. */
const day = (dayOfMonth: number, hour = 0) => new Date(2026, 7, dayOfMonth, hour).valueOf();

describe('chartjs bucket gaps', () => {
    describe('bucketTimes', () => {
        it('returns no timestamps for a table that only has a header', () => {
            expect(bucketTimes([['time', 'A']])).toEqual([]);
        });

        it('takes the timestamps from the first column and skips the header', () => {
            const table = [
                ['time', 'A'],
                [new Date(day(2)), 1],
                [new Date(day(3)), 2],
            ];

            expect(bucketTimes(table)).toEqual([day(2), day(3)]);
        });

        it('sorts the timestamps oldest first', () => {
            const table = [
                ['time', 'A'],
                [new Date(day(4)), 1],
                [new Date(day(2)), 2],
                [new Date(day(3)), 3],
            ];

            expect(bucketTimes(table)).toEqual([day(2), day(3), day(4)]);
        });
    });

    describe('findBucketGaps', () => {
        it('finds no gap between adjacent buckets', () => {
            expect(findBucketGaps([day(2), day(3), day(4)], '1d')).toEqual([]);
        });

        it('counts the buckets missing between two buckets', () => {
            expect(findBucketGaps([day(2), day(5)], '1d')).toEqual([
                { from: day(2), to: day(5), count: 2, truncated: false },
            ]);
        });

        it('reports every gap separately', () => {
            const gaps = findBucketGaps([day(2), day(4), day(7)], '1d');

            expect(gaps.map((g) => g.count)).toEqual([1, 2]);
            expect(gaps.map((g) => g.from)).toEqual([day(2), day(4)]);
        });

        it('counts in multiples of the grouping interval', () => {
            expect(findBucketGaps([day(2), day(8)], '2d')).toEqual([
                { from: day(2), to: day(8), count: 2, truncated: false },
            ]);
        });

        it('steps months as calendar months rather than fixed days', () => {
            const jan = new Date(2026, 0, 1).valueOf();
            const apr = new Date(2026, 3, 1).valueOf();

            expect(findBucketGaps([jan, apr], '1months')).toEqual([
                { from: jan, to: apr, count: 2, truncated: false },
            ]);
        });

        it('treats buckets less than half an interval apart as adjacent', () => {
            // what a daylight saving shift looks like: a day that is an hour longer than the interval
            expect(findBucketGaps([day(2), day(3, 1)], '1d')).toEqual([]);
            expect(findBucketGaps([day(2), day(2, 23)], '1d')).toEqual([]);
        });

        it('needs two buckets to have a gap between them', () => {
            expect(findBucketGaps([], '1d')).toEqual([]);
            expect(findBucketGaps([day(2)], '1d')).toEqual([]);
        });

        it('finds no gap when the grouping interval cannot be read', () => {
            expect(findBucketGaps([day(2), day(9)], null)).toEqual([]);
            expect(findBucketGaps([day(2), day(9)], '')).toEqual([]);
            expect(findBucketGaps([day(2), day(9)], 'weekly')).toEqual([]);
            expect(findBucketGaps([day(2), day(9)], '0d')).toEqual([]);
        });

        it('marks a run as truncated instead of scanning it to the end', () => {
            const [gap] = findBucketGaps([day(2), new Date(2126, 0, 1).valueOf()], '1ms');

            expect(gap.truncated).toBeTrue();
            expect(gap.count).toBe(10000);
        });
    });

    describe('describeBucketGap', () => {
        it('names the interval unit', () => {
            expect(describeBucketGap(gapOf(2), '1d')).toBe('no data for 2 days');
            expect(describeBucketGap(gapOf(3), '1h')).toBe('no data for 3 hours');
            expect(describeBucketGap(gapOf(2), '1months')).toBe('no data for 2 months');
            expect(describeBucketGap(gapOf(4), '1y')).toBe('no data for 4 years');
        });

        it('keeps the unit singular for a single missing interval', () => {
            expect(describeBucketGap(gapOf(1), '1d')).toBe('no data for 1 day');
            expect(describeBucketGap(gapOf(1), '1h')).toBe('no data for 1 hour');
        });

        it('reports the time that went unreported, not the number of buckets', () => {
            expect(describeBucketGap(gapOf(3), '2d')).toBe('no data for 6 days');
            expect(describeBucketGap(gapOf(1), '15m')).toBe('no data for 15 minutes');
        });

        it('says the count is a lower bound for a truncated run', () => {
            expect(describeBucketGap(gapOf(10000, true), '1ms')).toBe('no data for over 10000 milliseconds');
        });

        it('falls back to a bare statement when the grouping interval cannot be read', () => {
            expect(describeBucketGap(gapOf(2), null)).toBe('no data');
            expect(describeBucketGap(gapOf(2), 'weekly')).toBe('no data');
        });
    });
});
