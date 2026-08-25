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

import { ENVIRONMENTS_ROUTES } from './environments.module';

// The router takes the first match in array order, and 'environments/datasets' /
// 'environments/:id' are both pathMatch 'full' -- if the detail route came first, it
// would swallow '/environments/datasets' as id="datasets" and the datasets page would
// never render. This pins the registration order directly against that regression.
describe('EnvironmentsModule route registration order', () => {
    it('registers environments/datasets before environments/:id', () => {
        const datasetsIndex = ENVIRONMENTS_ROUTES.findIndex((r) => r.path === 'environments/datasets');
        const detailIndex = ENVIRONMENTS_ROUTES.findIndex((r) => r.path === 'environments/:id');

        expect(datasetsIndex).toBeGreaterThanOrEqual(0);
        expect(detailIndex).toBeGreaterThanOrEqual(0);
        expect(datasetsIndex).toBeLessThan(detailIndex);
    });

    it('routes environments/datasets and environments/:id to their own components', () => {
        const datasets = ENVIRONMENTS_ROUTES.find((r) => r.path === 'environments/datasets');
        const detail = ENVIRONMENTS_ROUTES.find((r) => r.path === 'environments/:id');

        expect(datasets?.component).toBeDefined();
        expect(detail?.component).toBeDefined();
        expect(datasets?.component).not.toBe(detail?.component);
    });
});
