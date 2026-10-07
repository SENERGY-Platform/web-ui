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
import { reconstructionAxisTitle, ReconstructionPoint, reconstructionSeriesNames } from './reconstruction-chart';

export const reconstructionFrame = googleFrame(1000, 500);

/** The true value in Google's first and the expected one in its second colour, 1000x500 without legend. */
export function reconstructionChart(points: ReconstructionPoint[]): FramedChartConfig<'line'> {
    const sorted = [...points].sort((a, b) => a.time.getTime() - b.time.getTime());
    const numeric = (v: any) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
    return googleLinesConfig({
        frame: reconstructionFrame,
        kind: 'line',
        series: [
            { label: reconstructionSeriesNames[0], color: googlePalette[0], points: sorted.map((p) => ({ x: p.time.getTime(), y: numeric(p.true) })) },
            { label: reconstructionSeriesNames[1], color: googlePalette[1], points: sorted.map((p) => ({ x: p.time.getTime(), y: numeric(p.expected) })) },
        ],
        axes: { left: { title: reconstructionAxisTitle } },
    });
}
