/*
 * Copyright 2021 InfAI (CC SES)
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
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { SelectionModel } from '@angular/cdk/collections';
import { MatLegacyCheckboxChange as MatCheckboxChange } from '@angular/material/legacy-checkbox';
import { DeviceInstancesService } from '../../device-instances/shared/device-instances.service';
import { DeviceInstancesModel } from '../../device-instances/shared/device-instances.model';
import { NetworksService } from '../shared/networks.service';
import { forkJoin, Observable } from 'rxjs';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';

@Component({
    selector: 'senergy-device-groups-pipeline-helper-dialog',
    templateUrl: './networks-delete-dialog.component.html',
    styleUrls: ['./networks-delete-dialog.component.css'],
})
export class NetworksDeleteDialogComponent implements OnInit {
    deviceSelection = new SelectionModel<DeviceInstancesModel>(true, []);
    ready = true;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { networkId: string; devices: DeviceInstancesModel[] },
        private dialogRef: MatDialogRef<NetworksDeleteDialogComponent>,
        private deviceInstancesService: DeviceInstancesService,
        private networksService: NetworksService,
        private snackBar: MatSnackBar,
    ) {}

    ngOnInit(): void {
        this.deviceSelection = new SelectionModel<DeviceInstancesModel>(true, []);
        console.log(this.data)
    }

    save() {
        this.ready = false;
        const ids = this.deviceSelection.selected.map((p) => p.id);
        const obs: Observable<any>[] = [];
        if (ids.length > 0) {
            obs.push(this.deviceInstancesService.deleteDeviceInstances(ids));
        }
        obs.push(this.networksService.delete(this.data.networkId));
        forkJoin(obs).subscribe((resps) => {
            const ok = resps.findIndex((r: any) => r === null || r.status === 500) === -1;
            if (ok) {
                this.snackBar.open('Hub ' + (ids.length > 0 ? 'and devices ' : '') + 'deleted successfully.', undefined, {
                    duration: 2000,
                });
                this.close(true);
            } else {
                this.snackBar.open('Error while deleting the hub' + (ids.length > 0 ? ' and devices' : '') + '!', 'close', { panelClass: 'snack-bar-error' });
                this.ready = true;
            }
        });
    }

    close(val: any) {
        this.dialogRef.close(val);
    }

    checkboxed(value: DeviceInstancesModel, $event: MatCheckboxChange) {
        if ($event.checked) {
            this.deviceSelection.select(value);
        } else {
            this.deviceSelection.deselect(value);
        }
    }

    masterCheckboxed($event: MatCheckboxChange) {
        if ($event.checked) {
            this.deviceSelection.select(...this.data.devices);
        } else {
            this.deviceSelection.deselect(...this.data.devices);
        }
    }
}
