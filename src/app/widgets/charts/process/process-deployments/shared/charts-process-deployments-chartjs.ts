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

import { googleAxisNumber } from 'src/app/core/charts/google-look';
import { dateColumnsConfig, FramedChartConfig } from 'src/app/core/charts/google-columns';
import { GoogleFrame } from 'src/app/core/charts/google-chartjs';
import { DeploymentsPerDay, deploymentsTooltip, processDeploymentsColumnColor } from './charts-process-deployments-chart';

/** One column per day on a date axis; the tooltip shows the date and the count. */
export function deploymentsChart(days: DeploymentsPerDay[], frame: GoogleFrame): FramedChartConfig<'bar'> {
    return dateColumnsConfig({
        frame,
        times: days.map((d) => d.date.getTime()),
        values: days.map((d) => d.count),
        color: processDeploymentsColumnColor,
        outline: false,
        valueLabel: googleAxisNumber,
        tooltip: (index) => deploymentsTooltip(days[index].date, days[index].count).split('\n').map((text) => [{ text }]),
    });
}
