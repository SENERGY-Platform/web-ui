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

import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DeviceGroupsService } from '../shared/device-groups.service';
import { MatTable } from '@angular/material/table';
import {FormControl, UntypedFormControl} from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import { Sort } from '@angular/material/sort';
import { DeviceGroupsPermSearchModel } from '../shared/device-groups-perm-search.model';
import {Route} from '@angular/router';

@Component({
    templateUrl: './device-groups-select-dialog.component.html',
    styleUrls: ['./device-groups-select-dialog.component.css'],
})
export class DeviceGroupsSelectDialogComponent implements OnInit {
    @ViewChild(MatTable, { static: false }) table!: MatTable<DeviceGroupsSelectDialogComponent>;

    deviceGroups: DeviceGroupsPermSearchModel[] = [];
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
            .subscribe((groups) => {
                this.deviceGroups.push(...groups);
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
