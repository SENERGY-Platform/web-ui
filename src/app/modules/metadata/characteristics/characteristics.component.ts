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
import {MatLegacyDialog as MatDialog, MatLegacyDialogConfig as MatDialogConfig} from '@angular/material/legacy-dialog';
import {DeviceTypeCharacteristicsModel} from '../device-types-overview/shared/device-type.model';
import {Navigation, Router} from '@angular/router';
import {CharacteristicsService} from './shared/characteristics.service';
import {forkJoin, Observable, Subscription} from 'rxjs';
import {DialogsService} from '../../../core/services/dialogs.service';
import {CharacteristicsPermSearchModel} from './shared/characteristics-perm-search.model';
import {CharacteristicsEditDialogComponent} from './dialogs/characteristics-edit-dialog.component';
import {MatLegacySnackBar as MatSnackBar} from '@angular/material/legacy-snack-bar';
import {ConceptsPermSearchModel} from '../concepts/shared/concepts-perm-search.model';
import {MatSort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import {UntypedFormControl} from '@angular/forms';
import {debounceTime} from 'rxjs/operators';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';

@Component({
    selector: 'senergy-characteristic',
    templateUrl: './characteristics.component.html',
    styleUrls: ['./characteristics.component.css'],
})
export class CharacteristicsComponent implements OnInit, OnDestroy {
    readonly pageSize = 20;
    ready = false;
    dataSource = new MatTableDataSource<CharacteristicsPermSearchModel>();
    @ViewChild(MatSort) sort!: MatSort;
    selection = new SelectionModel<CharacteristicsPermSearchModel>(true, []);
    totalCount = 200;
    searchControl = new UntypedFormControl('');
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    routerConcept: ConceptsPermSearchModel | null = null;
    selectedTag = '';
    private searchSub: Subscription = new Subscription();

    constructor(
        private dialog: MatDialog,
        private characteristicsService: CharacteristicsService,
        private snackBar: MatSnackBar,
        private router: Router,
        private dialogsService: DialogsService,
    ) {
        this.getRouterParams();
    }

    ngOnInit() {

    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    ngAfterViewInit(): void {
        this.dataSource.sortingDataAccessor = (row: any, sortHeaderId: string) => {
            var value = row[sortHeaderId];
            value = (typeof(value) === 'string') ? value.toUpperCase(): value;
            return value
        };
        this.dataSource.sort = this.sort;

        this.paginator.page.subscribe(()=>{
            this.getCharacteristics()
        });
        this.getCharacteristics();
        this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe(() => this.reload());
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
                    this.reload()
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
                    this.characteristicsService
                        .deleteCharacteristic(characteristic.id)
                        .subscribe((resp: boolean) => {
                            if (resp === true) {
                                this.snackBar.open('Characteristic deleted successfully.', undefined, {duration: 2000});
                            } else {
                                this.snackBar.open('Error while deleting the characteristic!', 'close', {panelClass: 'snack-bar-error'});
                            }
                            this.reload()
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

    private getCharacteristics() {
        var offset = this.paginator.pageSize * this.paginator.pageIndex;

        if (this.routerConcept !== null) {
            this.selectedTag = this.routerConcept.name;
        }
        this.characteristicsService
            .getCharacteristics(this.searchControl.value, this.pageSize, offset, 'name', 'asc', this.routerConcept?.characteristic_ids || [])
            .subscribe((characteristics: CharacteristicsPermSearchModel[]) => {
                this.setCharacteristics(characteristics);
            });
    }

    private setCharacteristics(characteristics: CharacteristicsPermSearchModel[]) {
        this.dataSource.data = characteristics;
        this.ready = true;
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
        this.paginator.pageIndex = 0;
        this.selectionClear();
        this.getCharacteristics();
    }

    resetSearch() {
        this.searchControl.setValue('');
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
                this.selection.selected.forEach((characteristic: CharacteristicsPermSearchModel) => {
                    var job = this.characteristicsService.deleteCharacteristic(characteristic.id)
                    deletionJobs.push(job)
                });
            }
            
            forkJoin(deletionJobs).subscribe((deletionJobResults) => {
                console.log(deletionJobResults)
                const ok = deletionJobResults.findIndex((r: any) => r === null || r.status === 500) === -1;
                if (ok) {
                    this.snackBar.open('Characteristics deleted successfully.', undefined, {duration: 2000});            
                } else {
                    this.snackBar.open('Error while deleting characteristics!', 'close', {panelClass: 'snack-bar-error'});
                }
                this.reload()
            })
        });
    }
}
