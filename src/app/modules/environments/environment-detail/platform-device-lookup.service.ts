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

import { inject, Injectable, signal } from '@angular/core';
import { DeviceInstancesService } from '../../devices/device-instances/shared/device-instances.service';
import { DeviceTypeService as PlatformDeviceTypeService } from '../../metadata/device-types-overview/shared/device-type.service';
import { DeviceTypeModel } from '../../metadata/device-types-overview/shared/device-type.model';
import { DatasetSource } from '../shared/environments.model';

/**
 * Display names and device types of the platform devices that dataset sources and assets
 * reference, looked up on demand as they are shown rather than for the whole document.
 */
@Injectable()
export class PlatformDeviceLookup {
    private deviceInstancesService = inject(DeviceInstancesService);
    private platformDeviceTypeService = inject(PlatformDeviceTypeService);

    private readonly namesState = signal<ReadonlyMap<string, string>>(new Map());
    private readonly typesState = signal<ReadonlyMap<string, DeviceTypeModel>>(new Map());
    private loading = new Set<string>();
    /** The cached options are valid only for the types map they were built from, which is replaced whenever an entry is added. */
    private serviceOptionsCache = new WeakMap<DatasetSource, { ref?: string; types: ReadonlyMap<string, DeviceTypeModel>; options: DeviceTypeModel['services'] }>();
    private columnOptionsCache = new WeakMap<DatasetSource, { ref?: string; serviceRef?: string; types: ReadonlyMap<string, DeviceTypeModel>; options: string[] }>();

    /** Device id to display name, for every device resolved so far. */
    readonly names = this.namesState.asReadonly();
    /** Device id to device type, for every device whose type resolved. */
    readonly types = this.typesState.asReadonly();

    /**
     * Every service of the device a platform-origin dataset source points at. Cached per dataset
     * object so the Service select does not get a fresh [items] array on every change-detection pass.
     */
    serviceOptions(dataset: DatasetSource): DeviceTypeModel['services'] {
        const types = this.typesState();
        const cached = this.serviceOptionsCache.get(dataset);
        if (cached && cached.ref === dataset.ref && cached.types === types) {
            return cached.options;
        }
        const deviceType = dataset.ref ? types.get(dataset.ref) : undefined;
        const options = deviceType?.services || [];
        this.serviceOptionsCache.set(dataset, { ref: dataset.ref, types, options });
        return options;
    }

    /** Every value path of the chosen service's outputs, cached like serviceOptions and additionally keyed on dataset.service_ref. */
    columnOptions(dataset: DatasetSource): string[] {
        const types = this.typesState();
        const cached = this.columnOptionsCache.get(dataset);
        if (cached && cached.ref === dataset.ref && cached.serviceRef === dataset.service_ref && cached.types === types) {
            return cached.options;
        }
        const service = this.serviceOptions(dataset).find((s) => s.id === dataset.service_ref);
        const paths: string[] = [];
        (service?.outputs || []).forEach((output) => {
            this.platformDeviceTypeService.getValuePathsAndContentVariables(output.content_variable).forEach((p) => paths.push(p.path));
        });
        this.columnOptionsCache.set(dataset, { ref: dataset.ref, serviceRef: dataset.service_ref, types, options: paths });
        return paths;
    }

    /** Loads the device behind a platform-origin dataset source; a no-op for any other origin or an unset ref. */
    ensureLoadedForDataset(dataset: DatasetSource | undefined): void {
        this.ensureLoaded(dataset?.origin === 'platform' ? dataset.ref : undefined);
    }

    /** Loads the display name and device type of a platform device by id, once; a no-op for an unset id or one already loaded or loading. */
    ensureLoaded(id: string | undefined): void {
        if (!id || this.namesState().has(id) || this.loading.has(id)) {
            return;
        }
        this.loading.add(id);
        this.deviceInstancesService.getDeviceInstance(id).subscribe((device) => {
            this.loading.delete(id);
            if (!device) {
                return;
            }
            this.namesState.update((names) => new Map(names).set(id, device.display_name || id));
            this.platformDeviceTypeService.getDeviceType(device.device_type_id).subscribe((deviceType) => {
                if (deviceType) {
                    this.typesState.update((types) => new Map(types).set(id, deviceType));
                }
            });
        });
    }
}
