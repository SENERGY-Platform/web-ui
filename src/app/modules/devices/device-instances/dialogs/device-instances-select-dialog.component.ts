/*
 * Copyright 2021 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Component, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { DeviceInstanceModel } from '../shared/device-instances.model';
import { DeviceInstancesService } from '../shared/device-instances.service';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { UntypedFormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import { Sort, MatSort, MatSortHeader } from '@angular/material/sort';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatPrefix, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { MatCheckbox } from '@angular/material/checkbox';

@Component({
    templateUrl: './device-instances-select-dialog.component.html',
    styleUrls: ['./device-instances-select-dialog.component.css'],
    selector: 'senergy-device-instances-select-dialog',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, MatFormField, MatLabel, MatInput, ReactiveFormsModule, MatIcon, MatPrefix, MatIconButton, MatError, MatErrorMessagesDirective, InfiniteScrollDirective, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatCheckbox, MatSortHeader, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatDialogActions, MatButton]
})
export class DeviceInstancesSelectDialogComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<DeviceInstancesSelectDialogComponent>>(MatDialogRef);
    private deviceInstancesService = inject(DeviceInstancesService);
    private destroyRef = inject(DestroyRef);

    @ViewChild(MatTable, { static: false }) table!: MatTable<DeviceInstanceModel>;

    devices: DeviceInstanceModel[] = [];
    dataReady = false;
    sortBy = 'name';
    sortOrder = 'asc';
    searchControl = new UntypedFormControl('');
    limitInit = 100;
    limit = this.limitInit;
    offset = 0;

    selectedDevices: string[] = [];

    ngOnInit() {
        this.load();
        this.searchControl.valueChanges.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.reload());
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active;
        this.sortOrder = $event.direction;
        this.reload();
    }

    load() {
        this.deviceInstancesService
            .getDeviceInstances({limit: this.limit, offset: this.offset, sortBy: this.sortBy, sortDesc: this.sortOrder === 'desc', searchText: this.searchControl.value})
            .subscribe((devices) => {
                this.devices.push(...devices.result);
                if (this.table !== undefined) {
                    this.table.renderRows();
                }
                this.dataReady = true;
            });
    }

    reload() {
        this.limit = this.limitInit;
        this.offset = 0;
        this.devices = [];
        this.load();
    }

    resetSearch() {
        this.searchControl.setValue('');
    }

    onScroll() {
        this.limit += this.limitInit;
        this.offset = this.devices.length;
        this.load();
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close(this.selectedDevices);
    }

    isSelected(id: string): boolean {
        return this.selectedDevices.indexOf(id) !== -1;
    }

    select(checked: boolean, id: string) {
        if (checked) {
            // add
            this.selectedDevices.push(id);
        } else {
            // remove
            const index = this.selectedDevices.indexOf(id);
            if (index > -1) {
                this.selectedDevices.splice(index, 1);
            }
        }
        // remove duplicates
        this.selectedDevices = this.selectedDevices.filter((item: string, index: number) => this.selectedDevices.indexOf(item) === index);
    }
}
