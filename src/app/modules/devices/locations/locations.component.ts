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

import { AfterViewInit, Component, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, map } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DialogsService } from '../../../core/services/dialogs.service';
import { bulkDelete, confirmDelete, countLabel, everyTrue } from '../../../core/services/delete-flows';
import { ExtendedLocationModel, LocationModel } from './shared/locations.model';
import { LocationsService } from './shared/locations.service';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { Sort, MatSort, MatSortHeader } from '@angular/material/sort';
import { ListSelection } from 'src/app/core/classes/list-selection';
import { PagedListState } from 'src/app/core/classes/paged-list-state';
import { MatPaginator } from '@angular/material/paginator';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { SearchbarComponent } from '../../../core/components/searchbar/searchbar.component';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { NgClass } from '@angular/common';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIconButton, MatFabButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';


@Component({
    selector: 'senergy-locations',
    templateUrl: './locations.component.html',
    styleUrls: ['./locations.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [SearchbarComponent, SpinnerComponent, NgClass, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatSortHeader, MatIconButton, MatTooltip, MatIcon, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, MatFabButton]
})
export class LocationsComponent implements OnInit, AfterViewInit {
    private locationsService = inject(LocationsService);
    private searchbarService = inject(SearchbarService);
    private destroyRef = inject(DestroyRef);
    private snackBar = inject(MatSnackBar);
    private router = inject(Router);
    private dialogsService = inject(DialogsService);
    preferencesService = inject(PreferencesService);
    private permissionsDialogService = inject(PermissionsDialogService);

    displayedColumns = ['select', 'name', 'show'];
    ready = false;
    instances = [];
    totalCount = 200;
    dataSource = new MatTableDataSource<ExtendedLocationModel>();
    listSelection = new ListSelection<ExtendedLocationModel>(() => this.dataSource.connect().value);
    selection = this.listSelection.model;
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    searchText = '';
    list = new PagedListState(this.preferencesService, () => this.getLocations(), { sortBy: 'name', sortDirection: 'asc' });
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasCreateAuthorization = false;
    userHasShareAuthorization = false;

    ngOnInit() {
        this.initSearch();
        this.checkAuthorization();
    }

    ngAfterViewInit(): void {
        this.list.connect(this.paginator, this.destroyRef);
    }

    checkAuthorization() {
        this.userHasCreateAuthorization = this.locationsService.userHasCreateAuthorization();

        this.userHasShareAuthorization = this.locationsService.userHasShareAuthorization();
        if(this.userHasShareAuthorization) {
            this.displayedColumns.push('share');
        }

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
        this.list.sortChanged($event);
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
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    deleteLocation(location: LocationModel): boolean {
        confirmDelete(this.dialogsService, 'location ' + location.name).subscribe(() => {
            this.ready = false;
            this.locationsService.deleteLocation(location.id).subscribe((resp: boolean) => {
                if (resp === true) {
                    snackSuccess(this.snackBar, 'Location deleted successfully.');
                    this.reloadLocations();
                } else {
                    snackError(this.snackBar, 'Error while deleting the location!');
                }
            });
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

    private getLocations(): Observable<ExtendedLocationModel[]> {
        return this.locationsService
            .getLocations({search: this.searchText, limit: this.list.pageSize, offset: this.list.offset, sortBy: this.list.sortBy, sortDirection: this.list.sortDirection})
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
        this.ready = false;
        this.selectionClear();

        this.list.reload(() => {
            this.ready = true;
        });
    }

    isAllSelected() {
        return this.listSelection.isAllSelected();
    }

    masterToggle() {
        this.listSelection.masterToggle();
    }

    selectionClear(): void {
        this.selection.clear();
    }

    deleteMultipleItems() {
        bulkDelete(this.dialogsService, this.snackBar, {
            text: countLabel(this.selection.selected.length, 'location', 'locations'),
            before: () => {
                this.ready = false;
            },
            jobs: () => this.selection.selected.map((location: LocationModel) => this.locationsService.deleteLocation(location.id)),
            isSuccess: everyTrue,
            successMessage: 'Locations deleted successfully.',
            errorMessage: 'Error while deleting locations!',
            after: () => this.reload(),
        });
    }

    shareLocation(location: ExtendedLocationModel): void {
        this.permissionsDialogService.openPermissionV2Dialog('locations', location.id, location.name);
    }
}
