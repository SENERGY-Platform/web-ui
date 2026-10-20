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

import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LIST_DATE_FORMAT } from 'src/app/core/classes/list-date-format';
import {MatSnackBar} from '@angular/material/snack-bar';
import {FilterSelection, FlowModel} from './shared/flow.model';
import {FlowRepoService} from './shared/flow-repo.service';
import {DialogsService} from '../../../core/services/dialogs.service';
import { confirmDelete } from '../../../core/services/delete-flows';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {Observable, tap} from 'rxjs';
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
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import {MatPaginator} from '@angular/material/paginator';
import {PreferencesService} from '../../../core/services/preferences.service';
import {PagedListState} from 'src/app/core/classes/paged-list-state';
import { MatSort, MatSortHeader, Sort } from '@angular/material/sort';
import { HoverPreviewComponent } from '../../../core/components/hover-preview/hover-preview.component';
import {FlowFilterDialogComponent} from './flow-filter-dialog/flow-filter-dialog.component';
import {MatDialog} from '@angular/material/dialog';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatChipSet, MatChip, MatChipAvatar, MatChipRemove } from '@angular/material/chips';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';


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
        }
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, MatButton, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger, MatTooltip, MatIcon, MatChipSet, MatChip, MatChipAvatar, MatChipRemove, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatSortHeader, HoverPreviewComponent, RouterLink, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, SpinnerComponent, CurrencyPipe, DatePipe]
})
export class FlowRepoComponent implements OnInit, AfterViewInit {
    private flowRepoService = inject(FlowRepoService);
    private destroyRef = inject(DestroyRef);
    snackBar = inject(MatSnackBar);
    private dialogsService = inject(DialogsService);
    private sanitizer = inject(DomSanitizer);
    authService = inject(AuthorizationService);
    private searchbarService = inject(SearchbarService);
    private flowEngineService = inject(FlowEngineService);
    costService = inject(CostService);
    private permissionsDialogService = inject(PermissionsDialogService);
    protected permissionsService = inject(PermissionsService);
    private pipeService = inject(PipelineRegistryService);
    private router = inject(Router);
    private preferencesService = inject(PreferencesService);
    private dialog = inject(MatDialog);
    private activatedRoute = inject(ActivatedRoute);
    private cd = inject(ChangeDetectorRef);

    @ViewChild('paginator', {static: false}) paginator!: MatPaginator;
    flows: FlowModel[] = [];

    readonly dateFormat = LIST_DATE_FORMAT;
    flowsDataSource = new MatTableDataSource<FlowModel>();
    /** The cost estimation per flow id; it arrives after the list. */
    flowEstimations = new Map<string, CostEstimationModel>();
    ready = false;
    userHasDeleteAuthorization = false;
    userHasUpdateAuthorization = false;
    userHasPipelineCreateAuthorization = false;

    displayedColumns: string[] = ['image', 'name', 'pub', 'cost', 'dateUpdated', 'actions'];
    totalCount = 0;
    list = new PagedListState(this.preferencesService, () => this.loadFlows(), { sortBy: 'dateUpdated', sortDirection: 'desc' });

    shareUser = '';

    flowUsagePerFlow: FlowUsage[] = [];

    searchText = '';

    permissionsPerFlows: PermissionsV2RightsAndIdModel[] = [];

    userId = {} as string | Error;

    private svgCache = new Map<string, SafeUrl>();

    routerOperator: string[] | undefined = undefined;
    routerOperatorNames: string[] | undefined = undefined;

    ngOnInit() {
        this.userId = this.authService.getUserId();
        if (this.authService.userIsAdmin()) {
            this.loadFlowUsage();
        }
        this.userHasUpdateAuthorization = this.flowRepoService.userHasUpdateAuthorization();
        this.userHasDeleteAuthorization = this.flowRepoService.userHasDeleteAuthorization();
        this.userHasPipelineCreateAuthorization = this.flowEngineService.userHasCreateAuthorization();

        this.activatedRoute.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => {
            if (value.has('operator')){
                this.routerOperator = value.getAll('operator');
            }
            if (value.has('operatorName')){
                this.routerOperatorNames = value.getAll('operatorName');
            }
        });

        this.initSearch();
    }

    ngAfterViewInit() {
        this.list.connect(this.paginator, this.destroyRef);
    }

    get filtered(): boolean {
        return this.searchText !== '' || (this.routerOperator?.length ?? 0) > 0;
    }

    private initSearch(): void {
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    matSortChange($event: Sort) {
        this.list.sortChanged($event);
        this.reload();
    }

    /** The one reload path: search, sort, filter, refresh button and delete all end here. */
    reload() {
        this.ready = false;
        this.list.reload({ error: () => (this.ready = true) });
    }

    private loadFlows(): Observable<unknown> {
        this.ready = false;
        let filter = undefined;
        if (this.routerOperator != null && this.routerOperator.length > 0){
            filter = 'operator:'+this.routerOperator!.toString();
        }
        return this.flowRepoService
            .getFlows(this.searchText, this.list.pageSize, this.list.offset, this.list.sortBy, this.list.sortDirection, filter)
            .pipe(
                tap((resp: { flows: FlowModel[], total: number }) => {
                    this.flows = resp.flows ?? [];
                    this.totalCount = resp.total;
                    this.flowsDataSource.data = this.flows;
                    this.flowEstimations = new Map();
                    if (this.flows.length > 0) {
                        this.loadFlowsPermissions();
                        this.loadFlowEstimations(this.flows.map(f => f._id || ''));
                    }
                    this.ready = true;
                }),
            );
    }

    private loadFlowEstimations(ids: string[]) {
        if (!this.costService.userMayGetFlowCostEstimations()) {
            return;
        }
        this.costService.getFlowCostEstimations(ids).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(estimations => {
            const byId = new Map<string, CostEstimationModel>();
            ids.forEach((id, i) => byId.set(id, estimations[i]));
            this.flowEstimations = byId;
        });
    }

    deleteFlow(flow: FlowModel) {
        confirmDelete(this.dialogsService, 'flow ' + flow.name).subscribe(() => {
            this.flowRepoService.deleteFlow(flow).subscribe({
                next: _ => {
                    snackSuccess(this.snackBar, 'Flow deleted');
                    this.reload();
                },
                error: _ => {
                    snackError(this.snackBar, 'Flow could not be deleted');
                },
            });
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

    /** The row click and the first menu entry: the designer, only for who may edit the flow. */
    editFlow(flow: FlowModel) {
        if (!this.canEdit(flow)) {
            return;
        }
        this.router.navigate(['/data/designer', flow._id]);
    }

    deployFlow(flow: FlowModel) {
        this.router.navigate(['/data/flow-repo/deploy', flow._id]);
    }

    canEdit(flow: FlowModel): boolean {
        return this.userHasUpdateAuthorization && flow._id !== undefined && this.userHasWritePermission(flow._id);
    }

    canShare(flow: FlowModel): boolean {
        return this.userHasUpdateAuthorization && flow._id !== undefined && this.userHasAdministratePermission(flow._id);
    }

    canDelete(flow: FlowModel): boolean {
        return this.userHasDeleteAuthorization && flow._id !== undefined && this.userHasAdministratePermission(flow._id);
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

    /**
     * The stored flow image as an image URL, so it is only drawn and never run as markup. The designer writes
     * `viewbox` in lower case, which an image document ignores, so the attribute name is fixed on the first
     * `<svg` start tag; the stored document starts with an XML prolog, so it is not anchored to the text start.
     */
    previewUrl(id: string, svg: string | unknown): SafeUrl {
        if (!this.svgCache.has(id)) {
            const fixed = String(svg).replace(/<svg\b[^>]*>/i, (tag) => tag.replace(/\bviewbox=/i, 'viewBox='));
            const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fixed);
            this.svgCache.set(id, this.sanitizer.bypassSecurityTrustUrl(url));
        }
        return this.svgCache.get(id)!;
    }

    openFilterDialog() {
        const filterSelection: FilterSelection = {
            operators: this.routerOperator,
            operatorNames: [],
        };
        const dialogRef = this.dialog.open(FlowFilterDialogComponent, {
            data: filterSelection,
            minWidth: '50vw',
        });

        dialogRef.afterClosed().subscribe({
            next: (filterSelectionInner: FilterSelection) => {
                if (filterSelectionInner != null) {
                    this.routerOperator = filterSelectionInner.operators;
                    this.routerOperatorNames = filterSelectionInner.operatorNames;
                    const queryParams: Params = {operator: this.routerOperator, operatorName: this.routerOperatorNames};
                    this.router.navigate(
                        [],
                        {
                            relativeTo: this.activatedRoute,
                            queryParams
                        },
                    );
                    this.cd.detectChanges();

                }
                this.reload();
            }
        });
    }

    removeChip(i: number, type: string){
        if (type === 'operator'){
            this.routerOperator!.splice(i, 1);
            this.routerOperatorNames!.splice(i, 1);
        }
        const queryParams: Params = {operator: this.routerOperator, operatorName: this.routerOperatorNames};
        this.router.navigate(
            [],
            {
                relativeTo: this.activatedRoute,
                queryParams
            },
        );
        this.reload();
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
