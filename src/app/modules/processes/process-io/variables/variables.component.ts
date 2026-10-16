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

import { AfterViewInit, Component, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, tap } from 'rxjs';
import {ProcessIoService} from '../shared/process-io.service';
import {ProcessIoVariable} from '../shared/process-io.model';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { Sort, MatSort, MatSortHeader } from '@angular/material/sort';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DialogsService} from '../../../../core/services/dialogs.service';
import { bulkDelete, countLabel, noneNullOrServerError } from '../../../../core/services/delete-flows';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {ProcessIoVariableEditDialogComponent} from '../dialogs/process-io-variable-edit-dialog.component';
import {MatPaginator} from '@angular/material/paginator';
import {SearchbarService} from '../../../../core/components/searchbar/shared/searchbar.service';
import { ListSelection } from 'src/app/core/classes/list-selection';
import { PagedListState } from 'src/app/core/classes/paged-list-state';
import { LIST_DATE_FORMAT } from 'src/app/core/classes/list-date-format';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { PageHeaderComponent } from '../../../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../../../core/components/empty-state/empty-state.component';
import { SpinnerComponent } from '../../../../core/components/spinner/spinner.component';
import { JsonPipe, DatePipe } from '@angular/common';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { ShortKeyPipe } from '../shared/short-key.pipe';
import { snackError } from 'src/app/core/services/snack-bar-messages';



@Component({
    selector: 'senergy-process-io-variables',
    templateUrl: './variables.component.html',
    styleUrls: ['./variables.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, SpinnerComponent, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatSortHeader, MatTooltip, MatIconButton, MatIcon, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, MatButton, MatMenu, MatMenuItem, MatMenuTrigger, JsonPipe, DatePipe, ShortKeyPipe]
})
export class ProcessIoVariablesComponent implements AfterViewInit, OnInit {
    private processIoService = inject(ProcessIoService);
    private snackBar = inject(MatSnackBar);
    private dialogsService = inject(DialogsService);
    private dialog = inject(MatDialog);
    private searchbarService = inject(SearchbarService);
    private destroyRef = inject(DestroyRef);
    private preferencesService = inject(PreferencesService);

    sort = 'unix_timestamp_in_s.desc';
    keyRegex = '';
    ready = false;
    totalCount = 0;
    userHasCreateAuthorization = false;
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;

    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    listSelection = new ListSelection<ProcessIoVariable>(() => this.dataSource.connect().value);
    selection = this.listSelection.model;

    dataSource = new MatTableDataSource<ProcessIoVariable>();
    displayedColumns: string[] = [];
    readonly dateFormat = LIST_DATE_FORMAT;
    list = new PagedListState(this.preferencesService, () => this.fetchVariables(), { sortBy: 'unix_timestamp_in_s', sortDirection: 'desc' });


    constructor() {
        this.userHasCreateAuthorization = this.processIoService.userHasCreateAuthorization();

        this.userHasUpdateAuthorization = this.processIoService.userHasUpdateAuthorization();
        this.userHasDeleteAuthorization = this.processIoService.userHasDeleteAuthorization();

        // The selection column only exists for the bulk delete, the menu column only with an action in it.
        this.displayedColumns = [
            ...(this.userHasDeleteAuthorization ? ['select'] : []),
            'key', 'value', 'process_instance_id', 'process_definition_id', 'unix_timestamp_in_s',
            ...(this.userHasUpdateAuthorization || this.userHasDeleteAuthorization ? ['actions'] : []),
        ];

        this.updateTotal();
    }

    ngOnInit() {
        this.initSearch();
    }

    ngAfterViewInit(): void {
        this.list.connect(this.paginator, this.destroyRef);
    }

    matSortChange($event: Sort) {
        this.list.sortChanged($event);
        this.reload();
    }

    initSearch() {
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
            if(this.keyRegex !== searchText) {
                this.keyRegex = searchText;
            }
            this.reload();
        });
    }

    reload(){
        this.selectionClear();
        this.updateTotal();
        this.list.reload();
    }

    updateTotal(){
        this.processIoService.countVariables(this.keyRegex).subscribe(value => {
            if (value) {
                this.totalCount = value.count;
            }
        });
    }

    loadVariables(){
        this.fetchVariables().subscribe();
    }

    private fetchVariables(): Observable<unknown> {
        this.ready = false;
        const sort = this.list.sortBy + '.' + this.list.sortDirection;
        return this.processIoService.listVariables(this.list.pageSize, this.list.offset, sort, this.keyRegex).pipe(
            tap(value => {
                if(value){
                    this.dataSource.data = value || [];
                }
                this.ready = true;
            })
        );
    }

    edit(variable: ProcessIoVariable){
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            variable: JSON.parse(JSON.stringify(variable)), // create copy of object
            enableKey: false,
            enableDefinitionId: false,
            enableInstanceId: false
        };

        const editDialogRef = this.dialog.open(ProcessIoVariableEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((result: ProcessIoVariable | null) => {
            if (result) {
                this.processIoService.set(result).subscribe(value => {
                    if(value.status >= 300){
                        snackError(this.snackBar, 'Error while updating process-io variable!');
                    }else {
                        this.loadVariables();
                    }
                });
            }
        });
    }

    add(){
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            variable: {
                key: '',
                value: null,
                process_definition_id: '',
                process_instance_id: '',
                unix_timestamp_in_s: 0
            },
            enableKey: true,
            enableDefinitionId: false,
            enableInstanceId: false
        };

        const editDialogRef = this.dialog.open(ProcessIoVariableEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((result: ProcessIoVariable | null) => {
            if (result) {
                this.processIoService.get(result.key).subscribe(existing => {
                    if(existing){
                        if(existing.unix_timestamp_in_s > 0) {
                            snackError(this.snackBar, 'process-io variable with this key already exists');
                        } else {
                            this.processIoService.set(result).subscribe(value => {
                                if(value.status >= 300){
                                    snackError(this.snackBar, 'Error while setting process-io variable!');
                                }else {
                                    this.loadVariables();
                                }
                            });
                        }
                    } else {
                        snackError(this.snackBar, 'Error while checking for existing process-io variable!');
                    }
                });

            }
        });
    }

    remove(key: string){
        this.dialogsService
            .openDeleteDialog('Process-IO Variable')
            .afterClosed()
            .subscribe((variableDelete: boolean | undefined) => {
                if (variableDelete) {
                    this.processIoService.remove(key).subscribe(value => {
                        if(value.status >= 300){
                            snackError(this.snackBar, 'Error while deleting process-io variable!');
                        }else {
                            this.dataSource.data = this.dataSource.data.filter(value1 => value1.key !== key);
                        }
                    });
                }
            });
    }


    isAllSelected() {
        return this.listSelection.isAllSelected();
    }

    masterToggle() {
        this.listSelection.masterToggle();
    }

    selectionClear(): void {
        this.selection.clear();
    }

    deleteMultipleItems(): void {
        const text = countLabel(this.selection.selected.length, 'process', 'processes');
        bulkDelete(this.dialogsService, this.snackBar, {
            text,
            before: () => {
                this.ready = false;
            },
            jobs: () => this.selection.selected.map((variable: ProcessIoVariable) => this.processIoService.remove(variable.key)),
            isSuccess: noneNullOrServerError,
            successMessage: text + ' deleted successfully.',
            errorMessage: 'Error while deleting ' + text + '!',
            after: () => this.reload(),
        });
    }


}
