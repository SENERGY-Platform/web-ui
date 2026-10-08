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

import { Component, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { DeviceGroupsService } from '../shared/device-groups.service';
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { UntypedFormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import { Sort, MatSort, MatSortHeader } from '@angular/material/sort';
import { DeviceGroupModel } from '../shared/device-groups.model';
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
    templateUrl: './device-groups-select-dialog.component.html',
    styleUrls: ['./device-groups-select-dialog.component.css'],
    selector: 'senergy-device-groups-select-dialog',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, MatFormField, MatLabel, MatInput, ReactiveFormsModule, MatIcon, MatPrefix, MatIconButton, MatError, MatErrorMessagesDirective, InfiniteScrollDirective, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatCheckbox, MatSortHeader, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatDialogActions, MatButton]
})
export class DeviceGroupsSelectDialogComponent implements OnInit {
    @ViewChild(MatTable, { static: false }) table!: MatTable<DeviceGroupsSelectDialogComponent>;

    deviceGroups: DeviceGroupModel[] = [];
    dataReady = false;
    sortBy = 'name';
    sortOrder = 'asc';
    searchControl = new UntypedFormControl('');
    limitInit = 100;
    limit = this.limitInit;
    offset = 0;

    selectedGroups: string[] = [];

    constructor(private dialogRef: MatDialogRef<DeviceGroupsSelectDialogComponent>, private deviceGroupsService: DeviceGroupsService) {}

    ngOnInit() {
        this.load();
        this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe(() => this.reload());
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active;
        this.sortOrder = $event.direction;
        this.reload();
    }

    load() {
        this.deviceGroupsService
            .getDeviceGroups(this.searchControl.value, this.limit, this.offset, this.sortBy, this.sortOrder)
            .subscribe((res) => {
                this.deviceGroups.push(...res.result);
                if (this.table !== undefined) {
                    this.table.renderRows();
                }
                this.dataReady = true;
            });
    }

    reload() {
        this.limit = this.limitInit;
        this.offset = 0;
        this.deviceGroups = [];
        this.load();
    }

    resetSearch() {
        this.searchControl.setValue('');
    }

    onScroll() {
        this.limit += this.limitInit;
        this.offset = this.deviceGroups.length;
        this.load();
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close(this.selectedGroups);
    }

    isSelected(id: string): boolean {
        return this.selectedGroups.indexOf(id) !== -1;
    }

    select(checked: boolean, id: string) {
        if (checked) {
            // add
            this.selectedGroups.push(id);
        } else {
            // remove
            const index = this.selectedGroups.indexOf(id);
            if (index > -1) {
                this.selectedGroups.splice(index, 1);
            }
        }
        // remove duplicates
        this.selectedGroups = this.selectedGroups.filter((item: string, index: number) => this.selectedGroups.indexOf(item) === index);
    }
}
