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
import {SortModel} from '../../../core/components/sort/shared/sort.model';
import {forkJoin, Observable, Subscription} from 'rxjs/index';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {ResponsiveService} from '../../../core/services/responsive.service';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {UtilService} from '../../../core/services/util.service';
import {DeploymentsService} from './shared/deployments.service';
import {DeploymentsModel} from './shared/deployments.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {ClipboardService} from 'ngx-clipboard';
import {environment} from '../../../../environments/environment';
import {Router} from '@angular/router';
import {DialogsService} from '../../../core/services/dialogs.service';
import {DeploymentsMissingDependenciesDialogComponent} from './dialogs/deployments-missing-dependencies-dialog.component';
import {FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';

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
    styleUrls: ['./deployments.component.css']
})

export class ProcessDeploymentsComponent implements OnInit, OnDestroy {
    formGroup: FormGroup = new FormGroup({repoItems: new FormArray([])});
    gridCols = 0;
    sortAttributes = [new SortModel('Date', 'deploymentTime', 'desc'), new SortModel('Name', 'name', 'asc')];
    ready = false;

    private searchText = '';
    private limitInit = 54;
    private limit = this.limitInit;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;
    selectedItems: DeploymentsModel[] = [];

    constructor(private sanitizer: DomSanitizer,
                private utilService: UtilService,
                private searchbarService: SearchbarService,
                private deploymentsService: DeploymentsService,
                private responsiveService: ResponsiveService,
                private snackBar: MatSnackBar,
                private clipboardService: ClipboardService,
                private router: Router,
                private dialogsService: DialogsService,
                private dialog: MatDialog,
                private _formBuilder: FormBuilder) {
    }

    ngOnInit() {
        this.initGridCols();
        this.initSearchAndGetDevices();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
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

    run(definitionId: string): void {
        this.deploymentsService.startDeployment(definitionId).subscribe((resp) => {
            if (resp === null) {
                this.snackBar.open('Error while starting the deployment!', undefined, {duration: 2000});
            } else {
                this.snackBar.open('Deployment started successfully.', undefined, {duration: 2000});
            }
        });
    }

    copyEndpoint(endpoint: string) {
        this.clipboardService.copyFromContent(environment.processServiceUrl + '/process-definition/' + endpoint + '/start');
        this.snackBar.open('URL copied to clipboard.', undefined, {duration: 2000});
    }

    navigateToMonitorSection(deployment: DeploymentsModel, activeTab: number) {
        this.router.navigateByUrl('/processes/monitor', {state: {deployment: deployment, activeTab: activeTab}});
    }

    deleteDeployment(deployment: DeploymentsModel): void {
        this.dialogsService.openDeleteDialog('deployment ' + deployment.name).afterClosed().subscribe((deleteDeployment: boolean) => {
            if (deleteDeployment) {
                this.deploymentsService.deleteDeployment(deployment.id).subscribe((resp: { status: number }) => {
                    if (resp.status === 200) {
                        this.repoItems.removeAt(this.repoItems.value.findIndex((item: DeploymentsModel) => deployment.id === item.id));
                        this.deploymentsService.checkForDeletedDeploymentWithRetries(deployment.id, 10, 100).subscribe((exists: boolean) => {
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

    showMissingDependencies(id: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            id: id
        };
        this.dialog.open(DeploymentsMissingDependenciesDialogComponent, dialogConfig);
    }

    copyDeployment(deploymentId: string): void {
        this.router.navigateByUrl('/processes/deployments/config', {state: {processId: '', deploymentId: deploymentId}});
    }

    countCheckboxes(): void {
        this.selectedItems = this.repoItems.value.filter((item: DeploymentsModel) => item.selected === true);
    }

    deleteMultipleItems(): void {
        this.dialogsService.openDeleteDialog(this.selectedItems.length + (this.selectedItems.length === 1 ? ' deployment' : ' deployments')).afterClosed().subscribe((deleteProcess: boolean) => {
            if (deleteProcess) {
                // clear repoItems and ready, that spinner occurs
                this.repoItems.clear();
                this.ready = false;
                const array: Observable<boolean>[] = [];
                this.selectedItems.forEach((item: DeploymentsModel) => {
                    array.push(this.deploymentsService.checkForDeletedDeploymentWithRetries (item.id, 15, 200));
                    this.deploymentsService.deleteDeployment(item.id).subscribe((resp: { status: number }) => {
                        if (resp.status !== 200) {
                            this.showSnackBarError(this.selectedItems.length === 1 ? 'deleting the deployment!' : 'deleting the deployments!');
                        }
                    });
                });

                forkJoin(array).subscribe((resp: boolean[]) => {
                    const error = resp.some((item: boolean) => item === true);
                        if (error) {
                            this.showSnackBarError(this.selectedItems.length === 1 ? 'deleting the deployment!' : 'deleting the deployments!');
                        } else {
                            this.showSnackBarSuccess(this.selectedItems.length === 1 ? 'Deployment deleted' : 'Deployments deleted');
                        }
                    this.getRepoItems(true);
                    }
                );

            }
        });
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
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

        this.deploymentsService.getAll(
            this.searchText, this.limit, this.offset, this.sortAttribute.value, this.sortAttribute.order).subscribe(
            (repoItems: DeploymentsModel[]) => {
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
            this.repoItems.push(this._formBuilder.group(
                {
                    id: repoItem.id,
                    name: repoItem.name,
                    definition_id: repoItem.definition_id,
                    deploymentTime: repoItem.deploymentTime,
                    diagram: repoItem.diagram,
                    offline_reasons: repoItem.offline_reasons,
                    online: repoItem.online,
                    image: this.provideImg(repoItem.diagram),
                    selected: false,
                }
            ));
        });
    }

    private showSnackBarError(text: string): void {
        this.snackBar.open('Error while ' + text + ' !', undefined, {duration: 2000});
    }

    private showSnackBarSuccess(text: string): void {
        this.snackBar.open(text + ' successfully.', undefined, {duration: 2000});
    }
}
