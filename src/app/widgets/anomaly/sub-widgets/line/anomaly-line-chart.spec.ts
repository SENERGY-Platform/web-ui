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

import { AnomalyResultModel, DeviceValue } from '../../shared/anomaly.model';
import {
    chartAnomalies,
    roundMilliseconds,
    timeChartSeries,
    valueChartSeries,
    valueTooltipMessage,
    waitingTimeLevel,
    waitingTimes,
} from './anomaly-line-chart';

const minute = 60000;
const t0 = Date.UTC(2026, 9, 5, 8);
const at = (minutes: number) => t0 + minutes * minute;
const iso = (minutes: number) => new Date(at(minutes)).toISOString();

function curve(start: number, end: number, curves: [number, number, number][] = []): AnomalyResultModel {
    return { type: 'curve', start_time: iso(start), end_time: iso(end), original_reconstructed_curves: curves } as AnomalyResultModel;
}

function extreme(minutes: number, value: string, lower: number, upper: number): AnomalyResultModel {
    return { type: 'extreme_value', timestamp: iso(minutes), value, lower_bound: lower, upper_bound: upper } as AnomalyResultModel;
}

function values(...rows: [number, number][]): DeviceValue[] {
    return rows.map(([minutes, value]) => ({ timestamp: iso(minutes), value }));
}

const shade = { color: '#FF4C4C', opacity: 0.4 };

describe('chartAnomalies', () => {
    it('shades a single curve anomaly from its start to its end', () => {
        expect(chartAnomalies([curve(0, 10)]).intervals).toEqual([{ from: at(0), to: at(10), ...shade }]);
    });

    it('turns extreme values into outlier points, in order', () => {
        const a = extreme(5, '350', 500, 800);
        const b = extreme(7, '0.5', 0, 1);
        const result = chartAnomalies([a, curve(0, 1), b]);
        expect(result.outlierPoints).toEqual([{ x: at(5), y: 350 }, { x: at(7), y: 0.5 }]);
        expect(result.extremeOutliers).toEqual([a, b]);
    });

    it('merges overlapping curve anomalies into one interval', () => {
        expect(chartAnomalies([curve(0, 20), curve(10, 30)]).intervals).toEqual([{ from: at(0), to: at(30), ...shade }]);
    });

    it('merges an anomaly lying within another one into it', () => {
        expect(chartAnomalies([curve(0, 30), curve(10, 20)]).intervals).toEqual([{ from: at(0), to: at(30), ...shade }]);
    });

    // SNRGY-4848: merging overlaps rewrote end_time of the anomalies the widget got from its parent.
    it('leaves the given anomalies alone', () => {
        const first = curve(0, 20);
        const second = curve(10, 30);
        chartAnomalies([second, first]);
        expect([first.end_time, second.end_time]).toEqual([iso(20), iso(30)]);
    });

    it('cuts the reconstruction of an overlapped anomaly where the next one starts', () => {
        const result = chartAnomalies([
            curve(0, 20, [[at(0), 1, 2], [at(10), 3, 4], [at(15), 5, 6]]),
            curve(10, 30, [[at(10), 7, 8], [at(30), 9, 10]]),
        ]);
        expect(result.reconstructedPoints).toEqual([{ x: at(0), y: 2 }, { x: at(10), y: 4 }, { x: at(10), y: 8 }, { x: at(30), y: 10 }]);
        expect(result.reconstructionInputPoints).toEqual([{ x: at(0), y: 1 }, { x: at(10), y: 3 }, { x: at(10), y: 7 }, { x: at(30), y: 9 }]);
    });

    // SNRGY-4848: the cut-off times were applied by the index among the overlaps, not among all anomalies.
    it('cuts the reconstruction of the overlapped anomaly, not of an earlier separate one', () => {
        const result = chartAnomalies([
            curve(-30, -20, [[at(-30), 1, 2], [at(-20), 3, 4]]),
            curve(0, 20, [[at(0), 5, 6], [at(15), 7, 8]]),
            curve(10, 30, [[at(10), 9, 10]]),
        ]);
        expect(result.reconstructedPoints).toEqual([{ x: at(-30), y: 2 }, { x: at(-20), y: 4 }, { x: at(-20), y: null }, { x: at(0), y: 6 }, { x: at(10), y: 10 }]);
    });

    it('shows the reconstruction of an anomaly again once a nested one has ended', () => {
        const points = (minutes: number[]) => minutes.map((m) => [at(m), 0, m] as [number, number, number]);
        const result = chartAnomalies([curve(0, 10, points([0, 3, 6, 9])), curve(2, 4, points([2, 3, 4])), curve(8, 12, points([8, 10, 12]))]);
        expect(result.reconstructedPoints.map((p) => p.y)).toEqual([0, 2, 3, 4, 6, 8, 10, 12]);
    });

    // SNRGY-4848: without any overlap the prediction and processed series had no data at all. Separate anomalies are not joined by a line.
    it('draws the reconstruction of anomalies without overlap, broken between them', () => {
        const result = chartAnomalies([curve(0, 10, [[at(0), 1, 2]]), curve(20, 30, [[at(20), 3, 4]])]);
        expect(result.reconstructedPoints).toEqual([{ x: at(0), y: 2 }, { x: at(10), y: null }, { x: at(20), y: 4 }]);
        expect(result.reconstructionInputPoints).toEqual([{ x: at(0), y: 1 }, { x: at(10), y: null }, { x: at(20), y: 3 }]);
    });

    // SNRGY-4848: every interval without overlap was the same object, so all of them ended up at the last one.
    it('shades separate curve anomalies each at its own position', () => {
        expect(chartAnomalies([curve(0, 10), curve(20, 30)]).intervals).toEqual([
            { from: at(0), to: at(10), ...shade },
            { from: at(20), to: at(30), ...shade },
        ]);
    });

    // SNRGY-4848: after an overlap the last anomaly was skipped.
    it('keeps the last anomaly after an overlapping pair', () => {
        expect(chartAnomalies([curve(0, 20), curve(10, 30), curve(40, 50)]).intervals).toEqual([
            { from: at(0), to: at(30), ...shade },
            { from: at(40), to: at(50), ...shade },
        ]);
    });
});

describe('valueChartSeries', () => {
    it('draws the device curve blue and the outliers as big red points', () => {
        const anomalies = chartAnomalies([extreme(5, '350', 500, 800)]);
        const series = valueChartSeries(values([0, 1.5], [1, 2]), anomalies, false);
        expect(series).toEqual([
            { name: 'Original', type: 'line', data: [{ x: at(0), y: 1.5 }, { x: at(1), y: 2 }], color: '#008FFB', markerSize: 1 },
            { name: 'Outlier', type: 'scatter', data: [{ x: at(5), y: 350 }], color: '#FF0000', markerSize: 7 },
        ]);
    });

    it('adds the prediction and the processed input with showDebug', () => {
        const anomalies = chartAnomalies([curve(0, 20, [[at(0), 1, 2]]), curve(10, 30)]);
        const series = valueChartSeries([], anomalies, true);
        expect(series.map((s) => [s.name, s.type, s.color, s.markerSize])).toEqual([
            ['Original', 'line', '#008FFB', 1],
            ['Outlier', 'scatter', '#FF0000', 7],
            ['Prediction', 'line', '#228B22', 0],
            ['Processed', 'line', '#AFE1AF', 0],
        ]);
        expect(series[2].data).toEqual([{ x: at(0), y: 2 }]);
        expect(series[3].data).toEqual([{ x: at(0), y: 1 }]);
    });
});

describe('valueTooltipMessage', () => {
    const outliers = [extreme(5, '350', 500, 800)];

    it('names the series and rounds the value to 2 decimals', () => {
        expect(valueTooltipMessage(0, 0, 12.3456, outliers)).toEqual({ label: 'Device Output:', value: '12.35' });
        expect(valueTooltipMessage(2, 0, 3, outliers)).toEqual({ label: 'Predicted Value:', value: '3.00' });
        expect(valueTooltipMessage(3, 0, -1.005001, outliers)).toEqual({ label: 'Preprocessed Value:', value: '-1.01' });
        expect(valueTooltipMessage(4, 0, 7, outliers)).toEqual({ label: '', value: '7.00' });
    });

    it('shows the raw value and the bounds of an extreme outlier', () => {
        expect(valueTooltipMessage(1, 0, 350, outliers)).toEqual({ label: 'Extreme Outlier:', value: '350 [500-800]' });
    });
});

describe('waiting times', () => {
    it('measures from each value to the next older one, 0 for the oldest', () => {
        expect(waitingTimes(values([30, 0], [20, 0], [5, 0]))).toEqual([10 * minute, 15 * minute, 0]);
        expect(waitingTimes([])).toEqual([]);
    });

    it('picks the unit by the average', () => {
        expect(waitingTimeLevel([60000, 60000])).toBe('seconds');
        expect(waitingTimeLevel([61000])).toBe('minutes');
        expect(waitingTimeLevel([2 * 3600000])).toBe('hours');
        expect(waitingTimeLevel([2 * 86400000])).toBe('days');
        expect(waitingTimeLevel([31 * 86400000])).toBe('Months');
        expect(waitingTimeLevel([])).toBe('seconds');
    });

    it('converts into the unit', () => {
        expect(roundMilliseconds(90000, 'seconds')).toBe(90);
        expect(roundMilliseconds(90000, 'minutes')).toBe(1.5);
        expect(roundMilliseconds(5400000, 'hours')).toBe(1.5);
        expect(roundMilliseconds(129600000, 'days')).toBe(1.5);
    });

    // SNRGY-4848: there was no conversion for Months, the axis said months while the values stayed milliseconds.
    it('converts into months of 30 days', () => {
        const day = 86400000;
        const data: DeviceValue[] = [{ timestamp: new Date(t0 + 62 * day).toISOString(), value: 1 }, { timestamp: new Date(t0).toISOString(), value: 1 }];
        const chart = timeChartSeries(data, []);
        expect(chart.yTitle).toBe('Waiting time in Months');
        expect(chart.series[0].data[0].y).toBeCloseTo(62 / 30, 10);
        expect(chart.series[0].data[1].y).toBe(0);
    });
});

describe('timeChartSeries', () => {
    it('plots the waiting times in the unit of their average and the frequency anomalies as outliers', () => {
        const freq = { type: 'freq', timestamp: iso(25), value: '4' } as AnomalyResultModel;
        const chart = timeChartSeries(values([30, 0], [28, 0], [26, 0]), [freq, extreme(1, '2', 0, 1)]);
        expect(chart.yTitle).toBe('Waiting time in minutes');
        expect(chart.series).toEqual([
            { name: 'Waiting Time', data: [{ x: at(30), y: 2 }, { x: at(28), y: 2 }, { x: at(26), y: 0 }], color: '#008FFB', markerSize: 5 },
            { name: 'Outlier', type: 'scatter', data: [{ x: at(25), y: 4 }], color: '#FF0000', markerSize: 7 },
        ]);
    });
});
