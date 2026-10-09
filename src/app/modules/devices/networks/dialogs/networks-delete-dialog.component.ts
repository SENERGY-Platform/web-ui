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

import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { SelectionModel } from '@angular/cdk/collections';
import { MatCheckboxChange, MatCheckbox } from '@angular/material/checkbox';
import { DeviceInstancesService } from '../../device-instances/shared/device-instances.service';
import { DeviceInstanceModel } from '../../device-instances/shared/device-instances.model';
import { NetworksService } from '../shared/networks.service';
import { forkJoin, Observable } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatButton } from '@angular/material/button';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';

@Component({
    selector: 'senergy-device-groups-pipeline-helper-dialog',
    templateUrl: './networks-delete-dialog.component.html',
    styleUrls: ['./networks-delete-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatDialogActions, MatButton]
})
export class NetworksDeleteDialogComponent implements OnInit {
    data = inject<{
        networkId: string;
        devices: DeviceInstanceModel[];
    }>(MAT_DIALOG_DATA);
    private dialogRef = inject<MatDialogRef<NetworksDeleteDialogComponent>>(MatDialogRef);
    private deviceInstancesService = inject(DeviceInstancesService);
    private networksService = inject(NetworksService);
    private snackBar = inject(MatSnackBar);

    deviceSelection = new SelectionModel<DeviceInstanceModel>(true, []);
    ready = true;

    ngOnInit(): void {
        this.deviceSelection = new SelectionModel<DeviceInstanceModel>(true, []);
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
                snackSuccess(this.snackBar, 'Hub ' + (ids.length > 0 ? 'and devices ' : '') + 'deleted successfully.');
                this.close(true);
            } else {
                snackError(this.snackBar, 'Error while deleting the hub' + (ids.length > 0 ? ' and devices' : '') + '!');
                this.ready = true;
            }
        });
    }

    close(val: any) {
        this.dialogRef.close(val);
    }

    checkboxed(value: DeviceInstanceModel, $event: MatCheckboxChange) {
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
