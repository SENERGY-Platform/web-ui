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
import { FramedChartConfig } from 'src/app/core/charts/google-columns';
import { GoogleFrame } from 'src/app/core/charts/google-chartjs';
import { googlePalette } from 'src/app/core/charts/google-look';
import { googleLinesConfig, GoogleSeries } from 'src/app/core/charts/google-lines';
import { defaultSliceThreshold, GooglePieConfig, googlePieConfig, pieSlices } from 'src/app/core/charts/google-pie';
import { ChartsExportChart } from './shared/charts-export-table';
import { chartDateLocale, storedDateFormat } from './charts-export-chartjs';

function numeric(value: unknown): number | null {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
        return null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

/** One series per table column in its colour, points in time order; values that are no numbers are left out. */
export function chartsExportSeries(chart: ChartsExportChart): GoogleSeries[] {
    const header = chart.dataTable[0] || [];
    const rows = chart.dataTable.slice(1).filter((r) => r[0] instanceof Date).sort((a, b) => (a[0] as Date).getTime() - (b[0] as Date).getTime());
    return header.slice(1).map((label, i) => ({
        label: String(label),
        color: chart.colors[i] || googlePalette[i % googlePalette.length],
        secondAxis: chart.secondAxis[i] === true,
        points: rows.map((r) => ({ x: (r[0] as Date).getTime(), y: numeric(r[i + 1]) })).filter((p) => p.y !== null),
    }));
}

/** The line or scatter chart: both value axes with their titles, the stored axis format, drag to zoom; pretty bounds above 200px height. */
export function chartsExportLineConfig(chart: ChartsExportChart, frame: GoogleFrame): FramedChartConfig<'line'> {
    const dateFormat = storedDateFormat(chart.hAxisFormat);
    return googleLinesConfig({
        frame,
        kind: chart.chartType === 'ScatterChart' ? 'scatter' : 'line',
        series: chartsExportSeries(chart),
        axes: { left: { title: chart.vAxisLabel }, right: { title: chart.secondVAxisLabel } },
        valueMode: frame.height > 200 ? 'pretty' : 'maximized',
        xTitle: chart.hAxisLabel,
        xFormat: dateFormat === undefined ? undefined : (date) => format(date, dateFormat, { locale: chartDateLocale }),
        curve: chart.curved,
        spanGaps: true,
        explorer: true,
    });
}

/** The pie: one slice per row with the labeled legend; small slices grouped below the threshold. */
export function chartsExportPieConfig(chart: ChartsExportChart, frame: GoogleFrame): GooglePieConfig & { frame: GoogleFrame } {
    const rows = chart.dataTable.slice(1).map((r, i) => ({ label: String(r[0]), value: numeric(r[1]) ?? 0, color: chart.colors[i] || googlePalette[i % googlePalette.length] }));
    return { frame, ...googlePieConfig(pieSlices(rows, chart.sliceThreshold ?? defaultSliceThreshold), frame) };
}
