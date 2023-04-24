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
import { Component, OnInit, ViewChild } from '@angular/core';
import { ImportInstancesModel } from './shared/import-instances.model';
import { FormControl } from '@angular/forms';
import { ImportTypePermissionSearchModel } from '../import-types/shared/import-types.model';
import { debounceTime } from 'rxjs/operators';
import { Sort } from '@angular/material/sort';
import { ImportInstancesService } from './shared/import-instances.service';
import { MatTable } from '@angular/material/table';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ImportDeployEditDialogComponent } from '../import-deploy-edit-dialog/import-deploy-edit-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogsService } from '../../../core/services/dialogs.service';
import { ImportInstanceExportDialogComponent } from './import-instance-export-dialog/import-instance-export-dialog.component';
import { ExportModel } from '../../exports/shared/export.model';
import { Router } from '@angular/router';

@Component({
    selector: 'senergy-import-instances',
    templateUrl: './import-instances.component.html',
    styleUrls: ['./import-instances.component.css'],
})
export class ImportInstancesComponent implements OnInit {
    @ViewChild(MatTable, { static: false }) table!: MatTable<ImportTypePermissionSearchModel>;

    constructor(
        private importInstancesService: ImportInstancesService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar,
        private deleteDialog: DialogsService,
        private router: Router,
    ) {}

    instances: ImportInstancesModel[] = [];
    searchControl = new FormControl('');
    dataReady = false;
    sort = 'updated_at.desc';
    limitInit = 100;
    limit = this.limitInit;
    offset = 0;
    excludeGenerated = localStorage.getItem('import.instances.excludeGenerated') === 'true';

    ngOnInit(): void {
        this.load();
        this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe(() => this.reload());
    }

    edit(m: ImportInstancesModel) {
        const config: MatDialogConfig = {
            data: m,
            minHeight: '400px',
            minWidth: '600px',
        };
        this.dialog
            .open(ImportDeployEditDialogComponent, config)
            .afterClosed()
            .subscribe((val) => {
                if (val !== undefined) {
                    this.reload();
                }
            });
    }

    delete(m: ImportInstancesModel) {
        this.deleteDialog
            .openDeleteDialog('import')
            .afterClosed()
            .subscribe((del) => {
                if (del === true) {
                    this.importInstancesService.deleteImportInstance(m.id).subscribe(
                        () => {
                            this.snackBar.open('Import deleted', 'OK', { duration: 3000 });
                            this.reload();
                        },
                        (err) => {
                            console.error(err);
                            this.snackBar.open('Error deleting', "close", { panelClass: "snack-bar-error" });
                        },
                    );
                }
            });
    }

    matSortChange($event: Sort) {
        this.sort = $event.active + '.' + $event.direction;
        this.reload();
    }

    load() {
        this.importInstancesService
            .listImportInstances(this.searchControl.value, this.limit, this.offset, this.sort, this.excludeGenerated)
            .subscribe((inst) => {
                this.instances.push(...inst);
                if (this.table !== undefined) {
                    this.table.renderRows();
                }
                this.dataReady = true;
            });
    }

    reload() {
        this.limit = this.limitInit;
        this.offset = 0;
        this.instances = [];
        this.load();
    }

    resetSearch() {
        this.searchControl.setValue('');
    }

    onScroll() {
        this.limit += this.limitInit;
        this.offset = this.instances.length;
        this.load();
    }

    export(m: ImportInstancesModel) {
        const config: MatDialogConfig = {
            data: m,
            minHeight: '300px',
            minWidth: '400px',
        };
        this.dialog
            .open(ImportInstanceExportDialogComponent, config)
            .afterClosed()
            .subscribe((val: ExportModel | undefined) => {
                if (val !== undefined) {
                    this.router.navigateByUrl('exports/details/' + val.ID);
                }
            });
    }

    toggleExcludeGenerated() {
        this.excludeGenerated = !this.excludeGenerated;
        localStorage.setItem('import.instances.excludeGenerated', '' + this.excludeGenerated);
        this.reload();
    }
}
