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

import {Component, OnInit, ViewChild} from '@angular/core';
import {BudgetService} from './shared/budget.service';
import {BudgetModel} from './shared/budget.model';
import {forkJoin, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {AuthorizationService} from '../../../core/services/authorization.service';
import {MatTable} from '@angular/material/table';
import {DialogsService} from '../../../core/services/dialogs.service';
import {BudgetCreateEditComponent} from './budget-create-edit/budget-create-edit.component';

@Component({
    selector: 'senergy-budget',
    templateUrl: './budget.component.html',
    styleUrls: ['./budget.component.css']
})
export class BudgetComponent implements OnInit {
    @ViewChild(MatTable, {static: false}) table!: MatTable<BudgetModel>;

    budgets: BudgetModel[] = [];
    dataReady = false;
    limitInit = 100;
    limit = this.limitInit;
    offset = 0;
    dialogWidth = 700;
    roles: string[] = [];
    users: any[] = [];

    constructor(
        private authService: AuthorizationService,
        private budgetService: BudgetService,
        private dialog: MatDialog,
        private dialogsService: DialogsService,
    ) {
    }

    ngOnInit(): void {
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
        return this.budgetService.getBudgets(this.limit, this.offset).pipe(map(budgets => {
            this.budgets.push(...budgets);
            if (this.table !== undefined) {
                this.table.renderRows();
            }
            if (setReady) {
                this.dataReady = true;
            }
        }));
    }

    reload() {
        this.limit = this.limitInit;
        this.offset = 0;
        this.budgets = [];
        this.load().subscribe();
    }

    onScroll() {
        this.limit += this.limitInit;
        this.offset = this.budgets.length;
        this.load().subscribe();
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
                            this.budgets.splice(this.budgets.indexOf(b));
                            this.table.renderRows();
                        }
                    });
                }
            });
    }

    getUsername(userid: string) {
        return this.users.find(u => u.id === userid)?.username;
    }
}
