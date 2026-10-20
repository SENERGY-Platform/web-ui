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

export interface GroupOption {
    value: string;
    name: string;
}

/** The units of a grouping interval; months stay plural because the backend only accepts `months`. */
export const groupTimeLevels: GroupOption[] = [
    { name: 'Miliseconds', value: 'ms' },
    { name: 'Seconds', value: 's' },
    { name: 'Minutes', value: 'm' },
    { name: 'Hours', value: 'h' },
    { name: 'Days', value: 'd' },
    { name: 'Weeks', value: 'w' },
    { name: 'Months', value: 'months' },
    { name: 'Years', value: 'y' },
];

const baseGroupTypes: GroupOption[] = [
    { value: 'mean', name: 'Mean' },
    { value: 'sum', name: 'Sum' },
    { value: 'count', name: 'Count' },
    { value: 'median', name: 'Median' },
    { value: 'min', name: 'Minimum' },
    { value: 'max', name: 'Maximum' },
    { value: 'first', name: 'First' },
    { value: 'last', name: 'Last' },
    { value: 'difference-first', name: 'Difference-First' },
    { value: 'difference-last', name: 'Difference-Last' },
    { value: 'difference-min', name: 'Difference-Minimum' },
    { value: 'difference-max', name: 'Difference-Maximum' },
    { value: 'difference-count', name: 'Difference-Count' },
    { value: 'difference-mean', name: 'Difference-Mean' },
    { value: 'difference-sum', name: 'Difference-Sum' },
    { value: 'difference-median', name: 'Difference-Median' },
];

const timeWeightedGroupTypes: GroupOption[] = [
    { value: 'time-weighted-mean-linear', name: 'Time weighted mean linear' },
    { value: 'time-weighted-mean-locf', name: 'Time weighted mean LOCF' },
];

/** The time weighted types are not available on the internal Influx database. */
export function groupTypeOptions(influx: boolean): GroupOption[] {
    return influx ? [...baseGroupTypes] : [...baseGroupTypes, ...timeWeightedGroupTypes];
}

const axisGroupIntervalPattern = /^\d+(ms|s|months|y|m|h|d|w)$/;

/** Whether the text is a grouping interval such as `15m` or `1months`, in the units the timescale-wrapper accepts. */
export function isAxisGroupInterval(time: string | null | undefined): boolean {
    return time !== undefined && time !== null && axisGroupIntervalPattern.test(time);
}

/** Splits `15m` into the number and the unit; both are empty strings when the text does not fit. */
export function splitGroupTime(time: string | undefined): { value: string; level: string } {
    const match = /^(\d*)([a-zA-Zµ]*)$/.exec(time || '');
    return { value: match?.[1] ?? '', level: match?.[2] ?? '' };
}
