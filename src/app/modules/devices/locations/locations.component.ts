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

import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ResponsiveService } from '../../../core/services/responsive.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DialogsService } from '../../../core/services/dialogs.service';
import uuid = util.uuid;
import { util } from 'jointjs';
import { LocationModel } from './shared/locations.model';
import { LocationsService } from './shared/locations.service';
import { DeviceInstancesRouterState, DeviceInstancesRouterStateTypesEnum } from '../device-instances/device-instances.component';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { FormControl } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';



@Component({
    selector: 'senergy-locations',
    templateUrl: './locations.component.html',
    styleUrls: ['./locations.component.css'],
})
export class LocationsComponent implements OnInit, OnDestroy {
    readonly limitInit = 54;

    locations: LocationModel[] = [];
    instances = []
    dataSource = new MatTableDataSource(this.locations)
    @ViewChild(MatSort) sort!: MatSort

    searchControl = new FormControl('');

    ready = false;

    private limit = this.limitInit;
    private offset = 0;
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    constructor(
        private locationsService: LocationsService,
        private snackBar: MatSnackBar,
        private router: Router,
        private dialogsService: DialogsService,
    ) {}

    ngOnInit() {
        this.getLocations()
        this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe(() => this.reload());
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.ready = false;
            this.offset = this.offset + this.limit;
            this.getLocations();
        }
    }

    showDevices(location: LocationModel) {
        this.router.navigate(['devices/deviceinstances'], {
            state: { type: DeviceInstancesRouterStateTypesEnum.LOCATION, value: location } as DeviceInstancesRouterState,
        });
        return false;
    }

    deleteLocation(location: LocationModel): boolean {
        this.dialogsService
            .openDeleteDialog('location ' + location.name)
            .afterClosed()
            .subscribe((deleteDeviceClass: boolean) => {
                if (deleteDeviceClass) {
                    this.locationsService.deleteLocation(location.id).subscribe((resp: boolean) => {
                        if (resp === true) {
                            this.locations.splice(this.locations.indexOf(location), 1);
                            this.snackBar.open('Location deleted successfully.', undefined, { duration: 2000 });
                            this.setLimitOffset(1);
                            this.reloadLocations();
                        } else {
                            this.snackBar.open('Error while deleting the location!', "close", { panelClass: "snack-bar-error" });
                        }
                    });
                }
            });
        return false;
    }

    newLocation(): boolean {
        this.router.navigate(['devices/locations/edit']);
        return false;
    }

    editLocation(inputLocation: LocationModel): boolean {
        this.router.navigate(['devices/locations/edit/' + inputLocation.id]);
        return false;
    }

    private getLocations() {
        this.locationsService
            .searchLocations(this.searchControl.value, this.limit, this.offset, "name", "asc")
            .subscribe((locations: LocationModel[]) => {
                if (locations.length !== this.limit) {
                    this.allDataLoaded = true;
                }
                this.locations = this.locations.concat(locations);
                this.dataSource = new MatTableDataSource(this.locations)
                this.dataSource.sort = this.sort
                this.ready = true;
            });
    }

    private reloadLocations() {
        setTimeout(() => {
            this.reload()
        }, 2500);
    }

    private setLimitOffset(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.locations.length;
    }


    reload() {
        this.locations = [];
        this.limit = this.limitInit;
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
        this.getLocations();
    }

    resetSearch() {
        this.searchControl.setValue('');
    }
}
