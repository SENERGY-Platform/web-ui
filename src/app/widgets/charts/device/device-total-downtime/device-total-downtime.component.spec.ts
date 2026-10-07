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

import { of, throwError } from 'rxjs';
import { DeviceTotalDowntimeComponent } from './device-total-downtime.component';
import { WidgetModel } from '../../../../modules/dashboard/shared/dashboard-widget.model';

describe('DeviceTotalDowntimeComponent', () => {
    function component(result: any) {
        const service = { getTotalDowntime: () => result };
        const elementSizeService = { getHeightAndWidthByElementId: () => ({ height: 305, width: 605, heightPercentage: '90%', widthPercentage: '90%' }) };
        const dashboardService = { initWidgetObservable: of('reloadAll') };
        const c = new DeviceTotalDowntimeComponent(service as any, elementSizeService as any, dashboardService as any, {} as any, {} as any);
        c.widget = { id: 'w', properties: {} } as WidgetModel;
        return c;
    }

    // SNRGY-4848 item 3: the error handler was empty, so the spinner ran on after a failure.
    it('stops the spinner and shows no data when loading fails', () => {
        const c = component(throwError(() => new Error('down')));
        c.ngOnInit();
        expect(c.ready).toBeTrue();
        expect(c.refeshing).toBeFalse();
        expect(c.chart).toBeUndefined();
    });

    it('draws the intervals once loaded', () => {
        const c = component(of([{ from: new Date(2026, 9, 5), to: new Date(2026, 9, 5, 0, 15), failureRatio: 0.5 }]));
        c.ngOnInit();
        expect(c.ready).toBeTrue();
        expect(c.chart?.data.datasets[0].data.length).toBe(2);
    });
});
