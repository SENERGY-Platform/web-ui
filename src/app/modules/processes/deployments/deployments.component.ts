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

import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { concatMap, from, map, mergeMap, Observable, of, Subscription, toArray } from 'rxjs';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { UtilService } from '../../../core/services/util.service';
import { DeploymentsService } from './shared/deployments.service';
import { DeploymentsModel, DeploymentsOfflineReasonsModel } from './shared/deployments.model';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ClipboardService } from 'ngx-clipboard';
import { environment } from '../../../../environments/environment';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogsService } from '../../../core/services/dialogs.service';
import { DeploymentsMissingDependenciesDialogComponent } from './dialogs/deployments-missing-dependencies-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CamundaVariable } from './shared/deployments-definition.model';
import { DeploymentsStartParameterDialogComponent } from './dialogs/deployments-start-parameter-dialog.component';
import { HubModel } from '../../devices/networks/shared/networks.model';
import { NetworksService } from '../../devices/networks/shared/networks.service';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { DatePipe } from '@angular/common';
import { MatChipSet, MatChip, MatChipRemove, MatChipListbox, MatChipOption } from '@angular/material/chips';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader, Sort, SortDirection } from '@angular/material/sort';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { HoverPreviewComponent } from '../../../core/components/hover-preview/hover-preview.component';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { LIST_DATE_FORMAT } from '../../../core/classes/list-date-format';
import { ListSelection } from '../../../core/classes/list-selection';
import { loadAllPages } from '../../../core/classes/load-all-pages';
import { PreferencesService } from '../../../core/services/preferences.service';
import { UrlStateService } from '../../../core/services/url-state.service';
import { bulkDelete, confirmDelete, countLabel, everyTrue } from '../../../core/services/delete-flows';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';
import { dialogSize } from '../../../core/dialog-size';
import { ENGINE_CLOUD_NETWORK } from '../../../core/model/automation-engine.model';

/** Deployments are read in chunks this size, because the online state of each chunk is looked up with its ids in one URL. */
const CHUNK = 50;

/** The columns with a sort header, the only sort keys taken from the URL. */
const SORTABLE = ['name', 'deploymentTime'];

@Component({
    selector: 'senergy-process-deployments',
    templateUrl: './deployments.component.html',
    styleUrls: ['./deployments.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, HoverPreviewComponent, SpinnerComponent, MatButton, MatIconButton, MatTooltip, MatIcon, MatMenuTrigger, MatMenu, MatMenuItem, MatChipSet, MatChip, MatChipRemove, MatChipListbox, MatChipOption, MatCheckbox, MatPaginator, MatSort, MatSortHeader, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, DatePipe]
})
export class ProcessDeploymentsComponent implements OnInit, AfterViewInit, OnDestroy {
    private sanitizer = inject(DomSanitizer);
    private utilService = inject(UtilService);
    private searchbarService = inject(SearchbarService);
    private deploymentsService = inject(DeploymentsService);
    private snackBar = inject(MatSnackBar);
    private clipboardService = inject(ClipboardService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private dialogsService = inject(DialogsService);
    private dialog = inject(MatDialog);
    private hubsService = inject(NetworksService);
    private metadataExistenceService = inject(MetadataExistenceService);
    private urlState = inject(UrlStateService);
    private destroyRef = inject(DestroyRef);
    preferencesService = inject(PreferencesService);

    readonly dateFormat = LIST_DATE_FORMAT;
    displayedColumns = ['select', 'image', 'name', 'status', 'network', 'deploymentTime', 'actions'];
    /** The deployment API has no total, so every deployment is loaded and the list pages on the client. */
    dataSource = new MatTableDataSource<DeploymentsModel>([]);
    listSelection = new ListSelection<DeploymentsModel>(() => this.dataSource.connect().value);
    selection = this.listSelection.model;
    ready = false;
    searchText = '';
    showGenerated = false;
    hubList: HubModel[] = [];
    /** null lists the deployments of the platform and of all hubs, ENGINE_CLOUD_NETWORK those of the platform, a hub id those of that hub */
    networkFilter: string | null = null;
    readonly cloudNetwork = ENGINE_CLOUD_NETWORK;
    deploymentIdFilter: string | null = null;
    /** Metadata warning per deployment id, filled once the check was asked for. */
    metadataWarnings = new Map<string, string>();
    metadataCheckRequested = false;
    private metadataChecksRunning = 0;

    userHasDeleteAuthorization = false;

    sortBy = 'deploymentTime';
    sortOrder: SortDirection = 'desc';
    // the page from the URL, taken by the opening load once the rows are in; null afterwards
    private openingPage: number | null = null;
    private paginatorRef?: MatPaginator;
    private source = 'sepl';
    private getAllSub = new Subscription();
    private requestedHubId: string | null = null;
    private viewInitialized = false;
    private searchInitialized = false;
    private hubSelectionResolved = false;
    private metadataChecked = new Set<string>();

    @ViewChild('paginator', { static: false })
    set paginator(value: MatPaginator | undefined) {
        if (value && value !== this.paginatorRef) {
            this.paginatorRef = value;
            this.dataSource.paginator = value;
            value.page.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => this.urlState.setPage(e.pageIndex));
        }
    }

    ngOnInit() {
        this.userHasDeleteAuthorization = this.deploymentsService.userHasDeleteAuthorization();
        this.showGenerated = this.urlState.getShown('generated', false);
        this.source = this.showGenerated ? '' : 'sepl';
        const sort = this.urlState.getSort('deploymentTime', 'desc');
        // only the sortable columns; the header cannot be cleared, so a sort without a direction is the default sort
        if (SORTABLE.includes(sort.active) && sort.direction !== '') {
            this.sortBy = sort.active;
            this.sortOrder = sort.direction;
        }
        this.openingPage = this.urlState.getPage();

        this.requestedHubId = this.route.snapshot.queryParamMap.get('hubId');
        this.deploymentIdFilter = this.route.snapshot.queryParamMap.get('deploymentId');
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            const hubId = params.get('hubId');
            const deploymentId = params.get('deploymentId');
            const hubChanged = hubId !== this.requestedHubId;
            const deploymentChanged = deploymentId !== this.deploymentIdFilter;

            if (!hubChanged && !deploymentChanged) {
                return;
            }

            this.requestedHubId = hubId;
            this.deploymentIdFilter = deploymentId;

            // before the hubs are known, their answer applies the parameter
            if (hubChanged && this.hubSelectionResolved) {
                this.applyNetworkSelectionFromQueryParam();
            }

            if (deploymentChanged && !hubChanged && this.searchInitialized) {
                this.reload();
            }
        });

        // The metadata check follows the page that is shown: it costs a request per deployment.
        this.dataSource.connect().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((rows) => {
            if (this.metadataCheckRequested) {
                this.markMissingMetadata(rows);
            }
        });

        this.hubsService.listSyncNetworks().subscribe((result) => {
            this.hubList = result;
            this.applyNetworkSelectionFromQueryParam();
            this.hubSelectionResolved = true;
            this.tryInitializeSearchAndLoad();
        });
    }

    ngAfterViewInit() {
        this.viewInitialized = true;
        this.tryInitializeSearchAndLoad();
    }

    ngOnDestroy() {
        this.getAllSub.unsubscribe();
    }

    /** True while any metadata check is still reading diagrams, so overlapping checks keep the button disabled. */
    get metadataCheckRunning(): boolean {
        return this.metadataChecksRunning > 0;
    }

    get filtered(): boolean {
        return this.searchText !== '' || this.showGenerated || this.deploymentIdFilter !== null || this.networkFilter !== null;
    }

    /** The one reload path: search, sort, hub, filters, refresh button and every write end here; only the latest load stays subscribed. */
    reload(): void {
        this.getAllSub.unsubscribe();
        this.ready = false;
        this.selection.clear();
        this.metadataChecked.clear();
        this.metadataWarnings = new Map();
        // the first load is the one the page was opened with and keeps the page from the URL
        const openingPage = this.openingPage;
        this.openingPage = null;
        this.getAllSub = this.load().subscribe((deployments) => {
            const paginator = this.dataSource.paginator;
            if (openingPage !== null && paginator) {
                // set before the data, which the data source renders at the paginator's page; a page beyond the end
                // would be moved back by the data source without a page event, so it is corrected here with the URL
                const lastPage = Math.max(0, Math.ceil(deployments.length / paginator.pageSize) - 1);
                paginator.pageIndex = Math.min(openingPage, lastPage);
                if (paginator.pageIndex !== openingPage) {
                    this.urlState.setPage(paginator.pageIndex);
                }
            }
            this.dataSource.data = deployments;
            if (openingPage === null) {
                paginator?.firstPage();
                this.urlState.setPage(0);
            }
            this.ready = true;
        });
    }

    matSortChange(event: Sort): void {
        this.sortBy = event.active;
        this.sortOrder = event.direction || 'desc';
        this.urlState.setSort(event, 'deploymentTime', 'desc');
        this.reload();
    }

    isAllSelected(): boolean {
        return this.listSelection.isAllSelected();
    }

    masterToggle(): void {
        this.listSelection.masterToggle();
    }

    selectionClear(): void {
        this.selection.clear();
    }

    checkMissingMetadata(): void {
        this.metadataCheckRequested = true;
        this.markMissingMetadata(this.dataSource.connect().value, true);
    }

    selectNetwork(networkFilter: string | null, updateQueryParam = true) {
        this.networkFilter = networkFilter;

        if (updateQueryParam) {
            this.requestedHubId = networkFilter;
            this.deploymentIdFilter = null;
            this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { hubId: this.requestedHubId, deploymentId: null },
                queryParamsHandling: 'merge',
                replaceUrl: true,
            });
        }

        if (this.searchInitialized) {
            this.reload();
        }
    }

    run(deploymentId: string): void {
        this.deploymentsService.getDeploymentInputParameters(deploymentId).subscribe((parameter) => {
            if (parameter && parameter.size) {
                this.openStartWithParameterDialog(deploymentId, parameter);
            } else {
                this.deploymentsService.startDeployment(deploymentId).subscribe((resp) => {
                    if (resp === null) {
                        snackError(this.snackBar, 'Error while starting the deployment!');
                    } else {
                        snackSuccess(this.snackBar, 'Deployment started successfully.');
                    }
                });
            }
        });
    }

    openStartWithParameterDialog(deploymentId: string, parameter: Map<string, CamundaVariable>): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            deploymentService: this.deploymentsService,
            deploymentId,
            parameter,
        };
        this.dialog.open(DeploymentsStartParameterDialogComponent, dialogConfig);
    }

    copyEndpoint(id: string) {
        this.clipboardService.copyFromContent(environment.processServiceUrl + '/v2/deployments/' + id + '/start');
        snackSuccess(this.snackBar, 'URL copied to clipboard.');
    }

    navigateToMonitorSection(deployment: DeploymentsModel, activeTab: number) {
        this.router.navigateByUrl('/processes/monitor', { state: { deployment, activeTab } });
    }

    /** where a deployment runs: the platform or the name of its hub */
    networkName(networkId: string | undefined): string {
        if (!networkId) {
            return 'Platform';
        }
        return this.hubList.find((hub) => hub.id === networkId)?.name || networkId;
    }

    /** the label of the network filter button */
    get networkFilterLabel(): string {
        if (this.networkFilter === null) {
            return 'All networks';
        }
        return this.networkFilter === ENGINE_CLOUD_NETWORK ? 'Senergy-Platform' : this.networkName(this.networkFilter);
    }

    deleteDeployment(deployment: DeploymentsModel): void {
        confirmDelete(this.dialogsService, 'deployment ' + deployment.name).subscribe(() => {
            this.ready = false;
            this.deploymentsService.v2deleteDeployment(deployment.id).subscribe((resp: { status: number }) => {
                if (resp.status === 200) {
                    this.deploymentsService
                        .checkForDeletedDeploymentWithRetries(deployment.id, 10, 100)
                        .subscribe((exists: boolean) => {
                            if (exists) {
                                this.showSnackBarError('deleting the deployment!');
                            } else {
                                snackSuccess(this.snackBar, this.deleteSuccessText(false, !!deployment.network_id));
                            }
                            this.reload();
                        });
                } else {
                    this.showSnackBarError('deleting the deployment!');
                    this.ready = true;
                }
            });
        });
    }

    /** Switching off ends the running instances, so it is confirmed first; switching on needs no confirmation. */
    toggleDeploymentEnabled(deployment: DeploymentsModel): void {
        if (deployment.disabled) {
            this.setDeploymentDisabled(deployment, false);
            return;
        }
        this.dialogsService
            .openConfirmDialog(
                'Switch off deployment',
                'Switching off "' + deployment.name + '" ends its running instances. Do you want to continue?',
            )
            .afterClosed()
            .subscribe((confirmed: boolean | undefined) => {
                if (confirmed) {
                    this.setDeploymentDisabled(deployment, true);
                }
            });
    }

    private setDeploymentDisabled(deployment: DeploymentsModel, disabled: boolean): void {
        this.deploymentsService.setDeploymentDisabled(deployment.id, disabled).subscribe((resp) => {
            if (resp === null) {
                this.showSnackBarError('switching the deployment ' + (disabled ? 'off' : 'on') + '!');
            } else {
                deployment.disabled = resp.disabled;
            }
        });
    }

    showOfflineReasons(reasons: DeploymentsOfflineReasonsModel[]): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        Object.assign(dialogConfig, dialogSize('l'));
        dialogConfig.data = {
            reasons,
        };
        this.dialog.open(DeploymentsMissingDependenciesDialogComponent, dialogConfig);
    }

    copyDeployment(deploymentId: string): void {
        this.router.navigateByUrl('/processes/deployments/config?deploymentId=' + deploymentId);
    }

    removeDeploymentIdFilter(): void {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { deploymentId: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    deleteMultipleItems(): void {
        const selected = [...this.selection.selected];
        const many = selected.length > 1;
        bulkDelete(this.dialogsService, this.snackBar, {
            text: countLabel(selected.length, 'deployment', 'deployments'),
            // the verification takes seconds; hiding the rows keeps a second click from sending the deletes again
            before: () => {
                this.ready = false;
                this.selection.clear();
            },
            jobs: () => selected.map((item) => this.deleteAndVerify(item)),
            isSuccess: everyTrue,
            successMessage: this.deleteSuccessText(many, selected.some((item) => !!item.network_id)),
            errorMessage: this.errorText(many ? 'deleting the deployments!' : 'deleting the deployment!'),
            after: () => this.reload(),
        });
    }

    filterItems(show: boolean): void {
        // the chip also reports the state restored from the URL, which is no change
        if (show === this.showGenerated) {
            return;
        }
        this.showGenerated = show;
        this.source = show ? '' : 'sepl';
        this.urlState.set({ generated: show ? 'show' : null, page: null });
        this.reload();
    }

    /** Emits true when the deployment answered the delete with 200 and is gone afterwards. */
    private deleteAndVerify(deployment: DeploymentsModel): Observable<boolean> {
        return this.deploymentsService.v2deleteDeployment(deployment.id).pipe(
            concatMap((resp) =>
                resp.status === 200
                    ? this.deploymentsService.checkForDeletedDeploymentWithRetries(deployment.id, 15, 200).pipe(map((exists) => !exists))
                    : of(false),
            ),
        );
    }

    private initSearchAndGetDevices() {
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    private tryInitializeSearchAndLoad(): void {
        if (!this.viewInitialized || !this.hubSelectionResolved || this.searchInitialized) {
            return;
        }

        this.searchInitialized = true;
        this.initSearchAndGetDevices();
    }

    private applyNetworkSelectionFromQueryParam(): void {
        const requested = this.requestedHubId;
        if (requested && requested !== ENGINE_CLOUD_NETWORK && !this.hubList.some((hub) => hub.id === requested)) {
            // a hub that is gone or no longer shared
            this.selectNetwork(null);
            return;
        }
        if (this.networkFilter !== requested) {
            this.selectNetwork(requested, false);
        }
    }

    private load(): Observable<DeploymentsModel[]> {
        const loaded = this.deploymentIdFilter
            ? this.deploymentsService.getDeploymentOfNetworks(this.deploymentIdFilter).pipe(map((deployment) => (deployment ? [deployment] : [])))
            : loadAllPages(
                  (limit, offset) =>
                      this.deploymentsService.listOfNetworks(
                          this.searchText,
                          limit,
                          offset,
                          this.sortBy,
                          this.sortOrder,
                          this.source,
                          this.networkFilter || undefined,
                      ),
                  CHUNK,
                  // only an empty chunk ends the list, so a chunk the backend shortened is not taken as the last one
                  true,
              );
        return loaded.pipe(
            map((deployments) =>
                deployments.map((deployment) => {
                    deployment.image = this.provideImg(deployment.diagram);
                    deployment.disabled = deployment.disabled === true;
                    return deployment;
                }),
            ),
        );
    }

    private provideImg(svg: string): SafeUrl {
        const base64 = this.utilService.convertSVGtoBase64(svg);
        return this.sanitizer.bypassSecurityTrustUrl('data:image/svg+xml;base64,' + base64);
    }

    /**
     * The deployment list carries the svg but not the bpmn, so the diagram of every deployment has to
     * be read separately. That is a request per row, which is why the check is only run on demand and
     * then follows the page that is shown.
     */
    private markMissingMetadata(rows: { id: string }[], notify = false): void {
        // An explicit click checks the shown page again; automatic checks on a page change skip what was read.
        const unchecked = notify ? rows : rows.filter((row) => !this.metadataChecked.has(row.id));
        if (unchecked.length === 0) {
            return;
        }
        unchecked.forEach((row) => this.metadataChecked.add(row.id));
        const service = this.deploymentsService;
        const shown = this.dataSource.data;
        this.metadataChecksRunning++;
        from(unchecked)
            .pipe(
                mergeMap(
                    (row) => service.getDeploymentDiagramXml(row.id).pipe(map((bpmnXml) => ({ key: row.id, bpmnXml }))),
                    4,
                ),
                toArray(),
                concatMap((documents) => this.metadataExistenceService.warningsForBpmn(documents)),
            )
            .subscribe((warnings) => {
                this.metadataChecksRunning--;
                // Warnings of a list that was replaced meanwhile are dropped.
                if (shown !== this.dataSource.data) {
                    return;
                }
                warnings.forEach((warning, id) => this.metadataWarnings.set(id, warning));
                if (notify) {
                    snackSuccess(
                        this.snackBar,
                        warnings.size === 0
                            ? 'No deployment references missing metadata.'
                            : countLabel(warnings.size, 'deployment', 'deployments') + ' on this page reference missing metadata.',
                    );
                }
            });
    }

    private errorText(text: string): string {
        return 'Error while ' + text + ' !';
    }

    private showSnackBarError(text: string): void {
        snackError(this.snackBar, this.errorText(text));
    }

    // A hub removes the deployment only after it confirms the delete command, so success there means "sent".
    private deleteSuccessText(many: boolean, onHub: boolean): string {
        if (onHub) {
            return 'Delete sent to the hub; the ' + (many ? 'deployments disappear' : 'deployment disappears') + ' once the hub confirms.';
        }
        return many ? 'Deployments deleted successfully.' : 'Deployment deleted successfully.';
    }

}
