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
import { OperatorModel } from './shared/operator.model';
import { OperatorRepoService } from './shared/operator-repo.service';
import { AuthorizationService } from '../../../core/services/authorization.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DialogsService } from '../../../core/services/dialogs.service';
import { Subscription, merge } from 'rxjs';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { startWith, switchMap } from 'rxjs/operators';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import {PermissionsDialogService} from '../../permissions/shared/permissions-dialog.service';
import {PermissionsV2RightsAndIdModel} from "../../permissions/shared/permissions-resource.model";
import {FlowModel} from "../flow-repo/shared/flow.model";

@Component({
    selector: 'senergy-operator-repo',
    templateUrl: './operator-repo.component.html',
    styleUrls: ['./operator-repo.component.css'],
})
export class OperatorRepoComponent implements OnInit, OnDestroy {
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    @ViewChild('sort', { static: false }) sort!: MatSort;

    selection = new SelectionModel<OperatorModel>(true, []);
    displayedColumns: string[] = ['select', 'pub', 'name', 'image', 'details', 'share'];
    totalCount = 0;

    operators = [] as OperatorModel[];
    operatorsDataSource = new MatTableDataSource<OperatorModel>();
    ready = false;

    userId: string | Error = '';
    shareUser = '';

    userHasDeleteAuthorization = false;
    userHasUpdateAuthorization = false;
    userHasCreateAuthorization = false;

    private searchText = '';
    private searchSub: Subscription = new Subscription();
    private operatorSub: Subscription = new Subscription();

    permissionsPerOperator: PermissionsV2RightsAndIdModel[] = [];

    constructor(
        private operatorRepoService: OperatorRepoService,
        protected auth: AuthorizationService,
        private searchbarService: SearchbarService,
        public snackBar: MatSnackBar,
        private dialogsService: DialogsService,
        protected permission: PermissionsService,
        public preferencesService: PreferencesService,
        private permissionsDialogService: PermissionsDialogService,
    ) { }

    ngOnInit() {
        this.userHasCreateAuthorization = this.operatorRepoService.userHasCreateAuthorization();

        this.userId = this.auth.getUserId();
        this.initSearchAndGetOperators();

        this.userHasUpdateAuthorization = this.operatorRepoService.userHasUpdateAuthorization();
        if (this.userHasUpdateAuthorization) {
            this.displayedColumns.push('edit');
        }

        this.userHasDeleteAuthorization = this.operatorRepoService.userHasDeleteAuthorization();
        if (this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
        this.operatorSub.unsubscribe();
    }

    deleteOperator(operator: OperatorModel) {
        this.dialogsService
            .openDeleteDialog('operator')
            .afterClosed()
            .subscribe((operatorDelete: boolean) => {
                if (operatorDelete) {
                    this.ready = false;
                    this.operatorRepoService.deleteOperator(operator).subscribe(() => {
                        this.snackBar.open('Operator deleted', undefined, {
                            duration: 2000,
                        });
                        this.getOperators(true);
                    });
                }
            });
    }

    getOperatorUser(id: string | undefined) {
        if (id !== undefined) {
            this.permission.getUserById(id).subscribe((item) => {
                this.shareUser = item.username;
            });
        }
    }

    private getOperators(reset: boolean) {
        if (reset) {
            this.reset();
        }
        this.operatorsDataSource.sort = this.sort;
        this.sort.sortChange.subscribe(() => {
            this.paginator.pageIndex = 0;
            this.selectionClear();
        });

        this.operatorSub = merge(this.sort.sortChange, this.paginator.page)
            .pipe(
                startWith({}),
                switchMap(() => {
                    this.ready = false;
                    return this.operatorRepoService.getOperators(
                        this.searchText,
                        this.paginator.pageSize,
                        this.paginator.pageSize * this.paginator.pageIndex,
                        this.sort.active,
                        this.sort.direction,
                    );
                }),
            )
            .subscribe((resp: { operators: OperatorModel[]; totalCount: number }) => {
                if (resp.operators.length > 0) {
                    this.operators = resp.operators;
                    this.operatorsDataSource.data = this.operators;

                    this.totalCount = resp.totalCount;
                }
                this.loadOperatorPermissions();
                this.ready = true;
            });
    }

    private reset() {
        this.operators = [];
        this.ready = false;
    }

    private initSearchAndGetOperators() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.getOperators(true);
        });
    }

    selectionClear($event: PageEvent | undefined = undefined): void {
        if ($event !== undefined) {
            this.preferencesService.pageSize = $event.pageSize;
        }
        this.selection.clear();
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const currentViewed = this.operatorsDataSource.connect().value.length;
        return numSelected <= currentViewed && numSelected !== 0;
    }

    masterToggle() {
        if (this.isAllSelected()) {
            this.selectionClear();
        } else {
            this.operatorsDataSource.connect().value.forEach((row) => {
                this.selection.select(row);
            });
        }
    }

    deleteMultipleItems(): void {
        this.dialogsService
            .openDeleteDialog(this.selection.selected.length + (this.selection.selected.length > 1 ? ' operators' : ' operator'))
            .afterClosed()
            .subscribe((deleteOperators: boolean) => {
                if (deleteOperators) {
                    this.ready = false;

                    const operatorIDs: string[] = [];

                    this.selection.selected.forEach((exp: OperatorModel) => {
                        if (exp._id !== undefined) {
                            operatorIDs.push(exp._id);
                        }
                    });

                    this.operatorRepoService.deleteOperators(operatorIDs).subscribe(() => {
                        this.getOperators(true);
                        this.selectionClear();
                    });
                }
            });
    }

    loadOperatorPermissions() {
        this.permission.getComputedResourcePermissionsV2('analytics-operators', this.operators.map(e => e._id || '')).subscribe(
            perms => (this.permissionsPerOperator = perms)
        );
    }

    shareOperator(operator: OperatorModel){
        if (operator._id == null) {
            return;
        }
        this.permissionsDialogService.openPermissionV2Dialog('analytics-operators', operator._id, operator.name || '');
    }

    userHasReadPermission(id: string): boolean {
        return this.permissionsPerOperator.find(e => e.id === id)?.read || false;
    }

    userHasWritePermission(id: string): boolean {
        return this.permissionsPerOperator.find(e => e.id === id)?.write || false;
    }

    userHasExecutePermission(id: string): boolean {
        return this.permissionsPerOperator.find(e => e.id === id)?.execute || false;
    }

    userHasAdministratePermission(id: string): boolean {
        return this.permissionsPerOperator.find(e => e.id === id)?.administrate || false;
    }
}
