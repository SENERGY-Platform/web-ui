/*
 * Copyright 2019 InfAI (CC SES)
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

import {AfterViewInit, Component, OnDestroy, OnInit} from '@angular/core';
import {MatDialog, MatDialogConfig} from '@angular/material';
import {ConceptsNewDialogComponent} from './dialogs/concepts-new-dialog.component';
import {DeviceTypeConceptModel} from '../device-types-overview/shared/device-type.model';
import {ResponsiveService} from '../../../core/services/responsive.service';
import {Router} from '@angular/router';

const grids = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-concepts',
    templateUrl: './concepts.component.html',
    styleUrls: ['./concepts.component.css']
})
export class ConceptsComponent implements OnInit, OnDestroy, AfterViewInit {

    concepts: DeviceTypeConceptModel[] = [];
    gridCols = 0;
    ready = true;

    constructor(private dialog: MatDialog,
                private responsiveService: ResponsiveService,
                private router: Router) {
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
        const editDialogRef = this.dialog.open(ConceptsNewDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((concept: DeviceTypeConceptModel) => {
            if (concept !== undefined) {

                console.log(concept);
            }
        });

    }

    showCharacteristics(concept: DeviceTypeConceptModel) {
        this.router.navigateByUrl('/devices/characteristics', {state: concept});
    }

    private getConcepts() {
        this.concepts.push({
            id: '1',
            name: 'temperature',
            characteristics: []
        });
        this.concepts.push({
            id: '2',
            name: 'color',
            characteristics: []
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

}
