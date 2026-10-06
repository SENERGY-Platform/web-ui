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
import { AnomalyGroup, anomalyGroups } from '../../shared/anomaly-phases';

export const anomalyPointSize = 7;
export const anomalyPointColor = '#FF0000';
export const normalPointSize = 1;
export const normalPointColor = '#008FFB';
export const predictionColor = '#228B22';
export const processedColor = '#AFE1AF';
export const debugPointSize = 0;
export const normalWaitingPointSize = 5;

export interface XYPoint {
    x: number;
    y: any;
}

export interface AnomalyLineSeries {
    name: string;
    type?: 'line' | 'scatter';
    data: XYPoint[];
    color: string;
    markerSize: number;
}

/** A shaded x range marking a (merged) curve anomaly. */
export interface AnomalyInterval {
    from: number;
    to: number;
    color: string;
    opacity: number;
}

export interface ChartAnomalies {
    outlierPoints: XYPoint[];
    reconstructedPoints: XYPoint[];
    reconstructionInputPoints: XYPoint[];
    intervals: AnomalyInterval[];
    /** the extreme value anomalies in the order of outlierPoints, for the tooltip */
    extremeOutliers: AnomalyResultModel[];
}

const intervalColor = '#FF4C4C';
const intervalOpacity = 0.4;

const startOf = (anomaly: AnomalyResultModel) => new Date(anomaly.start_time).getTime();
const endOf = (anomaly: AnomalyResultModel) => new Date(anomaly.end_time).getTime();

/**
 * The reconstruction (prediction) and its input of every group of curve anomalies. At each time the curve of the
 * latest started anomaly still running is shown; between groups the line breaks with a point without value.
 */
function reconstructionPoints(groups: AnomalyGroup[]): [XYPoint[], XYPoint[]] {
    const reconstructed: XYPoint[] = [];
    const inputs: XYPoint[] = [];
    groups.forEach((group, groupIndex) => {
        const points: { x: number; reconstructed: number; input: number }[] = [];
        group.anomalies.forEach((anomaly, index) => {
            const later = group.anomalies.slice(index + 1).filter((other) => startOf(other) > startOf(anomaly));
            for (const [ts, inputValue, reconstructedValue] of anomaly.original_reconstructed_curves || []) {
                const x = new Date(ts).getTime();
                // a later anomaly takes over right after its start, so both curves share that point
                if (!later.some((other) => startOf(other) < x && x <= endOf(other))) {
                    points.push({ x, reconstructed: parseFloat(String(reconstructedValue)), input: parseFloat(String(inputValue)) });
                }
            }
        });
        points.sort((a, b) => a.x - b.x).forEach((p) => {
            reconstructed.push({ x: p.x, y: p.reconstructed });
            inputs.push({ x: p.x, y: p.input });
        });
        if (groupIndex < groups.length - 1 && points.length > 0) {
            reconstructed.push({ x: group.end, y: null });
            inputs.push({ x: group.end, y: null });
        }
    });
    return [reconstructed, inputs];
}

/** Splits the anomalies of a device into outlier points and curve anomaly intervals, without changing them. */
export function chartAnomalies(deviceAnomalies: AnomalyResultModel[]): ChartAnomalies {
    const outlierPoints: XYPoint[] = [];
    const curveAnomalies: AnomalyResultModel[] = [];
    const extremeOutliers: AnomalyResultModel[] = [];
    deviceAnomalies.forEach(anomaly => {
        if (anomaly.type === 'extreme_value') {
            extremeOutliers.push(anomaly);
            outlierPoints.push({
                x: new Date(anomaly.timestamp).getTime(),
                y: parseFloat(anomaly.value)
            });
        } else if (anomaly.type === 'curve') {
            curveAnomalies.push(anomaly);
        }
    });
    const groups = anomalyGroups(curveAnomalies);
    const [reconstructedPoints, reconstructionInputPoints] = reconstructionPoints(groups);
    return {
        outlierPoints,
        reconstructedPoints,
        reconstructionInputPoints,
        intervals: groups.map((group) => ({ from: group.start, to: group.end, color: intervalColor, opacity: intervalOpacity })),
        extremeOutliers,
    };
}

/** The device curve with its outliers and, with showDebug, the reconstruction the operator compared it to. */
export function valueChartSeries(deviceValues: DeviceValue[], anomalies: ChartAnomalies, showDebug: boolean): AnomalyLineSeries[] {
    const series: AnomalyLineSeries[] = [
        { name: 'Original', type: 'line', data: deviceValues.map((v) => ({ x: new Date(v.timestamp).getTime(), y: v.value })), color: normalPointColor, markerSize: normalPointSize },
        { name: 'Outlier', type: 'scatter', data: anomalies.outlierPoints, color: anomalyPointColor, markerSize: anomalyPointSize },
    ];
    if (showDebug) {
        series.push({ name: 'Prediction', type: 'line', data: anomalies.reconstructedPoints, color: predictionColor, markerSize: debugPointSize });
        series.push({ name: 'Processed', type: 'line', data: anomalies.reconstructionInputPoints, color: processedColor, markerSize: debugPointSize });
    }
    return series;
}

/** The tooltip line of the value chart, by series: device output, extreme outlier with its bounds, prediction, preprocessed value. */
export function valueTooltipMessage(seriesIndex: number, dataPointIndex: number, value: number, extremeOutliers: AnomalyResultModel[]): { label: string; value: string } {
    const formatted = value.toFixed(2);
    switch (seriesIndex) {
    case 0:
        return { label: 'Device Output:', value: formatted };
    case 1: {
        const anomaly = extremeOutliers[dataPointIndex];
        return { label: 'Extreme Outlier:', value: anomaly.value + ' [' + anomaly.lower_bound + '-' + anomaly.upper_bound + ']' };
    }
    case 2:
        return { label: 'Predicted Value:', value: formatted };
    case 3:
        return { label: 'Preprocessed Value:', value: formatted };
    default:
        return { label: '', value: formatted };
    }
}

/** Time from each value to the next older one in ms, 0 for the oldest; expects newest first. */
export function waitingTimes(data: DeviceValue[]): number[] {
    const waitingTimesInMs: number[] = [];
    for (let index = 0; index < data.length; index++) {
        const nextIndex = index + 1;
        if (nextIndex > data.length - 1) {
            waitingTimesInMs.push(0);
            break;
        }
        const currentRow = data[index];
        const nextRow = data[nextIndex];
        const waitingTime = new Date(currentRow.timestamp).getTime() - new Date(nextRow.timestamp).getTime();
        waitingTimesInMs.push(waitingTime);
    }
    return waitingTimesInMs;
}

/** The unit the average waiting time is shown in. */
export function waitingTimeLevel(timesInMs: number[]): string {
    const sum = timesInMs.reduce((a, b) => a + b, 0);
    const avg = sum / timesInMs.length;
    let level = 'seconds';
    let time = avg / 1000;

    if (time > 60) {
        level = 'minutes';
        time = time / 60;

        if (time > 60) {
            time = time / 60;
            level = 'hours';

            if (time > 24) {
                time = time / 24;
                level = 'days';

                if (time > 30) {
                    time = time / 30;
                    level = 'Months';
                }
            }
        }
    }
    return level;
}

export function roundMilliseconds(miliseconds: number, to: string): number {
    switch (to) {
    case 'seconds':
        return miliseconds / 1000;
    case 'minutes':
        return miliseconds / 1000 / 60;
    case 'hours':
        return miliseconds / 1000 / 60 / 60;
    case 'days':
        return miliseconds / 1000 / 60 / 60 / 24;
    case 'Months':
        return miliseconds / 1000 / 60 / 60 / 24 / 30;
    }

    return miliseconds;
}

/** The waiting time between values in the unit of their average, plus the frequency anomalies as outliers. */
export function timeChartSeries(data: DeviceValue[], deviceAnomalies: AnomalyResultModel[]): { yTitle: string; series: AnomalyLineSeries[] } {
    const times = waitingTimes(data);
    const level = waitingTimeLevel(times);
    const points: XYPoint[] = times.map((waitingTime, index) => ({ x: new Date(data[index].timestamp).getTime(), y: roundMilliseconds(waitingTime, level) }));
    const outliers: XYPoint[] = deviceAnomalies
        .filter((anomaly) => anomaly.type === 'freq')
        .map((anomaly) => ({ x: new Date(anomaly.timestamp).getTime(), y: parseFloat(anomaly.value) }));
    return {
        yTitle: 'Waiting time in ' + level,
        series: [
            { name: 'Waiting Time', data: points, color: normalPointColor, markerSize: normalWaitingPointSize },
            { name: 'Outlier', type: 'scatter', data: outliers, color: anomalyPointColor, markerSize: anomalyPointSize },
        ],
    };
}
