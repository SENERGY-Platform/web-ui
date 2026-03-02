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

import {Component, OnDestroy, OnInit, TemplateRef, ViewChild, ViewContainerRef} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {FlowModel} from './shared/flow.model';
import {FlowRepoService} from './shared/flow-repo.service';
import {DialogsService} from '../../../core/services/dialogs.service';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {merge, Subscription} from 'rxjs';
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
import {CostMockService} from '../../cost/shared/cost.service.mock';
import {PipelineRegistryService} from '../pipeline-registry/shared/pipeline-registry.service';
import {FlowUsage,} from '../pipeline-registry/shared/pipeline.model';
import {Router} from '@angular/router';
import {MatTableDataSource} from '@angular/material/table';
import {MatPaginator, PageEvent} from '@angular/material/paginator';
import {PreferencesService} from '../../../core/services/preferences.service';
import {SelectionModel} from '@angular/cdk/collections';
import {MatSort} from '@angular/material/sort';
import {startWith, switchMap} from 'rxjs/operators';
import {FlexibleConnectedPositionStrategy, Overlay, OverlayRef} from '@angular/cdk/overlay';
import {TemplatePortal} from '@angular/cdk/portal';


@Component({
    selector: 'senergy-operator-repo',
    templateUrl: './flow-repo.component.html',
    styleUrls: ['./flow-repo.component.css'],
    providers: [
        {
            provide: PermissionsService,
            useClass: environment.mockPermissionsV2 ? PermissionsMockService : PermissionsService
        }, {
            provide: CostService, useClass: environment.mockCostService ? CostMockService : CostService
        }]
})
export class FlowRepoComponent implements OnInit, OnDestroy {
    @ViewChild('paginator', {static: false}) paginator!: MatPaginator;
    @ViewChild('sort', {static: false}) sort!: MatSort;
    @ViewChild('overlayTpl') overlayTpl!: TemplateRef<any>;
    flows: FlowModel[] = [];

    flowsDataSource = new MatTableDataSource<FlowModel>();
    flowEstimations: CostEstimationModel [] = [];
    selection = new SelectionModel<FlowModel>(true, []);
    ready = false;
    userHasDeleteAuthorization = false;
    userHasUpdateAuthorization = false;
    userHasPipelineCreateAuthorization = false;

    displayedColumns: string[] = ['select', 'pub', 'name', 'description','cost', 'dateUpdated'];
    totalCount = 0;

    shareUser = '';

    flowUsagePerFlow: FlowUsage[] = [];

    private searchText = '';
    private searchSub: Subscription = new Subscription();
    private flowSub: Subscription = new Subscription();

    permissionsPerFlows: PermissionsV2RightsAndIdModel[] = [];

    userId = {} as string | Error;

    private overlayRef?: OverlayRef;

    private svgCache = new Map<string, SafeHtml>();

    constructor(
        private flowRepoService: FlowRepoService,
        public snackBar: MatSnackBar,
        private dialogsService: DialogsService,
        private sanitizer: DomSanitizer,
        public authService: AuthorizationService,
        private searchbarService: SearchbarService,
        private flowEngineService: FlowEngineService,
        public costService: CostService,
        private permissionsDialogService: PermissionsDialogService,
        protected permissionsService: PermissionsService,
        private pipeService: PipelineRegistryService,
        private router: Router,
        public preferencesService: PreferencesService,
        private overlay: Overlay,
        private vcr: ViewContainerRef
    ) {
    }

    ngOnInit() {
        this.initSearchAndGetFlows();
        this.userId = this.authService.getUserId();
        if (this.authService.userIsAdmin()) {
            this.loadFlowUsage();
            this.displayedColumns.push('usage');
        }
        this.displayedColumns.push('image');
        this.displayedColumns.push('deploy');
        this.userHasUpdateAuthorization = this.flowRepoService.userHasUpdateAuthorization();
        if (this.userHasUpdateAuthorization) {
            this.displayedColumns.push('share');
            this.displayedColumns.push('edit');
        }

        this.userHasDeleteAuthorization = this.flowRepoService.userHasDeleteAuthorization();
        if (this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }
        this.userHasPipelineCreateAuthorization = this.flowEngineService.userHasCreateAuthorization();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
        this.flowSub.unsubscribe();
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
                        this.getFlows(true);
                    });
                }
            });
    }


    getFlows(reset: boolean) {
        if (reset) {
            this.reset();
        }
        this.flowsDataSource.sort = this.sort;
        this.sort.sortChange.subscribe(() => {
            this.paginator.pageIndex = 0;
            this.selectionClear();
        });

        this.flowSub = merge(this.sort.sortChange, this.paginator.page)
            .pipe(
                startWith({}),
                switchMap(() => {
                    this.ready = false;
                    return this.flowRepoService
                        .getFlows(this.searchText, this.paginator.pageSize,
                            this.paginator.pageSize * this.paginator.pageIndex,
                            this.sort.active,
                            this.sort.direction);
                }),
            )
            .subscribe((resp: { flows: FlowModel[], total: number }) => {
                if (resp.flows.length > 0) {
                    this.flows= resp.flows;
                    this.totalCount = resp.total;
                    this.flowsDataSource.data = this.flows;
                    this.loadFlowsPermissions();
                }
                if (this.costService.userMayGetFlowCostEstimations()) {
                    if (resp.flows.length > 0) {
                        this.flowEstimations=[];
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

    private initSearchAndGetFlows(): void {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.getFlows(true);
        });
    }

    private reset() {
        this.flows = [];
        this.flowEstimations = [];
        this.ready = false;
    }

    openOverlay(origin: any, element: any) {
        if (this.overlayRef) {
            return;
        }

        const positionStrategy: FlexibleConnectedPositionStrategy =
            this.overlay.position()
                .flexibleConnectedTo(origin.elementRef)
                .withPositions([
                    {
                        originX: 'start',
                        originY: 'center',
                        overlayX: 'end',
                        overlayY: 'center',
                        offsetY: -8,
                    },
                ]);

        this.overlayRef = this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            hasBackdrop: false,
        });

        const portal = new TemplatePortal(
            this.overlayTpl,
            this.vcr,
            { element }
        );

        this.overlayRef.attach(portal);
    }

    closeOverlay() {
        this.overlayRef?.detach();
        this.overlayRef = undefined;
    }

    loadFlowUsage() {
        this.pipeService.getFlowUsage().subscribe(
            stats => (this.flowUsagePerFlow = stats)
        );
    }

    getFlowUsageCount(id: string): number | undefined {
        return this.flowUsagePerFlow.find(item => item.flowId === id)?.count;
    }

    getFlowUser(id: string | undefined) {
        if (id !== undefined) {
            this.permissionsService.getUserById(id).subscribe((item) => {
                this.shareUser = item.username;
            });
        }
    }

    masterToggle() {
        if (this.isAllSelected()) {
            this.selectionClear();
        } else {
            this.flowsDataSource.connect().value.forEach((row) => {
                this.selection.select(row);
            });
        }
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const currentViewed = this.flowsDataSource.connect().value.length;
        return numSelected <= currentViewed && numSelected !== 0;
    }

    selectionClear($event: PageEvent | undefined = undefined): void {
        if ($event !== undefined) {
            this.preferencesService.pageSize = $event.pageSize;
        }
        this.selection.clear();
    }

    getSafeSvgCached(id: string, svg: string): SafeHtml {
        if (!this.svgCache.has(id)) {
            this.svgCache.set(id, this.sanitizer.bypassSecurityTrustHtml(svg));
        }
        return this.svgCache.get(id)!;
    }

    showPipelines(id: string, name: string) {
        this.router.navigate(['data/pipelines'], {queryParams: {flow: id, flowName: name}});
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
