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

import {AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {Subscription} from 'rxjs';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {ProcessModel} from '../../processes/process-repo/shared/process.model';
import {SmartServiceDesignsService} from './shared/designs.service';
import {SmartServiceDesignModel} from './shared/design.model';
import {FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {ResponsiveService} from '../../../core/services/responsive.service';
import {DesignerProcessModel} from '../../processes/designer/shared/designer.model';
import {saveAs} from 'file-saver';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DialogsService} from '../../../core/services/dialogs.service';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {UtilService} from '../../../core/services/util.service';
import {SmartServiceReleasesService} from '../releases/shared/release.service';

const grids = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

@Component({
    selector: 'smart-service-designs',
    templateUrl: './designs.component.html',
    styleUrls: ['./designs.component.css'],
})
export class SmartServiceDesignsComponent implements OnInit, AfterViewInit, OnDestroy {
    formGroup: FormGroup = new FormGroup({ repoItems: new FormArray([]) });

    gridCols = 0;
    animationDone = true;
    ready = false;
    searchInitialized = false;
    searchText = '';
    selectedItems: ProcessModel[] = [];
    rowHeight = 282;

    private limitInit = 54;
    private limit = this.limitInit;
    private offset = 0;
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;
    private gridColChangeTimeout: number | undefined;
    private knownMainPanelOffsetHeight = 0;

    @ViewChild('mainPanel', { static: false }) mainPanel!: ElementRef;

    constructor(
        private searchbarService: SearchbarService,
        private designsService: SmartServiceDesignsService,
        private releaseService: SmartServiceReleasesService,
        private responsiveService: ResponsiveService,
        private snackBar: MatSnackBar,
        private dialogsService: DialogsService,
        private sanitizer: DomSanitizer,
        private utilService: UtilService,
        private _formBuilder: FormBuilder,
    ) {

    }

    ngOnInit() {
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
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.setRepoItemsParams(this.limitInit);
            this.getRepoItems(false);
        }
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

    private get maxItemsDisplayed(): number {
        return this.gridCols * Math.ceil(this.knownMainPanelOffsetHeight / this.rowHeight);
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

        this.designsService
            .getDesignList(
                this.limit,
                this.offset,
                this.searchText
            )
            .subscribe((repoItems: SmartServiceDesignModel[]) => {
                this.animationDone = true;
                this.addToFormArray(repoItems);
                if (repoItems.length !== this.limit) {
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

    private addToFormArray(repoItems: SmartServiceDesignModel[]): void {
        repoItems.forEach((repoItem: SmartServiceDesignModel) => {
            this.repoItems.push(
                this._formBuilder.group({
                    id: repoItem.id,
                    name: repoItem.name,
                    description: repoItem.description,
                    svg_xml: repoItem.svg_xml,
                    bpmn_xml: repoItem.bpmn_xml,
                    image: this.provideImg(repoItem.svg_xml),
                }),
            );
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

    downloadDiagram(design: SmartServiceDesignModel): void {
        const file = new Blob([design.bpmn_xml], { type: 'application/bpmn-xml' });
        saveAs(file, design.name + '.bpmn');
    }

    downloadSvg(design: SmartServiceDesignModel): void {
        const file = new Blob([design.svg_xml], { type: 'image/svg+xml' });
        saveAs(file, design.name + '.svg');
    }

    deleteDesign(design: SmartServiceDesignModel): void {
        this.dialogsService
            .openDeleteDialog('design')
            .afterClosed()
            .subscribe((deleteProcess: boolean) => {
                if (deleteProcess) {
                    this.designsService.deleteDesign(design.id).subscribe((resp: { status: number }) => {
                        if (resp.status === 200) {
                            this.repoItems.removeAt(this.repoItems.value.findIndex((item: ProcessModel) => design.id === item.id));
                        } else {
                            this.showSnackBarError('deleting the design');
                        }
                    });
                }
            });
    }

    releaseDesign(design: SmartServiceDesignModel): void {
        this.dialogsService.openInputDialog("Release Name and Description", {name: design.name, description: design.description}, ["name"])
            .afterClosed()
            .subscribe((result: {name: string, description: string}) => {
                this.releaseService.createRelease({design_id: design.id, name: result.name, description: result.description}).subscribe(value => {
                    if(value) {
                        this.snackBar.open('Release created.', undefined, { duration: 2000 });
                    } else {
                        this.showSnackBarError('creating a release');
                    }
                })
            })
    }

    private showSnackBarError(text: string): void {
        this.snackBar.open('Error while ' + text + ' !', "close", { panelClass: "snack-bar-error" });
    }
}
