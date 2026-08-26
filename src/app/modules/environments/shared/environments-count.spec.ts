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

import { countEnvironmentEntities, countManagedPlatformDevices, countPendingPlatformDevices } from './environments-count';
import { Environment } from './environments.model';

describe('countEnvironmentEntities', () => {
    it('counts zero for an environment without zones', () => {
        expect(countEnvironmentEntities({ id: 'e1', name: 'empty' })).toEqual({ zones: 0, assets: 0, channels: 0 });
    });

    it('counts a flat environment with one zone and one asset', () => {
        const env: Environment = {
            id: 'e1',
            zones: [
                {
                    id: 'z1',
                    assets: [
                        { id: 'a1', channels: [{ id: 'c1' }, { id: 'c2' }] },
                    ],
                },
            ],
        };
        expect(countEnvironmentEntities(env)).toEqual({ zones: 1, assets: 1, channels: 2 });
    });

    it('counts recursively through nested zones', () => {
        const env: Environment = {
            id: 'e1',
            zones: [
                {
                    id: 'building',
                    assets: [{ id: 'a1', channels: [{ id: 'c1' }] }],
                    zones: [
                        {
                            id: 'floor',
                            assets: [{ id: 'a2', channels: [] }],
                            zones: [
                                {
                                    id: 'room',
                                    assets: [{ id: 'a3', channels: [{ id: 'c2' }, { id: 'c3' }, { id: 'c4' }] }],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        expect(countEnvironmentEntities(env)).toEqual({ zones: 3, assets: 3, channels: 4 });
    });

    it('treats an asset without channels as zero channels', () => {
        const env: Environment = { id: 'e1', zones: [{ id: 'z1', assets: [{ id: 'a1' }] }] };
        expect(countEnvironmentEntities(env)).toEqual({ zones: 1, assets: 1, channels: 0 });
    });
});

describe('countManagedPlatformDevices', () => {
    it('counts zero for an environment without zones', () => {
        expect(countManagedPlatformDevices({ id: 'e1' })).toBe(0);
    });

    it('counts only assets with external_managed=true, not linked or unconnected ones', () => {
        const env: Environment = {
            id: 'e1',
            zones: [
                {
                    id: 'z1',
                    assets: [
                        { id: 'a1', external_ref: 'd1', external_managed: true },
                        { id: 'a2', external_ref: 'd2', external_managed: false },
                        { id: 'a3' },
                    ],
                },
            ],
        };
        expect(countManagedPlatformDevices(env)).toBe(1);
    });

    // Older servers do not send external_managed at all yet -- undefined must count the
    // same as false, i.e. never as a device the simulation would delete.
    it('treats external_managed=undefined the same as false', () => {
        const env: Environment = { id: 'e1', zones: [{ id: 'z1', assets: [{ id: 'a1', external_ref: 'd1' }] }] };
        expect(countManagedPlatformDevices(env)).toBe(0);
    });

    it('counts recursively through nested zones', () => {
        const env: Environment = {
            id: 'e1',
            zones: [
                {
                    id: 'building',
                    assets: [{ id: 'a1', external_ref: 'd1', external_managed: true }],
                    zones: [
                        { id: 'floor', assets: [{ id: 'a2', external_ref: 'd2', external_managed: true }] },
                    ],
                },
            ],
        };
        expect(countManagedPlatformDevices(env)).toBe(2);
    });
});

describe('countPendingPlatformDevices', () => {
    it('counts zero for an environment without zones', () => {
        expect(countPendingPlatformDevices({ id: 'e1' })).toBe(0);
    });

    it('counts only assets with external_type_id but no external_ref yet', () => {
        const env: Environment = {
            id: 'e1',
            zones: [
                {
                    id: 'z1',
                    assets: [
                        { id: 'a1', external_type_id: 't1' }, // new machine, not saved yet
                        { id: 'a2', external_type_id: 't1', external_ref: 'd2' }, // already has a device
                        { id: 'a3' }, // not platform-backed at all
                    ],
                },
            ],
        };
        expect(countPendingPlatformDevices(env)).toBe(1);
    });

    it('counts recursively through nested zones', () => {
        const env: Environment = {
            id: 'e1',
            zones: [
                {
                    id: 'building',
                    assets: [{ id: 'a1', external_type_id: 't1' }],
                    zones: [
                        { id: 'floor', assets: [{ id: 'a2', external_type_id: 't2' }] },
                    ],
                },
            ],
        };
        expect(countPendingPlatformDevices(env)).toBe(2);
    });
});
