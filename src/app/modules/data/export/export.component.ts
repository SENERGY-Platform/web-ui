/*
 * Copyright 2020 InfAI (CC SES)
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

import {Component, OnDestroy, OnInit} from '@angular/core';
import {ExportService} from './shared/export.service';
import {ExportModel} from './shared/export.model';
import {environment} from '../../../../environments/environment';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DialogsService} from '../../../core/services/dialogs.service';
import {ResponsiveService} from '../../../core/services/responsive.service';
import {ClipboardService} from 'ngx-clipboard';
import {SortModel} from '../../../core/components/sort/shared/sort.model';
import {Subscription} from 'rxjs';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';

const grids = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-export',
    templateUrl: './export.component.html',
    styleUrls: ['./export.component.css']
})

export class ExportComponent implements OnInit, OnDestroy {

    exports: ExportModel[] = [];
    showGenerated = localStorage.getItem('data.exports.showGenerated') === 'true';
    ready = false;
    deleteInProgress = false;
    url = environment.influxAPIURL;
    gridCols = 0;
    sortAttributes = [new SortModel('Name', 'name', 'asc'), new SortModel('Erstellungsdatum', 'created_at', 'asc')];

    private searchText = '';
    private limitInit = 54;
    private limit = this.limitInit;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    constructor(private exportService: ExportService,
                public snackBar: MatSnackBar,
                private dialogsService: DialogsService,
                private searchbarService: SearchbarService,
                private responsiveService: ResponsiveService,
                private clipboardService: ClipboardService) {
    }

    ngOnInit() {
        this.initGridCols();
        this.initSearchAndGetExports();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.setRepoItemsParams(this.limitInit);
            this.getExports(false);
        }
    }

    receiveSortingAttribute(sortAttribute: SortModel) {
        this.sortAttribute = sortAttribute;
        this.getExports(true);
    }

    deleteExport(exp: ExportModel) {
        this.dialogsService.openDeleteDialog('export').afterClosed().subscribe((deleteExport: boolean) => {
            if (deleteExport) {
                this.ready = false;
                this.deleteInProgress = true;
                this.exportService.stopPipeline(exp).subscribe((response) => {
                    if (response.status === 204) {
                        this.snackBar.open('Export deleted', undefined, {
                            duration: 2000,
                        });
                        const index = this.exports.indexOf(exp);
                        if (index > -1) {
                            this.exports.splice(index, 1);
                        }
                        this.setRepoItemsParams(1);
                        this.getExports(false);
                    } else {
                        this.snackBar.open('Export could not be deleted', undefined, {
                            duration: 2000,
                        });
                    }
                    this.ready = true;
                    this.deleteInProgress = false;
                });
            }
        });
    }

    copyEndpoint(endpoint: string) {
        this.clipboardService.copyFromContent(endpoint);
        this.snackBar.open('Endpoint copied to clipboard.', undefined, {
            duration: 2000,
        });
    }

    showGeneratedChanged() {
        localStorage.setItem('data.exports.showGenerated', String(this.showGenerated));
        this.getExports(true);
    }

    private getExports(reset: boolean) {
        if (reset) {
            this.setRepoItemsParams(this.limitInit);
            this.reset();
        }
        this.exportService.getExports(
            this.searchText,
            this.limit, this.offset,
            this.sortAttribute.value,
            this.sortAttribute.order,
            (this.showGenerated ? undefined : false) )
            .subscribe(
            (resp: ExportModel [] | null) => {
                if (resp !== null) {
                    if (resp.length !== this.limit) {
                        this.allDataLoaded = true;
                    }
                    this.exports = this.exports.concat(resp);
                }
                this.ready = true;
            });
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
    }

    private initSearchAndGetExports() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.getExports(true);
        });
    }

    private setRepoItemsParams(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.exports.length;
    }

    private reset() {
        this.exports = [];
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
    }
}
