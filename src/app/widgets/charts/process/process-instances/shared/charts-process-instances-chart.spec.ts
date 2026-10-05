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

import { MonitorProcessModel } from '../../../../../modules/processes/monitor/shared/monitor-process.model';
import { processStatusCounts, processStatusTable } from './charts-process-instances-chart';

function inState(state: string): MonitorProcessModel {
    return { state } as MonitorProcessModel;
}

describe('processStatusCounts', () => {
    it('counts every state in a fixed slice order, including the empty ones', () => {
        const counts = processStatusCounts([
            inState('COMPLETED'), inState('ACTIVE'), inState('COMPLETED'), inState('INTERNALLY_TERMINATED'),
        ]);
        expect(counts).toEqual([
            { label: 'Active', count: 1 },
            { label: 'Suspended', count: 0 },
            { label: 'Completed', count: 2 },
            { label: 'ExternallyTerminated', count: 0 },
            { label: 'InternallyTerminated', count: 1 },
        ]);
    });

    it('counts SUSPENDED and EXTERNALLY_TERMINATED into their own slices', () => {
        const counts = processStatusCounts([inState('SUSPENDED'), inState('EXTERNALLY_TERMINATED'), inState('EXTERNALLY_TERMINATED')]);
        expect(counts.map((c) => c.count)).toEqual([0, 1, 0, 2, 0]);
    });

    it('throws on a state it does not know', () => {
        expect(() => processStatusCounts([inState('ACTIVE'), inState('TERMINATED')])).toThrowError('Unknown process state.');
    });
});

describe('processStatusTable (Google)', () => {
    it('has one row per slice', () => {
        expect(processStatusTable([{ label: 'Active', count: 4 }, { label: 'Suspended', count: 0 }]).data).toEqual([
            ['Status', 'Count'],
            ['Active', 4],
            ['Suspended', 0],
        ]);
    });
});
