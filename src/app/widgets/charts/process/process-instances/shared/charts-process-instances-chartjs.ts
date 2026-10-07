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

import { GoogleFrame } from 'src/app/core/charts/google-chartjs';
import { GooglePieConfig, googlePieConfig, pieSlices } from 'src/app/core/charts/google-pie';
import { ProcessStatusCount } from './charts-process-instances-chart';

/** A pie of the states in Google's default colours with the labeled legend; empty states have no slice. */
export function processStatusChart(counts: ProcessStatusCount[], frame: GoogleFrame): GooglePieConfig & { frame: GoogleFrame } {
    return { frame, ...googlePieConfig(pieSlices(counts.map((c) => ({ label: c.label, value: c.count }))), frame) };
}
