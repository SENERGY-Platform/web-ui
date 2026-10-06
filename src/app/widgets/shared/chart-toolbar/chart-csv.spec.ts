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

import { chartCsv } from './chart-csv';

describe('chartCsv', () => {
    it('lists the day of every x value in ascending order with the value of each series', () => {
        const day1 = new Date(2026, 9, 5, 8).getTime();
        const day2 = new Date(2026, 9, 6, 8).getTime();
        const csv = chartCsv([
            { label: 'Original', data: [{ x: day2, y: 2 }, { x: day1, y: 1.5 }] },
            { label: 'Out,lier', data: [{ x: day2, y: 9 }] },
        ]);
        expect(csv).toBe('\uFEFFcategory,Original,Outlier\n' + new Date(day1).toDateString() + ',1.5,\n' + new Date(day2).toDateString() + ',2,9');
    });
});
