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
import {Subscription} from 'rxjs';
import {DialogsService} from '../../../core/services/dialogs.service';
import {CharacteristicsPermSearchModel} from './shared/characteristics-perm-search.model';
import {CharacteristicsEditDialogComponent} from './dialogs/characteristics-edit-dialog.component';
import {MatLegacySnackBar as MatSnackBar} from '@angular/material/legacy-snack-bar';
import {ConceptsPermSearchModel} from '../concepts/shared/concepts-perm-search.model';
import {MatSort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';
import {UntypedFormControl} from '@angular/forms';
import {debounceTime} from 'rxjs/operators';

@Component({
    selector: 'senergy-characteristic',
    templateUrl: './characteristics.component.html',
    styleUrls: ['./characteristics.component.css'],
})
export class CharacteristicsComponent implements OnInit, OnDestroy {
    readonly limitInit = 54;

    characteristics: CharacteristicsPermSearchModel[] = [];
    ready = false;
    dataSource = new MatTableDataSource(this.characteristics);
    @ViewChild(MatSort) sort!: MatSort;

    searchControl = new UntypedFormControl('');

    routerConcept: ConceptsPermSearchModel | null = null;
    selectedTag = '';

    private limit = this.limitInit;
    private offset = 0;
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

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
        this.getCharacteristics();
        this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe(() => this.reload());
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.ready = false;
            this.setRepoItemsParams(this.limitInit);
            this.getCharacteristics();
        }
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
                        this.reload();
                    } else {
                        this.snackBar.open('Characteristic created successfully.', undefined, {duration: 2000});
                        this.reloadCharacterisitics(true);
                    }
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
                                this.characteristics.splice(this.characteristics.indexOf(characteristic), 1);
                                this.snackBar.open('Characteristic deleted successfully.', undefined, {duration: 2000});
                                this.setRepoItemsParams(1);
                                this.reloadCharacterisitics(false);
                            } else {
                                this.snackBar.open('Error while deleting the characteristic!', 'close', {panelClass: 'snack-bar-error'});
                            }
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
        if (this.routerConcept !== null) {
            this.selectedTag = this.routerConcept.name;
        }
        this.characteristicsService
            .getCharacteristics(this.searchControl.value, this.limit, this.offset, 'name', 'asc', this.routerConcept?.characteristic_ids || [])
            .subscribe((characteristics: CharacteristicsPermSearchModel[]) => {
                this.setCharacteristics(characteristics);
            });
    }

    private setCharacteristics(characteristics: CharacteristicsPermSearchModel[]) {
        if (characteristics.length !== this.limit) {
            this.allDataLoaded = true;
        }
        this.characteristics = this.characteristics.concat(characteristics);
        this.dataSource = new MatTableDataSource(this.characteristics);
        this.dataSource.sort = this.sort;
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
        this.characteristics = [];
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
        this.limit = this.limitInit;
        this.getCharacteristics();
    }

    private setRepoItemsParams(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.characteristics.length;
    }

    private reloadCharacterisitics(reset: boolean) {
        setTimeout(() => {
            if (reset) {
                this.reload();
            } else {
                this.getCharacteristics();
            }
        }, 1500);
    }

    resetSearch() {
        this.searchControl.setValue('');
    }
}
