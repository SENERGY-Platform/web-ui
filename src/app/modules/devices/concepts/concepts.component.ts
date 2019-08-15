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

@Component({
    selector: 'senergy-concepts',
    templateUrl: './concepts.component.html',
    styleUrls: ['./concepts.component.css']
})
export class ConceptsComponent implements OnInit, OnDestroy, AfterViewInit {

    constructor() {
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

    }

    private initSearchAndGetValuetypes() {
        // this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
        //     this.isLoadingResults = true;
        //     this.searchText = searchText;
        //     this.paginator.pageIndex = 0;
        // });
    }

}
