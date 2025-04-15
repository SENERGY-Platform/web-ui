import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, UntypedFormBuilder } from '@angular/forms';
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
        {name: 'connected', value: DeviceInstancesRouterStateTabEnum.ONLINE},
        {name: 'unconnected', value: DeviceInstancesRouterStateTabEnum.OFFLINE},
        {name: 'unknown', value: DeviceInstancesRouterStateTabEnum.UNKNOWN}
    ];

    form = new FormGroup({
        location: new FormControl<string|undefined>(undefined),
        network: new FormControl<string|undefined>(undefined),
        deviceTypes: new FormControl<string[]>([]),
        connectionState: new FormControl<DeviceInstancesRouterStateTabEnum|undefined>(DeviceInstancesRouterStateTabEnum.ALL),
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
    private fb: UntypedFormBuilder,
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
        this.dialogRef.close(this.form.value);
    }
}
