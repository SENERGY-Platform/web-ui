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

import { FramedChartConfig } from 'src/app/core/charts/google-columns';
import { googleFrame } from 'src/app/core/charts/google-chartjs';
import { googlePalette } from 'src/app/core/charts/google-look';
import { googleLinesConfig } from 'src/app/core/charts/google-lines';
import { pvPredictionAxisTitle, PvPredictionPoint } from './pv-prediction-chart';

/** Google's default size, which the chart had because its container gave it none. */
export const pvPredictionFrame = googleFrame(400, 200);

/** The predictions as a line "energy" in Google's first colour over Google's date labels, without legend. */
export function pvPredictionChart(points: PvPredictionPoint[]): FramedChartConfig<'line'> {
    const sorted = [...points].sort((a, b) => a.time.getTime() - b.time.getTime());
    return googleLinesConfig({
        frame: pvPredictionFrame,
        kind: 'line',
        series: [{ label: 'energy', color: googlePalette[0], points: sorted.map((p) => ({ x: p.time.getTime(), y: p.value })) }],
        axes: { left: { title: pvPredictionAxisTitle } },
    });
}
