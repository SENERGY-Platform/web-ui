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

import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Attribute, DeviceInstanceModel } from '../../shared/device-instances.model';
import { DeviceInstancesService } from '../../shared/device-instances.service';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { DatePipe } from '@angular/common';
import { catchError, concatMap, forkJoin, map, Observable, of, throwError } from 'rxjs';
import { DeviceGroupsService } from '../../../device-groups/shared/device-groups.service';
import { DeviceGroupModel } from '../../../device-groups/shared/device-groups.model';

@Component({
  selector: 'app-device-instances-replace-dialog',
  templateUrl: './device-instances-replace-dialog.component.html',
  styleUrls: ['./device-instances-replace-dialog.component.css']
})
export class DeviceInstancesReplaceDialogComponent {
  modeClone = 1;
  modeChoose = 2;

  groupAddAll = 1;
  groupAddGenerated = 2;
  groupAddNone = 3;

  form = this.fb.group({
    mode: [this.modeClone, Validators.required],
    groupAddition: [this.groupAddAll, Validators.required],
    clone: this.fb.group({ // default --> set validators
      name: [this.data.device.display_name || this.data.device.name, Validators.required],
    }),
  });


  constructor(
    private dialogRef: MatDialogRef<DeviceInstancesReplaceDialogComponent>,
    private fb: FormBuilder,
    private deviceInstancesService: DeviceInstancesService,
    private deviceGroupsService: DeviceGroupsService,
    private errorHandlerService: ErrorHandlerService,
    private datePipe: DatePipe,

    @Inject(MAT_DIALOG_DATA) private data: {
      device: DeviceInstanceModel;
    },
  ) {

    this.form.get('mode')?.valueChanges.subscribe(mode => {
      this.form.get('clone.name')?.setValidators(mode === this.modeClone ? null : [Validators.required]);

      this.form.updateValueAndValidity();
    });
  }

  save() {
    let newDevice: Observable<DeviceInstanceModel>; // every 'mode' option needs to fill this
    switch (this.form.get('mode')?.value) {
      case this.modeClone:
        const clone = JSON.parse(JSON.stringify(this.data.device)) as DeviceInstanceModel;
        clone.attributes = clone.attributes?.filter((value) => value.key !== 'shared/nickname');
        clone.name = this.form.get('clone.name')?.value || this.data.device.name;
        clone.id = ''; // set by API
        newDevice = this.deviceInstancesService.saveDeviceInstance(clone).pipe(concatMap(d => d === null ? throwError(() => 'device is null') : of(d)));
        break;
      case this.modeChoose:
        this.errorHandlerService.showErrorInSnackBar('not implemented');
        return;
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
      map(dgs => deviceGroups = dgs), //remember device groups
      concatMap(_ => this.deviceInstancesService.updateDeviceInstance(this.data.device)),
      concatMap(_ => newDevice), // materialize new device
      concatMap(d => { // put new device in relevant groups
        const obs: Observable<any>[] = [of(null)];
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
      return new Observable<DeviceGroupModel[]>(o => {
        let offset = 0;
        const limit = 9999;
        const f = () => { // recursively collect device groups and return them as one list
          this.deviceGroupsService.getDeviceGroups('', limit, offset, '', '', false).subscribe(dg => {
            deviceGroups.push(...dg.result.filter(group => group.device_ids.indexOf(this.data.device.id) !== -1));
            offset += dg.result.length;
            if (dg.result.length < limit) {
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
}
