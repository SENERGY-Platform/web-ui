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

import { Injectable } from '@angular/core';

const storageKey = 'senergy.processes.network';

/**
 * The network the process lists (deployments, monitor) were last filtered by in this session: null for all networks,
 * ENGINE_CLOUD_NETWORK for the platform, otherwise a hub id (SNRGY-3353). A list opened without hubId in its URL and
 * without a target of its own shows it, so that switching between the views keeps the gateway. Kept in the
 * sessionStorage of the tab, so that a reload keeps it too; without storage it lasts until the app is reloaded.
 */
@Injectable({ providedIn: 'root' })
export class ProcessNetworkSelectionService {
    private current: string | null = null;

    constructor() {
        try {
            const stored = sessionStorage.getItem(storageKey);
            this.current = stored ? stored : null;
        } catch {
            // storage blocked, e.g. by the browser settings
        }
    }

    get network(): string | null {
        return this.current;
    }

    set network(network: string | null) {
        this.current = network;
        try {
            if (network) {
                sessionStorage.setItem(storageKey, network);
            } else {
                sessionStorage.removeItem(storageKey);
            }
        } catch {
            // storage blocked; the value still lasts until the app is reloaded
        }
    }
}
