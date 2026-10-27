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

import { map, startWith, switchMap } from 'rxjs/operators';

import { AfterViewInit, Component, EventEmitter, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { merge, Subscription } from 'rxjs';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { MonitorService } from './shared/monitor.service';
import { MonitorProcessModel } from './shared/monitor-process.model';
import { SelectionModel } from '@angular/cdk/collections';
import { DialogsService } from '../../../core/services/dialogs.service';
import { MonitorProcessTotalModel } from './shared/monitor-process-total.model';
import { ActivatedRoute, Navigation, Router } from '@angular/router';
import { DeploymentsModel } from '../deployments/shared/deployments.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort, SortDirection } from '@angular/material/sort';
import { NetworksService } from '../../devices/networks/shared/networks.service';
import { HubModel } from '../../devices/networks/shared/networks.model';
import { UtilService } from 'src/app/core/services/util.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { UrlStateService } from 'src/app/core/services/url-state.service';
import { ENGINE_CLOUD_NETWORK } from 'src/app/core/model/automation-engine.model';

interface TableView {
    sortActive: string;
    sortDirection: SortDirection;
    pageIndex: number;
}

function defaultTableView(): TableView {
    return { sortActive: 'startTime', sortDirection: 'desc', pageIndex: 0 };
}

@Component({
    selector: 'senergy-process-monitor',
    templateUrl: './monitor.component.html',
    styleUrls: ['./monitor.component.css'],
})
export class ProcessMonitorComponent implements OnInit, OnDestroy, AfterViewInit {
    dataSourceFinished = new MatTableDataSource<MonitorProcessModel>();
    dataSourceRunning = new MatTableDataSource<MonitorProcessModel>();
    displayedColumnsFinished: string[] = ['select', 'definitionName', 'network', 'id', 'startTime', 'endTime', 'duration', 'info', 'debug', 'delete'];
    displayedColumnsRunning: string[] = ['select', 'definitionName', 'network', 'id', 'startTime', 'debug', 'action'];
    selection = new SelectionModel<MonitorProcessModel>(true, []);
    selectionRunning = new SelectionModel<MonitorProcessModel>(true, []);
    activeIndex = 0;
    // Sort and page of each tab's table. Only the selected tab takes them from the URL, the other one stays on its defaults.
    runningView = defaultTableView();
    finishedView = defaultTableView();
    private navigationTab: number | null = null;
    totalCountFinished = 0;
    totalCountRunning = 0;
    searchText = '';
    isLoadingResultsFinished = true;
    isLoadingResultsRunning = true;
    searchInitialized = false;
    animation = true;
    selectedDeployment: DeploymentsModel | null = null;
    @ViewChild('paginatorFinished', { static: false }) paginatorFinished!: MatPaginator;
    @ViewChild('paginatorRunning', { static: false }) paginatorRunning!: MatPaginator;
    @ViewChild('sortFinished', { static: false }) sortFinished!: MatSort;
    @ViewChild('sortRunning', { static: false }) sortRunning!: MatSort;

    private searchSub: Subscription = new Subscription();
    private finishedSub: Subscription = new Subscription();
    private runningSub: Subscription = new Subscription();
    private routeSub: Subscription = new Subscription();
    private reloadFinishedSub: EventEmitter<boolean> = new EventEmitter();
    private reloadRunningSub: EventEmitter<boolean> = new EventEmitter();
    private requestedHubId: string | null = null;
    businessKeyFilter: string | null = null;
    private viewInitialized = false;
    private hubSelectionResolved = false;
    private tablesInitialized = false;

    hubList: HubModel[] = [];
    /** null lists the instances of the platform and of all hubs, ENGINE_CLOUD_NETWORK those of the platform, a hub id those of that hub */
    networkFilter: string | null = null;
    readonly cloudNetwork = ENGINE_CLOUD_NETWORK;

    constructor(
        private searchbarService: SearchbarService,
        private monitorService: MonitorService,
        private dialogsService: DialogsService,
        private router: Router,
        private route: ActivatedRoute,
        private hubsService: NetworksService,
        public utilsService: UtilService,
        public preferencesService: PreferencesService,
        private urlState: UrlStateService,
    ) {
        this.getRouterParams();
    }

    ngOnInit() {
        if (this.navigationTab !== null) {
            // a tab from navigation state wins over the URL and is written there
            this.urlState.set({ tab: this.activeIndex > 0 ? this.activeIndex : null });
        } else {
            this.activeIndex = this.urlState.getInt('tab', 0);
        }
        const sort = this.urlState.getSort('startTime', 'desc');
        const view = this.activeView;
        view.sortActive = sort.active;
        view.sortDirection = sort.direction;
        view.pageIndex = this.urlState.getPage();

        this.requestedHubId = this.route.snapshot.queryParamMap.get('hubId');
        this.businessKeyFilter = this.route.snapshot.queryParamMap.get('businessKey') || this.route.snapshot.queryParamMap.get('businesskey');
        this.routeSub = this.route.queryParamMap.subscribe((params) => {
            const hubId = params.get('hubId');
            const businessKey = params.get('businessKey') || params.get('businesskey');
            const hubChanged = hubId !== this.requestedHubId;
            const businessKeyChanged = businessKey !== this.businessKeyFilter;

            if (!hubChanged && !businessKeyChanged) {
                return;
            }

            this.requestedHubId = hubId;
            this.businessKeyFilter = businessKey;

            // before the hubs are known, their answer applies the parameter
            if (hubChanged && this.hubSelectionResolved) {
                this.applyNetworkSelectionFromQueryParam();
            }

            if (this.tablesInitialized) {
                // a changed filter starts again on the first page
                this.resetPage();
                this.reload();
            }
        });

        this.hubsService.listSyncNetworks().subscribe((result) => {
            this.hubList = result;
            this.applyNetworkSelectionFromQueryParam();
            this.hubSelectionResolved = true;
            this.tryInitializeTables();
        });
        this.initSearch();
    }

    ngAfterViewInit(): void {
        this.viewInitialized = true;
        this.tryInitializeTables();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
        this.finishedSub.unsubscribe();
        this.runningSub.unsubscribe();
        this.routeSub.unsubscribe();
    }

    selectNetwork(networkFilter: string | null, updateQueryParam = false) {
        this.networkFilter = networkFilter;

        if (updateQueryParam) {
            this.requestedHubId = networkFilter;
            this.businessKeyFilter = null;
            this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { hubId: this.requestedHubId, businessKey: null, businesskey: null, page: null },
                queryParamsHandling: 'merge',
                replaceUrl: true,
            });
        }
    }

    selectNetworkWithReload(networkFilter: string | null) {
        this.selectNetwork(networkFilter, true);
        // the URL page is dropped by the navigation in selectNetwork
        this.resetPaginator();
        this.reload();
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const currentViewed = this.dataSourceFinished.connect().value.length;
        return numSelected === currentViewed;
    }

    isAllSelectedRunning() {
        const numSelected = this.selectionRunning.selected.length;
        const currentViewed = this.dataSourceRunning.connect().value.length;
        return numSelected === currentViewed;
    }

    masterToggleRunning() {
        if (this.isAllSelectedRunning()) {
            this.selectionClearRunning();
        } else {
            this.dataSourceRunning.connect().value.forEach((row) => this.selectionRunning.select(row));
        }
    }

    masterToggle() {
        if (this.isAllSelected()) {
            this.selectionClear();
        } else {
            this.dataSourceFinished.connect().value.forEach((row) => this.selection.select(row));
        }
    }

    animationDone(): void {
        this.animation = false;
    }

    setTabIndex(index: number): void {
        this.animation = true;
        this.activeIndex = index;
        this.searchText = '';
        // The tab starts from the defaults; its load reads them from the view and not from the table, which only
        // takes the bindings at the next change detection.
        if (index === 0) {
            this.runningView = defaultTableView();
        } else {
            this.finishedView = defaultTableView();
        }
        this.urlState.set({ tab: index > 0 ? index : null, search: null, sort: null, dir: null, page: null });
        if (this.activeIndex === 0) {
            this.isLoadingResultsRunning = true;
        } else {
            this.isLoadingResultsFinished = true;
        }
        this.reload();
    }

    /** where an instance runs: the platform or the name of its hub */
    networkName(networkId: string | undefined): string {
        if (!networkId) {
            return 'Platform';
        }
        return this.hubList.find((hub) => hub.id === networkId)?.name || networkId;
    }

    openDetailsDialog(id: string): void {
        this.monitorService.openDetailsDialog(id);
    }

    deleteSingleItem(element: MonitorProcessModel): void {
        this.dialogsService
            .openDeleteDialog('process (' + element.id + ')')
            .afterClosed()
            .subscribe((processDelete: boolean) => {
                if (processDelete) {
                    this.isLoadingResultsFinished = true;
                    this.monitorService.deleteInstances(element.id).subscribe((resp: string) => {
                        if (resp === 'ok') {
                            this.resetPage();
                            this.reload();
                        }
                    });
                }
            });
    }

    deleteMultipleItems(): void {
        this.dialogsService
            .openDeleteDialog(this.selection.selected.length + ' process(es)')
            .afterClosed()
            .subscribe((processesDelete: boolean) => {
                if (processesDelete) {
                    this.isLoadingResultsFinished = true;
                    this.monitorService.deleteMultipleInstances(this.selection.selected).subscribe(() => {
                        this.resetPage();
                        this.reload();
                        this.selectionClear();
                    });
                }
            });
    }

    deleteMultipleItemsRunning(): void {
        this.dialogsService
            .openDeleteDialog(this.selectionRunning.selected.length + ' process(es)')
            .afterClosed()
            .subscribe((processesDelete: boolean) => {
                if (processesDelete) {
                    this.isLoadingResultsRunning = true;
                    this.monitorService.stopMultipleInstances(this.selectionRunning.selected).subscribe(() => {
                        this.resetPage();
                        this.reload();
                        this.selectionClearRunning();
                    });
                }
            });
    }

    stop(element: MonitorProcessModel): void {
        this.monitorService.stopInstances(element.id).subscribe((resp: string) => {
            if (resp === 'ok') {
                this.isLoadingResultsRunning = true;
                this.resetPage();
                this.reload();
            }
        });
    }

    selectionClear($event: PageEvent | undefined = undefined): void {
        if ($event !== undefined) {
            this.preferencesService.pageSize = $event?.pageSize;
        }
        this.selection.clear();
    }

    selectionClearRunning(): void {
        this.selectionRunning.clear();
    }

    removeChip(): void {
        this.selectedDeployment = null;
        this.reload();
    }

    removeBusinessKeyChip(): void {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { businessKey: null, businesskey: null, page: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    paginatorRunningPage($event: PageEvent) {
        this.preferencesService.pageSize = $event.pageSize;
    }

    private initRunning() {
        this.dataSourceRunning.sort = this.sortRunning;
        this.dataSourceRunning.sort.sortChange.subscribe((sort: Sort) => {
            this.runningView = { sortActive: sort.active, sortDirection: sort.direction, pageIndex: 0 };
            this.paginatorRunning.pageIndex = 0;
            this.urlState.setSort(sort, 'startTime', 'desc');
        });
        this.paginatorRunning.page.subscribe((e: PageEvent) => {
            this.runningView.pageIndex = e.pageIndex;
            // a tab that is not shown never writes the URL
            if (this.activeIndex === 0) {
                this.urlState.setPage(e.pageIndex);
            }
        });
        this.runningSub = merge(this.dataSourceRunning.sort.sortChange, this.paginatorRunning.page, this.reloadRunningSub)
            .pipe(
                startWith({}),
                switchMap(() => {
                    this.isLoadingResultsRunning = true;
                    return this.monitorService.getInstancesOfNetworks(
                        'running',
                        this.searchText,
                        this.selectedDeployment?.id,
                        this.paginatorRunning.pageSize,
                        this.paginatorRunning.pageSize * this.runningView.pageIndex,
                        this.runningView.sortActive,
                        this.runningView.sortDirection,
                        this.businessKeyFilter || undefined,
                        this.networkFilter || undefined,
                    );
                }),
                map((resp: MonitorProcessTotalModel) => {
                    this.totalCountRunning = resp.total;
                    return resp.data;
                }),
            )
            .subscribe((data: MonitorProcessModel[]) => {
                this.dataSourceRunning.data = data || [];
                this.isLoadingResultsRunning = false;
            });
    }

    private initFinished() {
        this.dataSourceFinished.sort = this.sortFinished;
        this.dataSourceFinished.sort.sortChange.subscribe((sort: Sort) => {
            this.finishedView = { sortActive: sort.active, sortDirection: sort.direction, pageIndex: 0 };
            this.paginatorFinished.pageIndex = 0;
            this.selectionClear();
            this.urlState.setSort(sort, 'startTime', 'desc');
        });
        this.paginatorFinished.page.subscribe((e: PageEvent) => {
            this.finishedView.pageIndex = e.pageIndex;
            if (this.activeIndex !== 0) {
                this.urlState.setPage(e.pageIndex);
            }
        });

        this.finishedSub = merge(this.dataSourceFinished.sort.sortChange, this.paginatorFinished.page, this.reloadFinishedSub)
            .pipe(
                startWith({}),
                switchMap(() => {
                    this.isLoadingResultsFinished = true;
                    return this.monitorService.getInstancesOfNetworks(
                        'finished',
                        this.searchText,
                        this.selectedDeployment?.id,
                        this.paginatorFinished.pageSize,
                        this.paginatorFinished.pageSize * this.finishedView.pageIndex,
                        this.finishedView.sortActive,
                        this.finishedView.sortDirection,
                        this.businessKeyFilter || undefined,
                        this.networkFilter || undefined,
                    );
                }),
                map((resp: MonitorProcessTotalModel) => {
                    this.totalCountFinished = resp.total;
                    return resp.data;
                }),
            )
            .subscribe((data: MonitorProcessModel[]) => {
                this.dataSourceFinished.data = data || [];
                this.isLoadingResultsFinished = false;
            });
    }

    private initSearch() {
        // the first search is the one the page was opened with, so it keeps the page from the URL
        let opening = true;
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            if (searchText !== '') {
                this.searchInitialized = true;
            }
            this.searchText = searchText;
            if (this.searchInitialized) {
                if (!opening) {
                    this.resetPage();
                }
                this.reload();
            }
            opening = false;
        });
    }

    private resetPage(): void {
        this.resetPaginator();
        this.urlState.setPage(0);
    }

    private resetPaginator(): void {
        this.activeView.pageIndex = 0;
        // not before the first render
        const paginator = this.activeIndex === 0 ? this.paginatorRunning : this.paginatorFinished;
        if (paginator) {
            paginator.pageIndex = 0;
        }
    }

    private get activeView(): TableView {
        return this.activeIndex === 0 ? this.runningView : this.finishedView;
    }

    private getRouterParams(): void {
        const navigation: Navigation | null = this.router.getCurrentNavigation();
        if (navigation !== null) {
            if (navigation.extras.state !== undefined) {
                const params = navigation.extras.state as {
                    deployment: DeploymentsModel;
                    activeTab: number;
                    businesskey?: string;
                };
                this.selectedDeployment = params.deployment;
                this.activeIndex = params.activeTab;
                this.navigationTab = params.activeTab;
                if (params.businesskey) {
                    this.businessKeyFilter = params.businesskey;
                    this.router.navigate([], {
                        relativeTo: this.route,
                        queryParams: { businessKey: params.businesskey, businesskey: null },
                        queryParamsHandling: 'merge',
                        replaceUrl: true,
                    });
                }
            }
        }
    }

    private tryInitializeTables(): void {
        if (!this.viewInitialized || !this.hubSelectionResolved || this.tablesInitialized) {
            return;
        }

        this.tablesInitialized = true;
        this.initRunning();
        this.initFinished();
    }

    private applyNetworkSelectionFromQueryParam(): void {
        const requested = this.requestedHubId;
        if (requested && requested !== ENGINE_CLOUD_NETWORK && !this.hubList.some((hub) => hub.id === requested)) {
            // a hub that is gone or no longer shared
            this.selectNetwork(null, true);
            return;
        }
        if (this.networkFilter !== requested) {
            this.selectNetwork(requested, false);
        }
    }

    private reload() {
        if (this.activeIndex === 0) {
            this.reloadRunningSub.emit(true);
        } else {
            this.reloadFinishedSub.emit(true);
        }
    }
}
