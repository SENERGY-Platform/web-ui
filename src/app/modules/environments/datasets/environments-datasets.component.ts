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

import { Component, DestroyRef, OnInit, ViewChild, ChangeDetectionStrategy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EnvironmentsService } from '../shared/environments.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { confirmDelete } from '../../../core/services/delete-flows';
import { PreferencesService } from '../../../core/services/preferences.service';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { LIST_DATE_FORMAT } from '../../../core/classes/list-date-format';
import { MatPaginator } from '@angular/material/paginator';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { DatasetMeta } from '../shared/environments.model';
import { formatBytes } from '../shared/environments-format';
import { EnvironmentsDatasetUploadDialogComponent } from './dialogs/environments-dataset-upload-dialog.component';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { DatePipe } from '@angular/common';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';

@Component({
    selector: 'senergy-environments-datasets',
    templateUrl: './environments-datasets.component.html',
    styleUrls: ['./environments-datasets.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, MatButton, MatIcon, SpinnerComponent, MatMenu, MatMenuItem, MatMenuTrigger, MatPaginator, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatIconButton, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, DatePipe]
})
export class EnvironmentsDatasetsComponent implements OnInit {
    private environmentsService = inject(EnvironmentsService);
    private dialog = inject(MatDialog);
    private dialogsService = inject(DialogsService);
    private snackBar = inject(MatSnackBar);
    private searchbarService = inject(SearchbarService);
    private destroyRef = inject(DestroyRef);
    preferencesService = inject(PreferencesService);

    /** The dataset endpoint lists everything, so search and paging run on the client. */
    @ViewChild('paginator', { static: false })
    set paginator(value: MatPaginator | undefined) {
        if (value) {
            this.dataSource.paginator = value;
        }
    }

    displayedColumns = ['name', 'timezone', 'columns', 'size', 'created'];
    dataSource = new MatTableDataSource<DatasetMeta>();
    dataReady = false;
    searchText = '';
    readonly dateFormat = LIST_DATE_FORMAT;
    formatBytes = formatBytes;

    userHasReadAuthorization = this.environmentsService.userHasDatasetReadAuthorization();
    userHasCreateAuthorization = this.environmentsService.userHasDatasetCreateAuthorization();
    userHasDeleteAuthorization = this.environmentsService.userHasDatasetDeleteAuthorization();

    ngOnInit(): void {
        if (this.userHasDeleteAuthorization) {
            this.displayedColumns.push('actions');
        }
        this.dataSource.filterPredicate = (ds, filter) => (ds.name || '').toLowerCase().includes(filter.trim().toLowerCase());
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((text) => {
            this.searchText = text;
            this.dataSource.filter = text;
            this.dataSource.paginator?.firstPage();
        });
        this.reload();
    }

    reload(): void {
        this.dataReady = false;
        this.environmentsService.listDatasets().subscribe((list) => {
            this.dataSource.data = list;
            this.dataReady = true;
        });
    }

    upload(): void {
        this.dialog
            .open(EnvironmentsDatasetUploadDialogComponent)
            .afterClosed()
            .subscribe((created: DatasetMeta | undefined) => {
                if (created) {
                    this.reload();
                }
            });
    }

    delete(ds: DatasetMeta): void {
        confirmDelete(this.dialogsService, 'dataset ' + (ds.name || ds.id), {
            note: 'Channels still referencing this dataset stop playing on their next reload.',
        }).subscribe(() => {
            if (ds.id) {
                this.environmentsService.deleteDataset(ds.id).subscribe((ok) => {
                    if (ok) {
                        snackSuccess(this.snackBar, 'Dataset deleted successfully.');
                    } else {
                        snackError(this.snackBar, 'Error while deleting the dataset!');
                    }
                    this.reload();
                });
            }
        });
    }
}
