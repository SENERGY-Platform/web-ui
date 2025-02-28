/*
 * Copyright 2024 InfAI (CC SES)
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
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Attribute, DeviceInstanceModel } from '../../shared/device-instances.model';
import { DeviceInstancesService } from '../../shared/device-instances.service';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { DatePipe } from '@angular/common';
import { catchError, concatMap, forkJoin, map, Observable, of, throwError } from 'rxjs';
import { DeviceGroupsService } from '../../../device-groups/shared/device-groups.service';
import { DeviceGroupModel } from '../../../device-groups/shared/device-groups.model';
import { DeviceTypeModel } from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from 'src/app/modules/metadata/device-types-overview/shared/device-type.service';

@Component({
  selector: 'app-device-instances-replace-dialog',
  templateUrl: './device-instances-replace-dialog.component.html',
  styleUrls: ['./device-instances-replace-dialog.component.css']
})
export class DeviceInstancesReplaceDialogComponent implements OnInit {
  DeviceInstancesReplaceDialogComponent = DeviceInstancesReplaceDialogComponent;
  static modeClone = 1;
  static modeExisting = 2;

  groupAddAll = 1;
  groupAddGenerated = 2;
  groupAddNone = 3;

  form = this.fb.group({
    mode: [DeviceInstancesReplaceDialogComponent.modeClone, Validators.required],
    groupAddition: [this.groupAddAll, Validators.required],
    clone: this.fb.group({ // default --> set validators
      name: [this.data.device.display_name || this.data.device.name],
    }),
    existing: this.fb.group({
      deviceType: [''],
      device:  new FormControl<DeviceInstanceModel|null>(null),
    }),
  });

  deviceTypes: DeviceTypeModel[] = [];
  deviceTypesDisabled = new Map<string, boolean>();
  deviceInstancesByType = new Map<string, DeviceInstanceModel[]>();
  allDeviceGroups: DeviceGroupModel[] | undefined;

  constructor(
    private dialogRef: MatDialogRef<DeviceInstancesReplaceDialogComponent>,
    private fb: FormBuilder,
    private deviceInstancesService: DeviceInstancesService,
    private deviceGroupsService: DeviceGroupsService,
    private errorHandlerService: ErrorHandlerService,
    private datePipe: DatePipe,
    private deviceTypeService: DeviceTypeService,

    @Inject(MAT_DIALOG_DATA) private data: {
      device: DeviceInstanceModel;
    },
  ) {
  }

  ngOnInit(): void {
    const limit = 9999;
    let offset = 0;
    const f = () => {
      this.deviceTypeService.getDeviceTypes('', limit, offset, 'name', 'asc').subscribe(dt => {
        this.deviceTypes.push(...dt.result);
        offset += dt.result.length;
        if (this.deviceTypes.length < dt.total) {
          f();
        }
      });
    };
    f();

    this.form.get('mode')?.valueChanges.subscribe(mode => {
      if (mode === DeviceInstancesReplaceDialogComponent.modeExisting && this.form.get('groupAddition')?.value !== this.groupAddNone) {
        this.prepareDeviceTypesDisabled();
      }
    });
    this.form.get('groupAddition')?.valueChanges.subscribe(groupAddition => {
      if (groupAddition !== this.groupAddNone && this.form.get('mode')?.value === DeviceInstancesReplaceDialogComponent.modeExisting) {
        this.prepareDeviceTypesDisabled();
      }
    });
    this.form.get('existing.deviceType')?.valueChanges.subscribe(deviceType => {
      if (deviceType !== null) {
        this.loadDeviceInstancesByType(deviceType).subscribe();
      }
    });
  }

  save() {
    let newDevice: Observable<DeviceInstanceModel>; // every 'mode' option needs to fill this
    switch (this.form.get('mode')?.value) {
      case DeviceInstancesReplaceDialogComponent.modeClone:
        const clone = JSON.parse(JSON.stringify(this.data.device)) as DeviceInstanceModel;
        clone.attributes = clone.attributes?.filter((value) => value.key !== 'shared/nickname');
        clone.name = this.form.get('clone.name')?.value || this.data.device.name;
        clone.id = ''; // set by API
        newDevice = this.deviceInstancesService.saveDeviceInstance(clone).pipe(concatMap(d => d === null ? throwError(() => 'device is null') : of(d)));
        break;
      case DeviceInstancesReplaceDialogComponent.modeExisting:
        const device = this.form.get('existing.device')?.value;
        if (device === undefined || device === null) {
          this.errorHandlerService.showErrorInSnackBar('Error Saving: Devcie null');
          return;
        }
        newDevice = of(device);
        break;
      default:
        this.errorHandlerService.showErrorInSnackBar('Error Saving: Unknown Mode');
        return;
    }
    // edit old device is the same for all 'mode' options
    this.data.device.local_id += '_' + this.datePipe.transform(new Date(), 'yy_MM_dd');
    const attrIndex = this.data.device.attributes?.findIndex(a => a.key === 'inactive') || -1;
    if (attrIndex != -1) {
      this.data.device.attributes![attrIndex].value = 'true'; // just checked
    } else {
      const attr: Attribute = {
        key: 'inactive',
        value: 'true',
        origin: 'web-ui',
      };
      if (this.data.device.attributes === undefined) {
        this.data.device.attributes = [attr];
      } else {
        this.data.device.attributes.push(attr);
      }
    }
    let deviceGroups: DeviceGroupModel[] = [];
    this.getDeviceGroupsToUpdate().pipe(
      map(dgs => deviceGroups = dgs), // remember device groups
      concatMap(_ => this.deviceInstancesService.updateDeviceInstance(this.data.device)),
      concatMap(_ => newDevice), // materialize new device
      concatMap(d => { // put new device in relevant groups
        const obs: Observable<unknown>[] = [of(null)];
        deviceGroups.forEach(deviceGroup => {
          if (deviceGroup.device_ids.findIndex(id => id === d.id) === -1) { // not yet in group
            deviceGroup.device_ids.push(d.id);
            obs.push(this.deviceGroupsService.updateDeviceGroup(deviceGroup));
          }
        });
        return forkJoin(obs);
      }),
      map(_ => this.dialogRef.close(true)),
      catchError(this.errorHandlerService.handleErrorWithSnackBar('Error Saving', DeviceInstancesReplaceDialogComponent.name, 'save')),
    ).subscribe();
  }

  close() {
    this.dialogRef.close(false);
  }

  private getDeviceGroupsToUpdate(): Observable<DeviceGroupModel[]> {
    const deviceGroups: DeviceGroupModel[] = [];

    switch (this.form.get('groupAddition')?.value) {
      case this.groupAddNone:
        return of([]);
      case this.groupAddGenerated:
        return this.deviceGroupsService.getGeneratedDeviceGroupOfDevice(this.data.device.id).pipe(map(dg => {
          if (dg !== null) {
            deviceGroups.push(dg);
          }
        })).pipe(map(_ => deviceGroups));
      case this.groupAddAll:
        if (this.allDeviceGroups !== undefined) {
          return of(this.allDeviceGroups);
        }
        return new Observable<DeviceGroupModel[]>(o => {
          let offset = 0;
          const limit = 9999;
          const f = () => { // recursively collect device groups and return them as one list
            this.deviceGroupsService.getDeviceGroups('', limit, offset, '', '', false).subscribe(dg => {
              deviceGroups.push(...dg.result.filter(group => group.device_ids.indexOf(this.data.device.id) !== -1));
              offset += dg.result.length;
              if (dg.result.length < limit) {
                this.allDeviceGroups = deviceGroups;
                o.next(deviceGroups);
                o.complete();
              } else {
                f();
              }
            });
          };
          f(); // initialize recursion
        });
      default:
        return throwError(() => 'not implemented');
    }
  }

  deviceTypeDisabledFn(): (deviceType: DeviceTypeModel) => boolean {
    const m = this.deviceTypesDisabled;
    return (deviceType: DeviceTypeModel) => m.get(deviceType.id) || false;
  }

  getDeviceName = (device: DeviceInstanceModel) => device.display_name || device.name;

  private prepareDeviceTypesDisabled() { // call whenever groupAddition changes and mode === this.modeChoose
    // TODO

    // getDeviceGroupsToUpdate

    // get usage+criteria of the device groups
    // // in processes-deployments
    // // for each hub https://api.senergy.infai.org/process-sync/networks
    // //// in fog-deployments (process-sync) https://api.senergy.infai.org/process-sync/metadata/:hubId
    // // in analytics
    // // in smart services

    // get device types (where user has a device) // if not cached in the component
    // cache in the component
    // for each device type
    // // if device type misses a usage+criteria --> disable that device type (how?)

    // store the list in the component for use in senergy-select-search
  }

  private loadDeviceInstancesByType(deviceTypeId: string): Observable<DeviceInstanceModel[]> {
    if (this.deviceInstancesByType.has(deviceTypeId)) {
      return of(this.deviceInstancesByType.get(deviceTypeId) || []);
    }
    return new Observable<DeviceInstanceModel[]>(o => {
      const deviceInstances: DeviceInstanceModel[] = [];
      const limit = 9999;
      let offset = 0;
      const f = () => {
        this.deviceInstancesService.getDeviceInstances({ limit, offset, deviceTypeIds: [deviceTypeId] }).subscribe(devices => {
          deviceInstances.push(...devices.result);
          offset += devices.result.length;
          if (deviceInstances.length < devices.total) {
            f();
          } else {
            this.deviceInstancesByType.set(deviceTypeId, deviceInstances);
            o.next(deviceInstances);
            o.complete();
          }
        });
      };
      f();
    });
  }
}
