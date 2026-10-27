/*
 * Copyright 2021 InfAI (CC SES)
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
import { Observable, map } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogsService } from '../../../core/services/dialogs.service';
import { bulkDelete, confirmDelete, countLabel, everyTrue } from '../../../core/services/delete-flows';
import { DeviceClassesService } from './shared/device-classes.service';
import { DeviceClassesEditDialogComponent } from './dialog/device-classes-edit-dialog.component';
import { DeviceTypeDeviceClassModel } from '../device-types-overview/shared/device-type.model';
import { Sort, MatSort, MatSortHeader } from '@angular/material/sort';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { ListSelection } from 'src/app/core/classes/list-selection';
import { PagedListState } from 'src/app/core/classes/paged-list-state';
import { UrlStateService } from '../../../core/services/url-state.service';
import { KeepPageInRangeDirective } from '../../../core/directives/keep-page-in-range.directive';
import { MatPaginator } from '@angular/material/paginator';
import {
    UsedInDeviceTypeQuery,
    UsedInDeviceTypeResponseElement
} from '../device-types-overview/shared/used-in-device-type.model';
import {DeviceTypeService} from '../device-types-overview/shared/device-type.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';
import { dialogSize } from '../../../core/dialog-size';

@Component({
    selector: 'senergy-device-classes',
    templateUrl: './device-classes.component.html',
    styleUrls: ['./device-classes.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, SpinnerComponent, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatSortHeader, MatTooltip, MatButton, MatIconButton, MatIcon, MatMenu, MatMenuItem, MatMenuTrigger, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, KeepPageInRangeDirective]
})
export class DeviceClassesComponent implements OnInit, AfterViewInit {
    private dialog = inject(MatDialog);
    private deviceClassesService = inject(DeviceClassesService);
    private searchbarService = inject(SearchbarService);
    private destroyRef = inject(DestroyRef);
    private snackBar = inject(MatSnackBar);
    private dialogsService = inject(DialogsService);
    private deviceTypeService = inject(DeviceTypeService);
    private preferencesService = inject(PreferencesService);
    private urlState = inject(UrlStateService);

    displayedColumns: string[] = [];
    ready = false;
    dataSource = new MatTableDataSource<DeviceTypeDeviceClassModel>();
    listSelection = new ListSelection<DeviceTypeDeviceClassModel>(() => this.dataSource.connect().value);
    selection = this.listSelection.model;
    // 0 until the first answer, so the paginator keeps a page from the URL until the real length is known
    totalCount = 0;
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    searchText = '';
    list = new PagedListState(this.preferencesService, () => this.getDeviceClasses(), { sortBy: 'name', sortDirection: 'asc', urlState: this.urlState });
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasCreateAuthorization = false;
    userHasUsedInAuthorization = false;
    usedIn: Map<string,UsedInDeviceTypeResponseElement> = new Map<string, UsedInDeviceTypeResponseElement>();

    ngOnInit() {
        this.initSearch();
        this.checkAuthorization();
    }

    ngAfterViewInit(): void {
        this.list.connect(this.paginator, this.destroyRef);
    }

    checkAuthorization() {
        this.userHasUsedInAuthorization = this.deviceTypeService.userHasUsedInAuthorization();
        this.userHasUpdateAuthorization = this.deviceClassesService.userHasUpdateAuthorization();
        this.userHasDeleteAuthorization = this.deviceClassesService.userHasDeleteAuthorization();
        this.userHasCreateAuthorization = this.deviceClassesService.userHasCreateAuthorization();

        // The selection column only exists for the bulk delete.
        this.displayedColumns = [
            ...(this.userHasDeleteAuthorization ? ['select'] : []),
            'name',
            ...(this.userHasUsedInAuthorization ? ['useCount'] : []),
            'actions',
        ];
    }

    /** Row click: the edit dialog, or the read-only view of the same dialog without update permission. */
    openDeviceClass(deviceClass: DeviceTypeDeviceClassModel): void {
        if (this.userHasUpdateAuthorization) {
            this.editDeviceClass(deviceClass);
        } else {
            this.showDeviceClass(deviceClass);
        }
    }

    get filtered(): boolean {
        return this.searchText !== '';
    }

    private initSearch() {
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    editDeviceClass(inputDeviceClass: DeviceTypeDeviceClassModel): void {
        const dialogConfig = new MatDialogConfig();
        Object.assign(dialogConfig, dialogSize('m'));
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            deviceClass: JSON.parse(JSON.stringify(inputDeviceClass)), // create copy of object
        };

        const editDialogRef = this.dialog.open(DeviceClassesEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((newDeviceClass: DeviceTypeDeviceClassModel) => {
            if (newDeviceClass !== undefined) {
                this.deviceClassesService
                    .updateDeviceClasses(newDeviceClass)
                    .subscribe((deviceClass: DeviceTypeDeviceClassModel | null) => {
                        this.reloadAndShowSnackbar(deviceClass, 'update');
                    });
            }
        });
    }

    showDeviceClass(inputDeviceClass: DeviceTypeDeviceClassModel): void {
        const dialogConfig = new MatDialogConfig();
        Object.assign(dialogConfig, dialogSize('m'));
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            deviceClass: JSON.parse(JSON.stringify(inputDeviceClass)), // create copy of object
            disabled: true,
        };

        this.dialog.open(DeviceClassesEditDialogComponent, dialogConfig);
    }

    deleteDeviceClass(deviceClass: DeviceTypeDeviceClassModel): void {
        confirmDelete(this.dialogsService, 'device class ' + deviceClass.name).subscribe(() => {
            this.ready = false;
            this.deviceClassesService.deleteDeviceClasses(deviceClass.id).subscribe((resp: boolean) => {
                if (resp === true) {
                    snackSuccess(this.snackBar, 'Device class deleted successfully.');
                } else {
                    snackError(this.snackBar, 'Error while deleting the device class!');
                }
                this.reload();
            });
        });
    }

    newDeviceClass(): void {
        const dialogConfig = new MatDialogConfig();
        Object.assign(dialogConfig, dialogSize('m'));
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            deviceClass: {
                id: '',
                image: '',
                name: '',
            } as DeviceTypeDeviceClassModel,
        };

        const editDialogRef = this.dialog.open(DeviceClassesEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((newDeviceClass: DeviceTypeDeviceClassModel) => {
            if (newDeviceClass !== undefined) {
                this.deviceClassesService.createDeviceClass(newDeviceClass).subscribe((deviceClass: DeviceTypeDeviceClassModel | null) => {
                    this.reloadAndShowSnackbar(deviceClass, 'sav');
                });
            }
        });
    }

    private getDeviceClasses(): Observable<DeviceTypeDeviceClassModel[]> {
        return this.deviceClassesService
            .getDeviceClasses(this.searchText, this.list.pageSize, this.list.offset, this.list.sortBy, this.list.sortDirection)
            .pipe(
                map((deviceClasses) => {
                    this.totalCount = deviceClasses.total;
                    this.dataSource = new MatTableDataSource(deviceClasses.result);
                    this.updateDeviceClassInDeviceTypes(deviceClasses.result);
                    return deviceClasses.result;
                })
            );
    }

    reload() {
        this.ready = false;
        this.selectionClear();

        this.list.reload(() => {
            this.ready = true;
        });
    }

    matSortChange($event: Sort) {
        this.list.sortChanged($event);
        this.reload();
    }

    private reloadAndShowSnackbar(deviceClass: DeviceTypeDeviceClassModel | null, text: string) {
        if (deviceClass === null) {
            snackError(this.snackBar, 'Error while ' + text + 'ing the device class!');
        } else {
            snackSuccess(this.snackBar, 'Device class ' + text + 'ed successfully.');
        }
        this.reload();
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

    deleteMultipleItems() {
        bulkDelete(this.dialogsService, this.snackBar, {
            text: countLabel(this.selection.selected.length, 'device class', 'device classes'),
            before: () => {
                this.ready = false;
            },
            jobs: () => this.selection.selected.map((deviceClass: DeviceTypeDeviceClassModel) => this.deviceClassesService.deleteDeviceClasses(deviceClass.id)),
            isSuccess: everyTrue,
            successMessage: 'Device classes deleted successfully.',
            errorMessage: 'Error while deleting device classes!',
            after: () => this.reload(),
        });
    }

    private updateDeviceClassInDeviceTypes(list: DeviceTypeDeviceClassModel[]) {
        if (!this.userHasUsedInAuthorization) {
            return;
        }
        const query: UsedInDeviceTypeQuery = {
            resource: 'device-classes',
            ids: list.map(f => f.id)
        };
        this.deviceTypeService.getUsedInDeviceType(query).subscribe(result => {
            result?.forEach((value, key) => {
                this.usedIn.set(key, value);
            });
        });
    }

    public showUsedInDialog(usedIn: UsedInDeviceTypeResponseElement | undefined) {
        if (usedIn) {
            this.deviceTypeService.openUsedInDeviceTypeDialog(usedIn);
        }
    }
}
