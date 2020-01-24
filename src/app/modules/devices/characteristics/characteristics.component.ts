/*
 *
 *  Copyright 2019 InfAI (CC SES)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {Component, OnDestroy, OnInit} from '@angular/core';
import {MatDialog, MatDialogConfig, MatSnackBar} from '@angular/material';
import {DeviceTypeCharacteristicsModel, DeviceTypeConceptModel} from '../device-types-overview/shared/device-type.model';
import {ResponsiveService} from '../../../core/services/responsive.service';
import {CharacteristicsNewDialogComponent} from './dialogs/characteristics-new-dialog.component';
import {Navigation, Router} from '@angular/router';
import {CharacteristicsService} from './shared/characteristics.service';
import {SortModel} from '../../../core/components/sort/shared/sort.model';
import {Subscription} from 'rxjs';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {DialogsService} from '../../../core/services/dialogs.service';
import {CharacteristicsPermSearchModel} from './shared/characteristics-perm-search.model';
import {CharacteristicsEditDialogComponent} from './dialogs/characteristics-edit-dialog.component';

const grids = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-characteristic',
    templateUrl: './characteristics.component.html',
    styleUrls: ['./characteristics.component.css']
})
export class CharacteristicsComponent implements OnInit, OnDestroy {

    characteristics: CharacteristicsPermSearchModel[] = [];
    gridCols = 0;
    ready = false;
    routerConcept: DeviceTypeConceptModel | null = null;
    selectedTag = '';
    sortAttributes = new Array(new SortModel('Name', 'name', 'asc'));

    private searchText = '';
    private limit = 54;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    constructor(private dialog: MatDialog,
                private responsiveService: ResponsiveService,
                private characteristicsService: CharacteristicsService,
                private searchbarService: SearchbarService,
                private snackBar: MatSnackBar,
                private router: Router,
                private dialogsService: DialogsService) {
        this.getRouterParams();
    }

    ngOnInit() {
        this.initGridCols();
        this.initSearchAndGetCharacteristics();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    receiveSortingAttribute(sortAttribute: SortModel) {
        this.sortAttribute = sortAttribute;
        this.getCharacteristics(true);
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.ready = false;
            this.offset = this.offset + this.limit;
            this.getCharacteristics(false);
        }
    }

    newCharacteristic() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(CharacteristicsNewDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((resp: { conceptId: string, characteristic: DeviceTypeCharacteristicsModel }) => {
            if (resp !== undefined) {
                this.reset();
                this.characteristicsService.createCharacteristic(resp.conceptId, resp.characteristic).subscribe((characteristic) => {
                    if (characteristic === null) {
                        this.snackBar.open('Error while creating the characteristic!', undefined, {duration: 2000});
                        this.getCharacteristics(true);
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
        this.getCharacteristics(true);
    }

    deleteCharacteristic(characteristic: CharacteristicsPermSearchModel): void {
        this.dialogsService.openDeleteDialog('characteristic ' + characteristic.name).afterClosed().subscribe((deleteCharacteristic: boolean) => {
            if (deleteCharacteristic) {
                this.characteristicsService.deleteCharacteristic(characteristic.concept_id, characteristic.id).subscribe((resp: boolean) => {
                    console.log(resp);
                    if (resp === true) {
                        this.characteristics.splice(this.characteristics.indexOf(characteristic), 1);
                        this.snackBar.open('Characteristic deleted successfully.', undefined, {duration: 2000});
                        this.setRepoItemsParams(1);
                        this.reloadCharacterisitics(false);
                    } else {
                        this.snackBar.open('Error while deleting the characteristic!', undefined, {duration: 2000});
                    }
                });
            }
        });
    }

    editCharacteristic(inputCharacteristic: CharacteristicsPermSearchModel): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            characteristic: JSON.parse(JSON.stringify(inputCharacteristic))         // create copy of object
        };

        const editDialogRef = this.dialog.open(CharacteristicsEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((newCharacteristic: DeviceTypeCharacteristicsModel) => {
            if (newCharacteristic !== undefined) {
                console.log(newCharacteristic);
                this.reset();
                this.characteristicsService.updateConcept(inputCharacteristic.concept_id, newCharacteristic).subscribe((characteristic: (DeviceTypeCharacteristicsModel | null)) => {
                    if (characteristic === null) {
                        this.snackBar.open('Error while updating the characteristic!', undefined, {duration: 2000});
                        this.getCharacteristics(true);
                    } else {
                        this.snackBar.open('Characteristic updated successfully.', undefined, {duration: 2000});
                        this.reloadCharacterisitics(true);
                    }
                });
            }
        });
    }

    private getCharacteristics(reset: boolean) {
        if (reset) {
            this.reset();
        }
        if (this.routerConcept !== null) {
            this.selectedTag = this.routerConcept.name;
            this.characteristicsService.getCharacteristicByConceptId(this.routerConcept.id, this.limit, this.offset,
                this.sortAttribute.value, this.sortAttribute.order).subscribe(
                (characteristics: CharacteristicsPermSearchModel[]) => {
                    this.setCharacteristics(characteristics);
                });
        } else {
            this.characteristicsService.getCharacteristics(this.searchText, this.limit, this.offset, this.sortAttribute.value,
                this.sortAttribute.order).subscribe(
                (characteristics: CharacteristicsPermSearchModel[]) => {
                    this.setCharacteristics(characteristics);
                });
        }
    }

    private setCharacteristics(characteristics: CharacteristicsPermSearchModel[]) {
        if (characteristics.length !== this.limit) {
            this.allDataLoaded = true;
        }
        this.characteristics = this.characteristics.concat(characteristics);
        this.ready = true;
    }

    private initSearchAndGetCharacteristics() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            if (searchText) {
                this.routerConcept = null;
            }
            this.selectedTag = '';
            this.searchText = searchText;
            this.getCharacteristics(true);
        });
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
    }

    private getRouterParams(): void {
        const navigation: Navigation | null = this.router.getCurrentNavigation();
        if (navigation !== null) {
            if (navigation.extras.state !== undefined) {
                const concept = navigation.extras.state as DeviceTypeConceptModel;
                this.routerConcept = concept;
            }
        }
    }

    private reset() {
        this.characteristics = [];
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
    }

    private setRepoItemsParams(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.characteristics.length;
    }

    private reloadCharacterisitics(reset: boolean) {
        setTimeout(() => {
            this.getCharacteristics(reset);
        }, 1500);
    }

}
