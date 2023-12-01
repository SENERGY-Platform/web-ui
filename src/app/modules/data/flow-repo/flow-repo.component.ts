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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FlowModel } from './shared/flow.model';
import { FlowRepoService } from './shared/flow-repo.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { DomSanitizer } from '@angular/platform-browser';
import { ResponsiveService } from '../../../core/services/responsive.service';
import { SortModel } from '../../../core/components/sort/shared/sort.model';
import { Subscription } from 'rxjs';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { FlowEngineService } from './shared/flow-engine.service';
import { CostEstimationModel } from '../../cost/shared/cost.model';
import { CostService } from '../../cost/shared/cost.service';

const GRIDS = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-operator-repo',
    templateUrl: './flow-repo.component.html',
    styleUrls: ['./flow-repo.component.css'],
})
export class FlowRepoComponent implements OnInit, OnDestroy {
    flows: FlowModel[] = [];
    flowEstimations: CostEstimationModel[] = [];
    ready = false;
    gridCols = 0;
    sortAttributes = [new SortModel('Name', 'name', 'asc')];
    userHasDeleteAuthorization: boolean = false
    userHasUpdateAuthorization: boolean = false
    userHasPipelineCreateAuthorization: boolean = false 

    private searchText = '';
    private limitInit = 54;
    private limit = this.limitInit;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    showShared = localStorage.getItem('data.flows.showShared') === 'true';

    userId = {} as string | Error;

    constructor(
        private flowRepoService: FlowRepoService,
        public snackBar: MatSnackBar,
        private responsiveService: ResponsiveService,
        private dialogsService: DialogsService,
        private sanitizer: DomSanitizer,
        private authService: AuthorizationService,
        private searchbarService: SearchbarService,
        private flowEngineService: FlowEngineService,
        public costService: CostService,
    ) {}

    ngOnInit() {
        this.initGridCols();
        this.initSearchAndGetFlows();
        this.userId = this.authService.getUserId();
        this.userHasDeleteAuthorization = this.flowRepoService.userHasDeleteAuthorization()
        this.userHasUpdateAuthorization = this.flowRepoService.userHasUpdateAuthorization()
        this.userHasPipelineCreateAuthorization = this.flowEngineService.userHasCreateAuthorization()
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.setRepoItemsParams(this.limitInit);
            this.getFlows(false);
        }
    }

    deleteFlow(flow: FlowModel) {
        this.dialogsService
            .openDeleteDialog('flow ' + flow.name)
            .afterClosed()
            .subscribe((deleteFlow: boolean) => {
                if (deleteFlow) {
                    const index = this.flows.indexOf(flow);
                    if (index > -1) {
                        this.flows.splice(index, 1);
                        this.flowEstimations.slice(index, 1);
                    }
                    this.flowRepoService.deleteFlow(flow).subscribe(() => {
                        this.snackBar.open('Flow deleted', undefined, {
                            duration: 2000,
                        });
                        this.setRepoItemsParams(1);
                        this.getFlows(false);
                    });
                }
            });
    }

    receiveSortingAttribute(sortAttribute: SortModel) {
        this.sortAttribute = sortAttribute;
        this.getFlows(true);
    }

    showSharedChanged() {
        this.showShared= !this.showShared;
        localStorage.setItem('data.flows.showShared', String(this.showShared));
        this.getFlows(true);
    }

    getFlows(reset: boolean) {
        if (reset) {
            this.setRepoItemsParams(this.limitInit);
            this.reset();
        }

        this.flowRepoService
            .getFlows(this.searchText, this.limit, this.offset, this.sortAttribute.value, this.sortAttribute.order, this.showShared)
            .subscribe((resp: { flows: FlowModel[] }) => {
                if (resp.flows.length !== this.limit) {
                    this.allDataLoaded = true;
                }
                resp.flows.forEach((flow: FlowModel) => {
                    if (typeof flow.image === 'string') {
                        flow.image = this.sanitizer.bypassSecurityTrustHtml(flow.image);
                    }
                    this.flows.push(flow);
                });
                if (this.costService.userMayGetFlowCostEstimations()) {
                this.costService.getFlowCostEstimations(this.flows.map(f => f._id || '')).subscribe(estimations => {
                    this.flowEstimations.push(...estimations);
                    this.ready = true;
                })
            } else {
                this.ready = true;
            }
            });
    }

    private initGridCols(): void {
        this.gridCols = GRIDS.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = GRIDS.get(mqAlias) || 0;
        });
    }

    private initSearchAndGetFlows(): void {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.getFlows(true);
        });
    }

    private setRepoItemsParams(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.flows.length;
    }

    private reset() {
        this.flows = [];
        this.flowEstimations = [];
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
    }
}
