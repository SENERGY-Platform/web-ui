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
import {MatSnackBar} from '@angular/material/snack-bar';
import {FlowModel} from './shared/flow.model';
import {FlowRepoService} from './shared/flow-repo.service';
import {DialogsService} from '../../../core/services/dialogs.service';
import {DomSanitizer} from '@angular/platform-browser';
import {ResponsiveService} from '../../../core/services/responsive.service';
import {SortModel} from '../../../core/components/sort/shared/sort.model';
import {concat, Observable, Subscription} from 'rxjs';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {AuthorizationService} from '../../../core/services/authorization.service';
import {FlowEngineService} from './shared/flow-engine.service';
import {CostEstimationModel} from '../../cost/shared/cost.model';
import {CostService} from '../../cost/shared/cost.service';
import {PermissionsDialogService} from '../../permissions/shared/permissions-dialog.service';
import {PermissionsV2RightsAndIdModel} from '../../permissions/shared/permissions-resource.model';
import {PermissionsService} from '../../permissions/shared/permissions.service';
import {environment} from '../../../../environments/environment';
import {PermissionsMockService} from '../../permissions/shared/permissions.service.mock';

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
    providers: [
        {
            provide: PermissionsService, useClass: environment.mockPermissionsV2 ? PermissionsMockService : PermissionsService
        }]
})
export class FlowRepoComponent implements OnInit, OnDestroy {
    flows: FlowModel[] = [];
    flowEstimations: CostEstimationModel [] = [];
    ready = false;
    gridCols = 0;
    sortAttributes = [new SortModel('Name', 'name', 'asc')];
    userHasDeleteAuthorization = false;
    userHasUpdateAuthorization = false;
    userHasPipelineCreateAuthorization = false;

    private searchText = '';
    private limitInit = 54;
    private limit = this.limitInit;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;
    private userIdMap = new Map<string, string>();

    permissionsPerFlows: PermissionsV2RightsAndIdModel[] = [];

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
        private permissionsDialogService: PermissionsDialogService,
        private permissionsService: PermissionsService,
    ) {
    }

    ngOnInit() {
        this.initGridCols();
        this.initSearchAndGetFlows();
        this.userId = this.authService.getUserId();
        this.userHasDeleteAuthorization = this.flowRepoService.userHasDeleteAuthorization();
        this.userHasUpdateAuthorization = this.flowRepoService.userHasUpdateAuthorization();
        this.userHasPipelineCreateAuthorization = this.flowEngineService.userHasCreateAuthorization();
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
                if (resp.flows.length > 0) {
                    const idReqs: Observable<string>[] = [];
                    resp.flows.forEach((flow: FlowModel) => {
                        if (typeof flow.image === 'string') {
                            flow.image = this.sanitizer.bypassSecurityTrustHtml(flow.image);
                        }
                        if (this.userId !== flow.userId) {
                            idReqs.push(this.getUserNameById(flow.userId));
                        }
                        this.flows.push(flow);
                    });
                    concat(...idReqs).subscribe(_ => {
                        this.userIdMap.forEach((name: string, userId: string) => {
                            this.flows.filter((flow) => flow.userId === userId).map((flow) => flow.userName = name);
                        });
                    });
                    this.loadFlowsPermissions();
                }
                if (this.costService.userMayGetFlowCostEstimations()) {
                    if (resp.flows.length > 0) {
                        this.costService.getFlowCostEstimations(this.flows.map(f => f._id || '')).subscribe(estimations => {
                            this.flowEstimations.push(...estimations);
                            this.ready = true;
                        });
                    } else {
                        this.ready = true;
                    }
                } else {
                    this.ready = true;
                }
            });
    }

    loadFlowsPermissions() {
        this.permissionsService.getComputedResourcePermissionsV2('analytics-flows', this.flows.map(e => e._id || '')).subscribe(
            perms => (this.permissionsPerFlows = perms)
        );
    }

    shareFlow(flow: FlowModel) {
        if (flow._id == null) {
            return;
        }
        this.permissionsDialogService.openPermissionV2Dialog('analytics-flows', flow._id, flow.name || '');
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

    getUserNameById(id: string): Observable<string> {
        return new Observable((obs) => {
            if (this.userIdMap.get(id) === undefined) {
                this.permissionsService.getUserById(id).subscribe(resp => {
                    this.userIdMap.set(id, resp.username);
                    obs.next(resp.username);
                    obs.complete();
                });
            } else {
                obs.next(this.userIdMap.get(id));
                obs.complete();
            }
        });
    }

    userHasReadPermission(id: string): boolean {
        return this.permissionsPerFlows.find(e => e.id === id)?.read || false;
    }

    userHasWritePermission(id: string): boolean {
        return this.permissionsPerFlows.find(e => e.id === id)?.write || false;
    }

    userHasExecutePermission(id: string): boolean {
        return this.permissionsPerFlows.find(e => e.id === id)?.execute || false;
    }

    userHasAdministratePermission(id: string): boolean {
        return this.permissionsPerFlows.find(e => e.id === id)?.administrate || false;
    }
}
