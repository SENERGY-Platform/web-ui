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

import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { forkJoin, Observable, Subscription, map } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DialogsService } from '../../../core/services/dialogs.service';
import { LocationModel } from './shared/locations.model';
import { LocationsService } from './shared/locations.service';
import { MatTableDataSource } from '@angular/material/table';
import { Sort, SortDirection } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';


@Component({
    selector: 'senergy-locations',
    templateUrl: './locations.component.html',
    styleUrls: ['./locations.component.css'],
})
export class LocationsComponent implements OnInit, OnDestroy, AfterViewInit {
    displayedColumns = ['select', 'name', 'show'];
    pageSize = this.preferencesService.pageSize;
    ready = false;
    instances = [];
    totalCount = 200;
    offset = 0;
    dataSource = new MatTableDataSource<LocationModel>();
    selection = new SelectionModel<LocationModel>(true, []);
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    private searchSub: Subscription = new Subscription();
    searchText = '';
    sortBy = 'name';
    sortDirection: SortDirection = 'asc';
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasCreateAuthorization = false;

    constructor(
        private locationsService: LocationsService,
        private searchbarService: SearchbarService,
        private snackBar: MatSnackBar,
        private router: Router,
        private dialogsService: DialogsService,
        public preferencesService: PreferencesService,
    ) {}

    ngOnInit() {
        this.initSearch();
        this.checkAuthorization();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe((e)=>{
            this.preferencesService.pageSize = e.pageSize;
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.getLocations().subscribe();
        });
    }

    checkAuthorization() {
        this.userHasCreateAuthorization = this.locationsService.userHasCreateAuthorization();

        this.userHasUpdateAuthorization = this.locationsService.userHasUpdateAuthorization();
        if(this.userHasUpdateAuthorization) {
            this.displayedColumns.push('edit');
        }

        this.userHasDeleteAuthorization = this.locationsService.userHasDeleteAuthorization();
        if(this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active;
        this.sortDirection = $event.direction;
        this.reload();
    }

    showDevices(location: LocationModel) {
        this.router.navigate(['devices/deviceinstances'], {
            queryParams: {
                'location-id': location.id,
                'location-name': location.name,
            },
        });
        return false;
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    deleteLocation(location: LocationModel): boolean {
        this.dialogsService
            .openDeleteDialog('location ' + location.name)
            .afterClosed()
            .subscribe((deleteDeviceClass: boolean) => {
                if (deleteDeviceClass) {
                    this.ready = false;
                    this.locationsService.deleteLocation(location.id).subscribe((resp: boolean) => {
                        if (resp === true) {
                            this.snackBar.open('Location deleted successfully.', undefined, { duration: 2000 });
                            this.reloadLocations();
                        } else {
                            this.snackBar.open('Error while deleting the location!', 'close', { panelClass: 'snack-bar-error' });
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

    private getLocations(): Observable<LocationModel[]> {
        return this.locationsService
            .getLocations({search: this.searchText, limit: this.pageSize, offset: this.offset, sortBy: this.sortBy, sortDirection: this.sortDirection})
            .pipe(
                map((locations) => {
                    this.dataSource.data = locations.result;
                    this.totalCount = locations.total;
                    return locations.result;
                })
            );
    }

    private reloadLocations() {
        setTimeout(() => {
            this.reload();
        }, 2500);
    }

    reload() {
        this.offset = 0;
        this.ready = false;
        this.selectionClear();

        this.getLocations().subscribe(_ => {
            this.ready = true;
        });
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const currentViewed = this.dataSource.connect().value.length;
        return numSelected === currentViewed;
    }

    masterToggle() {
        if (this.isAllSelected()) {
            this.selectionClear();
        } else {
            this.dataSource.connect().value.forEach((row) => this.selection.select(row));
        }
    }

    selectionClear(): void {
        this.selection.clear();
    }

    deleteMultipleItems() {
        const deletionJobs: Observable<any>[] = [];

        this.dialogsService
            .openDeleteDialog(this.selection.selected.length + (this.selection.selected.length > 1 ? ' locations' : ' location'))
            .afterClosed()
            .subscribe((deleteConcepts: boolean) => {
                if (deleteConcepts) {
                    this.ready = false;
                    this.selection.selected.forEach((location: LocationModel) => {
                        deletionJobs.push(this.locationsService.deleteLocation(location.id));
                    });
                }

                forkJoin(deletionJobs).subscribe((deletionJobResults) => {
                    const ok = deletionJobResults.findIndex((r: any) => r === null || r.status === 500) === -1;
                    if (ok) {
                        this.snackBar.open('Locations deleted successfully.', undefined, {duration: 2000});
                    } else {
                        this.snackBar.open('Error while deleting locations!', 'close', {panelClass: 'snack-bar-error'});
                    }
                    this.reload();
                });
            });
    }
}
