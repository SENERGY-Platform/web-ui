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
import { catchError, concatMap, map, of } from 'rxjs';
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

  form = this.fb.group({
    mode: [this.modeClone, Validators.required],
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
    switch (this.form.get('mode')?.value) {
      case this.modeClone:
        const clone = JSON.parse(JSON.stringify(this.data.device)) as DeviceInstanceModel;
        clone.attributes = clone.attributes?.filter((value)=>value.key !== 'shared/nickname');
        clone.name = this.form.get('clone.name')?.value || this.data.device.name;
        clone.id = ''; // set by API
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
        let deviceGroup: DeviceGroupModel | null = null;
        this.deviceInstancesService.updateDeviceInstance(this.data.device).pipe(
          concatMap(_ => this.deviceGroupsService.getGeneratedDeviceGroupOfDevice(this.data.device.id).pipe(map(dg => deviceGroup = dg))),
          concatMap(_ => this.deviceInstancesService.saveDeviceInstance(clone)),
          concatMap(d => {
            if (deviceGroup !== null && d !== null) {
              deviceGroup.device_ids.push(d.id);
              return this.deviceGroupsService.updateDeviceGroup(deviceGroup);
            }
            return of(null);
          }),
          map(_ => this.dialogRef.close(true)),
          catchError(this.errorHandlerService.handleErrorWithSnackBar('Error Saving', DeviceInstancesReplaceDialogComponent.name, 'save')),
        ).subscribe();
        return;

      case this.modeChoose:
        this.errorHandlerService.showErrorInSnackBar('not implemented');
        return;
      default:
        this.errorHandlerService.showErrorInSnackBar('Error Saving: Unknown Mode');
        return;
    }
  }

  close() {
    this.dialogRef.close(false);
  }
}
