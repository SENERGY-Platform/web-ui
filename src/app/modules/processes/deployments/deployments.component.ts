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

import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { SortModel } from '../../../core/components/sort/shared/sort.model';
import { SortDirection } from '@angular/material/sort';
import { concatMap, forkJoin, from, map, mergeMap, Observable, Subscription, toArray } from 'rxjs';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { ResponsiveService } from '../../../core/services/responsive.service';
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
import { AbstractControl, FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { CamundaVariable } from './shared/deployments-definition.model';
import { DeploymentsStartParameterDialogComponent } from './dialogs/deployments-start-parameter-dialog.component';
import { HubModel } from '../../devices/networks/shared/networks.model';
import { NetworksService } from '../../devices/networks/shared/networks.service';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';
import { UrlStateService } from '../../../core/services/url-state.service';
import { ENGINE_CLOUD_NETWORK } from '../../../core/model/automation-engine.model';

const grids = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-process-deployments',
    templateUrl: './deployments.component.html',
    styleUrls: ['./deployments.component.css'],
})
export class ProcessDeploymentsComponent implements OnInit, AfterViewInit, OnDestroy {
    formGroup: FormGroup = new FormGroup({ repoItems: new FormArray([]) });
    gridCols = 0;
    sortAttributes = [new SortModel('Date', 'deploymentTime', 'desc'), new SortModel('Name', 'name', 'asc')];
    ready = false;

    userHasDeleteAuthorization = false;

    private searchText = '';
    private limitInit = 54;
    private limit = this.limitInit;
    private offset = 0;
    // Engine rows consumed so far; differs from repoItems.length because the wrapper drops deployments without a virtual id.
    private serverOffset = 0;
    sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private getAllSub = new Subscription();
    private routeSub: Subscription = new Subscription();
    private allDataLoaded = false;
    private source = 'sepl';
    private gridColChangeTimeout: number | undefined;
    private knownMainPanelOffsetHeight = 0;
    private requestedHubId: string | null = null;
    deploymentIdFilter: string | null = null;
    private viewInitialized = false;
    private searchInitialized = false;
    private hubSelectionResolved = false;
    showGenerated = false;
    selectedItems: DeploymentsModel[] = [];
    rowHeight = 282;
    hubList: HubModel[] = [];
    /** null lists the deployments of the platform and of all hubs, ENGINE_CLOUD_NETWORK those of the platform, a hub id those of that hub */
    networkFilter: string | null = null;
    readonly cloudNetwork = ENGINE_CLOUD_NETWORK;
    metadataCheckRequested = false;
    metadataCheckRunning = false;

    @ViewChild('mainPanel', { static: false }) mainPanel!: ElementRef;

    constructor(
        private sanitizer: DomSanitizer,
        private utilService: UtilService,
        private searchbarService: SearchbarService,
        private deploymentsService: DeploymentsService,
        private responsiveService: ResponsiveService,
        private snackBar: MatSnackBar,
        private clipboardService: ClipboardService,
        private router: Router,
        private route: ActivatedRoute,
        private dialogsService: DialogsService,
        private dialog: MatDialog,
        private _formBuilder: FormBuilder,
        private hubsService: NetworksService,
        private metadataExistenceService: MetadataExistenceService,
        private urlState: UrlStateService,
    ) {}

    ngOnInit() {
        this.userHasDeleteAuthorization = this.deploymentsService.userHasDeleteAuthorization();
        this.showGenerated = this.urlState.getShown('generated', false);
        this.sortAttribute = this.restoreSortAttribute();
        this.source = this.showGenerated ? '' : 'sepl';

        this.requestedHubId = this.route.snapshot.queryParamMap.get('hubId');
        this.deploymentIdFilter = this.route.snapshot.queryParamMap.get('deploymentId');
        this.routeSub = this.route.queryParamMap.subscribe((params) => {
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
                this.getRepoItems(true);
            }
        });

        this.hubsService.listSyncNetworks().subscribe((result) => {
            this.hubList = result;
            this.applyNetworkSelectionFromQueryParam();
            this.hubSelectionResolved = true;
            this.tryInitializeSearchAndLoad();
        });
        this.initGridCols();
    }

    ngAfterViewInit() {
        this.viewInitialized = true;
        this.knownMainPanelOffsetHeight = this.mainPanel.nativeElement.offsetHeight;
        this.limitInit = this.maxItemsDisplayed;
        this.limit = this.limitInit;
        this.tryInitializeSearchAndLoad();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
        this.getAllSub.unsubscribe();
        this.routeSub.unsubscribe();
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.setRepoItemsParams(this.limitInit);
            this.getRepoItems(false);
        }
    }

    checkMissingMetadata(): void {
        this.metadataCheckRequested = true;
        this.markMissingMetadata(this.repoItems.value, true);
    }

    receiveSortingAttribute(sortAttribute: SortModel) {
        this.sortAttribute = sortAttribute;
        this.urlState.setSort({ active: sortAttribute.value, direction: sortAttribute.order as SortDirection }, 'deploymentTime', 'desc');
        this.getRepoItems(true);
    }

    /** The sort attribute the URL names, with the order it names; the first attribute otherwise. */
    private restoreSortAttribute(): SortModel {
        const sort = this.urlState.getSort('deploymentTime', 'desc');
        const attribute = this.sortAttributes.find((a) => a.value === sort.active);
        if (attribute === undefined || sort.direction === '') {
            return this.sortAttributes[0];
        }
        attribute.order = sort.direction;
        return attribute;
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
            this.getRepoItems(true);
        }
    }

    run(deploymentId: string): void {
        this.deploymentsService.getDeploymentInputParameters(deploymentId).subscribe((parameter) => {
            if (parameter && parameter.size) {
                this.openStartWithParameterDialog(deploymentId, parameter);
            } else {
                this.deploymentsService.startDeployment(deploymentId).subscribe((resp) => {
                    if (resp === null) {
                        this.snackBar.open('Error while starting the deployment!', 'close', { panelClass: 'snack-bar-error' });
                    } else {
                        this.snackBar.open('Deployment started successfully.', undefined, { duration: 2000 });
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
        this.snackBar.open('URL copied to clipboard.', undefined, { duration: 2000 });
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

    deleteDeployment(deployment: DeploymentsModel): void {
        this.dialogsService
            .openDeleteDialog('deployment ' + deployment.name)
            .afterClosed()
            .subscribe((deleteDeployment: boolean) => {
                if (deleteDeployment) {
                    this.deploymentsService.v2deleteDeployment(deployment.id).subscribe((resp: { status: number }) => {
                        if (resp.status === 200) {
                            this.repoItems.removeAt(this.repoItems.value.findIndex((item: DeploymentsModel) => deployment.id === item.id));
                            this.deploymentsService
                                .checkForDeletedDeploymentWithRetries(deployment.id, 10, 100)
                                .subscribe((exists: boolean) => {
                                    if (exists) {
                                        this.showSnackBarError('deleting the deployment!');
                                    } else {
                                        this.showDeleteSuccess(false, !!deployment.network_id);
                                    }
                                    this.serverOffset = Math.max(0, this.serverOffset - 1);
                                    this.setRepoItemsParams(1);
                                    this.getRepoItems(false, true);
                                });
                        } else {
                            this.showSnackBarError('deleting the deployment!');
                        }
                    });
                }
            });
    }

    /**
     * Switching off ends the running instances, so it is confirmed first. The toggle is set back
     * whenever the switch does not happen, because its own state has already flipped by then.
     */
    toggleDeploymentEnabled(item: AbstractControl, change: MatSlideToggleChange): void {
        const disabled = !change.checked;
        const revert = () => (change.source.checked = !change.checked);
        if (!disabled) {
            this.setDeploymentDisabled(item, false, revert);
            return;
        }
        this.dialogsService
            .openConfirmDialog(
                'Switch off deployment',
                'Switching off "' + item.value.name + '" ends its running instances. Do you want to continue?',
            )
            .afterClosed()
            .subscribe((confirmed: boolean) => {
                if (confirmed) {
                    this.setDeploymentDisabled(item, true, revert);
                } else {
                    revert();
                }
            });
    }

    private setDeploymentDisabled(item: AbstractControl, disabled: boolean, revert: () => void): void {
        this.deploymentsService.setDeploymentDisabled(item.value.id, disabled).subscribe((resp) => {
            if (resp === null) {
                this.showSnackBarError('switching the deployment ' + (disabled ? 'off' : 'on') + '!');
                revert();
            } else {
                item.patchValue({ disabled: resp.disabled });
            }
        });
    }

    showOfflineReasons(reasons: DeploymentsOfflineReasonsModel[]): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
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

    countCheckboxes(): void {
        this.selectedItems = this.repoItems.value.filter((item: DeploymentsModel) => item.selected === true);
    }

    deleteMultipleItems(): void {
        this.dialogsService
            .openDeleteDialog(this.selectedItems.length + (this.selectedItems.length === 1 ? ' deployment' : ' deployments'))
            .afterClosed()
            .subscribe((deleteProcess: boolean) => {
                if (deleteProcess) {
                    // clear repoItems and ready, that spinner occurs
                    this.repoItems.clear();
                    this.ready = false;
                    const array: Observable<boolean>[] = [];
                    this.selectedItems.forEach((item: DeploymentsModel) => {
                        array.push(this.deploymentsService.checkForDeletedDeploymentWithRetries(item.id, 15, 200));
                        this.deploymentsService.v2deleteDeployment(item.id).subscribe((resp: { status: number }) => {
                            if (resp.status !== 200) {
                                this.showSnackBarError(
                                    this.selectedItems.length === 1 ? 'deleting the deployment!' : 'deleting the deployments!',
                                );
                            }
                        });
                    });

                    forkJoin(array).subscribe((resp: boolean[]) => {
                        const error = resp.some((item: boolean) => item === true);
                        if (error) {
                            this.showSnackBarError(
                                this.selectedItems.length === 1 ? 'deleting the deployment!' : 'deleting the deployments!',
                            );
                        } else {
                            this.showDeleteSuccess(this.selectedItems.length !== 1, this.selectedItems.some((item) => !!item.network_id));
                        }
                        this.getRepoItems(true);
                    });
                }
            });
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            const gridCols = grids.get(mqAlias) || 0;
            if (gridCols > this.gridCols) {
                this.gridColChangeTimeout = this.adjustForResize(2);
            }
            this.gridCols = gridCols;
        });
    }

    filterItems(show: boolean): void {
        this.showGenerated = show;
        this.urlState.set({ generated: show ? 'show' : null });

        if (this.showGenerated) {
            this.source = '';
        } else {
            this.source = 'sepl';
        }
        this.getRepoItems(true);
    }

    private initSearchAndGetDevices() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.getRepoItems(true);
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

    /** @param refill fetches the row that moved up after a delete; its result says nothing about the end of the list. */
    private getRepoItems(reset: boolean, refill = false) {
        if (reset) {
            this.setRepoItemsParams(this.limitInit);
            this.reset();
        }

        this.getAllSub.unsubscribe(); // only one request at a time

        if (this.deploymentIdFilter) {
            this.getAllSub = this.deploymentsService.getDeploymentOfNetworks(this.deploymentIdFilter).subscribe((deployment) => {
                if (deployment) {
                    this.addToFormArray([deployment]);
                }
                this.allDataLoaded = true;
                this.ready = true;
            });
            return;
        }

        this.getAllSub = this.deploymentsService
            .listOfNetworks(
                this.searchText,
                this.limit,
                this.offset,
                this.sortAttribute.value,
                this.sortAttribute.order,
                this.source,
                this.networkFilter || undefined,
            )
            .subscribe((repoItems: DeploymentsModel[]) => {
                this.serverOffset = this.offset + this.limit;
                this.addToFormArray(repoItems);
                if (!refill) {
                    // A short chunk is not the end, the wrapper may have dropped rows from it; only an empty one is.
                    if (repoItems.length === 0 && this.limit > 0) {
                        this.allDataLoaded = true;
                    } else if (repoItems.length < this.limit) {
                        this.setRepoItemsParams(this.limitInit);
                        this.getRepoItems(false);
                        return;
                    }
                }
                this.ready = true;
            });
    }

    private provideImg(svg: string): SafeUrl {
        const base64 = this.utilService.convertSVGtoBase64(svg);
        return this.sanitizer.bypassSecurityTrustUrl('data:image/svg+xml;base64,' + base64);
    }

    private reset() {
        this.repoItems.clear();
        this.offset = 0;
        this.serverOffset = 0;
        this.allDataLoaded = false;
        this.ready = false;
        this.selectedItems = [];
    }

    private setRepoItemsParams(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.serverOffset;
    }

    get repoItems(): FormArray {
        return this.formGroup.get('repoItems') as FormArray;
    }

    private addToFormArray(repoItems: DeploymentsModel[]): void {
        repoItems.forEach((repoItem: DeploymentsModel) => {
            this.repoItems.push(
                this._formBuilder.group({
                    id: repoItem.id,
                    name: repoItem.name,
                    definition_id: repoItem.definition_id,
                    deploymentTime: repoItem.deploymentTime,
                    diagram: repoItem.diagram,
                    offline_reasons: this._formBuilder.array(repoItem.offline_reasons || []),
                    online: repoItem.online,
                    image: this.provideImg(repoItem.diagram),
                    sync: repoItem.sync,
                    disabled: repoItem.disabled === true,
                    network_id: repoItem.network_id,
                    selected: false,
                    metadataWarning: '',
                }),
            );
        });
        if (this.metadataCheckRequested) {
            this.markMissingMetadata(repoItems);
        }
    }

    /**
     * The deployment list carries the svg but not the bpmn, so the diagram of every deployment has to
     * be read separately. That is a request per tile, which is why the check is only run on demand and
     * then kept up for the pages loaded afterwards.
     */
    private markMissingMetadata(repoItems: { id: string }[], notify = false): void {
        if (repoItems.length === 0) {
            return;
        }
        const service = this.deploymentsService;
        this.metadataCheckRunning = true;
        from(repoItems)
            .pipe(
                mergeMap(
                    (repoItem) =>
                        service.getDeploymentDiagramXml(repoItem.id).pipe(map((bpmnXml) => ({ key: repoItem.id, bpmnXml }))),
                    4,
                ),
                toArray(),
                concatMap((documents) => this.metadataExistenceService.warningsForBpmn(documents)),
            )
            .subscribe((warnings) => {
                this.metadataCheckRunning = false;
                this.repoItems.controls.forEach((control) => {
                    const warning = warnings.get(control.value.id);
                    if (warning) {
                        control.patchValue({ metadataWarning: warning });
                    }
                });
                if (notify && warnings.size === 0) {
                    this.snackBar.open('No deployment references missing metadata.', undefined, { duration: 2000 });
                }
            });
    }

    private showSnackBarError(text: string): void {
        this.snackBar.open('Error while ' + text + ' !', 'close', { panelClass: 'snack-bar-error' });
    }

    // A hub removes the deployment only after it confirms the delete command, so success there means "sent".
    private showDeleteSuccess(plural: boolean, onHub: boolean): void {
        if (onHub) {
            this.snackBar.open(
                'Delete sent to the hub; the ' + (plural ? 'deployments disappear' : 'deployment disappears') + ' once the hub confirms.',
                undefined,
                { duration: 4000 },
            );
            return;
        }
        this.showSnackBarSuccess(plural ? 'Deployments deleted' : 'Deployment deleted');
    }

    private showSnackBarSuccess(text: string): void {
        this.snackBar.open(text + ' successfully.', undefined, { duration: 2000 });
    }

    private get maxItemsDisplayed(): number {
        return this.gridCols * Math.ceil(this.knownMainPanelOffsetHeight / this.rowHeight);
    }

    private adjustForResize(timeout: number): number {
        return window.setTimeout(() => {
            if (this.mainPanel.nativeElement.offsetHeight === this.knownMainPanelOffsetHeight) {
                // redrawing might be unfinished even after gridCols have been changed.
                // Wait for resize of DOM element to be finished before determining the number of items to load.
                this.gridColChangeTimeout = this.adjustForResize(timeout * timeout);
            } else {
                this.knownMainPanelOffsetHeight = this.mainPanel.nativeElement.offsetHeight;
                this.limitInit = this.maxItemsDisplayed;
                this.setRepoItemsParams(this.repoItems.length + this.limitInit);
                this.getRepoItems(false);
            }
        }, timeout);
    }
}
