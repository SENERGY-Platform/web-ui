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

import { format } from 'date-fns';
import { googlePercent } from 'src/app/core/charts/google-look';
import { FramedChartConfig } from 'src/app/core/charts/google-columns';
import { GoogleFrame } from 'src/app/core/charts/google-chartjs';
import { googleLinesConfig } from 'src/app/core/charts/google-lines';
import { deviceTotalDowntimeColor, FailureRatioInterval, failureRatioPoints, failureRatioTooltip } from './device-total-downtime-chart';

/** The ratios as area over the day with HH:mm labels and a '#.## %' axis from 0, drag to zoom and right click to reset. */
export function totalDowntimeChart(intervals: FailureRatioInterval[], frame: GoogleFrame): FramedChartConfig<'line'> {
    const points = failureRatioPoints(intervals);
    return googleLinesConfig({
        frame,
        kind: 'area',
        series: [{ label: 'Percentage', color: deviceTotalDowntimeColor, points }],
        axes: { left: { label: (value) => googlePercent(value), min: 0 } },
        xFormat: (date) => format(date, 'HH:mm'),
        explorer: true,
        tooltip: (_, index) => {
            const point = points[index];
            return point.y === null ? undefined : failureRatioTooltip(new Date(point.x), point.y).split('\n').map((text) => [{ text }]);
        },
    });
}
