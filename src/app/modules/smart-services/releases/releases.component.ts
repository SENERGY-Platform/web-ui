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

import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {ProcessModel} from '../../processes/process-repo/shared/process.model';
import {SmartServiceReleaseModel, SmartServiceExtendedReleaseModel} from './shared/release.model';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {ResponsiveService} from '../../../core/services/responsive.service';
import {saveAs} from 'file-saver';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DialogsService} from '../../../core/services/dialogs.service';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {UtilService} from '../../../core/services/util.service';
import {SmartServiceReleasesService} from './shared/release.service';
import {PermissionsDialogService} from '../../permissions/shared/permissions-dialog.service';
import { DeleteDialogResponse } from 'src/app/core/dialogs/delete-dialog.component';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SmartServiceInstanceDialogService } from '../instances/shared/instance-dialog.service';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';
import { SearchbarComponent } from '../../../core/components/searchbar/searchbar.component';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatChipSet, MatChip, MatChipAvatar, MatChipRemove } from '@angular/material/chips';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { MatGridList, MatGridTile, MatGridTileText, MatGridTileFooterCssMatStyler } from '@angular/material/grid-list';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { DatePipe } from '@angular/common';
import { snackError } from 'src/app/core/services/snack-bar-messages';

const grids = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-smart-service-releases',
    templateUrl: './releases.component.html',
    styleUrls: ['./releases.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [SearchbarComponent, MatIconButton, MatTooltip, MatIcon, MatChipSet, MatChip, MatChipAvatar, MatChipRemove, InfiniteScrollDirective, FormsModule, ReactiveFormsModule, MatGridList, MatGridTile, MatGridTileText, MatGridTileFooterCssMatStyler, MatMenuTrigger, MatMenu, MatMenuItem, RouterLink, SpinnerComponent, DatePipe]
})
export class SmartServiceReleasesComponent implements OnInit, AfterViewInit {
    private permissionsDialogService = inject(PermissionsDialogService);
    private destroyRef = inject(DestroyRef);
    private searchbarService = inject(SearchbarService);
    private releasesService = inject(SmartServiceReleasesService);
    private responsiveService = inject(ResponsiveService);
    private snackBar = inject(MatSnackBar);
    private dialogsService = inject(DialogsService);
    private sanitizer = inject(DomSanitizer);
    private utilService = inject(UtilService);
    private _formBuilder = inject(FormBuilder);
    private activatedRoute = inject(ActivatedRoute);
    private router = inject(Router);
    private instanceDialogService = inject(SmartServiceInstanceDialogService);
    private metadataExistenceService = inject(MetadataExistenceService);

    formGroup: FormGroup = new FormGroup({ repoItems: new FormArray([]) });

    gridCols = 0;
    animationDone = true;
    ready = false;
    searchInitialized = false;
    searchText = '';
    selectedItems: ProcessModel[] = [];
    rowHeight = 282;
    latest = true;
    id ?: string;

    userHasDeleteAuthorization = false;

    private limitInit = 54;
    private limit = this.limitInit;
    private offset = 0;
    private allDataLoaded = false;
    private gridColChangeTimeout: number | undefined;
    private knownMainPanelOffsetHeight = 0;

    @ViewChild('mainPanel', { static: false }) mainPanel!: ElementRef;

    ngOnInit() {
        this.userHasDeleteAuthorization = this.releasesService.userHasDeleteAuthorization();
        this.initGridCols();
        this.activatedRoute.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            const id = params.get('id');
            if (id) {
                this.id = id;
            }
        });
    }

    ngAfterViewInit() {
        this.knownMainPanelOffsetHeight = this.mainPanel.nativeElement.offsetHeight;
        this.limitInit = this.maxItemsDisplayed;
        this.limit = this.limitInit;
        this.initSearchAndGetDevices();
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.setRepoItemsParams(this.limitInit);
            this.getRepoItems(false);
        }
    }

    toggleLatest(){
        this.latest = !this.latest;
        this.getRepoItems(true);
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((mqAlias) => {
            const gridCols = grids.get(mqAlias) || 0;
            if (gridCols > this.gridCols) {
                clearTimeout(this.gridColChangeTimeout);
                this.gridColChangeTimeout = this.adjustForResize(2);
            }
            this.gridCols = gridCols;
        });
    }

    private get maxItemsDisplayed(): number {
        return this.gridCols * Math.ceil(this.knownMainPanelOffsetHeight / this.rowHeight);
    }

    private initSearchAndGetDevices() {
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
            this.searchInitialized = true;
            this.searchText = searchText;
            this.getRepoItems(true);
        });
    }

    getRepoItems(reset: boolean) {
        if (reset) {
            this.setRepoItemsParams(this.limitInit);
            this.reset();
        }

        this.releasesService
            .getExtendedReleaseList(
                this.limit,
                this.offset,
                this.searchText,
                'r',
                this.latest,
                this.id ? [this.id] : undefined
            )
            .subscribe((repoItems) => {
                this.animationDone = true;
                this.addToFormArray(repoItems.releases);
                if (repoItems.releases.length !== this.limit) {
                    this.allDataLoaded = true;
                }
                this.ready = true;
            });
    }

    private setRepoItemsParams(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.repoItems.length;
    }

    private reset() {
        this.repoItems.clear();
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
        this.selectedItems = [];
    }

    get repoItems(): FormArray {
        return this.formGroup.get('repoItems') as FormArray;
    }

    private addToFormArray(repoItems: SmartServiceExtendedReleaseModel[]): void {
        repoItems.forEach((repoItem: SmartServiceExtendedReleaseModel) => {
            this.repoItems.push(
                this._formBuilder.group({
                    id: repoItem.id,
                    design_id: repoItem.design_id,
                    name: repoItem.name,
                    description: repoItem.description,
                    svg_xml: repoItem.svg_xml,
                    bpmn_xml: repoItem.bpmn_xml,
                    image: this.provideImg(repoItem.svg_xml),
                    shared: repoItem.permissions_info.shared,
                    permissions: repoItem.permissions_info.permissions,
                    created_at: repoItem.created_at,
                    error: repoItem.error,
                    metadataWarning: '',
                }),
            );
        });
        this.markMissingMetadata(repoItems);
    }

    private markMissingMetadata(repoItems: SmartServiceExtendedReleaseModel[]): void {
        this.metadataExistenceService
            .warningsForBpmn(repoItems.map((repoItem) => ({ key: repoItem.id, bpmnXml: repoItem.bpmn_xml })))
            .subscribe((warnings) => {
                this.repoItems.controls.forEach((control) => {
                    const warning = warnings.get(control.value.id);
                    if (warning) {
                        control.patchValue({ metadataWarning: warning });
                    }
                });
            });
    }

    private provideImg(jsonSVG: string): SafeUrl {
        const base64 = this.utilService.convertSVGtoBase64(jsonSVG);
        return this.sanitizer.bypassSecurityTrustUrl('data:image/svg+xml;base64,' + base64);
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

    downloadDiagram(release: SmartServiceExtendedReleaseModel): void {
        const file = new Blob([release.bpmn_xml], { type: 'application/bpmn-xml' });
        saveAs(file, release.name + '.bpmn');
    }

    downloadSvg(release: SmartServiceExtendedReleaseModel): void {
        const file = new Blob([release.svg_xml], { type: 'image/svg+xml' });
        saveAs(file, release.name + '.svg');
    }

    deleteRelease(release: SmartServiceReleaseModel): void {
        this.dialogsService
            .openDeleteDialog('release', {checkboxText: 'Delete all previous releases'})
            .afterClosed()
            .subscribe((deleteResponse: DeleteDialogResponse | undefined) => {
                if (deleteResponse?.confirmed) {
                    this.releasesService.deleteRelease(release.id, deleteResponse.checkboxChecked).subscribe((resp: { status: number }) => {
                        if (resp.status === 200) {
                            this.repoItems.removeAt(this.repoItems.value.findIndex((item: ProcessModel) => release.id === item._id));
                        } else {
                            this.showSnackBarError('deleting the release!');
                        }
                    });
                }
            });
    }

    private showSnackBarError(text: string): void {
        snackError(this.snackBar, 'Error while ' + text + ' !');
    }

    permission(release: SmartServiceReleaseModel): void {
        this.permissionsDialogService.openPermissionV2Dialog('smart_service_releases', release.id, release.name);
    }

    updateQueryParams() {
         const queryParams: any = {};
        if (this.id !== undefined) {
            queryParams['id'] = this.id;
        }

        this.router.navigate(
            [],
            {
                relativeTo: this.activatedRoute,
                queryParams,
            },
        );
    }

    showInstances(id: string): void {
        this.router.navigate(['smart-services/instances'], { queryParams: { release_id: id } });
    }

    /** Starts an instance of the release and, once it exists, shows the instances of that release */
    launchRelease(release: SmartServiceReleaseModel): void {
        this.instanceDialogService.launch(release).subscribe((created) => {
            if (created) {
                this.showInstances(release.id);
            }
        });
    }
}
