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
import { forkJoin, Observable, Subscription } from 'rxjs';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { ResponsiveService } from '../../../core/services/responsive.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { UtilService } from '../../../core/services/util.service';
import { DeploymentsService } from './shared/deployments.service';
import { DeploymentsModel, DeploymentsOfflineReasonsModel } from './shared/deployments.model';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ClipboardService } from 'ngx-clipboard';
import { environment } from '../../../../environments/environment';
import { Router } from '@angular/router';
import { DialogsService } from '../../../core/services/dialogs.service';
import { DeploymentsMissingDependenciesDialogComponent } from './dialogs/deployments-missing-dependencies-dialog.component';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CamundaVariable } from './shared/deployments-definition.model';
import { DeploymentsStartParameterDialogComponent } from './dialogs/deployments-start-parameter-dialog.component';
import { DeploymentsFogFactory } from './shared/deployments-fog.service';
import { HubModel, NetworksModel } from '../../devices/networks/shared/networks.model';
import { NetworksService } from '../../devices/networks/shared/networks.service';
import { DeploymentsFogModel } from './shared/deployments-fog.model';

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

    private searchText = '';
    private limitInit = 54;
    private limit = this.limitInit;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private getAllSub = new Subscription();
    private allDataLoaded = false;
    private source = 'sepl';
    private gridColChangeTimeout: number | undefined;
    private knownMainPanelOffsetHeight = 0;
    showGenerated = false;
    selectedItems: DeploymentsModel[] = [];
    rowHeight = 282;
    hubList: NetworksModel[] = [];
    hub: NetworksModel | undefined | null;

    deploymentsService: {
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
    };

    @ViewChild('mainPanel', { static: false }) mainPanel!: ElementRef;

    constructor(
        private sanitizer: DomSanitizer,
        private utilService: UtilService,
        private searchbarService: SearchbarService,
        private platformDeploymentsService: DeploymentsService,
        private responsiveService: ResponsiveService,
        private snackBar: MatSnackBar,
        private clipboardService: ClipboardService,
        private router: Router,
        private dialogsService: DialogsService,
        private dialog: MatDialog,
        private fogDeploymentsFactory: DeploymentsFogFactory,
        private _formBuilder: FormBuilder,
        private hubsService: NetworksService,
    ) {
        this.deploymentsService = platformDeploymentsService;
    }

    ngOnInit() {
        this.hubsService.listSyncNetworks().subscribe((result) => {
            this.hubList = result;
        });
        this.initGridCols();
    }

    ngAfterViewInit() {
        this.knownMainPanelOffsetHeight = this.mainPanel.nativeElement.offsetHeight;
        this.limitInit = this.maxItemsDisplayed;
        this.limit = this.limitInit;
        this.initSearchAndGetDevices();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
        this.getAllSub.unsubscribe();
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.setRepoItemsParams(this.limitInit);
            this.getRepoItems(false);
        }
    }

    receiveSortingAttribute(sortAttribute: SortModel) {
        this.sortAttribute = sortAttribute;
        this.getRepoItems(true);
    }

    selectHub(hub: NetworksModel | null) {
        this.hub = hub;
        if (hub) {
            this.deploymentsService = this.fogDeploymentsFactory.withHubId(hub.id);
        } else {
            this.deploymentsService = this.platformDeploymentsService;
        }
        this.getRepoItems(true);
    }

    run(deploymentId: string): void {
        this.deploymentsService.getDeploymentInputParameters(deploymentId).subscribe((parameter) => {
            if (parameter && parameter.size) {
                this.openStartWithParameterDialog(deploymentId, parameter);
            } else {
                this.deploymentsService.startDeployment(deploymentId).subscribe((resp) => {
                    if (resp === null) {
                        this.snackBar.open('Error while starting the deployment!', undefined, { duration: 2000 });
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
        this.clipboardService.copyFromContent(environment.processServiceUrl + '/deployment/' + id + '/start');
        this.snackBar.open('URL copied to clipboard.', undefined, { duration: 2000 });
    }

    navigateToMonitorSection(deployment: DeploymentsModel, activeTab: number) {
        this.router.navigateByUrl('/processes/monitor', { state: { deployment, activeTab, hub: this.hub } });
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
                                        this.showSnackBarSuccess('Deployment deleted');
                                    }
                                    this.setRepoItemsParams(1);
                                    this.getRepoItems(false);
                                });
                        } else {
                            this.showSnackBarError('deleting the deployment!');
                        }
                    });
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
                            this.showSnackBarSuccess(this.selectedItems.length === 1 ? 'Deployment deleted' : 'Deployments deleted');
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

    private getRepoItems(reset: boolean) {
        if (reset) {
            this.setRepoItemsParams(this.limitInit);
            this.reset();
        }

        this.getAllSub.unsubscribe(); // only one request at a time
        this.getAllSub = this.deploymentsService
            .getAll(this.searchText, this.limit, this.offset, this.sortAttribute.value, this.sortAttribute.order, this.source)
            .subscribe((repoItems: DeploymentsModel[]) => {
                if (repoItems.length !== this.limit) {
                    this.allDataLoaded = true;
                }
                this.addToFormArray(repoItems);
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
        this.allDataLoaded = false;
        this.ready = false;
        this.selectedItems = [];
    }

    private setRepoItemsParams(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.repoItems.length;
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
                    selected: false,
                }),
            );
        });
    }

    private showSnackBarError(text: string): void {
        this.snackBar.open('Error while ' + text + ' !', undefined, { duration: 2000 });
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
