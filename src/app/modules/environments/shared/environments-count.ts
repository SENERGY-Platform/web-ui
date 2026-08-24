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

import { Environment, Zone } from './environments.model';

export interface EnvironmentEntityCounts {
    zones: number;
    assets: number;
    channels: number;
}

/**
 * Counts zones, assets and channels of an environment, descending through the
 * arbitrarily nested zone tree (a zone can contain further zones).
 */
export function countEnvironmentEntities(env: Environment): EnvironmentEntityCounts {
    const counts: EnvironmentEntityCounts = { zones: 0, assets: 0, channels: 0 };
    countZones(env.zones, counts);
    return counts;
}

function countZones(zones: Zone[] | undefined, counts: EnvironmentEntityCounts): void {
    (zones || []).forEach(zone => {
        counts.zones += 1;
        (zone.assets || []).forEach(asset => {
            counts.assets += 1;
            counts.channels += (asset.channels || []).length;
        });
        countZones(zone.zones, counts);
    });
}
