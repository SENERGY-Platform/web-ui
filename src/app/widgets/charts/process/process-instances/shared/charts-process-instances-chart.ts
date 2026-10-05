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
import { ChartsDataTableModel } from '../../../shared/charts-data-table.model';
import { ChartElementSize, ChartsModel } from '../../../shared/charts.model';

export interface ProcessStatusCount {
    label: string;
    count: number;
}

/** One slice per instance state, always all five and in this order; an unknown state throws. */
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
        default: {
            throw new Error('Unknown process state.');
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

/** Google data table: one row per slice. */
export function processStatusTable(counts: ProcessStatusCount[]): ChartsDataTableModel {
    const dataTable = new ChartsDataTableModel([['Status', 'Count']]);
    counts.forEach(({ label, count }) => dataTable.data.push([label, count]));
    return dataTable;
}

export function processStatusChart(dataTable: ChartsDataTableModel, element: ChartElementSize): ChartsModel {
    return new ChartsModel('PieChart', dataTable.data, {
        chartArea: { width: element.widthPercentage, height: element.heightPercentage },
        height: element.height,
        width: element.width,
        pieSliceText: 'none',
        legend: {
            position: 'labeled',
        }
    });
}
