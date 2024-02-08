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

import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DeviceTypeCharacteristicsModel} from '../device-types-overview/shared/device-type.model';
import {Navigation, Router} from '@angular/router';
import {CharacteristicsService} from './shared/characteristics.service';
import {forkJoin, Observable, Subscription, map} from 'rxjs';
import {DialogsService} from '../../../core/services/dialogs.service';
import {CharacteristicsPermSearchModel} from './shared/characteristics-perm-search.model';
import {CharacteristicsEditDialogComponent} from './dialogs/characteristics-edit-dialog.component';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ConceptsPermSearchModel} from '../concepts/shared/concepts-perm-search.model';
import {MatSort, Sort, SortDirection} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import {DeviceClassesPermSearchModel} from "../device-classes/shared/device-classes-perm-search.model";
import {
    UsedInDeviceTypeQuery,
    UsedInDeviceTypeResponseElement
} from "../device-types-overview/shared/used-in-device-type.model";
import {DeviceTypeService} from "../device-types-overview/shared/device-type.service";

@Component({
    selector: 'senergy-characteristic',
    templateUrl: './characteristics.component.html',
    styleUrls: ['./characteristics.component.css'],
})
export class CharacteristicsComponent implements OnInit, OnDestroy {
    displayedColumns = ['select', 'name', "useCount", 'info'];
    pageSize = 20;
    ready = false;
    dataSource = new MatTableDataSource<CharacteristicsPermSearchModel>();
    selection = new SelectionModel<CharacteristicsPermSearchModel>(true, []);
    totalCount = 200;
    offset = 0;
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    routerConcept: ConceptsPermSearchModel | null = null;
    selectedTag = '';
    private searchSub: Subscription = new Subscription();
    searchText = '';
    sortBy = 'name';
    sortDirection: SortDirection = 'asc';
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasCreateAuthorization = false;
    usedIn: Map<string,UsedInDeviceTypeResponseElement> = new Map<string, UsedInDeviceTypeResponseElement>();

    constructor(
        private dialog: MatDialog,
        private searchbarService: SearchbarService,
        private characteristicsService: CharacteristicsService,
        private snackBar: MatSnackBar,
        private router: Router,
        private dialogsService: DialogsService,
        private deviceTypeService: DeviceTypeService
    ) {
        this.getRouterParams();
    }

    ngOnInit() {
        this.initSearch();
        this.checkAuthorization();
    }

    getTotalCounts(): Observable<number> {
        return this.characteristicsService.getTotalCountOfCharacteristics(this.searchText).pipe(
            map((totalCount: number) => {
                this.totalCount = totalCount;
                return totalCount;
            })
        );
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active;
        this.sortDirection = $event.direction;
        this.reload();
    }


    checkAuthorization() {
        this.userHasUpdateAuthorization = this.characteristicsService.userHasUpdateAuthorization();
        if(this.userHasUpdateAuthorization) {
            this.displayedColumns.push('edit');
        }

        this.userHasDeleteAuthorization = this.characteristicsService.userHasDeleteAuthorization();
        if(this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }

        this.userHasCreateAuthorization = this.characteristicsService.userHasCreateAuthorization();
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe(()=>{
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.getCharacteristics().subscribe();
        });
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    newCharacteristic() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(CharacteristicsEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((resp: { characteristic: DeviceTypeCharacteristicsModel }) => {
            if (resp !== undefined) {
                this.characteristicsService.createCharacteristic(resp.characteristic).subscribe((characteristic) => {
                    if (characteristic === null) {
                        this.snackBar.open('Error while creating the characteristic!', 'close', {panelClass: 'snack-bar-error'});
                    } else {
                        this.snackBar.open('Characteristic created successfully.', undefined, {duration: 2000});
                    }
                    this.reload();
                });
            }
        });
    }

    tagRemoved(): void {
        this.routerConcept = null;
        this.selectedTag = '';
        this.reload();
    }

    deleteCharacteristic(characteristic: CharacteristicsPermSearchModel): void {
        this.dialogsService
            .openDeleteDialog('characteristic ' + characteristic.name)
            .afterClosed()
            .subscribe((deleteCharacteristic: boolean) => {
                if (deleteCharacteristic) {
                    this.ready = false;
                    this.characteristicsService
                        .deleteCharacteristic(characteristic.id)
                        .subscribe((resp: boolean) => {
                            if (resp === true) {
                                this.snackBar.open('Characteristic deleted successfully.', undefined, {duration: 2000});
                            } else {
                                this.snackBar.open('Error while deleting the characteristic!', 'close', {panelClass: 'snack-bar-error'});
                            }
                            this.reload();
                        });
                }
            });
    }

    editCharacteristic(inputCharacteristic: CharacteristicsPermSearchModel): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            characteristic: JSON.parse(JSON.stringify(inputCharacteristic)), // create copy of object
        };

        const editDialogRef = this.dialog.open(CharacteristicsEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((resp: {
            conceptId: string;
            characteristic: DeviceTypeCharacteristicsModel;
        }) => {
            if (resp !== undefined) {
                const newCharacteristic = resp.characteristic;
                this.characteristicsService
                    .updateConcept(newCharacteristic)
                    .subscribe((characteristic: DeviceTypeCharacteristicsModel | null) => {
                        if (characteristic === null) {
                            this.snackBar.open('Error while updating the characteristic!', 'close', {panelClass: 'snack-bar-error'});
                        } else {
                            this.snackBar.open('Characteristic updated successfully.', undefined, {duration: 2000});
                        }
                        this.reload();
                    });
            }
        });
    }

    showCharacteristic(inputCharacteristic: CharacteristicsPermSearchModel): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            characteristic: JSON.parse(JSON.stringify(inputCharacteristic)), // create copy of object
            disabled: true
        };

        const editDialogRef = this.dialog.open(CharacteristicsEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((resp: {
            conceptId: string;
            characteristic: DeviceTypeCharacteristicsModel;
        }) => {
            if (resp !== undefined) {
                const newCharacteristic = resp.characteristic;
                this.characteristicsService
                    .updateConcept(newCharacteristic)
                    .subscribe((characteristic: DeviceTypeCharacteristicsModel | null) => {
                        if (characteristic === null) {
                            this.snackBar.open('Error while updating the characteristic!', 'close', {panelClass: 'snack-bar-error'});
                        } else {
                            this.snackBar.open('Characteristic updated successfully.', undefined, {duration: 2000});
                        }
                        this.reload();
                    });
            }
        });
    }

    private getCharacteristics(): Observable<CharacteristicsPermSearchModel[]> {
        if (this.routerConcept !== null) {
            this.selectedTag = this.routerConcept.name;
        }
        return this.characteristicsService
            .getCharacteristics(this.searchText, this.pageSize, this.offset, this.sortBy, this.sortDirection, this.routerConcept?.characteristic_ids || [])
            .pipe(
                map((characteristics: CharacteristicsPermSearchModel[]) => {
                    this.setCharacteristics(characteristics);
                    this.updateCharacteristicInDeviceTypes(characteristics);
                    return characteristics;
                })
            );
    }

    private setCharacteristics(characteristics: CharacteristicsPermSearchModel[]) {
        this.dataSource.data = characteristics;
    }

    private getRouterParams(): void {
        const navigation: Navigation | null = this.router.getCurrentNavigation();
        if (navigation !== null) {
            if (navigation.extras.state !== undefined) {
                const concept = navigation.extras.state as ConceptsPermSearchModel;
                this.routerConcept = concept;
            }
        }
    }

    reload() {
        this.ready = false;
        this.offset = 0;
        this.pageSize = 20;
        this.selectionClear();

        forkJoin([this.getCharacteristics(), this.getTotalCounts()]).subscribe(_ => {
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
            .openDeleteDialog(this.selection.selected.length + (this.selection.selected.length > 1 ? ' characteristics' : ' characteristic'))
            .afterClosed()
            .subscribe((deleteConcepts: boolean) => {
                if (deleteConcepts) {
                    this.ready = false;
                    this.selection.selected.forEach((characteristic: CharacteristicsPermSearchModel) => {
                        const job = this.characteristicsService.deleteCharacteristic(characteristic.id);
                        deletionJobs.push(job);
                    });
                }

                forkJoin(deletionJobs).subscribe((deletionJobResults) => {
                    const ok = deletionJobResults.findIndex((r: any) => r === null || r.status === 500) === -1;
                    if (ok) {
                        this.snackBar.open('Characteristics deleted successfully.', undefined, {duration: 2000});
                    } else {
                        this.snackBar.open('Error while deleting characteristics!', 'close', {panelClass: 'snack-bar-error'});
                    }
                    this.reload();
                });
            });
    }

    private updateCharacteristicInDeviceTypes(list: CharacteristicsPermSearchModel[]) {
        let query: UsedInDeviceTypeQuery = {
            resource: "characteristics",
            ids: list.map(f => f.id)
        }
        this.deviceTypeService.getUsedInDeviceType(query).subscribe(result => {
            result?.forEach((value, key) => {
                this.usedIn.set(key, value);
            })
        })
    }

    public showUsedInDialog(usedIn: UsedInDeviceTypeResponseElement | undefined) {
        if (usedIn) {
            this.deviceTypeService.openUsedInDeviceTypeDialog(usedIn);
        }
    }
}
