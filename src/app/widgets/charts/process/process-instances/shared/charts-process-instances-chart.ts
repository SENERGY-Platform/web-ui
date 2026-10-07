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

export interface ProcessStatusCount {
    label: string;
    count: number;
}

/** One slice per instance state, always all five and in this order; instances in a state not among them are not counted. */
export function processStatusCounts(processes: MonitorProcessModel[]): ProcessStatusCount[] {
    const status = { active: 0, suspended: 0, completed: 0, externallyTerminated: 0, internallyTerminated: 0 };
    processes.forEach((process) => {
        switch (process.state) {
        case 'ACTIVE': {
            status.active++;
            break;
        }
        case 'SUSPENDED': {
            status.suspended++;
            break;
        }
        case 'COMPLETED': {
            status.completed++;
            break;
        }
        case 'EXTERNALLY_TERMINATED': {
            status.externallyTerminated++;
            break;
        }
        case 'INTERNALLY_TERMINATED': {
            status.internallyTerminated++;
            break;
        }
        }
    });
    return [
        { label: 'Active', count: status.active },
        { label: 'Suspended', count: status.suspended },
        { label: 'Completed', count: status.completed },
        { label: 'ExternallyTerminated', count: status.externallyTerminated },
        { label: 'InternallyTerminated', count: status.internallyTerminated },
    ];
}
