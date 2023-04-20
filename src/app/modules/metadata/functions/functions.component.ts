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

import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogsService } from '../../../core/services/dialogs.service';
import { FunctionsPermSearchModel } from './shared/functions-perm-search.model';
import { FunctionsService } from './shared/functions.service';
import { DeviceTypeFunctionModel } from '../device-types-overview/shared/device-type.model';
import { FunctionsEditDialogComponent } from './dialog/functions-edit-dialog.component';
import { FunctionsCreateDialogComponent } from './dialog/functions-create-dialog.component';
import {AuthorizationService} from '../../../core/services/authorization.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { FormControl } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';

@Component({
    selector: 'senergy-functions',
    templateUrl: './functions.component.html',
    styleUrls: ['./functions.component.css'],
})
export class FunctionsComponent implements OnInit, OnDestroy {
    readonly limitInit = 54;

    functions: FunctionsPermSearchModel[] = [];
    dataSource = new MatTableDataSource(this.functions)
    @ViewChild(MatSort) sort!: MatSort

    searchControl = new FormControl('');
    ready = false;
    userIsAdmin = false;

    private limit = this.limitInit;
    private offset = 0;
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    constructor(
        private dialog: MatDialog,
        private functionsService: FunctionsService,
        private snackBar: MatSnackBar,
        private dialogsService: DialogsService,
        private authService: AuthorizationService,
    ) {}

    ngOnInit() {
        this.userIsAdmin = this.authService.userIsAdmin();
        this.getFunctions();
        this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe(() => this.reload());
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.ready = false;
            this.offset = this.offset + this.limit;
            this.getFunctions();
        }
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
                    this.functionsService.deleteFunction(func.id).subscribe((resp: boolean) => {
                        if (resp === true) {
                            this.functions.splice(this.functions.indexOf(func), 1);
                            this.snackBar.open('Function deleted successfully.', undefined, { duration: 2000 });
                        } else {
                            this.snackBar.open('Error while deleting the function!', "close", { panelClass: "snack-bar-error" });
                        }
                        this.reload()
                    });
                }
            });
    }

    private getFunctions() {
        if (this.functions && this.functions.length) {
            this.functionsService
                .getFunctionsAfter(
                    this.searchControl.value,
                    this.limit,
                    "name",
                    "asc",
                    this.functions[this.functions.length - 1],
                )
                .subscribe((functions: FunctionsPermSearchModel[]) => {
                    if (functions.length !== this.limit) {
                        this.allDataLoaded = true;
                    }
                    this.functions = this.functions.concat(functions);
                    this.dataSource = new MatTableDataSource(this.functions)
                    this.dataSource.sort = this.sort
                    this.ready = true;
                });
        } else {
            this.functionsService
                .getFunctions(this.searchControl.value, this.limit, this.offset, "name", "asc")
                .subscribe((functions: FunctionsPermSearchModel[]) => {
                    if (functions.length !== this.limit) {
                        this.allDataLoaded = true;
                    }
                    this.functions = this.functions.concat(functions);
                    this.dataSource = new MatTableDataSource(this.functions)
                    this.dataSource.sort = this.sort
                    this.ready = true;
                });
        }
    }

    reload() {
        this.functions = [];
        this.limit = this.limitInit;
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
        this.getFunctions();
    }

    private reloadAndShowSnackbar(func: DeviceTypeFunctionModel | null, text: string) {
        if (func === null) {
            this.snackBar.open('Error while ' + text + 'ing the function!', "close", { panelClass: "snack-bar-error" });
            this.reload()
        } else {
            this.snackBar.open('Function ' + text + 'ed successfully.', undefined, { duration: 2000 });
            this.reload()
        }
    }

    resetSearch() {
        this.searchControl.setValue('');
    }
}
