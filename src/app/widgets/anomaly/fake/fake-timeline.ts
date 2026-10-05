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

/**
 * Sorts the [timestamp, value] rows newest first (in place) and turns them into timeline rows: 1 while
 * the value lies above the threshold, 0 otherwise, with only the bounds of each run above it kept.
 */
export function thresholdTimeline(data: any, threshold: any): any[] {
    const chartData: any[] = [];

    data.sort((a: any, b: any) => new Date(b[0] as string).getTime() - new Date(a[0] as string).getTime());

    let intervalFound = true;
    for (let index = 0; index < data.length; index++) {
        const row = data[index];
        const currentValue = row[1];
        const ts = row[0];
        let prevTs = new Date().toDateString();
        if (index > 0) {
            const prevRow = data[index - 1];
            prevTs = prevRow[0];
        }

        if (currentValue > threshold && intervalFound) {
            chartData.push([ts, 1]);
            intervalFound = false;
        } else if (currentValue < threshold && !intervalFound) {
            chartData.push([prevTs, 1]);
            intervalFound = true;
        } else if (intervalFound) {
            chartData.push([ts, 0]);
        } else if (!intervalFound && index === data.length - 1) {
            // anomaly at the beggining of the data history
            chartData.push([ts, 1]);
        }
    }

    return chartData;
}
