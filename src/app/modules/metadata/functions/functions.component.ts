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

import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {forkJoin, Observable, Subscription, map} from 'rxjs';
import {MatDialog} from '@angular/material/dialog';
import {MatDialogConfig} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {DialogsService} from '../../../core/services/dialogs.service';
import {FunctionsPermSearchModel} from './shared/functions-perm-search.model';
import {FunctionsService} from './shared/functions.service';
import {DeviceTypeFunctionModel} from '../device-types-overview/shared/device-type.model';
import {FunctionsEditDialogComponent} from './dialog/functions-edit-dialog.component';
import {FunctionsCreateDialogComponent} from './dialog/functions-create-dialog.component';
import {AuthorizationService} from '../../../core/services/authorization.service';
import {MatTableDataSource} from '@angular/material/table';
import {MatSort, Sort, SortDirection} from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import {DeviceTypeService} from "../device-types-overview/shared/device-type.service";
import {
    UsedInDeviceTypeQuery,
    UsedInDeviceTypeResponseElement
} from "../device-types-overview/shared/used-in-device-type.model";

@Component({
    selector: 'senergy-functions',
    templateUrl: './functions.component.html',
    styleUrls: ['./functions.component.css'],
})
export class FunctionsComponent implements OnInit, OnDestroy {
    displayedColumns = ['select', 'name', "useCount", 'info'];
    pageSize = 20;
    dataSource = new MatTableDataSource<FunctionsPermSearchModel>();
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    selection = new SelectionModel<FunctionsPermSearchModel>(true, []);
    totalCount = 200;
    offset = 0;
    ready = false;
    userIsAdmin = false;
    private searchSub: Subscription = new Subscription();
    searchText = '';
    sortBy = 'name';
    sortDirection: SortDirection = 'asc';
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasCreateAuthorization = false;
    usedIn: Map<string,UsedInDeviceTypeResponseElement> = new Map<string, UsedInDeviceTypeResponseElement>()

    constructor(
        private dialog: MatDialog,
        private searchbarService: SearchbarService,
        private functionsService: FunctionsService,
        private snackBar: MatSnackBar,
        private dialogsService: DialogsService,
        private authService: AuthorizationService,
        private deviceTypeService: DeviceTypeService
    ) {}

    ngOnInit() {
        this.userIsAdmin = this.authService.userIsAdmin();
        this.initSearch();
        this.checkAuthorization();
    }

    getTotalCounts() {
        return this.functionsService.getTotalCountOfFunctions(this.searchText).pipe(
            map((totalCount: number) => {
                this.totalCount = totalCount;
                return totalCount;
            })
        );
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe(()=> {
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.getFunctions().subscribe();
        });
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    checkAuthorization() {
        this.userHasUpdateAuthorization = this.functionsService.userHasUpdateAuthorization();
        if(this.userHasUpdateAuthorization) {
            this.displayedColumns.push('edit');
        }
        this.userHasDeleteAuthorization = this.functionsService.userHasDeleteAuthorization();
        if(this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }
        this.userHasCreateAuthorization = this.functionsService.userHasCreateAuthorization();
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    editFunction(inputFunction: FunctionsPermSearchModel): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            function: JSON.parse(JSON.stringify(inputFunction)), // create copy of object
        };

        const editDialogRef = this.dialog.open(FunctionsEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((newFunction: DeviceTypeFunctionModel) => {
            if (newFunction !== undefined) {
                this.functionsService.updateFunction(newFunction).subscribe((func: DeviceTypeFunctionModel | null) => {
                    this.reloadAndShowSnackbar(func, 'updat');
                });
            }
        });
    }

    showFunction(inputFunction: FunctionsPermSearchModel): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            function: JSON.parse(JSON.stringify(inputFunction)), // create copy of object
            disabled: true,
        };

        const editDialogRef = this.dialog.open(FunctionsEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((newFunction: DeviceTypeFunctionModel) => {
            if (newFunction !== undefined) {
                this.functionsService.updateFunction(newFunction).subscribe((func: DeviceTypeFunctionModel | null) => {
                    this.reloadAndShowSnackbar(func, 'updat');
                });
            }
        });
    }

    newFunction(): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;

        const editDialogRef = this.dialog.open(FunctionsCreateDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((newFunction: DeviceTypeFunctionModel) => {
            console.log(newFunction);
            if (newFunction !== undefined) {
                this.functionsService.createFunction(newFunction).subscribe((func: DeviceTypeFunctionModel | null) => {
                    this.reloadAndShowSnackbar(func, 'sav');
                });
            }
        });
    }

    deleteFunction(func: FunctionsPermSearchModel): void {
        this.dialogsService
            .openDeleteDialog('function ' + func.name)
            .afterClosed()
            .subscribe((deleteFunction: boolean) => {
                if (deleteFunction) {
                    this.ready = false;
                    this.functionsService.deleteFunction(func.id).subscribe((resp: boolean) => {
                        if (resp === true) {
                            this.snackBar.open('Function deleted successfully.', undefined, { duration: 2000 });
                        } else {
                            this.snackBar.open('Error while deleting the function!', 'close', { panelClass: 'snack-bar-error' });
                        }
                        this.reload();
                    });
                }
            });
    }

    private getFunctions(): Observable<FunctionsPermSearchModel[]> {
        return this.functionsService
            .getFunctions(this.searchText, this.pageSize, this.offset, this.sortBy, this.sortDirection)
            .pipe(
                map((functions: FunctionsPermSearchModel[]) => {
                    this.dataSource = new MatTableDataSource(functions);
                    this.updateFunctionUsedInDeviceTypes(functions);
                    return functions;
                })
            );
    }

    reload() {
        this.ready = false;
        this.offset = 0;
        this.selectionClear();
        forkJoin([this.getFunctions(), this.getTotalCounts()]).subscribe(_ => {
            this.ready = true;
        });
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active;
        this.sortDirection = $event.direction;
        this.reload();
    }

    private reloadAndShowSnackbar(func: DeviceTypeFunctionModel | null, text: string) {
        if (func === null) {
            this.snackBar.open('Error while ' + text + 'ing the function!', 'close', { panelClass: 'snack-bar-error' });
            this.reload();
        } else {
            this.snackBar.open('Function ' + text + 'ed successfully.', undefined, { duration: 2000 });
            this.reload();
        }
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

        this.dialogsService
            .openDeleteDialog(this.selection.selected.length + (this.selection.selected.length > 1 ? ' functions' : ' function'))
            .afterClosed()
            .subscribe((deleteExports: boolean) => {
                if (deleteExports) {
                    this.ready = false;
                    this.selection.selected.forEach((func: FunctionsPermSearchModel) => {
                        deletionJobs.push(this.functionsService.deleteFunction(func.id));
                    });
                }

                forkJoin(deletionJobs).subscribe((deletionJobResults) => {
                    const ok = deletionJobResults.findIndex((r: any) => r === null || r.status === 500) === -1;
                    if (ok) {
                        this.snackBar.open('Characteristics deleted successfully.', undefined, {duration: 2000});
                    } else {
                        this.snackBar.open('Error while deleting characteristics!', 'close', {panelClass: 'snack-bar-error'});
                    }
                    this.reload();
                });
            });
    }

    private updateFunctionUsedInDeviceTypes(functions: FunctionsPermSearchModel[]) {
        let query: UsedInDeviceTypeQuery = {
            resource: "functions",
            ids: functions.map(f => f.id)
        }
        this.deviceTypeService.getUsedInDeviceType(query).subscribe(result => {
            result?.forEach((value, key) => {
                this.usedIn.set(key, value);
            })
        })
    }

    public showUsedInDialog(usedIn: UsedInDeviceTypeResponseElement | undefined) {
        if (usedIn) {
            this.deviceTypeService.openUsedInDeviceTypeDialog(usedIn);
        }
    }
}
