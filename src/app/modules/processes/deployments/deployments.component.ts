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
import { DeploymentsFogFactory } from './shared/deployments-fog.service';
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
import { MatSort, MatSortHeader, Sort } from '@angular/material/sort';
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
import { bulkDelete, confirmDelete, countLabel, everyTrue } from '../../../core/services/delete-flows';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';
import { dialogSize } from '../../../core/dialog-size';

/** Deployments are read in chunks this size, because the online state of each chunk is looked up with its ids in one URL. */
const CHUNK = 50;

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
    private platformDeploymentsService = inject(DeploymentsService);
    private snackBar = inject(MatSnackBar);
    private clipboardService = inject(ClipboardService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private dialogsService = inject(DialogsService);
    private dialog = inject(MatDialog);
    private fogDeploymentsFactory = inject(DeploymentsFogFactory);
    private hubsService = inject(NetworksService);
    private metadataExistenceService = inject(MetadataExistenceService);
    private destroyRef = inject(DestroyRef);
    preferencesService = inject(PreferencesService);

    readonly dateFormat = LIST_DATE_FORMAT;
    displayedColumns = ['select', 'image', 'name', 'status', 'deploymentTime', 'actions'];
    /** The deployment API has no total, so every deployment is loaded and the list pages on the client. */
    dataSource = new MatTableDataSource<DeploymentsModel>([]);
    listSelection = new ListSelection<DeploymentsModel>(() => this.dataSource.connect().value);
    selection = this.listSelection.model;
    ready = false;
    searchText = '';
    showGenerated = false;
    hubList: HubModel[] = [];
    hub: HubModel | undefined | null;
    deploymentIdFilter: string | null = null;
    /** Metadata warning per deployment id, filled once the check was asked for. */
    metadataWarnings = new Map<string, string>();
    metadataCheckRequested = false;
    private metadataChecksRunning = 0;

    userHasDeleteAuthorization = false;

    private sortBy = 'deploymentTime';
    private sortOrder = 'desc';
    private source = 'sepl';
    private getAllSub = new Subscription();
    private requestedHubId: string | null = null;
    private viewInitialized = false;
    private searchInitialized = false;
    private hubSelectionResolved = false;
    private metadataChecked = new Set<string>();

    deploymentsService: {
        getDeployment(deploymentId: string): Observable<DeploymentsModel | null>;
        getAll(
            query: string,
            limit: number,
            offset: number,
            feature: string,
            order: string,
            source: string,
        ): Observable<DeploymentsModel[]>;
        checkForDeletedDeploymentWithRetries(id: string, maxRetries: number, intervalInMs: number): Observable<boolean>;
        getDeploymentInputParameters(deploymentId: string): Observable<Map<string, CamundaVariable> | null>;
        startDeployment(deploymentId: string): Observable<any | null>;
        v2deleteDeployment(deploymentId: string): Observable<{ status: number }>;
        getDeploymentDiagramXml(deploymentId: string): Observable<string>;
    };

    refreshSyncF: undefined | null | {refreshSync():Observable<{ status: number }>};

    @ViewChild('paginator', { static: false })
    set paginator(value: MatPaginator | undefined) {
        if (value) {
            this.dataSource.paginator = value;
        }
    }

    constructor() {
        const platformDeploymentsService = this.platformDeploymentsService;

        this.deploymentsService = platformDeploymentsService;
    }

    ngOnInit() {
        this.userHasDeleteAuthorization = this.platformDeploymentsService.userHasDeleteAuthorization();

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

            if (hubChanged) {
                this.applyHubSelectionFromQueryParam();
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
            this.applyHubSelectionFromQueryParam();
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
        return this.searchText !== '' || this.showGenerated || this.deploymentIdFilter !== null;
    }

    /** The one reload path: search, sort, hub, filters, refresh button and every write end here; only the latest load stays subscribed. */
    reload(): void {
        this.getAllSub.unsubscribe();
        this.ready = false;
        this.selection.clear();
        this.metadataChecked.clear();
        this.metadataWarnings = new Map();
        this.getAllSub = this.load().subscribe((deployments) => {
            this.dataSource.data = deployments;
            this.dataSource.paginator?.firstPage();
            this.ready = true;
        });
    }

    matSortChange(event: Sort): void {
        this.sortBy = event.active;
        this.sortOrder = event.direction || 'desc';
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

    selectHub(hub: HubModel | null, updateQueryParam = true) {
        this.hub = hub;
        if (hub) {
            const service = this.fogDeploymentsFactory.withHubId(hub.id);
            this.deploymentsService = service;
            this.refreshSyncF = service;
        } else {
            this.deploymentsService = this.platformDeploymentsService;
            this.refreshSyncF = null;
        }

        if (updateQueryParam) {
            this.requestedHubId = hub?.id || null;
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
        this.router.navigateByUrl('/processes/monitor', { state: { deployment, activeTab, hub: this.hub } });
    }

    refreshSync(): void {
        if(this.refreshSyncF) {
            this.refreshSyncF.refreshSync().subscribe((result) => {
                if (result.status !== 200) {
                    this.showSnackBarError('refreshing fog deployment sync!');
                } else {
                    this.reload();
                }
            });
        }
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
                                this.showSnackBarSuccess('Deployment deleted');
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
        this.platformDeploymentsService.setDeploymentDisabled(deployment.id, disabled).subscribe((resp) => {
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
            successMessage: many ? 'Deployments deleted successfully.' : 'Deployment deleted successfully.',
            errorMessage: this.errorText(many ? 'deleting the deployments!' : 'deleting the deployment!'),
            after: () => this.reload(),
        });
    }

    filterItems(show: boolean): void {
        this.showGenerated = show;
        this.source = show ? '' : 'sepl';
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
            this.selectHub(null);
            return;
        }

        if (this.hub?.id !== selectedHub.id) {
            this.selectHub(selectedHub, false);
        }
    }

    private load(): Observable<DeploymentsModel[]> {
        const loaded = this.deploymentIdFilter
            ? this.deploymentsService.getDeployment(this.deploymentIdFilter).pipe(map((deployment) => (deployment ? [deployment] : [])))
            : loadAllPages(
                  (limit, offset) =>
                      this.deploymentsService.getAll(this.searchText, limit, offset, this.sortBy, this.sortOrder, this.source),
                  CHUNK,
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

    private showSnackBarSuccess(text: string): void {
        snackSuccess(this.snackBar, text + ' successfully.');
    }
}
