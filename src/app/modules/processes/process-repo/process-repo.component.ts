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
import {AuthorizationService} from '../../../core/services/authorization.service';
import {SortModel} from '../../../core/components/sort/shared/sort.model';
import {forkJoin, Observable, Subscription} from 'rxjs/index';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {KeycloakService} from 'keycloak-angular';
import {ResponsiveService} from '../../../core/services/responsive.service';
import {ProcessModel} from './shared/process.model';
import {ProcessRepoService} from './shared/process-repo.service';
import {UtilService} from '../../../core/services/util.service';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {PermissionsDialogService} from '../../permissions/shared/permissions-dialog.service';
import {DesignerProcessModel} from '../designer/shared/designer.model';
import {saveAs} from 'file-saver';
import {DialogsService} from '../../../core/services/dialogs.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ProcessRepoConditionModel, ProcessRepoConditionsModel} from './shared/process-repo-conditions.model';
import {Router} from '@angular/router';
import {FormArray, FormBuilder, FormGroup} from '@angular/forms';

const grids = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

const sortingAttributes = [new SortModel('Date', 'date', 'desc'), new SortModel('Name', 'name', 'asc')];

@Component({
    selector: 'senergy-process-repo',
    templateUrl: './process-repo.component.html',
    styleUrls: ['./process-repo.component.css']
})

export class ProcessRepoComponent implements OnInit, OnDestroy {
    formGroup: FormGroup = new FormGroup({repoItems: new FormArray([])});
    activeIndex = 0;
    gridCols = 0;
    animationDone = true;
    sortAttributes = JSON.parse(JSON.stringify(sortingAttributes));         // create copy of object;
    userID: string;
    ready = false;
    searchInitialized = false;
    searchText = '';
    selectedItems: ProcessModel[] = [];

    private limitInit = 54;
    private limit = this.limitInit;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    constructor(private sanitizer: DomSanitizer,
                private utilService: UtilService,
                private searchbarService: SearchbarService,
                private processRepoService: ProcessRepoService,
                private responsiveService: ResponsiveService,
                protected auth: AuthorizationService,
                private keycloakService: KeycloakService,
                private permissionsDialogService: PermissionsDialogService,
                private dialogsService: DialogsService,
                private snackBar: MatSnackBar,
                private router: Router,
                private _formBuilder: FormBuilder) {
        this.userID = this.keycloakService.getKeycloakInstance().subject || '';
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

    permission(process: ProcessModel): void {
        this.permissionsDialogService.openPermissionDialog('processmodel', process.id, process.name);
    }

    downloadDiagram(process: ProcessModel): void {
        this.processRepoService.getProcessModel(process.id).subscribe((processModel: DesignerProcessModel | null) => {
            if (processModel) {
                const xml = processModel.bpmn_xml;
                const file = new Blob([xml], {type: 'application/bpmn-xml'});
                saveAs(file, process.name + '.bpmn');
            }
        });
    }

    downloadSvg(process: ProcessModel): void {
        const file = new Blob([process.svgXML], {type: 'image/svg+xml'});
        saveAs(file, process.name + '.svg');
    }

    deleteProcess(process: ProcessModel): void {
        this.dialogsService.openDeleteDialog('process').afterClosed().subscribe((deleteProcess: boolean) => {
            if (deleteProcess) {
                this.processRepoService.deleteProcess(process.id).subscribe((resp: { status: number }) => {
                    if (resp.status === 200) {
                        this.repoItems.removeAt(this.repoItems.value.findIndex((item: ProcessModel) => process.id === item.id));
                        this.processRepoService.checkForDeletedProcess(process.id, 10, 100).subscribe((exists) => {
                            if (exists) {
                                this.showSnackBarError('deleting the process!');
                            } else {
                                this.showSnackBarSuccess('Process deleted');
                            }
                            this.setRepoItemsParams(1);
                            this.getRepoItems(false);
                        });
                    } else {
                        this.showSnackBarError('deleting the process!');
                    }
                });
            }
        });
    }

    copyProcess(process: ProcessModel): void {
        this.reset();
        this.processRepoService.getProcessModel(process.id).subscribe((processModel: DesignerProcessModel | null) => {
            if (processModel) {
                const newProcess = processModel.bpmn_xml;
                this.processRepoService.saveProcess('', newProcess, processModel.svgXML).subscribe(
                    (processResp: DesignerProcessModel | null) => {
                        if (processResp === null) {
                            this.showSnackBarError('copying the process!');
                            this.getRepoItems(true);
                        } else {
                            this.processRepoService.checkForCopiedProcess(processResp._id, 10, 100).subscribe((exists) => {
                                if (exists) {
                                    this.showSnackBarSuccess('Process copied');
                                } else {
                                    this.showSnackBarError('copying the process!');
                                }
                                this.getRepoItems(true);
                            });
                        }
                    });
            }
        });
    }

    deployProcess(processId: string): void {
        this.router.navigateByUrl('/processes/deployments/config', {state: {processId: processId, deploymentId: ''}});
    }

    setIndex(event: number) {
        this.activeIndex = event;
        this.animationDone = false;
        this.searchText = '';
        this.sortAttributes = JSON.parse(JSON.stringify(sortingAttributes));         // create copy of object;
        this.sortAttribute = this.sortAttributes[0];
    }

    animation(): void {
        if (this.searchInitialized) {
            this.getRepoItems(true);
        }
    }

    deleteMultipleItems(): void {
        this.dialogsService.openDeleteDialog(this.selectedItems.length + (this.selectedItems.length === 1 ? ' process' : ' processes')).afterClosed().subscribe((deleteProcess: boolean) => {
            if (deleteProcess) {
                // clear repoItems and ready, that spinner occurs
                this.repoItems.clear();
                this.ready = false;
                const array: Observable<boolean>[] = [];
                this.selectedItems.forEach((item: ProcessModel) => {
                    array.push(this.processRepoService.checkForDeletedProcess(item.id, 15, 200));
                    this.processRepoService.deleteProcess(item.id).subscribe((resp: { status: number }) => {
                        if (resp.status !== 200) {
                            this.showSnackBarError(this.selectedItems.length === 1 ? 'deleting the process!' : 'deleting the processes!');
                        }
                    });
                });
                forkJoin(array).subscribe((resp: boolean[]) => {
                    const error = resp.some((item: boolean) => item === true);
                    if (error) {
                        this.showSnackBarError(this.selectedItems.length === 1 ? 'deleting the process!' : 'deleting the processes!');
                    } else {
                        this.showSnackBarSuccess(this.selectedItems.length === 1 ? 'Process deleted' : 'Processes deleted');
                    }
                    this.getRepoItems(true);
                });
            }
        });
    }

    countCheckboxes(): void {
        this.selectedItems = this.repoItems.value.filter((item: ProcessModel) => item.selected === true);
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
    }

    private initSearchAndGetDevices() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchInitialized = true;
            this.searchText = searchText;
            this.getRepoItems(true);
        });
    }

    private getRepoItems(reset: boolean) {
        if (reset) {
            this.setRepoItemsParams(this.limitInit);
            this.reset();
        }

        this.processRepoService.getProcessModels(
            this.searchText, this.limit, this.offset, this.sortAttribute.value, this.sortAttribute.order, this.getConditions()).subscribe(
            (repoItems: ProcessModel[]) => {
                this.animationDone = true;
                this.addToFormArray(repoItems);
                if (repoItems.length !== this.limit) {
                    this.allDataLoaded = true;
                }
                this.ready = true;
            });
    }

    private addToFormArray(repoItems: ProcessModel[]): void {
        repoItems.forEach((repoItem: ProcessModel) => {
            this.repoItems.push(this._formBuilder.group(
                {
                    id: repoItem.id,
                    name: repoItem.name,
                    date: repoItem.date,
                    svgXML: repoItem.svgXML,
                    bpmn_xml: repoItem.bpmn_xml,
                    publish: repoItem.publish,
                    shared: repoItem.shared,
                    parent_id: repoItem.parent_id,
                    image: this.provideImg(repoItem.svgXML),
                    permissions: repoItem.permissions,
                    selected: false,
                }
            ));
        });
    }

    private reset() {
        this.repoItems.clear();
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
        this.selectedItems = [];
    }

    private provideImg(jsonSVG: string): SafeUrl {
        const base64 = this.utilService.convertSVGtoBase64(jsonSVG);
        return this.sanitizer.bypassSecurityTrustUrl('data:image/svg+xml;base64,' + base64);
    }

    private getConditions(): (ProcessRepoConditionsModel | null) {
        let conditions: ProcessRepoConditionsModel | null = {};
        switch (this.activeIndex) {
            case 0:
                /** all */
                conditions = null;
                break;
            case 1:
                /** own */
                conditions.and = [{'condition': this.setCondition('creator', '==', 'jwt.user')},
                    {'condition': this.setCondition('features.parent_id', '==', 'null')}];
                break;
            case 2:
                /** marketplace */
                conditions.and = [{'condition': this.setCondition('creator', '==', 'jwt.user')},
                    {'condition': this.setCondition('features.parent_id', '!=', 'null')}];
                break;
            case 3:
                /** shared */
                conditions.condition = this.setCondition('creator', '!=', 'jwt.user');
                break;
        }
        return conditions;
    }

    private setCondition(feature: string, operation: string, ref: string): ProcessRepoConditionModel {
        const condition = {} as ProcessRepoConditionModel;
        condition.feature = feature;
        condition.operation = operation;
        condition.ref = ref;
        return condition;
    }

    private setRepoItemsParams(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.repoItems.length;
    }

    get repoItems(): FormArray {
        return this.formGroup.get('repoItems') as FormArray;
    }

    private showSnackBarError(text: string): void {
        this.snackBar.open('Error while ' + text + ' !', undefined, {duration: 2000});
    }

    private showSnackBarSuccess(text: string): void {
        this.snackBar.open(text + ' successfully.', undefined, {duration: 2000});
    }

}
