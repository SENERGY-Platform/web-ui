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

import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SortDirection } from '@angular/material/sort';
import { forkJoin, Observable, map, concatMap } from 'rxjs';
import { DeviceTypeModel } from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from 'src/app/modules/metadata/device-types-overview/shared/device-type.service';
import { LocationModel } from '../../../locations/shared/locations.model';
import { LocationsService } from '../../../locations/shared/locations.service';
import { ExtendedHubModel, HubModel } from '../../../networks/shared/networks.model';
import { NetworksService } from '../../../networks/shared/networks.service';
import { DeviceConnectionState, DeviceInstancesRouterStateTabEnum, FilterSelection } from '../../shared/device-instances.model';
import { DeviceInstancesService } from '../../shared/device-instances.service';

@Component({
    selector: 'app-device-instances-filter-dialog',
    templateUrl: './device-instances-filter-dialog.component.html',
    styleUrls: ['./device-instances-filter-dialog.component.css']
})
export class DeviceInstancesFilterDialogComponent implements OnInit {
    sortDirection: SortDirection = 'asc';
    locationOptions: LocationModel[] = [];
    networkOptions: HubModel[] = [];
    deviceTypeOptions: DeviceTypeModel[] = [];
    connectionOptions: DeviceConnectionState[] = [
        {name: 'Online', value: DeviceInstancesRouterStateTabEnum.ONLINE},
        {name: 'Offline', value: DeviceInstancesRouterStateTabEnum.OFFLINE},
        {name: 'Unknown', value: DeviceInstancesRouterStateTabEnum.UNKNOWN}
    ];

    form = new FormGroup({
        location: new FormControl<string|undefined>(undefined),
        network: new FormControl<string|undefined>(undefined),
        deviceTypes: new FormControl<string[]>([]),
        connectionState: new FormControl<DeviceInstancesRouterStateTabEnum|undefined>(DeviceInstancesRouterStateTabEnum.ALL),
        filter_inactive: new FormControl<boolean>(false),
    });

    savedFilterSelection!: FilterSelection | undefined;
    ready = false;

    constructor(
    private dialogRef: MatDialogRef<DeviceInstancesFilterDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: FilterSelection | undefined,
    private locationsService: LocationsService,
    private networksService: NetworksService,
    private deviceTypesService: DeviceTypeService,
    private deviceInstancesService: DeviceInstancesService,
    private cd: ChangeDetectorRef,
    ) {
        this.savedFilterSelection = data;
    }

    ngOnInit(): void {
        const optionLoadObs: Observable<any>[] = [];

        optionLoadObs.push(
            this.locationsService.getLocations({sortBy: 'name', sortDirection: this.sortDirection}).pipe(map((value) => {
                this.locationOptions = value.result;
            }))
        );

        optionLoadObs.push(
            // 100, 0, 'name', this.sortDirection
            this.networksService.listExtendedHubs({limit:100, offset:0, sortBy:'name', sortDesc: this.sortDirection !== 'asc'}).pipe(
                map((resp) => resp ? resp.result : [] as ExtendedHubModel[]),
                map((value) => {
                    this.networkOptions = value;
                })
            )
        );

        optionLoadObs.push(
            this.deviceInstancesService.listUsedDeviceTypeIds().pipe(
                concatMap((deviceTypeIds) => this.deviceTypesService.getDeviceTypeListByIds(deviceTypeIds)),
                map((deviceTypes) => {
                    this.deviceTypeOptions = deviceTypes;
                })
            )
        );

        forkJoin(optionLoadObs).subscribe({
            next: (_) => {
                this.preselectFormValues();
                this.ready = true;
            },
            error: (err) => {
                console.log(err);
                this.ready = true;
            }
        });
    }

    preselectFormValues() {
        if(!this.savedFilterSelection) {
            return;
        }

        if(this.savedFilterSelection.connectionState != null) {
            this.form.controls.connectionState.patchValue(this.savedFilterSelection.connectionState);
        }

        if(this.savedFilterSelection.deviceTypes != null) {
            this.form.controls.deviceTypes.patchValue(this.savedFilterSelection.deviceTypes);
        }

        if(this.savedFilterSelection.location != null) {
            this.form.controls.location.patchValue(this.savedFilterSelection.location);
        }

        if(this.savedFilterSelection.network != null) {
            this.form.controls.network.patchValue(this.savedFilterSelection.network);
        }

        if(this.savedFilterSelection.deviceAttributeBlacklist?.find(attr => attr.key === 'inactive' && attr.value === 'true', origin === 'web-ui')) {
            this.form.controls.filter_inactive.patchValue(true);
            this.cd.markForCheck(); 
        }
    }

    resetConnectionFilter() {
        this.form.controls.connectionState.patchValue(DeviceInstancesRouterStateTabEnum.ALL);
    }

    resetLocationFilter() {
        this.form.controls.location.patchValue(undefined);
    }

    resetNetworkFilter() {
        this.form.controls.network.patchValue(undefined);
    }

    resetDeviceTypeFilter() {
        this.form.controls.deviceTypes.patchValue([]);
    }

    close(): void {
        this.dialogRef.close();
    }

    filter() {
        const filterSelection: FilterSelection = this.form.value as FilterSelection;
        filterSelection.networkName = this.networkOptions.find(n => n.id === filterSelection.network)?.name;
        filterSelection.locationName = this.locationOptions.find(n => n.id === filterSelection.location)?.name;
        filterSelection.deviceTypesNames = [];
        filterSelection.deviceTypes?.forEach(dt => {
            filterSelection.deviceTypesNames?.push(this.deviceTypeOptions.find(d => d.id === dt)?.name || '');
        });        
        if(this.form.controls.filter_inactive.value) {
            filterSelection.deviceAttributeBlacklist =  [{key: 'inactive', value: 'true', origin: 'web-ui'}];
        }
        this.dialogRef.close(filterSelection);
    }
}
