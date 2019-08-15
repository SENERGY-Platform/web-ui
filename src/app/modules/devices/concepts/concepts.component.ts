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
import {WidgetModel} from '../../dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../dashboard/shared/dashboard-manipulation.enum';
import {ConceptsNewDialogComponent} from './dialogs/concepts-new-dialog.component';
import {NetworksModel} from '../networks/shared/networks.model';
import {DeviceTypeConceptModel} from '../device-types-overview/shared/device-type.model';

@Component({
    selector: 'senergy-concepts',
    templateUrl: './concepts.component.html',
    styleUrls: ['./concepts.component.css']
})
export class ConceptsComponent implements OnInit, OnDestroy, AfterViewInit {


    constructor(private dialog: MatDialog) {
    }

    ngOnInit() {
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

        editDialogRef.afterClosed().subscribe((conceptName: string) => {
            if (conceptName !== '') {
                console.log(conceptName);
            }
        });

    }

    private initSearchAndGetValuetypes() {
        // this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
        //     this.isLoadingResults = true;
        //     this.searchText = searchText;
        //     this.paginator.pageIndex = 0;
        // });
    }

}
