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

import { Asset, Channel, CatalogDeviceType, CatalogService } from './environments.model';

/**
 * A key usable in Asset.initial_states / a script's moses.device.state.set, derived from a
 * service's name: lowercased, non-alphanumeric runs collapsed to one underscore, trimmed.
 * Falls back to "value" for a name that yields nothing usable (e.g. one that is all symbols).
 */
function stateKeyFromServiceName(name: string | undefined): string {
    const slug = (name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return slug || 'value';
}

/**
 * The channel for one service of a device type. The server's validation
 * (domain.Source.Validate) requires a profile source to be a sensor with a nonzero
 * interval, and rejects a nonzero own-compute interval on anything but script -- so a
 * profile is only valid for a sensor, never for an actuator (see the switch-source-kind
 * fix in environments-source.ts for the same constraint from the editor's side). An
 * actuator instead gets a script that writes the commanded value into the asset's state
 * under a key derived from the service name, so a sensor channel elsewhere can read it
 * back; that key is not created here, it is only referenced by convention.
 */
function channelFromService(service: CatalogService): Channel {
    const base: Channel = {
        name: service.name,
        direction: service.direction,
        characteristic_id: service.characteristic_id,
        external_ref: service.id,
    };
    if (service.direction === 'actuator') {
        return {
            ...base,
            interval_seconds: 0,
            source: {
                kind: 'script',
                interval_seconds: 0,
                script: { code: `moses.device.state.set("${stateKeyFromServiceName(service.name)}", moses.service.input);` },
            },
        };
    }
    return {
        ...base,
        interval_seconds: 30,
        source: { kind: 'profile', interval_seconds: 0, profile: { base: 0 } },
    };
}

/**
 * Builds the asset a "New machine" dialog creates, wiring one channel per service of the
 * chosen device type instead of leaving the user to add and configure them by hand.
 * external_ref is deliberately left unset: the server creates the platform device on save
 * for any asset that carries external_type_id without one, and fills it in -- calling
 * POST /devices from here would leave an orphaned device behind on a cancelled or
 * rejected save.
 */
export function assetFromDeviceType(deviceType: CatalogDeviceType, name: string): Asset {
    return {
        name,
        kind: 'machine',
        external_type_id: deviceType.id,
        channels: (deviceType.services || []).map(channelFromService),
    };
}
