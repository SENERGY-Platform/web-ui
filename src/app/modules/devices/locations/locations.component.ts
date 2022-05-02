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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { SortModel } from '../../../core/components/sort/shared/sort.model';
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

const grids = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-locations',
    templateUrl: './locations.component.html',
    styleUrls: ['./locations.component.css'],
})
export class LocationsComponent implements OnInit, OnDestroy {
    readonly limitInit = 54;

    locations: LocationModel[] = [];
    gridCols = 0;
    ready = false;
    sortAttributes = new Array(new SortModel('Name', 'name', 'asc'));

    private searchText = '';
    private limit = this.limitInit;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    constructor(
        private dialog: MatDialog,
        private responsiveService: ResponsiveService,
        private locationsService: LocationsService,
        private searchbarService: SearchbarService,
        private snackBar: MatSnackBar,
        private router: Router,
        private dialogsService: DialogsService,
    ) {}

    ngOnInit() {
        this.initGridCols();
        this.initSearchAndGetLocations();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    receiveSortingAttribute(sortAttribute: SortModel) {
        this.sortAttribute = sortAttribute;
        this.getLocations(true);
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.ready = false;
            this.offset = this.offset + this.limit;
            this.getLocations(false);
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
                            this.reloadLocations(false);
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

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
    }

    private initSearchAndGetLocations() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.getLocations(true);
        });
    }

    private getLocations(reset: boolean) {
        if (reset) {
            this.reset();
        }

        this.locationsService
            .searchLocations(this.searchText, this.limit, this.offset, this.sortAttribute.value, this.sortAttribute.order)
            .subscribe((locations: LocationModel[]) => {
                if (locations.length !== this.limit) {
                    this.allDataLoaded = true;
                }
                this.locations = this.locations.concat(locations);
                this.ready = true;
            });
    }

    private reset() {
        this.locations = [];
        this.limit = this.limitInit;
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
    }

    private reloadLocations(reset: boolean) {
        setTimeout(() => {
            this.getLocations(reset);
        }, 2500);
    }

    private setLimitOffset(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.locations.length;
    }
}
