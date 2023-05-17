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
import {TimescaleRulesService} from './shared/timescale-rules.service';
import {TimescaleRuleModel} from './shared/timescale-rule.model';
import {MatTable} from '@angular/material/table';
import {ImportTypePermissionSearchModel} from '../../imports/import-types/shared/import-types.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {TimescaleRulesCreateEditComponent} from './timescale-rules-create-edit/timescale-rules-create-edit.component';
import {DialogsService} from '../../../core/services/dialogs.service';
import {AuthorizationService} from '../../../core/services/authorization.service';
import {forkJoin, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
    selector: 'senergy-timescale-rules',
    templateUrl: './timescale-rules.component.html',
    styleUrls: ['./timescale-rules.component.css']
})
export class TimescaleRulesComponent implements OnInit {
    @ViewChild(MatTable, {static: false}) table!: MatTable<ImportTypePermissionSearchModel>;

    constructor(
        private timescaleRuleService: TimescaleRulesService,
        private dialog: MatDialog,
        private dialogsService: DialogsService,
        private authService: AuthorizationService,
    ) {
    }

    rules: TimescaleRuleModel[] = [];
    dataReady = false;
    limitInit = 100;
    limit = this.limitInit;
    offset = 0;
    dialogWidth = 700;
    roles: string[] = [];
    users: any[] = [];

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
        return this.timescaleRuleService.getRules(this.limit, this.offset).pipe(map(rules => {
            this.rules.push(...rules);
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
        this.rules = [];
        this.load().subscribe();
    }

    onScroll() {
        this.limit += this.limitInit;
        this.offset = this.rules.length;
        this.load().subscribe();
    }

    add() {
        const config: MatDialogConfig = {
            data: {
                rule: undefined,
                editable: true,
                roles: this.roles,
                users: this.users,
            },
            minHeight: '65vh',
            minWidth: '' + this.dialogWidth + 'px',
        };
        this.dialog
            .open(TimescaleRulesCreateEditComponent, config)
            .afterClosed()
            .subscribe((rule) => {
                if (rule !== undefined) {
                    this.rules.push(rule);
                    this.table.renderRows();
                }
            });
    }

    details(r: TimescaleRuleModel) {
        const config: MatDialogConfig = {
            data: {
                rule: r,
                editable: false,
                roles: this.roles,
                users: this.users,
            },
            minHeight: '65vh',
            minWidth: '' + this.dialogWidth + 'px',
        };
        this.dialog.open(TimescaleRulesCreateEditComponent, config);
    }

    edit(r: TimescaleRuleModel) {
        const config: MatDialogConfig = {
            data: {
                rule: r,
                editable: true,
                roles: this.roles,
                users: this.users,
            },
            minHeight: '65vh',
            minWidth: '' + this.dialogWidth + 'px',
        };
        this.dialog
            .open(TimescaleRulesCreateEditComponent, config)
            .afterClosed()
            .subscribe((rule) => {
                if (rule !== undefined) {
                    this.rules[this.rules.indexOf(r)] = rule;
                    this.table.renderRows();

                }
            });
    }

    delete(r: TimescaleRuleModel) {
        this.dialogsService.openDeleteDialog('rule').afterClosed()
            .subscribe((del?: boolean) => {
                if (del === true) {
                    this.timescaleRuleService.deleteRule(r.id).subscribe(t => {
                        if (t) {
                            this.rules.splice(this.rules.indexOf(r));
                            this.table.renderRows();
                        }
                    });
                }
            });
    }
}
