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

import { googlePercent } from 'src/app/core/charts/google-look';
import { categoryColumnsConfig, FramedChartConfig } from 'src/app/core/charts/google-columns';
import { GoogleFrame } from 'src/app/core/charts/google-chartjs';
import { deviceDowntimeGatewayColumnColor, GatewayDowntime } from './device-downtime-gateway-chart';

/** One column per gateway with its percentage on or above it, a '#.## %' axis from 0 and no tooltip. */
export function downtimePerGatewayChart(rows: GatewayDowntime[], frame: GoogleFrame): FramedChartConfig<'bar'> {
    return categoryColumnsConfig({
        frame,
        categories: rows.map((r) => r.name),
        values: rows.map((r) => r.failureRatio),
        color: deviceDowntimeGatewayColumnColor,
        min: 0,
        valueLabel: (value) => googlePercent(value),
        barLabels: rows.map((r) => r.label),
    });
}
