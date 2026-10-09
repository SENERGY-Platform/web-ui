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

import { AfterViewInit, Component, EventEmitter, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge, Observable } from 'rxjs';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { MonitorService } from './shared/monitor.service';
import { MonitorProcessModel } from './shared/monitor-process.model';
import { ListSelection } from 'src/app/core/classes/list-selection';
import { DialogsService } from '../../../core/services/dialogs.service';
import { MonitorProcessTotalModel } from './shared/monitor-process-total.model';
import { ActivatedRoute, Navigation, Router } from '@angular/router';
import { DeploymentsModel } from '../deployments/shared/deployments.model';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { NetworksService } from '../../devices/networks/shared/networks.service';
import { HubModel } from '../../devices/networks/shared/networks.model';
import { MonitorFogFactory } from './shared/monitor-fog.service';
import { UtilService } from 'src/app/core/services/util.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { SearchbarComponent } from '../../../core/components/searchbar/searchbar.component';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { NgClass, DatePipe } from '@angular/common';
import { MatChipListbox, MatChipOption, MatChipRemove, MatChipSet, MatChipRow } from '@angular/material/chips';
import { MatCheckbox } from '@angular/material/checkbox';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';

@Component({
    selector: 'senergy-process-monitor',
    templateUrl: './monitor.component.html',
    styleUrls: ['./monitor.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatTabGroup, MatTab, SearchbarComponent, MatIconButton, MatTooltip, MatMenuTrigger, MatIcon, MatMenu, MatMenuItem, NgClass, MatChipListbox, MatChipOption, MatChipRemove, MatChipSet, MatChipRow, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatSortHeader, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, SpinnerComponent, DatePipe]
})
export class ProcessMonitorComponent implements OnInit, AfterViewInit {
    private searchbarService = inject(SearchbarService);
    private plattformMonitorService = inject(MonitorService);
    private dialogsService = inject(DialogsService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private hubsService = inject(NetworksService);
    private fogMonitorFactory = inject(MonitorFogFactory);
    utilsService = inject(UtilService);
    preferencesService = inject(PreferencesService);
    private destroyRef = inject(DestroyRef);

    dataSourceFinished = new MatTableDataSource<MonitorProcessModel>();
    dataSourceRunning = new MatTableDataSource<MonitorProcessModel>();
    displayedColumnsFinished: string[] = ['select', 'definitionName', 'id', 'startTime', 'endTime', 'duration', 'info', 'delete'];
    displayedColumnsRunning: string[] = ['select', 'definitionName', 'id', 'startTime', 'action'];
    listSelection = new ListSelection<MonitorProcessModel>(() => this.dataSourceFinished.connect().value);
    listSelectionRunning = new ListSelection<MonitorProcessModel>(() => this.dataSourceRunning.connect().value);
    selection = this.listSelection.model;
    selectionRunning = this.listSelectionRunning.model;
    activeIndex = 0;
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

    private reloadFinishedSub: EventEmitter<boolean> = new EventEmitter();
    private reloadRunningSub: EventEmitter<boolean> = new EventEmitter();
    private requestedHubId: string | null = null;
    businessKeyFilter: string | null = null;
    private viewInitialized = false;
    private hubSelectionResolved = false;
    private tablesInitialized = false;

    hubList: HubModel[] = [];
    hub: HubModel | undefined | null;

    private monitorService: {
        deleteInstances(id: string): Observable<string>;
        deleteMultipleInstances(processes: MonitorProcessModel[]): Observable<string[]>;
        stopInstances(id: string): Observable<string>;
        stopMultipleInstances(processes: MonitorProcessModel[]): Observable<string[]>;
        getFilteredHistoryInstances(
            filter: string,
            searchtype: string,
            searchvalue: string,
            limit: number,
            offset: number,
            value: string,
            order: string,
            businessKey?: string,
        ): Observable<MonitorProcessTotalModel>;
        openDetailsDialog(id: string): void;
    };

    constructor() {
        const plattformMonitorService = this.plattformMonitorService;

        this.monitorService = plattformMonitorService;
        this.getRouterParams();
    }

    ngOnInit() {
        this.requestedHubId = this.route.snapshot.queryParamMap.get('hubId');
        this.businessKeyFilter = this.route.snapshot.queryParamMap.get('businessKey') || this.route.snapshot.queryParamMap.get('businesskey');
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            const hubId = params.get('hubId');
            const businessKey = params.get('businessKey') || params.get('businesskey');
            const hubChanged = hubId !== this.requestedHubId;
            const businessKeyChanged = businessKey !== this.businessKeyFilter;

            if (!hubChanged && !businessKeyChanged) {
                return;
            }

            this.requestedHubId = hubId;
            this.businessKeyFilter = businessKey;

            if (hubChanged) {
                this.applyHubSelectionFromQueryParam();
            }

            if (this.tablesInitialized) {
                this.reload();
            }
        });

        this.hubsService.listSyncNetworks().subscribe((result) => {
            this.hubList = result;
            this.applyHubSelectionFromQueryParam();
            this.hubSelectionResolved = true;
            this.tryInitializeTables();
        });
        this.initSearch();
    }

    ngAfterViewInit(): void {
        this.viewInitialized = true;
        this.tryInitializeTables();
        // Material 22 fires no animationDone for the tab that is active from creation, which
        // would keep the tables hidden behind the spinner; the old tab animation ended right after render.
        setTimeout(() => this.animationDone());
    }

    selectHub(hub: HubModel | null, updateQueryParam = false) {
        this.hub = hub;
        if (hub) {
            this.monitorService = this.fogMonitorFactory.withHubId(hub.id);
        } else {
            this.monitorService = this.plattformMonitorService;
        }

        if (updateQueryParam) {
            this.requestedHubId = hub?.id || null;
            this.businessKeyFilter = null;
            this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { hubId: this.requestedHubId, businessKey: null, businesskey: null },
                queryParamsHandling: 'merge',
                replaceUrl: true,
            });
        }
    }

    selectHubWithReload(hub: HubModel | null) {
        this.selectHub(hub, true);
        this.reload();
    }

    isAllSelected() {
        return this.listSelection.isAllSelected();
    }

    isAllSelectedRunning() {
        return this.listSelectionRunning.isAllSelected();
    }

    masterToggleRunning() {
        this.listSelectionRunning.masterToggle();
    }

    masterToggle() {
        this.listSelection.masterToggle();
    }

    animationDone(): void {
        this.animation = false;
    }

    setTabIndex(index: number): void {
        this.animation = true;
        this.activeIndex = index;
        this.searchText = '';
        if (this.activeIndex === 0) {
            this.isLoadingResultsRunning = true;
        } else {
            this.isLoadingResultsFinished = true;
        }
        this.reload();
    }

    openDetailsDialog(id: string): void {
        this.monitorService.openDetailsDialog(id);
    }

    deleteSingleItem(element: MonitorProcessModel): void {
        this.dialogsService
            .openDeleteDialog('process (' + element.id + ')')
            .afterClosed()
            .subscribe((processDelete: boolean | undefined) => {
                if (processDelete) {
                    this.isLoadingResultsFinished = true;
                    this.monitorService.deleteInstances(element.id).subscribe((resp: string) => {
                        if (resp === 'ok') {
                            this.paginatorFinished.pageIndex = 0;
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
            .subscribe((processesDelete: boolean | undefined) => {
                if (processesDelete) {
                    this.isLoadingResultsFinished = true;
                    this.monitorService.deleteMultipleInstances(this.selection.selected).subscribe(() => {
                        this.paginatorFinished.pageIndex = 0;
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
            .subscribe((processesDelete: boolean | undefined) => {
                if (processesDelete) {
                    this.isLoadingResultsRunning = true;
                    this.monitorService.stopMultipleInstances(this.selectionRunning.selected).subscribe(() => {
                        this.paginatorRunning.pageIndex = 0;
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
                this.paginatorRunning.pageIndex = 0;
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
            queryParams: { businessKey: null, businesskey: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    paginatorRunningPage($event: PageEvent) {
        this.preferencesService.pageSize = $event.pageSize;
    }

    private initRunning() {
        this.dataSourceRunning.sort = this.sortRunning;
        this.dataSourceRunning.sort.sortChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.paginatorRunning.pageIndex = 0;
        });
        merge(this.dataSourceRunning.sort.sortChange, this.paginatorRunning.page, this.reloadRunningSub)
            .pipe(
                startWith({}),
                switchMap(() => {
                    this.isLoadingResultsRunning = true;
                    const searchParams = this.setSearchParams();
                    return this.monitorService.getFilteredHistoryInstances(
                        'unfinished',
                        searchParams.searchType,
                        searchParams.searchValue,
                        this.paginatorRunning.pageSize,
                        this.paginatorRunning.pageSize * this.paginatorRunning.pageIndex,
                        this.sortRunning.active,
                        this.sortRunning.direction,
                        this.businessKeyFilter || undefined,
                    );
                }),
                map((resp: MonitorProcessTotalModel) => {
                    this.totalCountRunning = resp.total;
                    return resp.data;
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((data: MonitorProcessModel[]) => {
                this.dataSourceRunning.data = data || [];
                this.isLoadingResultsRunning = false;
            });
    }

    private initFinished() {
        this.dataSourceFinished.sort = this.sortFinished;
        this.dataSourceFinished.sort.sortChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.paginatorFinished.pageIndex = 0;
            this.selectionClear();
        });

        merge(this.dataSourceFinished.sort.sortChange, this.paginatorFinished.page, this.reloadFinishedSub)
            .pipe(
                startWith({}),
                switchMap(() => {
                    this.isLoadingResultsFinished = true;
                    const searchParams = this.setSearchParams();
                    return this.monitorService.getFilteredHistoryInstances(
                        'finished',
                        searchParams.searchType,
                        searchParams.searchValue,
                        this.paginatorFinished.pageSize,
                        this.paginatorFinished.pageSize * this.paginatorFinished.pageIndex,
                        this.sortFinished.active,
                        this.sortFinished.direction,
                        this.businessKeyFilter || undefined,
                    );
                }),
                map((resp: MonitorProcessTotalModel) => {
                    this.totalCountFinished = resp.total;
                    return resp.data;
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((data: MonitorProcessModel[]) => {
                this.dataSourceFinished.data = data || [];
                this.isLoadingResultsFinished = false;
            });
    }

    private setSearchParams(): { searchType: string; searchValue: string } {
        let searchType = '';
        let searchValue = '';

        if (this.selectedDeployment === null) {
            searchType = 'processDefinitionNameLike';
            searchValue = this.searchText;
        } else {
            searchType = 'processDefinitionId';
            searchValue = this.selectedDeployment.definition_id;
        }
        return { searchType, searchValue };
    }

    private initSearch() {
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
            if (searchText !== '') {
                this.searchInitialized = true;
            }
            this.searchText = searchText;
            if (this.searchInitialized) {
                this.reload();
            }
        });
    }
    private getRouterParams(): void {
        const navigation: Navigation | null = this.router.getCurrentNavigation();
        if (navigation !== null) {
            if (navigation.extras.state !== undefined) {
                const params = navigation.extras.state as {
                    deployment: DeploymentsModel;
                    activeTab: number;
                    hub?: HubModel;
                    businesskey?: string;
                };
                this.selectedDeployment = params.deployment;
                this.activeIndex = params.activeTab;
                if (params.hub) {
                    this.selectHub(params.hub, true);
                }
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

    private applyHubSelectionFromQueryParam(): void {
        if (!this.hubList.length) {
            return;
        }

        if (!this.requestedHubId) {
            if (this.hub !== null) {
                this.selectHub(null, false);
            }
            return;
        }

        const selectedHub = this.hubList.find((hub) => hub.id === this.requestedHubId) || null;
        if (!selectedHub) {
            this.selectHub(null, true);
            return;
        }

        if (this.hub?.id !== selectedHub.id) {
            this.selectHub(selectedHub, false);
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
