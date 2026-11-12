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

import { ProcessNetworkSelectionService } from './process-network-selection.service';

describe('ProcessNetworkSelectionService', () => {
    const key = 'senergy.processes.network';

    afterEach(() => sessionStorage.removeItem(key));

    it('starts on all networks', () => {
        expect(new ProcessNetworkSelectionService().network).toBeNull();
    });

    it('keeps a network for a reload of the tab', () => {
        new ProcessNetworkSelectionService().network = 'hub-1';
        expect(new ProcessNetworkSelectionService().network).toBe('hub-1');
    });

    it('forgets the network when all networks are chosen', () => {
        const selection = new ProcessNetworkSelectionService();
        selection.network = 'cloud';
        selection.network = null;
        expect(new ProcessNetworkSelectionService().network).toBeNull();
        expect(sessionStorage.getItem(key)).toBeNull();
    });

    it('keeps the network in memory when the storage is blocked', () => {
        spyOn(sessionStorage, 'getItem').and.throwError('blocked');
        spyOn(sessionStorage, 'setItem').and.throwError('blocked');
        const selection = new ProcessNetworkSelectionService();
        expect(selection.network).toBeNull();
        selection.network = 'hub-1';
        expect(selection.network).toBe('hub-1');
    });
});
