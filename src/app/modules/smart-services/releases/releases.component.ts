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

import { AfterViewInit, Component, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {SmartServiceReleaseModel, SmartServiceExtendedReleaseModel} from './shared/release.model';
import {saveAs} from 'file-saver';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DialogsService} from '../../../core/services/dialogs.service';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {UtilService} from '../../../core/services/util.service';
import {SmartServiceReleasesService} from './shared/release.service';
import {PermissionsDialogService} from '../../permissions/shared/permissions-dialog.service';
import { DeleteDialogResponse } from 'src/app/core/dialogs/delete-dialog.component';
import { ActivatedRoute, Router } from '@angular/router';
import { SmartServiceInstanceDialogService } from '../instances/shared/instance-dialog.service';
import { MetadataExistenceService } from '../../metadata/shared/metadata-existence.service';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatChipSet, MatChip, MatChipAvatar, MatChipRemove, MatChipListbox, MatChipOption } from '@angular/material/chips';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { HoverPreviewComponent } from '../../../core/components/hover-preview/hover-preview.component';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { DatePipe } from '@angular/common';
import { LIST_DATE_FORMAT } from '../../../core/classes/list-date-format';
import { PagedListState } from '../../../core/classes/paged-list-state';
import { PreferencesService } from '../../../core/services/preferences.service';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';
import { MatDialog } from '@angular/material/dialog';
import { dialogSize } from '../../../core/dialog-size';
import { ContentReviewService } from '../requests/shared/content-review.service';
import { ReviewRequestModel } from '../requests/shared/content-review.model';
import { ProposeDialogComponent, ProposeDialogData } from '../requests/propose-dialog/propose-dialog.component';
import { ChangedResourcesHintComponent } from '../changed-resources/changed-resources-hint.component';

@Component({
    selector: 'senergy-smart-service-releases',
    templateUrl: './releases.component.html',
    styleUrls: ['./releases.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, HoverPreviewComponent, SpinnerComponent, MatIconButton, MatTooltip, MatIcon, MatChipSet, MatChip, MatChipAvatar, MatChipRemove, MatChipListbox, MatChipOption, MatMenuTrigger, MatMenu, MatMenuItem, MatPaginator, MatSort, MatSortHeader, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, DatePipe, ChangedResourcesHintComponent]
})
export class SmartServiceReleasesComponent implements OnInit, AfterViewInit {
    private permissionsDialogService = inject(PermissionsDialogService);
    private destroyRef = inject(DestroyRef);
    private searchbarService = inject(SearchbarService);
    private releasesService = inject(SmartServiceReleasesService);
    private snackBar = inject(MatSnackBar);
    private dialogsService = inject(DialogsService);
    private sanitizer = inject(DomSanitizer);
    private utilService = inject(UtilService);
    private activatedRoute = inject(ActivatedRoute);
    private router = inject(Router);
    private instanceDialogService = inject(SmartServiceInstanceDialogService);
    private metadataExistenceService = inject(MetadataExistenceService);
    private preferencesService = inject(PreferencesService);
    private contentReviewService = inject(ContentReviewService);
    private dialog = inject(MatDialog);

    readonly dateFormat = LIST_DATE_FORMAT;
    displayedColumns = ['image', 'name', 'status', 'created_at', 'actions'];
    dataSource = new MatTableDataSource<SmartServiceExtendedReleaseModel>([]);
    list = new PagedListState(this.preferencesService, () => this.loadReleases(), { sortBy: 'name', sortDirection: 'asc' });
    ready = false;
    searchText = '';
    totalCount = 0;
    /** Only the newest release of each design, as the page started. */
    latest = true;
    id ?: string;
    /** Metadata warning per release id of the page shown. */
    metadataWarnings = new Map<string, string>();

    userHasDeleteAuthorization = false;

    private images = new Map<string, SafeUrl>();

    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;

    ngOnInit() {
        this.userHasDeleteAuthorization = this.releasesService.userHasDeleteAuthorization();
        this.activatedRoute.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            const id = params.get('id');
            if (id) {
                this.id = id;
            }
        });
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    ngAfterViewInit() {
        this.list.connect(this.paginator, this.destroyRef);
    }

    get filtered(): boolean {
        return this.searchText !== '' || !this.latest || this.id !== undefined;
    }

    /** The one reload path: search, sort, filters, refresh button and every write end here. */
    reload(): void {
        this.ready = false;
        this.list.reload({ next: () => (this.ready = true), error: () => (this.ready = true) });
    }

    matSortChange(event: Sort): void {
        this.list.sortChanged(event);
        this.reload();
    }

    showOlder(show: boolean): void {
        this.latest = !show;
        this.reload();
    }

    removeIdFilter(): void {
        this.id = undefined;
        this.updateQueryParams();
        this.reload();
    }

    previewUrl(release: SmartServiceExtendedReleaseModel): SafeUrl | undefined {
        return this.images.get(release.id);
    }

    /** Release time in milliseconds; the repository sends unix seconds. */
    releasedAt(release: SmartServiceExtendedReleaseModel): number {
        return Number(release.created_at) * 1000;
    }

    /** A missing flag means the right is not known, which the page has always treated as allowed. */
    canLaunch(release: SmartServiceExtendedReleaseModel): boolean {
        return release.permissions_info.permissions.x !== false;
    }

    canAdministrate(release: SmartServiceExtendedReleaseModel): boolean {
        return release.permissions_info.permissions.a !== false;
    }

    /** Only the user's own latest release can be proposed, and only with the right to create requests. */
    canPropose(release: SmartServiceExtendedReleaseModel): boolean {
        return this.contentReviewService.canProposeRelease(release);
    }

    proposeForPublication(release: SmartServiceExtendedReleaseModel): void {
        this.dialog
            .open<ProposeDialogComponent, ProposeDialogData, ReviewRequestModel>(ProposeDialogComponent, {
                ...dialogSize('m'),
                data: { releaseId: release.id, name: release.name },
            })
            .afterClosed()
            .subscribe((request) => {
                if (request) {
                    snackSuccess(this.snackBar, 'Release proposed for publication.');
                    this.router.navigate(['/smart-services/requests', request.id]);
                }
            });
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
                            this.reload();
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
        // merged, so the search the searchbar keeps in the URL stays
        this.router.navigate(
            [],
            {
                relativeTo: this.activatedRoute,
                queryParams: { id: this.id ?? null },
                queryParamsHandling: 'merge',
            },
        );
    }

    exportToDesigner(release: SmartServiceReleaseModel): void {
        this.router.navigateByUrl('/smart-services/releases/designer/' + release.id);
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

    private loadReleases(): Observable<unknown> {
        return this.releasesService
            .getExtendedReleaseList(
                this.list.pageSize,
                this.list.offset,
                this.searchText,
                'r',
                this.latest,
                this.id ? [this.id] : undefined,
                this.list.sortBy + '.' + this.list.sortDirection,
            )
            .pipe(
                tap((answer) => {
                    this.totalCount = answer.total;
                    this.images = new Map(answer.releases.map((release) => [release.id, this.provideImg(release.svg_xml)]));
                    this.metadataWarnings = new Map();
                    this.dataSource.data = answer.releases;
                    this.markMissingMetadata(answer.releases);
                }),
            );
    }

    private markMissingMetadata(releases: SmartServiceExtendedReleaseModel[]): void {
        const shown = this.dataSource.data;
        this.metadataExistenceService
            .warningsForBpmn(releases.map((release) => ({ key: release.id, bpmnXml: release.bpmn_xml })))
            .subscribe((warnings) => {
                // Warnings of a page that was replaced meanwhile are dropped.
                if (shown === this.dataSource.data) {
                    this.metadataWarnings = warnings;
                }
            });
    }

    private provideImg(jsonSVG: string): SafeUrl {
        const base64 = this.utilService.convertSVGtoBase64(jsonSVG);
        return this.sanitizer.bypassSecurityTrustUrl('data:image/svg+xml;base64,' + base64);
    }
}
