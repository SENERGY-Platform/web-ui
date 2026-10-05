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

import { ChartsModel } from 'src/app/widgets/charts/shared/charts.model';

export const reconstructionAxisTitle = 'Expected Value';

/** Series names as the chart shows them: value[1] is named "expected", value[2] "true". */
export const reconstructionSeriesNames = ['expected', 'true'];

export interface ReconstructionPoint {
    time: Date;
    expected: any;
    true: any;
}

/** One point per curve value, newest first. */
export function reconstructionPoints(values: any[][]): ReconstructionPoint[] {
    const points = values.map((value) => ({ time: new Date(value[0]), expected: value[1], true: value[2] }));
    points.sort((a, b) => b.time.getTime() - a.time.getTime());
    return points;
}

/** Google line chart, 1000x500 without legend. */
export function reconstructionChart(points: ReconstructionPoint[]): ChartsModel {
    const dataTable: any[] = [['time', ...reconstructionSeriesNames]];
    points.forEach((point) => dataTable.push([point.time, point.expected, point.true]));
    return new ChartsModel('LineChart', dataTable, {
        legend: { position: 'none' },
        vAxis: {
            title: reconstructionAxisTitle
        },
        width: 1000,
        height: 500
    });
}
