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

import { googleDecimal } from 'src/app/core/charts/google-look';
import { categoryColumnsConfig, FramedChartConfig } from 'src/app/core/charts/google-columns';
import { GoogleFrame } from 'src/app/core/charts/google-chartjs';
import { labelledLine } from 'src/app/core/charts/google-tooltip';
import { deviceGatewayColumnColor, GatewayDeviceCount } from './device-gateway-chart';

/** One column per gateway labelled with its count; the tooltip names the gateway and its count. */
export function devicesPerGatewayChart(counts: GatewayDeviceCount[], frame: GoogleFrame): FramedChartConfig<'bar'> {
    return categoryColumnsConfig({
        frame,
        categories: counts.map((c) => c.name),
        values: counts.map((c) => c.count),
        color: deviceGatewayColumnColor,
        valueLabel: (value) => googleDecimal(value),
        barLabels: counts.map((c) => googleDecimal(c.count)),
        tooltip: (index) => [[{ text: counts[index].name, bold: true }], labelledLine('Count', googleDecimal(counts[index].count))],
    });
}
