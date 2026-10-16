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
import {TimescaleRulesService} from './shared/timescale-rules.service';
import {TimescaleRuleModel, TimescaleRuleTemplateModel} from './shared/timescale-rule.model';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {TimescaleRulesCreateEditComponent} from './timescale-rules-create-edit/timescale-rules-create-edit.component';
import {DialogsService} from '../../../core/services/dialogs.service';
import { dialogSize } from '../../../core/dialog-size';
import {AuthorizationService} from '../../../core/services/authorization.service';
import {forkJoin, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {
    TimescaleRulesCreateEditTemplateComponent
} from './timescale-rules-create-edit-template/timescale-rules-create-edit-template.component';
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
import { MatTooltip } from '@angular/material/tooltip';

@Component({
    selector: 'senergy-timescale-rules',
    templateUrl: './timescale-rules.component.html',
    styleUrls: ['./timescale-rules.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, MatButton, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger, MatIcon, SpinnerComponent, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatTooltip, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator]
})
export class TimescaleRulesComponent implements OnInit {
    private timescaleRuleService = inject(TimescaleRulesService);
    private dialog = inject(MatDialog);
    private dialogsService = inject(DialogsService);
    private authService = inject(AuthorizationService);

    private searchbarService = inject(SearchbarService);
    private destroyRef = inject(DestroyRef);
    preferencesService = inject(PreferencesService);

    /** The rule manager has no total, so every rule is loaded and the list pages on the client. */
    @ViewChild('paginator', { static: false })
    set paginator(value: MatPaginator | undefined) {
        if (value) {
            this.dataSource.paginator = value;
        }
    }

    rules: TimescaleRuleModel[] = [];
    dataSource = new MatTableDataSource<TimescaleRuleModel>();
    displayedColumns = ['description', 'group', 'priority', 'users', 'roles', 'status', 'actions'];
    searchText = '';
    dataReady = false;
    dialogWidth = 700;
    roles: string[] = [];
    users: any[] = [];
    templates: TimescaleRuleTemplateModel[] = [];

    ngOnInit(): void {
        this.dataSource.filterPredicate = (rule, filter) => {
            const needle = filter.trim().toLowerCase();
            return [rule.description, rule.group, this.usernames(rule.users), (rule.roles || []).join(' ')].join(' ').toLowerCase().includes(needle);
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
            this.timescaleRuleService.getTemplates().pipe(map(r => this.templates = r)),
        ]).subscribe(_ => {
            this.dataReady = true;
        });
    }

    load(setReady: boolean = true): Observable<any> {
        return loadAllPages((limit, offset) => this.timescaleRuleService.getRules(limit, offset)).pipe(map(rules => {
            this.rules = rules;
            this.refreshTable();
            if (setReady) {
                this.dataReady = true;
            }
        }));
    }

    reload() {
        this.load().subscribe();
    }

    hasErrors(rule: TimescaleRuleModel): boolean {
        return rule.errors !== undefined && rule.errors !== null && rule.errors.length > 0;
    }

    private refreshTable() {
        this.dataSource.data = this.rules;
    }

    add() {
        const config: MatDialogConfig = {
            data: {
                rule: undefined,
                editable: true,
                roles: this.roles,
                users: this.users,
            },
            ...dialogSize('l'),
        };
        this.dialog
            .open(TimescaleRulesCreateEditComponent, config)
            .afterClosed()
            .subscribe((rule) => {
                if (rule !== undefined) {
                    this.rules.push(rule);
                    this.refreshTable();
                }
            });
    }

    addFromTemplate() {
        const config: MatDialogConfig = {
            data: {
                rule: undefined,
                editable: true,
                roles: this.roles,
                users: this.users,
                templates: this.templates,
            },
            minWidth: '' + this.dialogWidth + 'px',
        };
        this.dialog
            .open(TimescaleRulesCreateEditTemplateComponent, config)
            .afterClosed()
            .subscribe((rule) => {
                if (rule !== undefined) {
                    this.rules.push(rule);
                    this.refreshTable();
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
        };
        if (r.type === 'template') {
            this.dialog.open(TimescaleRulesCreateEditTemplateComponent, { ...config, minWidth: '' + this.dialogWidth + 'px' });
        } else {
            this.dialog.open(TimescaleRulesCreateEditComponent, { ...config, ...dialogSize('l') });
        }
    }

    edit(r: TimescaleRuleModel) {
        const config: MatDialogConfig = {
            data: {
                rule: r,
                editable: true,
                roles: this.roles,
                users: this.users,
                templates: this.templates,
            },
        };
        if (r.type === 'template') {
            this.dialog
                .open(TimescaleRulesCreateEditTemplateComponent, { ...config, minWidth: '' + this.dialogWidth + 'px' })
                .afterClosed()
                .subscribe((rule) => {
                    if (rule !== undefined) {
                        this.rules[this.rules.indexOf(r)] = rule;
                        this.refreshTable();

                    }
                });
        } else {
            this.dialog
                .open(TimescaleRulesCreateEditComponent, { ...config, ...dialogSize('l') })
                .afterClosed()
                .subscribe((rule) => {
                    if (rule !== undefined) {
                        this.rules[this.rules.indexOf(r)] = rule;
                        this.refreshTable();
                    }
                });
        }
    }

    delete(r: TimescaleRuleModel) {
        this.dialogsService.openDeleteDialog('rule').afterClosed()
            .subscribe((del?: boolean) => {
                if (del === true) {
                    this.timescaleRuleService.deleteRule(r.id).subscribe(t => {
                        if (t) {
                            const index = this.rules.indexOf(r);
                            if (index !== -1) {
                                this.rules.splice(index, 1);
                                this.refreshTable();
                            }
                        }
                    });
                }
            });
    }

    usernames(ids: string[] | undefined): string {
        return ids?.map(userid => this.users.find(u => u.id === userid)?.username).join(', ') || '';
    }
}
