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

import {Component, OnDestroy, OnInit} from '@angular/core';
import {AuthorizationService} from '../../../core/services/authorization.service';
import {SortModel} from "../../../core/components/sort/shared/sort.model";
import {Subscription} from "rxjs/index";
import {SearchbarService} from "../../../core/components/searchbar/shared/searchbar.service";
import {KeycloakService} from "keycloak-angular";
import {ResponsiveService} from "../../../core/services/responsive.service";
import {ProcessModel} from "./shared/process.model";
import {ProcessRepoService} from "./shared/process-repo.service";
import {UtilService} from "../../../core/services/util.service";
import {DomSanitizer, SafeUrl} from "@angular/platform-browser";
import {forEach} from "@angular/router/src/utils/collection";

const grids = new Map([
    ['xs', 1],
    ['sm', 2],
    ['md', 2],
    ['lg', 3],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-process-repo',
    templateUrl: './process-repo.component.html',
    styleUrls: ['./process-repo.component.css']
})

export class ProcessRepoComponent implements OnInit, OnDestroy {

    repoItems: ProcessModel[] = [];
    gridCols = 0;
    sortAttributes = [new SortModel('Date', 'date', 'desc'), new SortModel('Name', 'name', 'asc')];
    userID: string;
    ready = false;

    private searchText = '';
    private limit = 54;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    constructor(private sanitizer: DomSanitizer, private utilService: UtilService, private searchbarService: SearchbarService, private processRepoService: ProcessRepoService, private responsiveService: ResponsiveService, protected auth: AuthorizationService, private keycloakService: KeycloakService) {
        this.userID = this.keycloakService.getKeycloakInstance().subject || '';
    }

    ngOnInit() {
        this.initGridCols();
        this.initSearchAndGetDevices();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.ready = false;
            this.offset = this.offset + this.limit;
            this.getRepoItems(false);
        }
    }

    receiveSortingAttribute(sortAttribute: SortModel) {
        this.sortAttribute = sortAttribute;
        this.getRepoItems(true);
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
    }

    private initSearchAndGetDevices() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.getRepoItems(true);
        });
    }

    private getRepoItems(reset: boolean) {
        if (reset) {
            this.repoItems = [];
            this.offset = 0;
            this.allDataLoaded = false;
            this.ready = false;
        }

        this.processRepoService.getProcessModels(
            this.searchText, this.limit, this.offset, this.sortAttribute.value, this.sortAttribute.order).subscribe(
            (repoItems: ProcessModel[]) => {
                if (repoItems.length !== this.limit) {
                    this.allDataLoaded = true;
                }
                this.repoItems = this.repoItems.concat(repoItems);
                this.repoItems.forEach((repoItem: ProcessModel) => {
                    repoItem.image = this.provideImg(repoItem.svg)
                });
                this.ready = true;
            });
    }

    private provideImg(jsonSVG: string): SafeUrl {
        const svg = this.utilService.convertJSONtoSVG(jsonSVG);
        const base64 = this.utilService.convertSVGtoBase64(svg);

        return this.sanitizer.bypassSecurityTrustUrl('data:image/svg+xml;base64,' + base64);
    }
}
