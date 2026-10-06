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
import { TimelineSelection } from '../../charts/shared/chart-types/timeline/timeline-chartjs';

export const anomalyPhaseColor = '#ff0000';
export const anomalyPhaseName = 'auffaellig';
export const normalPhaseColor = '#008000';

/** A group of curve anomalies that overlap or lie within one another, from the first start to the last end. */
export interface AnomalyGroup {
    start: number;
    end: number;
    /** sorted by start */
    anomalies: AnomalyResultModel[];
}

const startOf = (anomaly: AnomalyResultModel) => new Date(anomaly.start_time).getTime();
const endOf = (anomaly: AnomalyResultModel) => new Date(anomaly.end_time).getTime();

/** The anomalies sorted by start and merged into groups wherever one starts before the group so far ends. */
export function anomalyGroups(anomalies: AnomalyResultModel[]): AnomalyGroup[] {
    const groups: AnomalyGroup[] = [];
    // stable, so that anomalies starting together keep their order
    [...anomalies].sort((a, b) => startOf(a) - startOf(b)).forEach((anomaly) => {
        const last = groups[groups.length - 1];
        if (last !== undefined && startOf(anomaly) < last.end) {
            last.end = Math.max(last.end, endOf(anomaly));
            last.anomalies.push(anomaly);
        } else {
            groups.push({ start: startOf(anomaly), end: endOf(anomaly), anomalies: [anomaly] });
        }
    });
    return groups;
}

/**
 * The phase bounds of one device, oldest first: normal from the earliest start (or the first anomaly) on,
 * anomalous for every group of overlapping anomalies, normal in between and from the last end until now.
 */
function createIntervalsPerDevice(anomalies: AnomalyResultModel[], earliestStartTime: Date, now: Date) {
    const anomalyPhases: any[][] = [];
    const nowStr = now.toISOString();
    const iso = (ms: number) => new Date(ms).toISOString();
    const groups = anomalyGroups(anomalies);

    if (groups.length === 0) {
        anomalyPhases.push([earliestStartTime, 0]);
        anomalyPhases.push([nowStr, 0]);
        return anomalyPhases;
    }
    if (groups[0].start > earliestStartTime.getTime()) {
        anomalyPhases.push([earliestStartTime, 0]);
        anomalyPhases.push([iso(groups[0].start), 0]);
    }
    groups.forEach((group, index) => {
        anomalyPhases.push([iso(group.start), 1]);
        anomalyPhases.push([iso(group.end), 1]);
        const next = groups[index + 1];
        // touching groups have no normal phase between them
        if (next !== undefined && next.start > group.end) {
            anomalyPhases.push([iso(group.end), 0]);
            anomalyPhases.push([iso(next.start), 0]);
        }
    });
    const last = groups[groups.length - 1];
    if (last.end < now.getTime()) {
        anomalyPhases.push([iso(last.end), 0]);
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

/** The timeline input: one request per device, in device order, with its phase bounds newest first as the timeline expects. */
export function phaseTimelineData(phases: any[][][]): any[] {
    // reversed, not sorted by time: equal bounds of adjacent phases must keep their order to stay a pair
    return phases.map((phase) => [phase.slice().reverse()]);
}

/** The first curve anomaly by start lying within a clicked anomaly bar; undefined for a normal phase. */
export function anomalyOfBar(curveAnomalies: AnomalyResultModel[], bar: TimelineSelection): AnomalyResultModel | undefined {
    if (bar.seriesName !== anomalyPhaseName) {
        return undefined;
    }
    return anomalyGroups(curveAnomalies).flatMap((group) => group.anomalies).find((anomaly) => startOf(anomaly) >= bar.start && endOf(anomaly) <= bar.end);
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
            alias: anomalyPhaseName
        }, {
            from: '0',
            to: '0',
            color: normalPhaseColor,
            alias: 'normal'
        }]
    }));
}
