import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SortDirection } from '@angular/material/sort';
import { forkJoin, Observable, map, concatMap } from 'rxjs';
import { DeviceTypeBaseModel } from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from 'src/app/modules/metadata/device-types-overview/shared/device-type.service';
import { LocationModel } from '../../../locations/shared/locations.model';
import { LocationsService } from '../../../locations/shared/locations.service';
import { NetworksModel } from '../../../networks/shared/networks.model';
import { NetworksService } from '../../../networks/shared/networks.service';
import { DeviceConnectionState, FilterSelection } from '../../shared/device-instances.model';
import { DeviceInstancesService } from '../../shared/device-instances.service';

@Component({
  selector: 'app-device-instances-filter-dialog',
  templateUrl: './device-instances-filter-dialog.component.html',
  styleUrls: ['./device-instances-filter-dialog.component.css']
})
export class DeviceInstancesFilterDialogComponent implements OnInit {
  sortDirection: SortDirection = "asc"  
  locationOptions: LocationModel[] = [];
  networkOptions: NetworksModel[] = [];
  deviceTypeOptions: DeviceTypeBaseModel[] = [];
  connectionOptions: DeviceConnectionState[] = [{"name": "connected", "value": true}, {"name": "unconnected", "value": false}]

  form = new FormGroup({
    location: new FormControl<string|undefined>(undefined),
    network: new FormControl<string|undefined>(undefined),
    deviceTypes: new FormControl<string[]>([]),
    connectionState: new FormControl<boolean|undefined>(undefined),
  });

  savedFilterSelection!: FilterSelection | undefined
  ready: boolean = false 

  constructor(
    private dialogRef: MatDialogRef<DeviceInstancesFilterDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: FilterSelection | undefined,
    private locationsService: LocationsService,
    private networksService: NetworksService,
    private deviceTypesService: DeviceTypeService,
    private deviceInstancesService: DeviceInstancesService,
    private fb: UntypedFormBuilder,
    ) {
      this.savedFilterSelection = data
  }

  ngOnInit(): void {
    var optionLoadObs: Observable<any>[] = []

    optionLoadObs.push(
      this.locationsService.listLocations(100, 0, "name", this.sortDirection).pipe(map((value) => {
        this.locationOptions = value;
      }))
    )

    optionLoadObs.push(
    this.networksService.listNetworks(100, 0, "name", this.sortDirection).pipe(map((value) => {
        this.networkOptions = value;
    }))
    )

    optionLoadObs.push(
    this.deviceInstancesService.listUsedDeviceTypeIds().pipe(
      concatMap((deviceTypeIds) => {
        return this.deviceTypesService.getDeviceTypeListByIds(deviceTypeIds)
      }),
      map((deviceTypes) => {
        this.deviceTypeOptions = deviceTypes
      })
      )
    )

    forkJoin(optionLoadObs).subscribe({
      next: (_) => {
        this.preselectFormValues()
        this.ready = true
      },
      error: (err) => {
        console.log(err)
        this.ready = true
      }
    })
  }

  preselectFormValues() {
    if(!this.savedFilterSelection) {
      return 
    }

    if(this.savedFilterSelection.connectionState != null) {
      this.form.controls.connectionState.patchValue(this.savedFilterSelection.connectionState)
    }

    if(this.savedFilterSelection.deviceTypes != null) {
      this.form.controls.deviceTypes.patchValue(this.savedFilterSelection.deviceTypes)
    }

    if(this.savedFilterSelection.location != null) {
      this.form.controls.location.patchValue(this.savedFilterSelection.location)
    }

    if(this.savedFilterSelection.network != null) {
      this.form.controls.network.patchValue(this.savedFilterSelection.network)
    }
  }

  resetConnectionFilter() {
    this.form.controls.connectionState.patchValue(undefined)
  }

  resetLocationFilter() {
    this.form.controls.location.patchValue(undefined)
  }

  resetNetworkFilter() {
    this.form.controls.network.patchValue(undefined)
  }

  resetDeviceTypeFilter() {
    this.form.controls.deviceTypes.patchValue([])
  }

  close(): void {
    this.dialogRef.close();
  }

  filter() {
    this.dialogRef.close(this.form.value)
  }
}
