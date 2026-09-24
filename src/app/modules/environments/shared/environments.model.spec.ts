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

import { DatasetSource, datasetGapProblems, followProblem, isRemoteOrigin, parseReplayDuration } from './environments.model';

describe('isRemoteOrigin', () => {
    it('is true for platform and export, false for file and endpoint', () => {
        expect(isRemoteOrigin('platform')).toBe(true);
        expect(isRemoteOrigin('export')).toBe(true);
        expect(isRemoteOrigin('file')).toBe(false);
        expect(isRemoteOrigin('endpoint')).toBe(false);
        expect(isRemoteOrigin(undefined)).toBe(false);
    });
});

describe('parseReplayDuration', () => {
    it('parses single-unit durations to seconds', () => {
        expect(parseReplayDuration('30m')).toBe(1800);
        expect(parseReplayDuration('2d')).toBe(172800);
        expect(parseReplayDuration('1y')).toBe(31536000);
        expect(parseReplayDuration('90s')).toBe(90);
    });

    it('parses a composite duration, summing every segment', () => {
        expect(parseReplayDuration('1h30m')).toBe(3600 + 1800);
        expect(parseReplayDuration('120000ms')).toBe(120);
        expect(parseReplayDuration('+5m')).toBe(300);
    });

    it('returns undefined for unparsable text', () => {
        expect(parseReplayDuration('garbage')).toBeUndefined();
    });

    it('returns undefined for an empty string', () => {
        expect(parseReplayDuration('')).toBeUndefined();
    });

    it('rejects a day/week/year suffix mixed with another segment: the suffix must cover the whole string', () => {
        expect(parseReplayDuration('1d12h')).toBeUndefined();
        expect(parseReplayDuration('2w3d')).toBeUndefined();
        expect(parseReplayDuration('7d12h')).toBeUndefined();
        expect(parseReplayDuration('1y1h')).toBeUndefined();
    });

    it('rejects a duration at or above the 2^63ns clock bound, accepts just below it', () => {
        expect(parseReplayDuration('292y')).toBe(292 * 31536000);
        expect(parseReplayDuration('293y')).toBeUndefined();
    });
});

describe('followProblem', () => {
    it('is undefined when follow is off, regardless of other fields', () => {
        expect(followProblem({ origin: 'file' })).toBeUndefined();
        expect(followProblem(undefined)).toBeUndefined();
    });

    it('refuses follow on a file origin', () => {
        const dataset: DatasetSource = { origin: 'file', follow: true, anchor: 'original' };
        expect(followProblem(dataset)).toBe('A file origin has nothing to poll again; follow needs a platform or export origin.');
    });

    it('refuses follow with anchor loop', () => {
        const dataset: DatasetSource = { origin: 'platform', follow: true, anchor: 'loop' };
        expect(followProblem(dataset)).toBe('Follow needs anchor Original; Loop replays the frozen window it already fetched.');
    });

    it('refuses a follow_every shorter than 1m', () => {
        const dataset: DatasetSource = { origin: 'platform', follow: true, anchor: 'original', follow_every: '30s' };
        expect(followProblem(dataset)).toBe('Follow every must be at least 1m.');
    });

    it('refuses an unparsable follow_every with the server\'s own wording', () => {
        const dataset: DatasetSource = { origin: 'export', follow: true, anchor: 'original', follow_every: 'xyz' };
        expect(followProblem(dataset)).toBe('unreadable window "xyz", use a duration like "36h", "7d", "4w" or "1y"');
    });

    it('refuses a follow_every the clock cannot hold, with the server\'s own wording', () => {
        const dataset: DatasetSource = { origin: 'export', follow: true, anchor: 'original', follow_every: '293y' };
        expect(followProblem(dataset)).toBe('the window "293y" is longer than the clock can hold, about 292 years is the most');
    });

    it('is undefined for a valid platform/original/30m combination', () => {
        const dataset: DatasetSource = { origin: 'platform', follow: true, anchor: 'original', follow_every: '30m' };
        expect(followProblem(dataset)).toBeUndefined();
    });

    it('is undefined for an empty follow_every, which falls back to the default', () => {
        const dataset: DatasetSource = { origin: 'export', follow: true, anchor: 'original' };
        expect(followProblem(dataset)).toBeUndefined();
    });
});

describe('datasetGapProblems', () => {
    it('is empty for an undefined dataset or one with none of the three fields set', () => {
        expect(datasetGapProblems(undefined)).toEqual([]);
        expect(datasetGapProblems({ origin: 'file' })).toEqual([]);
    });

    describe('max_gap', () => {
        it('accepts exactly the minimum, 1s', () => {
            expect(datasetGapProblems({ origin: 'file', max_gap: '1s' })).toEqual([]);
        });

        it('refuses a bound below 1s', () => {
            expect(datasetGapProblems({ origin: 'file', max_gap: '500ms' })).toEqual(['Max gap must be at least 1s, got "500ms".']);
        });

        it('refuses text the duration grammar cannot read, with the server\'s own wording', () => {
            expect(datasetGapProblems({ origin: 'file', max_gap: 'garbage' })).toEqual([
                'unreadable window "garbage", use a duration like "36h", "7d", "4w" or "1y"',
            ]);
        });

        it('is fine absent, applies to every origin including file', () => {
            expect(datasetGapProblems({ origin: 'file' })).toEqual([]);
            expect(datasetGapProblems({ origin: 'export', max_gap: '12h' })).toEqual([]);
        });
    });

    describe('filters', () => {
        it('refuses filters on a non-export origin', () => {
            expect(datasetGapProblems({ origin: 'platform', filters: [{ column: 'station_id', value: '1' }] })).toEqual([
                'Filters only apply to an export, not origin "platform".',
            ]);
        });

        it('refuses a column padded with whitespace', () => {
            expect(datasetGapProblems({ origin: 'export', filters: [{ column: ' station_id', value: '1' }] })).toEqual([
                'Filter 1: column must not be padded with whitespace, the name reaches the query as written.',
            ]);
        });

        it('refuses a blank value', () => {
            expect(datasetGapProblems({ origin: 'export', filters: [{ column: 'station_id', value: '  ' }] })).toEqual([
                'Filter 1: value must not be empty, a filter on nothing keeps nothing.',
            ]);
        });

        it('is empty for a valid filter set on an export', () => {
            expect(datasetGapProblems({ origin: 'export', filters: [{ column: 'station_id', value: '02932' }] })).toEqual([]);
        });
    });

    describe('fallback', () => {
        const baseSource: DatasetSource = {
            origin: 'export',
            ref: 'ex-1',
            column: 'irradiance',
            max_gap: '2h',
            filters: [{ column: 'station_id', value: '02932' }],
        };

        it('needs max_gap', () => {
            const dataset: DatasetSource = {
                ...baseSource,
                max_gap: undefined,
                fallback: { filters: [{ column: 'station_id', value: '01048' }] },
            };
            expect(datasetGapProblems(dataset)).toEqual([
                'Fallback needs max_gap: without a bound nothing is a gap, so the fallback series would never be read.',
            ]);
        });

        it('needs at least one filter', () => {
            const dataset: DatasetSource = { ...baseSource, fallback: { filters: [] } };
            expect(datasetGapProblems(dataset)).toEqual([
                'Fallback must name the filters that pick the substitute series out of the export.',
            ]);
        });

        it('refuses a whitespace-only ref, but accepts an absent one', () => {
            const whitespaceRef: DatasetSource = {
                ...baseSource,
                fallback: { filters: [{ column: 'station_id', value: '01048' }], ref: '   ' },
            };
            expect(datasetGapProblems(whitespaceRef)).toEqual(["Fallback export must not be blank, empty reads the source's own."]);

            const absentRef: DatasetSource = {
                ...baseSource,
                fallback: { filters: [{ column: 'station_id', value: '01048' }] },
            };
            expect(datasetGapProblems(absentRef)).toEqual([]);
        });

        it('refuses a substitute that selects the same series, filters compared as a set regardless of order', () => {
            const sameOrder: DatasetSource = {
                ...baseSource,
                filters: [
                    { column: 'station_id', value: '02932' },
                    { column: 'sensor', value: 'a' },
                ],
                fallback: {
                    filters: [
                        { column: 'sensor', value: 'a' },
                        { column: 'station_id', value: '02932' },
                    ],
                },
            };
            expect(datasetGapProblems(sameOrder)).toEqual([
                'Fallback must select a different series than the source itself: the same export, column and filters.',
            ]);
        });

        it('refuses cumulative combined with fallback', () => {
            const dataset: DatasetSource = {
                ...baseSource,
                cumulative: true,
                fallback: { filters: [{ column: 'station_id', value: '01048' }] },
            };
            expect(datasetGapProblems(dataset)).toEqual([
                "Fallback must not be combined with cumulative: the substitute is a different meter, not this one's count.",
            ]);
        });

        it('refuses fallback on a non-export origin', () => {
            const dataset: DatasetSource = {
                origin: 'platform',
                fallback: { filters: [{ column: 'station_id', value: '01048' }] },
            };
            expect(datasetGapProblems(dataset)).toEqual(['Fallback only applies to an export, not origin "platform".']);
        });
    });

    it('is empty for a valid musterwerke-like source: filters, max_gap and a fallback to a different station', () => {
        const dataset: DatasetSource = {
            origin: 'export',
            ref: 'ex-1',
            column: 'irradiance',
            resample: 'linear',
            anchor: 'original',
            max_gap: '12h',
            filters: [{ column: 'station_id', value: '02932' }],
            fallback: { filters: [{ column: 'station_id', value: '01048' }] },
        };
        expect(datasetGapProblems(dataset)).toEqual([]);
    });
});
