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

/** A series of the chart as the CSV export sees it. */
export interface CsvSeries {
    label: string;
    data: { x: number; y: unknown }[];
}

/**
 * The CSV the chart menu downloads, as it was before: a category column with the day of every x value
 * in ascending order, then one column per series, empty where a series has no value at that x.
 */
export function chartCsv(series: CsvSeries[]): string {
    const xs = Array.from(new Set(series.flatMap((s) => s.data.map((p) => p.x)))).sort((a, b) => a - b);
    const rows = [['category', ...series.map((s) => s.label.split(',').join(''))].join(',')];
    // the first value of every series at each x, as the lookup by find did before
    const byX = series.map((s) => {
        const values = new Map<number, unknown>();
        s.data.forEach((p) => {
            if (!values.has(p.x)) {
                values.set(p.x, p.y);
            }
        });
        return values;
    });
    xs.forEach((x) => {
        const values = byX.map((m) => {
            const y = m.get(x);
            return y === null || y === undefined ? '' : String(y);
        });
        rows.push([new Date(x).toDateString(), ...values].join(','));
    });
    return '\uFEFF' + rows.join('\n');
}
