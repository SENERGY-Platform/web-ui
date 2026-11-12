/*
 * Copyright 2026 InfAI (CC SES)
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
import { Observable, map, concatMap } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DialogsService } from '../../../core/services/dialogs.service';
import { bulkDelete, confirmDelete, countLabel, everyTrue } from '../../../core/services/delete-flows';
import { ThingsService } from './shared/things.service';
import { THING_TOPIC, ThingModel } from './shared/things.model';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { Sort, MatSort, MatSortHeader } from '@angular/material/sort';
import { ListSelection } from 'src/app/core/classes/list-selection';
import { PagedListState } from 'src/app/core/classes/paged-list-state';
import { UrlStateService } from '../../../core/services/url-state.service';
import { KeepPageInRangeDirective } from '../../../core/directives/keep-page-in-range.directive';
import { MatPaginator } from '@angular/material/paginator';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsV2RightsAndIdModel } from '../../permissions/shared/permissions-resource.model';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { MatCheckbox } from '@angular/material/checkbox';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';

@Component({
    selector: 'senergy-things',
    templateUrl: './things.component.html',
    styleUrls: ['./things.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, MatButton, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger, MatIcon, SpinnerComponent, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatSortHeader, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, KeepPageInRangeDirective],
})
export class ThingsComponent implements OnInit, AfterViewInit {
    private thingsService = inject(ThingsService);
    private snackBar = inject(MatSnackBar);
    private router = inject(Router);
    private dialogsService = inject(DialogsService);
    private searchbarService = inject(SearchbarService);
    private destroyRef = inject(DestroyRef);
    private permissionsDialogService = inject(PermissionsDialogService);
    private permissionsService = inject(PermissionsService);
    private preferencesService = inject(PreferencesService);
    private urlState = inject(UrlStateService);

    displayedColumns: string[] = [];
    listSelection = new ListSelection<ThingModel>(
        () => this.dataSource.connect().value,
        { selectable: (thing) => this.userHasAdministratePermission(thing.id) },
    );
    selection = this.listSelection.model;
    // 0 until the first answer, so the paginator keeps a page from the URL until the real length is known
    totalCount = 0;
    dataSource = new MatTableDataSource<ThingModel>();
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    ready = false;
    searchText = '';
    list = new PagedListState(this.preferencesService, () => this.getThings(), { sortBy: 'name', sortDirection: 'asc', urlState: this.urlState });
    userHasCreateAuthorization = false;
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasShareAuthorization = false;
    permissionsPerInstance: PermissionsV2RightsAndIdModel[] = [];

    ngOnInit() {
        this.initSearch();
        this.checkAuthorization();
    }

    ngAfterViewInit(): void {
        this.list.connect(this.paginator, this.destroyRef);
    }

    checkAuthorization() {
        this.userHasCreateAuthorization = this.thingsService.userHasCreateAuthorization();
        this.userHasUpdateAuthorization = this.thingsService.userHasUpdateAuthorization();
        this.userHasDeleteAuthorization = this.thingsService.userHasDeleteAuthorization();
        this.userHasShareAuthorization = this.thingsService.userHasShareAuthorization();

        // The selection column only exists for the bulk delete.
        this.displayedColumns = [
            ...(this.userHasDeleteAuthorization ? ['select'] : []),
            'name',
            'devices',
            'actions',
        ];
    }

    get filtered(): boolean {
        return this.searchText !== '';
    }

    canEdit(thing: ThingModel): boolean {
        return this.userHasUpdateAuthorization && this.userHasEditPermission(thing.id);
    }

    canShare(thing: ThingModel): boolean {
        return this.userHasShareAuthorization && this.userHasAdministratePermission(thing.id);
    }

    canDelete(thing: ThingModel): boolean {
        return this.userHasDeleteAuthorization && this.userHasAdministratePermission(thing.id);
    }

    /** Device links that are still open; ended links do not count. */
    openDeviceLinkCount(thing: ThingModel): number {
        return (thing.device_links || []).filter((link) => link.until === null).length;
    }

    matSortChange($event: Sort) {
        this.list.sortChanged($event);
        this.reload();
    }

    private initSearch() {
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    isAllSelected() {
        return this.listSelection.isAllSelected();
    }

    masterToggle() {
        this.listSelection.masterToggle();
    }

    selectionClear(): void {
        this.selection.clear();
    }

    deleteThing(thing: ThingModel): boolean {
        confirmDelete(this.dialogsService, 'thing ' + thing.name).subscribe(() => {
            this.thingsService.deleteThing(thing.id).subscribe((resp: boolean) => {
                if (resp === true) {
                    snackSuccess(this.snackBar, 'Thing deleted successfully.');
                } else {
                    snackError(this.snackBar, 'Error while deleting the thing!');
                }
                this.reload();
            });
        });
        return false;
    }

    newThing(): boolean {
        this.router.navigate(['devices/things/edit']);
        return false;
    }

    editThing(inputThing: ThingModel): boolean {
        this.router.navigate(['devices/things/edit/' + inputThing.id]);
        return false;
    }

    private getThings(): Observable<ThingModel[]> {
        return this.thingsService
            .getThings({
                limit: this.list.pageSize,
                offset: this.list.offset,
                search: this.searchText,
                sortBy: this.list.sortBy,
                sortDirection: this.list.sortDirection,
            })
            .pipe(
                concatMap(a => this.permissionsService.getComputedResourcePermissionsV2(THING_TOPIC, a.result.map(i => i.id)).pipe(
                    map(permissions => this.permissionsPerInstance = permissions),
                    map(_ => a)
                )),
                map(res => {
                    this.dataSource.data = res.result;
                    this.totalCount = res.total;
                    return res.result;
                }),
            );
    }

    public reload() {
        this.ready = false;
        this.selectionClear();

        this.list.reload(() => {
            this.ready = true;
        });
    }

    deleteMultipleItems() {
        const count = this.selection.selected.length;
        bulkDelete(this.dialogsService, this.snackBar, {
            text: countLabel(count, 'thing', 'things'),
            before: () => {
                this.ready = false;
            },
            jobs: () => this.selection.selected.map((thing: ThingModel) => this.thingsService.deleteThing(thing.id)),
            isSuccess: everyTrue,
            successMessage: count > 1 ? 'Things deleted successfully.' : 'Thing deleted successfully.',
            errorMessage: 'Error while deleting the thing!',
            after: () => this.reload(),
        });
    }

    shareThing(thing: ThingModel) {
        this.permissionsDialogService.openPermissionV2Dialog(THING_TOPIC, thing.id, thing.name);
    }

    userHasEditPermission(thingId: string) {
        return this.permissionsPerInstance.find(e => e.id === thingId)?.write || false;
    }

    userHasAdministratePermission(thingId: string) {
        return this.permissionsPerInstance.find(e => e.id === thingId)?.administrate || false;
    }
}
