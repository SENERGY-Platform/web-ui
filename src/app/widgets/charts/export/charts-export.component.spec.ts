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

import { of } from 'rxjs';
import { ChartsExportComponent } from './charts-export.component';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';

describe('ChartsExportComponent timeline', () => {
    // SNRGY-4848: the timeline passed the axis format as the time range override, e.g. last 'HH:mm'.
    it('requests the timeline without the axis format as time range override', () => {
        const chartsExportService = jasmine.createSpyObj('ChartsExportService', ['getData']);
        chartsExportService.getData.and.returnValue(of({ data: null, metadata: [] }));
        const elementSizeService = { getHeightAndWidthByElementId: () => ({ height: 100, width: 100, heightPercentage: '90%', widthPercentage: '90%' }) };
        const component = new ChartsExportComponent(chartsExportService, elementSizeService as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
        component.widget = { id: 'w', name: 'w', type: 'charts_export', properties: { chartType: 'Timeline', hAxisFormat: 'HH:mm', time: { last: '6h' } } } as WidgetModel;
        (component as any).hAxisFormat = 'HH:mm';

        component.getTimelineData();
        component.getTimelineData('12h');

        expect(chartsExportService.getData.calls.allArgs().map((args: any[]) => args[4])).toEqual([undefined, '12h']);
    });
});
