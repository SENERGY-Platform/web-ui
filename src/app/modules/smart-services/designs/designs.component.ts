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

import { Component, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { SmartServiceDesignsService } from './shared/designs.service';
import { SmartServiceDesignModel } from './shared/design.model';
import { saveAs } from 'file-saver';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogsService } from '../../../core/services/dialogs.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { UtilService } from '../../../core/services/util.service';
import { SmartServiceReleasesService } from '../releases/shared/release.service';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton, MatIconButton } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { HoverPreviewComponent } from '../../../core/components/hover-preview/hover-preview.component';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { loadAllPages } from '../../../core/classes/load-all-pages';
import { PreferencesService } from '../../../core/services/preferences.service';
import { confirmDelete } from '../../../core/services/delete-flows';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';

/** Designs carry their diagrams, so they are read in small chunks. */
const CHUNK = 50;

@Component({
    selector: 'senergy-smart-service-designs',
    templateUrl: './designs.component.html',
    styleUrls: ['./designs.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, HoverPreviewComponent, SpinnerComponent, MatButton, MatIconButton, MatIcon, MatTooltip, RouterLink, MatMenuTrigger, MatMenu, MatMenuItem, MatPaginator, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow]
})
export class SmartServiceDesignsComponent implements OnInit {
    private searchbarService = inject(SearchbarService);
    private destroyRef = inject(DestroyRef);
    private designsService = inject(SmartServiceDesignsService);
    private releaseService = inject(SmartServiceReleasesService);
    private snackBar = inject(MatSnackBar);
    private dialogsService = inject(DialogsService);
    private sanitizer = inject(DomSanitizer);
    private utilService = inject(UtilService);
    private metadataExistenceService = inject(MetadataExistenceService);
    private router = inject(Router);
    preferencesService = inject(PreferencesService);

    displayedColumns = ['image', 'name', 'actions'];
    /** The design API has no total, so every design is loaded and the list pages on the client. */
    dataSource = new MatTableDataSource<SmartServiceDesignModel>([]);
    ready = false;
    searchText = '';
    /** Metadata warning per design id of the pages shown so far. */
    metadataWarnings = new Map<string, string>();

    userHasDeleteAuthorization = false;
    userHasUpdateAuthorization = false;
    userHasCreateAuthorization = false;

    private images = new Map<string, SafeUrl>();
    private metadataChecked = new Set<string>();
    private loadSub = new Subscription();

    @ViewChild('paginator', { static: false })
    set paginator(value: MatPaginator | undefined) {
        if (value) {
            this.dataSource.paginator = value;
        }
    }

    ngOnInit() {
        this.userHasDeleteAuthorization = this.designsService.userHasDeleteAuthorization();
        this.userHasUpdateAuthorization = this.designsService.userHasUpdateAuthorization();
        this.userHasCreateAuthorization = this.designsService.userHasCreateAuthorization();
        this.destroyRef.onDestroy(() => this.loadSub.unsubscribe());

        // Metadata is checked for the page that is shown, not for every design at once.
        this.dataSource.connect().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((rows) => this.markMissingMetadata(rows));
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    get filtered(): boolean {
        return this.searchText !== '';
    }

    /** The one reload path: search, refresh button and every write end here; only the latest load stays subscribed. */
    reload(): void {
        this.loadSub.unsubscribe();
        this.ready = false;
        this.metadataChecked.clear();
        this.metadataWarnings = new Map();
        this.loadSub = loadAllPages((limit, offset) => this.designsService.getDesignList(limit, offset, this.searchText), CHUNK).subscribe(
            (designs) => {
                this.images = new Map(designs.map((design) => [design.id, this.provideImg(design.svg_xml)]));
                this.dataSource.data = designs;
                this.dataSource.paginator?.firstPage();
                this.ready = true;
            },
        );
    }

    previewUrl(design: SmartServiceDesignModel): SafeUrl | undefined {
        return this.images.get(design.id);
    }

    /** Row click: the designer, for users who may update; others have nothing to open. */
    openDesign(design: SmartServiceDesignModel): void {
        if (this.userHasUpdateAuthorization) {
            this.editDesign(design);
        }
    }

    editDesign(design: SmartServiceDesignModel): void {
        this.router.navigateByUrl('/smart-services/designer/' + design.id);
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
        confirmDelete(this.dialogsService, 'design').subscribe(() => {
            this.designsService.deleteDesign(design.id).subscribe((resp: { status: number }) => {
                if (resp.status === 200) {
                    this.reload();
                } else {
                    this.showSnackBarError('deleting the design');
                }
            });
        });
    }

    releaseDesign(design: SmartServiceDesignModel): void {
        this.dialogsService.openInputDialog('Release Name and Description', {name: design.name, description: design.description}, ['name'])
            .afterClosed()
            .subscribe((result: {[key: string]: string} | null | undefined) => {
                if (!result) {
                    return;
                }
                this.releaseService.createRelease({design_id: design.id, name: result.name, description: result.description}).subscribe(value => {
                    if(value) {
                        snackSuccess(this.snackBar, 'Release created.');
                    } else {
                        this.showSnackBarError('creating a release');
                    }
                });
            });
    }

    private markMissingMetadata(rows: SmartServiceDesignModel[]): void {
        const unchecked = rows.filter((design) => !this.metadataChecked.has(design.id));
        if (unchecked.length === 0) {
            return;
        }
        unchecked.forEach((design) => this.metadataChecked.add(design.id));
        const shown = this.dataSource.data;
        this.metadataExistenceService
            .warningsForBpmn(unchecked.map((design) => ({ key: design.id, bpmnXml: design.bpmn_xml })))
            .subscribe((warnings) => {
                // Warnings of a list that was replaced meanwhile are dropped.
                if (shown === this.dataSource.data) {
                    warnings.forEach((warning, id) => this.metadataWarnings.set(id, warning));
                }
            });
    }

    private provideImg(jsonSVG: string): SafeUrl {
        const base64 = this.utilService.convertSVGtoBase64(jsonSVG);
        return this.sanitizer.bypassSecurityTrustUrl('data:image/svg+xml;base64,' + base64);
    }

    private showSnackBarError(text: string): void {
        snackError(this.snackBar, 'Error while ' + text + ' !');
    }
}
