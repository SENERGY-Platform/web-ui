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
import { deploymentsPerDay, deploymentsTooltip } from './charts-process-deployments-chart';

function started(startTime: string): MonitorProcessModel {
    return { startTime } as MonitorProcessModel;
}

describe('deploymentsPerDay', () => {
    it('counts the instances per start day, oldest day first, whatever order they come in', () => {
        const days = deploymentsPerDay([
            started('2026-10-05T08:00:00.000+0200'),
            started('2026-10-03T23:59:00.000+0200'),
            started('2026-10-05T07:00:00.000+0200'),
        ]);
        expect(days).toEqual([
            { date: new Date(2026, 9, 3), count: 1 },
            { date: new Date(2026, 9, 5), count: 2 },
        ]);
    });

    it('takes the day from the start time text, not from the instant it denotes', () => {
        const days = deploymentsPerDay([started('2026-10-05T23:30:00.000-0500')]);
        expect(days).toEqual([{ date: new Date(2026, 9, 5), count: 1 }]);
    });

    // SNRGY-4848 item 5: the day was UTC midnight, which west of UTC is still the day before in local time.
    it('dates each day at local midnight, so the tooltip shows the day of the start time in any time zone', () => {
        const [day] = deploymentsPerDay([started('2026-10-05T08:00:00Z')]);
        expect([day.date.getFullYear(), day.date.getMonth(), day.date.getDate(), day.date.getHours(), day.date.getMinutes()]).toEqual([2026, 9, 5, 0, 0]);
        expect(deploymentsTooltip(day.date, day.count, 'de-DE')).toBe('5.10.2026\ncount: 1');
    });

    it('leaves days without instances out', () => {
        const days = deploymentsPerDay([started('2026-10-01T00:00:00Z'), started('2026-10-04T00:00:00Z')]);
        expect(days.map((d) => d.count)).toEqual([1, 1]);
    });

    // SNRGY-4848 item 5: the array shared with the other process widgets used to be sorted in place.
    it('leaves the given array as it is', () => {
        const processes = [started('2026-10-05T00:00:00Z'), started('2026-10-01T00:00:00Z')];
        deploymentsPerDay(processes);
        expect(processes.map((p) => p.startTime)).toEqual(['2026-10-05T00:00:00Z', '2026-10-01T00:00:00Z']);
    });
});

describe('deploymentsTooltip', () => {
    it('shows the date and the count', () => {
        expect(deploymentsTooltip(new Date(2026, 9, 5), 3, 'de-DE')).toBe('5.10.2026\ncount: 3');
        expect(deploymentsTooltip(new Date(2026, 9, 5), 1, 'en-US')).toBe('10/5/2026\ncount: 1');
    });

    it('formats the date in the browser locale by default', () => {
        expect(deploymentsTooltip(new Date(2026, 9, 5), 2)).toBe(new Date(2026, 9, 5).toLocaleDateString() + '\ncount: 2');
    });
});
