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

import { NG_CHARTS_CONFIGURATION } from 'ng2-charts';
import { CoreModule } from './core.module';

describe('CoreModule', () => {
    // The app imports it eagerly, so its providers are at root: the device and the connection history dialogs open from
    // root services and draw a timeline outside the lazy modules; without this, "bar" was no registered controller.
    it('provides the chart configuration', () => {
        const providers = ((CoreModule as any).ɵinj.providers as unknown[]).flat(Infinity) as { provide?: unknown; useValue?: any }[];
        const charts = providers.find((p) => p?.provide === NG_CHARTS_CONFIGURATION);
        // chart.js' registerables come as groups, e.g. all controllers in one object
        const ids = (r: any): string[] => (typeof r?.id === 'string' ? [r.id] : Object.values(r || {}).flatMap(ids));
        expect(ids(charts?.useValue.registerables)).toEqual(jasmine.arrayContaining(['bar', 'time', 'zoom', 'annotation']));
    });
});
