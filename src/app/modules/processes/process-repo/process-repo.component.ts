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

import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy, inject } from '@angular/core';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { SortModel } from '../../../core/components/sort/shared/sort.model';
import { concatMap, forkJoin, map, Observable, Subscription } from 'rxjs';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { ResponsiveService } from '../../../core/services/responsive.service';
import { ProcessModel } from './shared/process.model';
import { ProcessRepoService } from './shared/process-repo.service';
import { UtilService } from '../../../core/services/util.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { DesignerProcessModel } from '../designer/shared/designer.model';
import { saveAs } from 'file-saver';
import { DialogsService } from '../../../core/services/dialogs.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsV2RightsAndIdModel } from '../../permissions/shared/permissions-resource.model';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { SearchbarComponent } from '../../../core/components/searchbar/searchbar.component';
import { MatIconButton, MatFabButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatBadge } from '@angular/material/badge';
import { SortComponent } from '../../../core/components/sort/sort.component';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { MatGridList, MatGridTile, MatGridTileText, MatGridTileFooterCssMatStyler } from '@angular/material/grid-list';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { DatePipe } from '@angular/common';

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
    styleUrls: ['./process-repo.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatTabGroup, MatTab, SearchbarComponent, MatIconButton, MatTooltip, MatIcon, MatBadge, SortComponent, InfiniteScrollDirective, FormsModule, ReactiveFormsModule, MatGridList, MatGridTile, MatGridTileText, MatGridTileFooterCssMatStyler, MatCheckbox, RouterLink, MatMenuTrigger, MatMenu, MatMenuItem, SpinnerComponent, MatFabButton, DatePipe]
})
export class ProcessRepoComponent implements OnInit, AfterViewInit, OnDestroy {
    private sanitizer = inject(DomSanitizer);
    private utilService = inject(UtilService);
    private searchbarService = inject(SearchbarService);
    private processRepoService = inject(ProcessRepoService);
    private responsiveService = inject(ResponsiveService);
    protected auth = inject(AuthorizationService);
    private authorizationService = inject(AuthorizationService);
    private permissionsDialogService = inject(PermissionsDialogService);
    private dialogsService = inject(DialogsService);
    private snackBar = inject(MatSnackBar);
    private router = inject(Router);
    private _formBuilder = inject(FormBuilder);
    private permissionsService = inject(PermissionsService);
    private metadataExistenceService = inject(MetadataExistenceService);

    formGroup: FormGroup = new FormGroup({ repoItems: new FormArray([]) });
    activeIndex = 0;
    gridCols = 0;
    animationDone = true;
    sortAttributes = JSON.parse(JSON.stringify(sortingAttributes)); // create copy of object;
    userID: string;
    ready = false;
    searchInitialized = false;
    searchText = '';
    selectedItems: ProcessModel[] = [];
    rowHeight = 282;
    permissionsPerModel: PermissionsV2RightsAndIdModel[] = [];

    userHasCreateAuthorization = false;
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;

    private limitInit = 54;
    private limit = this.limitInit;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    // one listing in flight at a time: an answer for a previous tab or search must not be appended
    private loadSub: Subscription = new Subscription();
    private allDataLoaded = false;
    private gridColChangeTimeout: number | undefined;
    private knownMainPanelOffsetHeight = 0;

    userIdToName: { [key: string]: string } = {};

    @ViewChild('mainPanel', { static: false }) mainPanel!: ElementRef;

    constructor() {
        const sub = this.authorizationService.getUserId();
        if (typeof sub === 'string') {
            this.userID = sub;
        } else {
            this.userID = '';
        }
    }

    ngOnInit() {
        this.userHasCreateAuthorization = this.processRepoService.userHasCreateAuthorization();
        this.userHasUpdateAuthorization = this.processRepoService.userHasUpdateAuthorization();
        this.userHasDeleteAuthorization = this.processRepoService.userHasDeleteAuthorization();

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
        this.loadSub.unsubscribe();
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
        this.permissionsDialogService.openPermissionV2Dialog('processmodel', process._id, process.name);
    }

    downloadDiagram(process: ProcessModel): void {
        this.processRepoService.getProcessModel(process._id).subscribe((processModel: DesignerProcessModel | null) => {
            if (processModel) {
                const xml = processModel.bpmn_xml;
                const file = new Blob([xml], { type: 'application/bpmn-xml' });
                saveAs(file, process.name + '.bpmn');
            }
        });
    }

    downloadSvg(process: ProcessModel): void {
        const file = new Blob([process.svgXML], { type: 'image/svg+xml' });
        saveAs(file, process.name + '.svg');
    }

    deleteProcess(process: ProcessModel): void {
        this.dialogsService
            .openDeleteDialog('process')
            .afterClosed()
            .subscribe((deleteProcess: boolean) => {
                if (deleteProcess) {
                    this.processRepoService.deleteProcess(process._id).subscribe((resp: { status: number }) => {
                        if (resp.status === 200) {
                            this.repoItems.removeAt(this.repoItems.value.findIndex((item: ProcessModel) => process._id === item._id));
                            this.showSnackBarSuccess('Process deleted');
                            this.setRepoItemsParams(1);
                            this.getRepoItems(false);
                        } else {
                            this.showSnackBarError('deleting the process!');
                        }
                    });
                }
            });
    }

    copyProcess(process: ProcessModel): void {
        this.reset();
        this.processRepoService.getProcessModel(process._id).subscribe((processModel: DesignerProcessModel | null) => {
            if (processModel) {
                const newProcess = processModel.bpmn_xml;
                this.processRepoService
                    .saveProcess('', newProcess, processModel.svgXML)
                    .subscribe((processResp: DesignerProcessModel | null) => {
                        if (processResp === null) {
                            this.showSnackBarError('copying the process!');
                            this.getRepoItems(true);
                        } else {
                            this.showSnackBarSuccess('Process copied');
                            this.getRepoItems(true);
                        }
                    });
            }
        });
    }

    deployProcess(processId: string): void {
        this.router.navigateByUrl('/processes/deployments/config?processId=' + processId);
    }

    setIndex(event: number) {
        this.activeIndex = event;
        this.animationDone = false;
        this.searchText = '';
        this.sortAttributes = JSON.parse(JSON.stringify(sortingAttributes)); // create copy of object;
        this.sortAttribute = this.sortAttributes[0];
    }

    animation(): void {
        if (this.searchInitialized) {
            this.getRepoItems(true);
        }
    }

    deleteMultipleItems(): void {
        this.dialogsService
            .openDeleteDialog(this.selectedItems.length + (this.selectedItems.length === 1 ? ' process' : ' processes'))
            .afterClosed()
            .subscribe((deleteProcess: boolean) => {
                if (deleteProcess) {
                    // clear repoItems and ready, that spinner occurs
                    this.repoItems.clear();
                    this.ready = false;
                    const array: Observable<boolean>[] = [];
                    this.selectedItems.forEach((item: ProcessModel) => {
                        this.processRepoService.deleteProcess(item._id).subscribe((resp: { status: number }) => {
                            if (resp.status !== 200) {
                                this.showSnackBarError(
                                    this.selectedItems.length === 1 ? 'deleting the process!' : 'deleting the processes!',
                                );
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

    hasAPermission(m: {_id: string}): boolean {
        return this.permissionsPerModel.find(t => t.id === m._id)?.administrate || false;
    }

    hasXPermission(m: {_id: string}): boolean {
        return this.permissionsPerModel.find(t => t.id === m._id)?.execute || false;
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            const gridCols = grids.get(mqAlias) || 0;
            if (gridCols > this.gridCols) {
                clearTimeout(this.gridColChangeTimeout);
                this.gridColChangeTimeout = this.adjustForResize(2);
            }
            this.gridCols = gridCols;
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

        this.loadSub.unsubscribe();
        this.loadSub = this.processRepoService
            .getProcessModels(
                this.searchText,
                this.limit,
                this.offset,
                this.sortAttribute.value,
                this.sortAttribute.order,
                this.getOwnerFilter(),
            ).pipe(concatMap(x => this.permissionsService.getComputedResourcePermissionsV2('processmodel', x.result.map(e => e._id)).pipe(map(perm => this.permissionsPerModel = this.permissionsPerModel.concat(perm)), map(_ => x))))
            .subscribe(repoItems => {
                this.loadUserNames(repoItems.result);
                this.animationDone = true;
                this.addToFormArray(repoItems.result);
                if (repoItems.result.length !== this.limit) {
                    this.allDataLoaded = true;
                }
                this.ready = true;
            });
    }

    private loadUserNames(elements: { owner: string }[]) {
        const missingCreators: string[] = [];
        elements?.forEach(element => {
            if (element.owner !== this.userID && !this.userIdToName[element.owner] && !missingCreators.includes(element.owner)) {
                missingCreators.push(element.owner);
            }
        });
        missingCreators.forEach(creator => {
            this.permissionsService.getUserById(creator).subscribe(value => {
                if (value) {
                    this.userIdToName[value.id] = value.username;
                }
            });
        });
    }

    private addToFormArray(repoItems: ProcessModel[]): void {
        repoItems.forEach((repoItem: ProcessModel) => {
            this.repoItems.push(
                this._formBuilder.group({
                    _id: repoItem._id,
                    name: repoItem.name,
                    date: repoItem.date,
                    svgXML: repoItem.svgXML,
                    bpmn_xml: repoItem.bpmn_xml,
                    publish: repoItem.publish,
                    owner: repoItem.owner,
                    image: this.provideImg(repoItem.svgXML),
                    selected: false,
                    metadataWarning: '',
                }),
            );
        });
        this.markMissingMetadata(repoItems);
    }

    private markMissingMetadata(repoItems: ProcessModel[]): void {
        this.metadataExistenceService
            .warningsForBpmn(repoItems.map((repoItem) => ({ key: repoItem._id, bpmnXml: repoItem.bpmn_xml })))
            .subscribe((warnings) => {
                this.repoItems.controls.forEach((control) => {
                    const warning = warnings.get(control.value._id);
                    if (warning) {
                        control.patchValue({ metadataWarning: warning });
                    }
                });
            });
    }

    private reset() {
        this.repoItems.clear();
        this.permissionsPerModel = [];
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
        this.selectedItems = [];
    }

    private provideImg(jsonSVG: string): SafeUrl {
        const base64 = this.utilService.convertSVGtoBase64(jsonSVG);
        return this.sanitizer.bypassSecurityTrustUrl('data:image/svg+xml;base64,' + base64);
    }

    private getOwnerFilter(): { owner?: string; notOwner?: string } | undefined {
        switch (this.activeIndex) {
        case 1:
            // own
            return { owner: this.userID };
        case 2:
            // shared
            return { notOwner: this.userID };
        default:
            // all
            return undefined;
        }
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
        this.snackBar.open('Error while ' + text + ' !', 'close', { panelClass: 'snack-bar-error' });
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
