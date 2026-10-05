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

import { ChartType } from 'ng-apexcharts';
import { ApexChartOptions } from 'src/app/widgets/charts/export/shared/charts-export-properties.model';
import { AnomalyResultModel, DeviceValue } from '../../shared/anomaly.model';

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
    x: number;
    x2: number;
    fillColor: string;
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

function combineCurveAnomalies(curveAnomalies: AnomalyResultModel[]): any[] {
    /* Curve Anomalies can overlap. The interval bounds and reconstructions need to be merged
       Assumption: curveAnomalies is sorted by ascending occurence
    */
    let anomalyIntervals: any[] = [];
    let overlapFound = false;
    const anomaliesWithOverlap: AnomalyResultModel[] = [];
    const startTimesOfFirstOverlaps: any[] = [];

    const point = {
        x: 0,
        x2: 0,
        fillColor: '#FF4C4C',
        opacity: 0.4,
    };

    for (let index = 0; index < curveAnomalies.length; index++) {
        const currentAnomaly = curveAnomalies[index];
        if (index === curveAnomalies.length - 1) {
            if (overlapFound) {
                break;
            }
            point.x = new Date(currentAnomaly.start_time).getTime();
            point.x2 = new Date(currentAnomaly.end_time).getTime();
            anomalyIntervals.push(point);
            break;
        }

        const nextAnomaly = curveAnomalies[index + 1];
        if (new Date(nextAnomaly.start_time).getTime() < new Date(currentAnomaly.end_time).getTime()) {
            // Case: Overlap with the next anomaly
            overlapFound = true;
            currentAnomaly.end_time = nextAnomaly.end_time;
            anomaliesWithOverlap.push(currentAnomaly);
            startTimesOfFirstOverlaps.push(nextAnomaly.start_time);
        } else {
            // Case: No Overlap, Interval can be directly created from anomaly
            point.x = new Date(currentAnomaly.start_time).getTime();
            point.x2 = new Date(currentAnomaly.end_time).getTime();
            anomalyIntervals.push(point);
        }
    }

    if (!overlapFound) {
        return [anomalyIntervals, []];
    } else {
        const result = combineCurveAnomalies(anomaliesWithOverlap);
        anomalyIntervals = anomalyIntervals.concat(result[0]);
    }

    const points: any[] = createReconstructionPoints(curveAnomalies, startTimesOfFirstOverlaps);
    return [anomalyIntervals, points];
}

function createReconstructionPoints(anomalies: AnomalyResultModel[], startTimesOfFirstOverlaps: any[]) {
    /* Assumption: Reconstruction are sorted asc by timestamp
       startTimesOfFirstOverlaps contains start times of overlapping intervals. These are end bounds for reconstructions from single anomalies.
    */
    const reconstrucedPoints: any[] = [];
    const reconstructionInputPoints: any[] = [];

    anomalies.forEach((anomaly, anomalyIndex) => {
        const reconstructions: any[] = anomaly.original_reconstructed_curves;
        const endTimeOfAnomalyPhase = new Date(startTimesOfFirstOverlaps[anomalyIndex]); // will be undefined for anomalies that are not overlapping
        for (let index = 0; index < reconstructions.length; index++) {
            const reconstruction = reconstructions[index];
            const ts = reconstruction[0];
            if (endTimeOfAnomalyPhase != null && new Date(ts).getTime() > endTimeOfAnomalyPhase.getTime()) {
                // Outside of anomaly interval
                break;
            }

            const inputValue = reconstruction[1];
            const reconstructedValue = reconstruction[2];
            reconstrucedPoints.push({
                x: new Date(ts).getTime(),
                y: parseFloat(reconstructedValue)
            });
            reconstructionInputPoints.push({
                x: new Date(ts).getTime(),
                y: parseFloat(inputValue)
            });
        }
    });

    return [reconstrucedPoints, reconstructionInputPoints];
}

/** Splits the anomalies of a device into outlier points and curve anomaly intervals. Merging overlaps rewrites end_time of the given anomalies. */
export function chartAnomalies(deviceAnomalies: AnomalyResultModel[]): ChartAnomalies {
    const outlierPoints: XYPoint[] = [];
    const curveAnomalies: AnomalyResultModel[] = [];
    const extremeOutliers: AnomalyResultModel[] = [];
    deviceAnomalies.forEach(anomaly => {
        const ts = new Date(anomaly.timestamp).getTime();
        if (anomaly.type === 'extreme_value') {
            extremeOutliers.push(anomaly);
            outlierPoints.push({
                x: ts,
                y: parseFloat(anomaly.value)
            });
        } else if (anomaly.type === 'curve') {
            curveAnomalies.push(anomaly);
        }
    });

    const result = combineCurveAnomalies(curveAnomalies);
    const points = result[1];
    return {
        outlierPoints,
        reconstructedPoints: points[0],
        reconstructionInputPoints: points[1],
        intervals: result[0],
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

/** The tooltip text of the value chart, by series: device output, extreme outlier with its bounds, prediction, preprocessed value. */
export function valueTooltipMessage(seriesIndex: number, dataPointIndex: number, value: number, extremeOutliers: AnomalyResultModel[]): string {
    const formatted = value.toFixed(2);
    switch (seriesIndex) {
    case 0:
        return '<b>Device Output:</b> ' + formatted;
    case 1: {
        const anomaly = extremeOutliers[dataPointIndex];
        return '<b>Extreme Outlier:</b> ' + anomaly.value + ' [' + anomaly.lower_bound + '-' + anomaly.upper_bound + ']';
    }
    case 2:
        return '<b>Predicted Value:</b> ' + formatted;
    case 3:
        return '<b>Preprocessed Value:</b> ' + formatted;
    default:
        return formatted;
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

export function apexAnomalyChartOptions(chartType: ChartType): ApexChartOptions {
    return {
        series: [],
        chart: {
            redrawOnParentResize: true,
            redrawOnWindowResize: true,
            width: '100%',
            height: 'auto',
            animations: {
                enabled: false
            },
            type: chartType,
            toolbar: {
                show: true
            },
            events: {}
        },
        title: {},
        plotOptions: {},
        xaxis: {
            type: 'datetime' as 'datetime' | 'category',
            labels: {
                datetimeUTC: false,
            },
            title: {
                text: ''
            }
        },
        yaxis: {
            title: {
                text: ''
            },
            decimalsInFloat: 3
        },
        colors: [],
        legend: {
            show: true
        },
        annotations: {
            points: [],
            xaxis: []
        },
        tooltip: {
            enabled: true,
            x: {
                format: 'dd.MM HH:mm:ss.fff',
            }
        },
        markers: {
        },
    };
}

/** Apex series, colours and marker sizes from the neutral series. */
export function applyApexSeries(chartData: ApexChartOptions, series: AnomalyLineSeries[]) {
    series.forEach((s) => chartData.series.push(s.type === undefined ? { data: s.data, name: s.name } : { data: s.data, name: s.name, type: s.type }));
    const colors = series.map((s) => s.color);
    chartData.markers.colors = colors;
    chartData.colors = colors;
    chartData.markers.size = series.map((s) => s.markerSize);
}
