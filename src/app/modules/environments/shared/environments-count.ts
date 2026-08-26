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

/**
 * Assets whose platform device the simulation created itself (external_managed=true, see
 * Asset.external_managed): deleting the environment also deletes those devices. Everything
 * else -- external_managed false or absent, i.e. an existing device the user linked -- is
 * never touched by that delete, so it does not count here. Descends through the same
 * arbitrarily nested zone tree as countEnvironmentEntities.
 */
export function countManagedPlatformDevices(env: Environment): number {
    let count = 0;
    const walk = (zones: Zone[] | undefined): void => {
        (zones || []).forEach(zone => {
            (zone.assets || []).forEach(asset => {
                if (asset.external_managed) {
                    count += 1;
                }
            });
            walk(zone.zones);
        });
    };
    walk(env.zones);
    return count;
}

/**
 * Assets that will get a new platform device created for them on the next save: they carry
 * external_type_id but not yet external_ref (see assetFromDeviceType's doc comment -- a new
 * machine is deliberately built this way, with the server filling in external_ref on save).
 * Meant to be read from the document as it is about to be sent, before a save's response can
 * update it.
 */
export function countPendingPlatformDevices(env: Environment): number {
    let count = 0;
    const walk = (zones: Zone[] | undefined): void => {
        (zones || []).forEach(zone => {
            (zone.assets || []).forEach(asset => {
                if (asset.external_type_id && !asset.external_ref) {
                    count += 1;
                }
            });
            walk(zone.zones);
        });
    };
    walk(env.zones);
    return count;
}
