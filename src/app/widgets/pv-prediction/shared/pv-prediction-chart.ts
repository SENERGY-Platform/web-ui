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

import { ChartsModel } from '../../charts/shared/charts.model';
import { PVPredictionResult } from './prediction.model';

export const pvPredictionAxisTitle = 'Average Power in W';

export interface PvPredictionPoint {
    time: Date;
    value: number;
}

export function pvPredictionPoints(data: PVPredictionResult): PvPredictionPoint[] {
    return data.predictions.map((row) => ({ time: new Date(row.timestamp), value: row.value }));
}

/** The summed prediction of the last `time` hours (or days for level 'd') of the hourly predictions, e.g. "12.35 Wh". */
export function nextPvPredictionText(data: PVPredictionResult, level: string, time: number): string {
    if (level === 'd') {
        time = time * 24;
    }
    const filteredData = data.predictions.slice(-time);
    const aggregatedPrediction = filteredData.reduce((accumulator, current) => accumulator + current.value, 0);
    return Math.round(aggregatedPrediction * 100) / 100 + ' Wh';
}

/** Google line chart of the predictions, without legend. */
export function pvPredictionChart(points: PvPredictionPoint[]): ChartsModel {
    const dataTable: any = [['time', 'energy']];
    points.forEach((point) => dataTable.push([point.time, point.value]));
    return new ChartsModel('LineChart', dataTable, {
        legend: { position: 'none' },
        vAxis: {
            title: pvPredictionAxisTitle
        }
    });
}
