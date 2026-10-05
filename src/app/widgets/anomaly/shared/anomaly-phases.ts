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

import { ChartsExportVAxesModel } from '../../charts/export/shared/charts-export-properties.model';
import { AnomaliesPerDevice, AnomalyResultModel } from './anomaly.model';

export const anomalyPhaseColor = '#ff0000';
export const normalPhaseColor = '#008000';

function createIntervalsPerAnomaly(anomalies: AnomalyResultModel[]) {
    const anomalyPhases: any[][] = [];
    for (let index = 0; index < anomalies.length; index++) {
        const anomaly = anomalies[index];
        const anomalyStartTime = anomaly.start_time;
        const anomalyEndTime = anomaly.end_time;
        anomalyPhases.push([anomalyStartTime, 1]);
        anomalyPhases.push([anomalyEndTime, 1]);

        if (index === anomalies.length - 1) {
            break;
        }
        const nextAnomaly = anomalies[index + 1];
        const nextAnomalyStartTime = nextAnomaly.start_time;
        // only add normal phase when start time of next anomaly is after end time of current anomaly
        if (new Date(nextAnomalyStartTime).getTime() <= new Date(anomalyEndTime).getTime()) {
            continue;
        }
        anomalyPhases.push([anomalyEndTime, 0]);
        anomalyPhases.push([nextAnomalyStartTime, 0]);
    }
    return anomalyPhases;
}

function createIntervalsPerDevice(anomalies: AnomalyResultModel[], earliestStartTime: Date, now: Date) {
    /* Create time windows based on the found anomalies of one device.
       For each anomaly, a window from start to end will be created.
       For time between anomalies a normal window will be created.
       Edge Cases:
       - No anomalies
       - First anomaly started after the time window history (e.g. the last 2 days, anomaly started yesterday)
       - Last anomaly ended 1 day before. Everything normal until now()
    */
    let anomalyPhases: any[][] = [];
    const nowStr = now.toISOString();

    if (anomalies.length === 0) {
        anomalyPhases.push([earliestStartTime, 0]);
        anomalyPhases.push([nowStr, 0]);
        return anomalyPhases;
    }

    const firstAnomaly = anomalies[0];
    if (new Date(firstAnomaly.start_time) > new Date(earliestStartTime)) {
        anomalyPhases.push([earliestStartTime, 0]);
        anomalyPhases.push([firstAnomaly.start_time, 0]);
    }

    anomalyPhases = anomalyPhases.concat(createIntervalsPerAnomaly(anomalies));

    const lastAnomaly = anomalies[0];
    if (new Date(lastAnomaly.end_time) < now) {
        anomalyPhases.push([lastAnomaly.end_time, 0]);
        anomalyPhases.push([nowStr, 0]);
    }

    return anomalyPhases;
}

/** Per device, in key order: alternating [time, 1] anomaly and [time, 0] normal phase bounds, oldest first. */
export function phaseWindows(anomalies: AnomaliesPerDevice, earliestStartTime: Date, now: Date) {
    const anomalyPhases: any[][][] = [];
    let deviceIndex = 0;
    for (const [_, anomaliesPerDevice] of Object.entries(anomalies)) {
        const intervals = createIntervalsPerDevice(anomaliesPerDevice, earliestStartTime, now);
        anomalyPhases[deviceIndex] = intervals;
        deviceIndex += 1;
    }
    return anomalyPhases;
}

/** The curve anomalies of every device, keyed in the order of deviceIDs. */
export function curveAnomaliesPerDevice(anomalies: AnomaliesPerDevice, deviceIDs: string[]): AnomaliesPerDevice {
    const result: AnomaliesPerDevice = {};
    deviceIDs.forEach(deviceID => {
        result[deviceID] = anomalies[deviceID].filter((anomaly) => anomaly.type === 'curve');
    });
    return result;
}

/** The timeline input: one request with one column per device. */
export function phaseTimelineData(phases: any[][][]): any[] {
    phases.sort((a: any, b: any) => new Date(b[0] as string).getTime() - new Date(a[0] as string).getTime());
    return phases.map((phase) => [phase]);
}

/** One timeline row per device, labelled with the device id. */
export function phaseVAxes(deviceIDs: string[]): ChartsExportVAxesModel[] {
    return deviceIDs.map((deviceID) => ({
        exportName: '',
        instanceId: '',
        math: '',
        color: '',
        valueName: '',
        valueType: '',
        valueAlias: deviceID,
        conversions: [{
            from: '1',
            to: '1',
            color: anomalyPhaseColor,
            alias: 'auffaellig'
        }, {
            from: '0',
            to: '0',
            color: normalPhaseColor,
            alias: 'normal'
        }]
    }));
}
