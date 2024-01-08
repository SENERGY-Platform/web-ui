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
import { Component, OnInit, ViewChild, } from '@angular/core';
import { ImportInstancesModel } from './shared/import-instances.model';
import { Sort } from '@angular/material/sort';
import { ImportInstancesService } from './shared/import-instances.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ImportDeployEditDialogComponent } from '../import-deploy-edit-dialog/import-deploy-edit-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogsService } from '../../../core/services/dialogs.service';
import { ImportInstanceExportDialogComponent } from './import-instance-export-dialog/import-instance-export-dialog.component';
import { ExportModel } from '../../exports/shared/export.model';
import { Router } from '@angular/router';
import { forkJoin, Observable, Subscription, map } from 'rxjs';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { UtilService } from 'src/app/core/services/util.service';
import { MatPaginator } from '@angular/material/paginator';

@Component({
    selector: 'senergy-import-instances',
    templateUrl: './import-instances.component.html',
    styleUrls: ['./import-instances.component.css'],
})
export class ImportInstancesComponent implements OnInit {
    displayedColumns = ['select', 'name', 'image', 'created_at', 'updated_at', 'export'];
    dataSource = new MatTableDataSource<ImportInstancesModel>();
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;

    constructor(
        private importInstancesService: ImportInstancesService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar,
        private deleteDialog: DialogsService,
        private router: Router,
        private searchbarService: SearchbarService,
        public utilsService: UtilService
    ) {}

    searchText = '';
    pageSize = 20;
    totalCount = 200;
    selection = new SelectionModel<ImportInstancesModel>(true, []);
    searchSub: Subscription = new Subscription();
    dataReady = false;
    sort = 'updated_at.desc';
    offset = 0;
    excludeGenerated = localStorage.getItem('import.instances.excludeGenerated') === 'true';
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasCreateAuthorization = false;

    ngOnInit(): void {
        this.initSearch();
        this.getTotalNumberOfTypes();
    }

    getTotalNumberOfTypes(): Observable<number> {
        return this.importInstancesService.getTotalCountOfInstances(this.searchText, this.excludeGenerated).pipe(
            map((totalCount: number) => {
                this.totalCount = totalCount;
                return totalCount;
            })
        );
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
        this.checkAuthorization();
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe(()=>{
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.load().subscribe();
        });
    }

    checkAuthorization() {
        this.userHasUpdateAuthorization = this.importInstancesService.userHasUpdateAuthorization();
        if(this.userHasUpdateAuthorization) {
            this.displayedColumns.push('edit');
        }

        this.userHasDeleteAuthorization = this.importInstancesService.userHasDeleteAuthorization();
        if(this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }

        this.userHasCreateAuthorization = this.importInstancesService.userHasCreateAuthorization();
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
                    this.dataReady = false;
                    this.importInstancesService.deleteImportInstance(m.id).subscribe(
                        () => {
                            this.snackBar.open('Import deleted', 'OK', { duration: 3000 });
                        },
                        (err) => {
                            console.error(err);
                            this.snackBar.open('Error deleting', 'close', { panelClass: 'snack-bar-error' });
                        },
                    );
                    this.reload();
                }
            });
    }

    matSortChange($event: Sort) {
        this.sort = $event.active + '.' + $event.direction;
        this.reload();
    }

    load(): Observable<ImportInstancesModel[]> {
        this.dataReady = false;
        return this.importInstancesService
            .listImportInstances(this.searchText, this.pageSize, this.offset, this.sort, this.excludeGenerated)
            .pipe(
                map((inst: ImportInstancesModel[]) => {
                    this.dataSource.data = inst;
                    return inst;
                })
            );
    }

    reload() {
        this.offset = 0;
        this.pageSize = 20;
        this.selectionClear();
        this.dataReady = false;

        forkJoin([this.load(), this.getTotalNumberOfTypes()]).subscribe(_ => {
            this.dataReady = true;
        });
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

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const currentViewed = this.dataSource.connect().value.length;
        return numSelected === currentViewed;
    }

    masterToggle() {
        if (this.isAllSelected()) {
            this.selectionClear();
        } else {
            this.dataSource.connect().value.forEach((row) => this.selection.select(row));
        }
    }

    selectionClear(): void {
        this.selection.clear();
    }

    deleteMultipleItems() {
        const deletionJobs: Observable<any>[] = [];
        const text = this.selection.selected.length + (this.selection.selected.length > 1 ? ' import instances' : ' import instance');

        this.deleteDialog
            .openDeleteDialog(text)
            .afterClosed()
            .subscribe((deletePipelines: boolean) => {
                if (deletePipelines) {
                    this.dataReady = false;
                    this.selection.selected.forEach((importInstance: ImportInstancesModel) => {
                        deletionJobs.push(this.importInstancesService.deleteImportInstance(importInstance.id));
                    });
                }

                forkJoin(deletionJobs).subscribe((deletionJobResults) => {
                    const ok = deletionJobResults.findIndex((r: any) => r === null || r.status === 500) === -1;
                    if (ok) {
                        this.snackBar.open(text + ' deleted successfully.', undefined, {duration: 2000});
                    } else {
                        this.snackBar.open('Error while deleting ' + text + '!', 'close', {panelClass: 'snack-bar-error'});
                    }
                    this.reload();
                });
            });
    }
}
