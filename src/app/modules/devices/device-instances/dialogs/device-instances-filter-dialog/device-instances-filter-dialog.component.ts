/*
 * Copyright 2025 InfAI (CC SES)
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

import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SortDirection } from '@angular/material/sort';
import { concatMap, map, shareReplay } from 'rxjs';
import { FilterDialogConfigModel, FilterDialogResultModel } from 'src/app/core/components/filter-dialog/shared/filter-dialog.model';
import { DeviceTypeService } from 'src/app/modules/metadata/device-types-overview/shared/device-type.service';
import { LocationsService } from '../../../locations/shared/locations.service';
import { ExtendedHubModel } from '../../../networks/shared/networks.model';
import { NetworksService } from '../../../networks/shared/networks.service';
import { DeviceConnectionState, DeviceInstancesRouterStateTabEnum, FilterSelection } from '../../shared/device-instances.model';
import { DeviceInstancesService } from '../../shared/device-instances.service';

@Component({
    selector: 'app-device-instances-filter-dialog',
    templateUrl: './device-instances-filter-dialog.component.html',
})
export class DeviceInstancesFilterDialogComponent implements OnInit {
    sortDirection: SortDirection = 'asc';
    connectionOptions: DeviceConnectionState[] = [
        {name: 'Online', value: DeviceInstancesRouterStateTabEnum.ONLINE},
        {name: 'Offline', value: DeviceInstancesRouterStateTabEnum.OFFLINE},
        {name: 'Unknown', value: DeviceInstancesRouterStateTabEnum.UNKNOWN}
    ];
    config: FilterDialogConfigModel = { fields: [] };

    savedFilterSelection!: FilterSelection | undefined;

    constructor(
    private dialogRef: MatDialogRef<DeviceInstancesFilterDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: FilterSelection | undefined,
    private locationsService: LocationsService,
    private networksService: NetworksService,
    private deviceTypesService: DeviceTypeService,
    private deviceInstancesService: DeviceInstancesService,
    ) {
        this.savedFilterSelection = data;
    }

    ngOnInit(): void {
        // all attribute and device type options come from the same request
        const usedOptions = this.deviceInstancesService.listUsedFilterOptions().pipe(shareReplay(1));
        const selection = this.savedFilterSelection;
        this.config = {
            fields: [
                {
                    key: 'location', label: 'Location', type: 'select', icon: 'place', section: 'Device',
                    items$: this.locationsService.getLocations({sortBy: 'name', sortDirection: this.sortDirection}).pipe(map(value => value.result)),
                    bindLabel: 'name', bindValue: 'id', value: selection?.location,
                },
                {
                    key: 'network', label: 'Network', type: 'select', icon: 'device_hub', section: 'Device',
                    items$: this.networksService.listExtendedHubs({limit: 100, offset: 0, sortBy: 'name', sortDesc: this.sortDirection !== 'asc'}).pipe(
                        map((resp) => resp ? resp.result : [] as ExtendedHubModel[])
                    ),
                    bindLabel: 'name', bindValue: 'id', value: selection?.network,
                },
                {
                    key: 'deviceTypes', label: 'Device Type', type: 'multiselect', icon: 'important_devices', section: 'Device',
                    items$: usedOptions.pipe(concatMap((used) => this.deviceTypesService.getDeviceTypeListByIds(used.deviceTypeIds))),
                    bindLabel: 'name', bindValue: 'id', value: selection?.deviceTypes,
                },
                {
                    key: 'connectionState', label: 'Connection State', type: 'select', icon: 'cloud', section: 'State',
                    items: this.connectionOptions, bindLabel: 'name', bindValue: 'value',
                    value: selection?.connectionState, emptyValue: DeviceInstancesRouterStateTabEnum.ALL,
                },
                {
                    key: 'filter_inactive', label: 'Filter Inactive Devices', type: 'checkbox', section: 'State',
                    value: this.inactiveIsFiltered(),
                },
                {
                    key: 'attributeKeys', label: 'Attribute Key', type: 'multiselect', icon: 'sell', section: 'Attributes',
                    hint: 'Lists devices that have at least one of these attributes',
                    items$: usedOptions.pipe(map((used) => used.attributeKeys)),
                    allowNewValues: true, value: selection?.attributeKeys,
                },
                {
                    key: 'attributeValues', label: 'Attribute Value', type: 'multiselect', icon: 'label', section: 'Attributes',
                    hint: 'Matched independently of the attribute key',
                    items$: usedOptions.pipe(map((used) => used.attributeValues)),
                    allowNewValues: true, value: selection?.attributeValues,
                },
            ]
        } as FilterDialogConfigModel;
    }

    filter(result: FilterDialogResultModel): void {
        const filterSelection: FilterSelection = {
            location: result.values['location'] || undefined,
            locationName: result.labels['location'][0],
            network: result.values['network'] || undefined,
            networkName: result.labels['network'][0],
            deviceTypes: result.values['deviceTypes'] || [],
            deviceTypesNames: result.labels['deviceTypes'],
            connectionState: result.values['connectionState'],
            attributeKeys: result.values['attributeKeys'] || [],
            attributeValues: result.values['attributeValues'] || [],
        };
        if (result.values['filter_inactive']) {
            filterSelection.deviceAttributeBlacklist = [{key: 'inactive', value: 'true', origin: 'web-ui'}];
        }
        this.dialogRef.close(filterSelection);
    }

    close(): void {
        this.dialogRef.close();
    }

    private inactiveIsFiltered(): boolean {
        return this.savedFilterSelection?.deviceAttributeBlacklist?.find(
            attr => attr.key === 'inactive' && attr.value === 'true' && attr.origin === 'web-ui') !== undefined;
    }
}
