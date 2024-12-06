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
import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ImportTypeModel, ImportTypeModelWithCostEstimation } from './shared/import-types.model';
import { ImportTypesService } from './shared/import-types.service';
import { Sort } from '@angular/material/sort';
import { Router } from '@angular/router';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ImportInstancesModel } from '../import-instances/shared/import-instances.model';
import { ImportDeployEditDialogComponent } from '../import-deploy-edit-dialog/import-deploy-edit-dialog.component';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogsService } from '../../../core/services/dialogs.service';
import { forkJoin, Observable, map, Subscription, of, mergeMap, concatMap } from 'rxjs';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { CostService } from '../../cost/shared/cost.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsV2RightsAndIdModel } from '../../permissions/shared/permissions-resource.model';

@Component({
    selector: 'senergy-import-types',
    templateUrl: './import-types.component.html',
    styleUrls: ['./import-types.component.css'],
})
export class ImportTypesComponent implements OnInit, AfterViewInit {
    displayedColumns = ['select', 'name', 'description', 'image', 'details', 'start', 'share'];
    pageSize = 20;
    dataSource = new MatTableDataSource<ImportTypeModelWithCostEstimation>();
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    selection = new SelectionModel<ImportTypeModel>(true, []);
    dataReady = false;
    sort = 'name.asc';
    searchText = '';
    searchSub: Subscription = new Subscription();
    totalCount = 200;
    offset = 0;
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasCreateAuthorization = false;
    permissionsPerType: PermissionsV2RightsAndIdModel[] = [];

    constructor(
        private importTypesService: ImportTypesService,
        private router: Router,
        private dialog: MatDialog,
        private permissionsDialogService: PermissionsDialogService,
        private snackBar: MatSnackBar,
        private deleteDialog: DialogsService,
        private searchbarService: SearchbarService,
        private costService: CostService,
        private permissionsService: PermissionsService,
    ) { }

    ngOnInit(): void {
        this.initSearch();
        this.checkAuthorization();
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe(() => {
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.load().subscribe();
        });
    }

    checkAuthorization() {
        this.userHasUpdateAuthorization = this.importTypesService.userHasUpdateAuthorization();
        if (this.userHasUpdateAuthorization) {
            this.displayedColumns.push('edit');
        }

        this.userHasDeleteAuthorization = this.importTypesService.userHasDeleteAuthorization();
        if (this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }

        this.userHasCreateAuthorization = this.importTypesService.userHasCreateAuthorization();

        if (this.costService.userMayGetImportCostEstimations()) {
            this.displayedColumns.splice(4, 0, 'cost');
        }
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    details(m: ImportTypeModel) {
        this.router.navigateByUrl('/imports/types/details/' + m.id);
    }

    start(m: ImportTypeModel) {
        const config: MatDialogConfig = {
            data: {
                name: m.name,
                import_type_id: m.id,
            } as ImportInstancesModel,
            minHeight: '400px',
            minWidth: '600px',
        };
        this.dialog
            .open(ImportDeployEditDialogComponent, config)
            .afterClosed()
            .subscribe((val) => {
                if (val !== undefined) {
                    this.router.navigateByUrl('imports/instances');
                }
            });
    }

    share(m: ImportTypeModel) {
        this.permissionsDialogService.openPermissionV2Dialog('import-types', m.id, m.name);
    }

    edit(m: ImportTypeModel) {
        this.router.navigateByUrl('/imports/types/edit/' + m.id);
    }

    delete(m: ImportTypeModel) {
        this.deleteDialog
            .openDeleteDialog('import type')
            .afterClosed()
            .subscribe((del) => {
                if (del === true) {
                    this.dataReady = false;
                    this.importTypesService.deleteImportInstance(m.id).subscribe(
                        () => {
                            this.snackBar.open('Import type deleted', 'OK', { duration: 3000 });
                            this.reload();
                        },
                        (err) => {
                            console.error(err);
                            this.snackBar.open('Error deleting import type', 'close', { panelClass: 'snack-bar-error' });
                        },
                    );
                }
            });
    }

    matSortChange($event: Sort) {
        this.sort = $event.active + '.' + $event.direction;
        this.reload();
    }

    load(): Observable<ImportTypeModelWithCostEstimation[]> {
        this.dataReady = false;
        return this.importTypesService.listImportTypes(this.searchText, this.pageSize, this.offset, this.sort).pipe(
            mergeMap((types) => {
                this.totalCount = types.total;
                if (this.costService.userMayGetImportCostEstimations()) {
                    return this.costService.getImportCostEstimations(types.result.map(t => t.id)).pipe(map(costs => {
                        costs.forEach((cost, i) => {
                            (types.result[i] as ImportTypeModelWithCostEstimation).costEstimation = cost;
                        });
                        this.dataSource.data = types.result;
                        return types.result;
                    }));
                } else {
                    this.dataSource.data = types.result;
                    return of(types.result);
                }
            }),
            concatMap(a => this.permissionsService.getComputedResourcePermissionsV2('import-types', this.dataSource.data.map(t => t.id)).pipe(map(perm => {
                this.permissionsPerType = perm;
                return a;
            }))),
        );
    }

    reload() {
        this.offset = 0;
        this.dataReady = false;
        this.selectionClear();

        this.load().subscribe(_ => {
            this.dataReady = true;
        });
    }

    add() {
        this.router.navigateByUrl('/imports/types/new');
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
        const text = this.selection.selected.length + (this.selection.selected.length > 1 ? ' import types' : ' import type');

        this.deleteDialog
            .openDeleteDialog(text)
            .afterClosed()
            .subscribe((deletePipelines: boolean) => {
                if (deletePipelines) {
                    this.dataReady = false;
                    this.selection.selected.forEach((importType: ImportTypeModel) => {
                        deletionJobs.push(this.importTypesService.deleteImportInstance(importType.id));
                    });
                }

                forkJoin(deletionJobs).subscribe((deletionJobResults) => {
                    const ok = deletionJobResults.findIndex((r: any) => r === null || r.status === 500) === -1;
                    if (ok) {
                        this.snackBar.open(text + ' deleted successfully.', undefined, { duration: 2000 });
                    } else {
                        this.snackBar.open('Error while deleting ' + text + '!', 'close', { panelClass: 'snack-bar-error' });
                    }
                    this.reload();
                });
            });
    }

    hasWPermission(m: ImportTypeModel): boolean {
        return this.permissionsPerType.find(t => t.id === m.id)?.write || false;
    }

    hasAPermission(m: ImportTypeModel): boolean {
        return this.permissionsPerType.find(t => t.id === m.id)?.administrate || false;
    }

    hasXPermission(m: ImportTypeModel): boolean {
        return this.permissionsPerType.find(t => t.id === m.id)?.execute || false;
    }
}
