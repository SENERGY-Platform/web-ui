/*
 * Copyright 2023 InfAI (CC SES)
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
import {BudgetService} from './shared/budget.service';
import {BudgetModel} from './shared/budget.model';
import {forkJoin, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {AuthorizationService} from '../../../core/services/authorization.service';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import {DialogsService} from '../../../core/services/dialogs.service';
import {BudgetCreateEditComponent} from './budget-create-edit/budget-create-edit.component';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatPaginator } from '@angular/material/paginator';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { loadAllPages } from '../../../core/classes/load-all-pages';
import { MatIcon } from '@angular/material/icon';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';

@Component({
    selector: 'senergy-budget',
    templateUrl: './budget.component.html',
    styleUrls: ['./budget.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, MatButton, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger, MatIcon, SpinnerComponent, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator]
})
export class BudgetComponent implements OnInit {
    private authService = inject(AuthorizationService);
    private budgetService = inject(BudgetService);
    private dialog = inject(MatDialog);
    private dialogsService = inject(DialogsService);

    private searchbarService = inject(SearchbarService);
    private destroyRef = inject(DestroyRef);
    preferencesService = inject(PreferencesService);

    /** The budget API has no total, so every budget is loaded and the list pages on the client. */
    @ViewChild('paginator', { static: false })
    set paginator(value: MatPaginator | undefined) {
        if (value) {
            this.dataSource.paginator = value;
        }
    }

    budgets: BudgetModel[] = [];
    dataSource = new MatTableDataSource<BudgetModel>();
    displayedColumns = ['budget_identifier', 'user', 'value', 'actions'];
    searchText = '';
    dataReady = false;
    dialogWidth = 700;
    roles: string[] = [];
    users: any[] = [];

    ngOnInit(): void {
        this.dataSource.filterPredicate = (budget, filter) => {
            const needle = filter.trim().toLowerCase();
            return [budget.budget_identifier, this.subjectName(budget), budget.value].join(' ').toLowerCase().includes(needle);
        };
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((text) => {
            this.searchText = text;
            this.dataSource.filter = text;
            this.dataSource.paginator?.firstPage();
        });
        forkJoin([
            this.load(false),
            this.authService.loadAllRoles().pipe(map((roles: any | { error: string }) => {
                if (roles != null) {
                    this.roles = roles.map((r: any) => r.name);
                } else {
                    console.error('Could not load roles from Keycloak. Reason was : ', roles.error);
                }
            })),
            this.authService.loadAllUsers().pipe(map((users: any | { error: string }) => {
                if (users != null) {
                    this.users = users;
                } else {
                    console.error('Could not load users from Keycloak. Reason was : ', users.error);
                }
            })),
        ]).subscribe(_ => {
            this.dataReady = true;
        });
    }

    load(setReady: boolean = true): Observable<any> {
        return loadAllPages((limit, offset) => this.budgetService.getBudgets(limit, offset)).pipe(map(budgets => {
            this.budgets = budgets;
            this.refreshTable();
            if (setReady) {
                this.dataReady = true;
            }
        }));
    }

    reload() {
        this.load().subscribe();
    }

    private refreshTable() {
        this.dataSource.data = this.budgets;
    }

    add() {
        const config: MatDialogConfig = {
            data: {
                budget: undefined,
                editable: true,
                roles: this.roles,
                users: this.users,
            },
            minWidth: '' + this.dialogWidth + 'px',
        };
        this.dialog
            .open(BudgetCreateEditComponent, config)
            .afterClosed()
            .subscribe((budget) => {
                if (budget !== undefined) {
                    this.reload();
                }
            });
    }

    details(b: BudgetModel) {
        const config: MatDialogConfig = {
            data: {
                budget: b,
                editable: false,
                roles: this.roles,
                users: this.users,
            },
            minWidth: '' + this.dialogWidth + 'px',
        };
        this.dialog.open(BudgetCreateEditComponent, config);
    }

    edit(b: BudgetModel) {
        const config: MatDialogConfig = {
            data: {
                budget: b,
                editable: true,
                roles: this.roles,
                users: this.users,
            },
            minWidth: '' + this.dialogWidth + 'px',
        };
        this.dialog
            .open(BudgetCreateEditComponent, config)
            .afterClosed()
            .subscribe((budget) => {
                if (budget !== undefined) {
                    this.reload();

                }
            });
    }

    delete(b: BudgetModel) {
        this.dialogsService.openDeleteDialog('budget').afterClosed()
            .subscribe((del?: boolean) => {
                if (del === true) {
                    this.budgetService.deleteBudget(b).subscribe(t => {
                        if (t) {
                            const index = this.budgets.indexOf(b);
                            if (index !== -1) {
                                this.budgets.splice(index, 1);
                                this.refreshTable();
                            }
                        }
                    });
                }
            });
    }

    getUsername(userid: string) {
        return this.users.find(u => u.id === userid)?.username;
    }

    /** The user name for a user budget, the role for a role budget. */
    subjectName(b: BudgetModel): string {
        return (b.user_id ? this.getUsername(b.user_id) : undefined) ?? b.role ?? '';
    }
}
