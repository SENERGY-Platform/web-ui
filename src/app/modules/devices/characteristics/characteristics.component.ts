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

import {AfterViewInit, Component, OnDestroy, OnInit} from '@angular/core';
import {MatDialog, MatDialogConfig} from '@angular/material';
import {DeviceTypeCharacteristicsModel, DeviceTypeConceptModel} from '../device-types-overview/shared/device-type.model';
import {ResponsiveService} from '../../../core/services/responsive.service';
import {CharacteristicsNewDialogComponent} from './dialogs/characteristics-new-dialog.component';
import {Navigation, Router} from '@angular/router';

const grids = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-concepts',
    templateUrl: './characteristics.component.html',
    styleUrls: ['./characteristics.component.css']
})
export class CharacteristicsComponent implements OnInit, OnDestroy, AfterViewInit {

    characteristics: DeviceTypeCharacteristicsModel[] = [];
    gridCols = 0;
    ready = true;
    routerConcept: DeviceTypeConceptModel | null = null;
    selectedTag = '';

    constructor(private dialog: MatDialog,
                private responsiveService: ResponsiveService,
                private router: Router) {
        this.getRouterParams();
    }

    ngOnInit() {
        this.initGridCols();
        this.getConcepts();
        this.initSearchAndGetValuetypes();
    }

    ngAfterViewInit(): void {

    }

    ngOnDestroy() {
        // this.searchSub.unsubscribe();
    }

    newConcept() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(CharacteristicsNewDialogComponent, dialogConfig);

        // editDialogRef.afterClosed().subscribe((conceptName: string) => {
        //     if (conceptName !== '') {
        //         console.log(conceptName);
        //     }
        // });

    }

    tagRemoved(): void {
        this.routerConcept = null;
        this.selectedTag = '';
        this.getConcepts();
    }

    private getConcepts() {
        this.characteristics.push({
            id: 'char1',
            name: 'DegreeCelsius',
            type: 'https://schema.org/Integer',
            min_value: -273.15
        });
        this.characteristics.push({
            id: 'char2',
            name: 'Kelvin',
            type: 'https://schema.org/Integer',
            min_value: 0
        });
        this.characteristics.push({
            id: 'char3',
            name: 'DegreeFahrenheit',
            type: 'https://schema.org/Integer',
            min_value: -459.67
        });
    }

    private initSearchAndGetValuetypes() {
        // this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
        //     this.isLoadingResults = true;
        //     this.searchText = searchText;
        //     this.paginator.pageIndex = 0;
        // });
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
                this.selectedTag = this.routerConcept.name;
                console.log(this.routerConcept);
            }
        }
    }

}
