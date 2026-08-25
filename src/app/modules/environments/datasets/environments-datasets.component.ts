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

import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EnvironmentsService } from '../shared/environments.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { DatasetMeta } from '../shared/environments.model';
import { formatBytes } from '../shared/environments-format';
import { EnvironmentsDatasetUploadDialogComponent } from './dialogs/environments-dataset-upload-dialog.component';

@Component({
    selector: 'senergy-environments-datasets',
    templateUrl: './environments-datasets.component.html',
    styleUrls: ['./environments-datasets.component.css'],
})
export class EnvironmentsDatasetsComponent implements OnInit {
    displayedColumns = ['name', 'timezone', 'columns', 'size', 'created'];
    dataSource = new MatTableDataSource<DatasetMeta>();
    dataReady = false;
    formatBytes = formatBytes;

    userHasReadAuthorization = this.environmentsService.userHasDatasetReadAuthorization();
    userHasCreateAuthorization = this.environmentsService.userHasDatasetCreateAuthorization();
    userHasDeleteAuthorization = this.environmentsService.userHasDatasetDeleteAuthorization();

    constructor(
        private environmentsService: EnvironmentsService,
        private dialog: MatDialog,
        private dialogsService: DialogsService,
        private snackBar: MatSnackBar,
    ) {}

    ngOnInit(): void {
        if (this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }
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
        this.dialogsService
            .openConfirmDialog(
                'Delete dataset',
                'Delete "' + (ds.name || ds.id) + '"? Channels still referencing this dataset stop playing on their next reload.',
            )
            .afterClosed()
            .subscribe((confirmed: boolean) => {
                if (confirmed && ds.id) {
                    this.environmentsService.deleteDataset(ds.id).subscribe((ok) => {
                        if (ok) {
                            this.snackBar.open('Dataset deleted successfully.', undefined, { duration: 2000 });
                        } else {
                            this.snackBar.open('Error while deleting the dataset!', 'close', { panelClass: 'snack-bar-error' });
                        }
                        this.reload();
                    });
                }
            });
    }
}
