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

import { googleFrame } from 'src/app/core/charts/google-chartjs';
import { processStatusChart } from './charts-process-instances-chartjs';

describe('processStatusChart', () => {
    const frame = googleFrame(605, 305, '90%', '90%');
    const chart = processStatusChart([
        { label: 'Active', count: 3 }, { label: 'Suspended', count: 0 }, { label: 'Completed', count: 6 },
        { label: 'ExternallyTerminated', count: 2 }, { label: 'InternallyTerminated', count: 1 },
    ], frame);

    it('draws a slice per state with instances, in the order of the states', () => {
        expect(chart.data.labels).toEqual(['Active', 'Completed', 'ExternallyTerminated', 'InternallyTerminated']);
        expect(chart.data.datasets[0].data).toEqual([3, 6, 2, 1]);
    });

    it('colours the slices in Google\'s default colours by their position among the states', () => {
        expect(chart.data.datasets[0].backgroundColor).toEqual(['#3366cc', '#ff9900', '#109618', '#990099']);
    });
});
