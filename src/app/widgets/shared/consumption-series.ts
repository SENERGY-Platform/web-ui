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

/** Colours of the normal and the anomalous series, in that order. */
export const consumptionColors = ['#008FFB', '#FF0000'];

export interface ConsumptionSeries {
    name: string;
    data: { x: number; y: any }[];
}

/** Splits [timestamp, value, isAnomaly] rows into the normal and the anomalous series; only isAnomaly === 1 counts as anomalous. */
export function consumptionSeries(lastConsumptions: any[][]): ConsumptionSeries[] {
    const points: { x: number; y: any }[] = [];
    const anomalyPoints: { x: number; y: any }[] = [];
    lastConsumptions.forEach(row => {
        const point = { x: new Date(row[0]).getTime(), y: row[1] };
        if (row[2] === 1) {
            anomalyPoints.push(point);
        } else {
            points.push(point);
        }
    });
    return [
        { data: points, name: 'Normal Consumption' },
        { data: anomalyPoints, name: 'Anomalous Consumption' },
    ];
}
