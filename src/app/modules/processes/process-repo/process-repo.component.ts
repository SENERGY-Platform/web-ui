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

import { AfterViewInit, Component, OnInit, TemplateRef, ViewChild, ViewContainerRef, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { concatMap, map, Observable, of, tap } from 'rxjs';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
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
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsV2RightsAndIdModel } from '../../permissions/shared/permissions-resource.model';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { MatSort, MatSortHeader, Sort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { CdkOverlayOrigin, FlexibleConnectedPositionStrategy, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DatePipe } from '@angular/common';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { LIST_DATE_FORMAT } from '../../../core/classes/list-date-format';
import { ListSelection } from '../../../core/classes/list-selection';
import { PagedListState } from '../../../core/classes/paged-list-state';
import { PreferencesService } from '../../../core/services/preferences.service';
import { bulkDelete, confirmDelete, countLabel, noneNullOrServerError } from '../../../core/services/delete-flows';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';

@Component({
    selector: 'senergy-process-repo',
    templateUrl: './process-repo.component.html',
    styleUrls: ['./process-repo.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, SpinnerComponent, MatTabGroup, MatTab, MatButton, MatIconButton, MatTooltip, MatIcon, MatCheckbox, RouterLink, MatMenuTrigger, MatMenu, MatMenuItem, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatSortHeader, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, CdkOverlayOrigin, DatePipe]
})
export class ProcessRepoComponent implements OnInit, AfterViewInit {
    private sanitizer = inject(DomSanitizer);
    private utilService = inject(UtilService);
    private searchbarService = inject(SearchbarService);
    private processRepoService = inject(ProcessRepoService);
    private authorizationService = inject(AuthorizationService);
    private permissionsDialogService = inject(PermissionsDialogService);
    private dialogsService = inject(DialogsService);
    private snackBar = inject(MatSnackBar);
    private router = inject(Router);
    private permissionsService = inject(PermissionsService);
    private metadataExistenceService = inject(MetadataExistenceService);
    private preferencesService = inject(PreferencesService);
    private overlay = inject(Overlay);
    private vcr = inject(ViewContainerRef);
    private destroyRef = inject(DestroyRef);

    readonly tabs = ['All', 'Own', 'Shared'];
    readonly dateFormat = LIST_DATE_FORMAT;
    displayedColumns = ['select', 'image', 'name', 'date', 'actions'];
    activeIndex = 0;
    userID: string;
    ready = false;
    searchText = '';
    totalCount = 0;
    dataSource = new MatTableDataSource<ProcessModel>([]);
    listSelection = new ListSelection<ProcessModel>(() => this.dataSource.data);
    selection = this.listSelection.model;
    list = new PagedListState(this.preferencesService, () => this.loadProcesses(), { sortBy: 'date', sortDirection: 'desc' });
    permissionsPerModel: PermissionsV2RightsAndIdModel[] = [];
    userIdToName: { [key: string]: string } = {};
    /** Metadata warning per process id of the page shown. */
    metadataWarnings = new Map<string, string>();

    userHasCreateAuthorization = false;
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;

    private searchInitialized = false;
    private overlayRef?: OverlayRef;
    private images = new Map<string, SafeUrl>();

    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    @ViewChild('overlayTpl') overlayTpl!: TemplateRef<unknown>;

    constructor() {
        const sub = this.authorizationService.getUserId();
        this.userID = typeof sub === 'string' ? sub : '';
        this.destroyRef.onDestroy(() => this.closeOverlay());
    }

    ngOnInit() {
        this.userHasCreateAuthorization = this.processRepoService.userHasCreateAuthorization();
        this.userHasUpdateAuthorization = this.processRepoService.userHasUpdateAuthorization();
        this.userHasDeleteAuthorization = this.processRepoService.userHasDeleteAuthorization();
        if (!this.userHasDeleteAuthorization) {
            // The only bulk action is delete; without it a selection would only hide the search.
            this.displayedColumns = this.displayedColumns.filter((column) => column !== 'select');
        }
        this.initSearch();
    }

    ngAfterViewInit() {
        this.list.connect(this.paginator, this.destroyRef);
    }

    get filtered(): boolean {
        return this.searchText !== '';
    }

    get emptyText(): string {
        if (this.filtered) {
            return 'No process model matches the search.';
        }
        return ['Process models are drawn in the designer and then deployed.', 'You have not created a process model yet.', 'No process model is shared with you.'][this.activeIndex];
    }

    /** The one reload path: search, sort, tab, refresh button and every write end here. */
    reload(): void {
        this.ready = false;
        this.selection.clear();
        this.list.reload({ next: () => (this.ready = true), error: () => (this.ready = true) });
    }

    setIndex(index: number): void {
        this.activeIndex = index;
        this.searchText = '';
        this.list.sortBy = 'date';
        this.list.sortDirection = 'desc';
        this.reload();
    }

    matSortChange(event: Sort): void {
        this.list.sortChanged(event);
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

    /** Row click: the designer, for users who may update; others have nothing to open. */
    openProcess(process: ProcessModel): void {
        if (this.userHasUpdateAuthorization) {
            this.editProcess(process);
        }
    }

    editProcess(process: ProcessModel): void {
        this.router.navigateByUrl('/processes/designer/' + process._id);
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
        confirmDelete(this.dialogsService, 'process ' + process.name).subscribe(() => {
            this.processRepoService.deleteProcess(process._id).subscribe((resp: { status: number }) => {
                if (resp.status === 200) {
                    snackSuccess(this.snackBar, 'Process deleted successfully.');
                } else {
                    snackError(this.snackBar, 'Error while deleting the process!');
                }
                this.reload();
            });
        });
    }

    copyProcess(process: ProcessModel): void {
        this.processRepoService.getProcessModel(process._id).subscribe((processModel: DesignerProcessModel | null) => {
            if (processModel) {
                this.processRepoService
                    .saveProcess('', processModel.bpmn_xml, processModel.svgXML)
                    .subscribe((processResp: DesignerProcessModel | null) => {
                        if (processResp === null) {
                            snackError(this.snackBar, 'Error while copying the process!');
                        } else {
                            snackSuccess(this.snackBar, 'Process copied successfully.');
                        }
                        this.reload();
                    });
            }
        });
    }

    deployProcess(process: ProcessModel): void {
        this.router.navigateByUrl('/processes/deployments/config?processId=' + process._id);
    }

    deleteMultipleItems(): void {
        const selected = [...this.selection.selected];
        const many = selected.length > 1;
        bulkDelete(this.dialogsService, this.snackBar, {
            text: countLabel(selected.length, 'process', 'processes'),
            jobs: () => selected.map((item) => this.processRepoService.deleteProcess(item._id)),
            isSuccess: noneNullOrServerError,
            successMessage: many ? 'Processes deleted successfully.' : 'Process deleted successfully.',
            errorMessage: many ? 'Error while deleting the processes!' : 'Error while deleting the process!',
            after: () => this.reload(),
        });
    }

    hasAPermission(m: { _id: string }): boolean {
        return this.permissionsPerModel.find((t) => t.id === m._id)?.administrate || false;
    }

    hasXPermission(m: { _id: string }): boolean {
        return this.permissionsPerModel.find((t) => t.id === m._id)?.execute || false;
    }

    /** The stored SVG as an image URL, so it is only drawn and never run as markup. */
    previewUrl(process: ProcessModel): SafeUrl | undefined {
        return this.images.get(process._id);
    }

    openOverlay(origin: CdkOverlayOrigin, process: ProcessModel): void {
        if (this.overlayRef) {
            return;
        }
        const positionStrategy: FlexibleConnectedPositionStrategy = this.overlay
            .position()
            .flexibleConnectedTo(origin.elementRef)
            .withPositions([
                { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 8 },
                { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -8 },
            ]);
        this.overlayRef = this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            hasBackdrop: false,
        });
        this.overlayRef.attach(new TemplatePortal(this.overlayTpl, this.vcr, { process }));
    }

    closeOverlay(): void {
        this.overlayRef?.dispose();
        this.overlayRef = undefined;
    }

    private initSearch(): void {
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
            // A tab change destroys the old searchbar, which re-sends the already reset empty text.
            if (this.searchInitialized && searchText === this.searchText) {
                return;
            }
            this.searchInitialized = true;
            this.searchText = searchText;
            this.reload();
        });
    }

    private loadProcesses(): Observable<unknown> {
        return this.processRepoService
            .getProcessModels(this.searchText, this.list.pageSize, this.list.offset, this.list.sortBy, this.list.sortDirection, this.getOwnerFilter())
            .pipe(
                concatMap((resp) => {
                    const ids = resp.result.map((e) => e._id);
                    const permissions = ids.length > 0 ? this.permissionsService.getComputedResourcePermissionsV2('processmodel', ids) : of([]);
                    return permissions.pipe(
                        tap((perm) => (this.permissionsPerModel = perm)),
                        map(() => resp),
                    );
                }),
                tap((resp) => {
                    this.closeOverlay();
                    this.selection.clear();
                    this.totalCount = resp.total;
                    this.metadataWarnings = new Map();
                    this.images = new Map(resp.result.map((process) => [process._id, this.provideImg(process.svgXML)]));
                    this.dataSource.data = resp.result;
                    this.loadUserNames(resp.result);
                    this.markMissingMetadata(resp.result);
                }),
            );
    }

    private loadUserNames(elements: { owner: string }[]): void {
        const missingCreators: string[] = [];
        elements.forEach((element) => {
            if (element.owner !== this.userID && !this.userIdToName[element.owner] && !missingCreators.includes(element.owner)) {
                missingCreators.push(element.owner);
            }
        });
        missingCreators.forEach((creator) => {
            this.permissionsService.getUserById(creator).subscribe((value) => {
                if (value) {
                    this.userIdToName[value.id] = value.username;
                }
            });
        });
    }

    private markMissingMetadata(processes: ProcessModel[]): void {
        const shown = this.dataSource.data;
        this.metadataExistenceService
            .warningsForBpmn(processes.map((process) => ({ key: process._id, bpmnXml: process.bpmn_xml })))
            .subscribe((warnings) => {
                // Warnings of a page that was replaced meanwhile are dropped.
                if (shown === this.dataSource.data) {
                    this.metadataWarnings = warnings;
                }
            });
    }

    private provideImg(svg: string): SafeUrl {
        const base64 = this.utilService.convertSVGtoBase64(svg);
        return this.sanitizer.bypassSecurityTrustUrl('data:image/svg+xml;base64,' + base64);
    }

    private getOwnerFilter(): { owner?: string; notOwner?: string } | undefined {
        switch (this.activeIndex) {
        case 1:
            return { owner: this.userID };
        case 2:
            return { notOwner: this.userID };
        default:
            return undefined;
        }
    }
}
