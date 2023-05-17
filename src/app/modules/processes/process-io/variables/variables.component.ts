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

import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ProcessIoService} from '../shared/process-io.service';
import {ProcessIoVariable} from '../shared/process-io.model';
import {MatTableDataSource} from '@angular/material/table';
import {MonitorProcessModel} from '../../monitor/shared/monitor-process.model';
import {MatSort} from '@angular/material/sort';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DeviceInstancesUpdateModel} from '../../../devices/device-instances/shared/device-instances-update.model';
import {DialogsService} from '../../../../core/services/dialogs.service';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DeviceInstancesEditDialogComponent} from '../../../devices/device-instances/dialogs/device-instances-edit-dialog.component';
import {DeviceInstancesModel} from '../../../devices/device-instances/shared/device-instances.model';
import {ProcessIoVariableEditDialogComponent} from '../dialogs/process-io-variable-edit-dialog.component';
import {MatPaginator} from '@angular/material/paginator';
import {SearchbarService} from '../../../../core/components/searchbar/shared/searchbar.service';
import {forkJoin, Observable, Subscription} from 'rxjs';
import { SelectionModel } from '@angular/cdk/collections';
import { UtilService } from 'src/app/core/services/util.service';



@Component({
    selector: 'senergy-process-io-variables',
    templateUrl: './variables.component.html',
    styleUrls: ['./variables.component.css'],
})
export class ProcessIoVariablesComponent implements AfterViewInit, OnDestroy{
    pageSize = 20;
    sort = 'unix_timestamp_in_s.desc';
    keyRegex = '';
    ready = false;
    offset = 0;
    totalCount = 0;

    @ViewChild('matSort', { static: false }) matSort!: MatSort;
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    selection = new SelectionModel<ProcessIoVariable>(true, []);

    dataSource = new MatTableDataSource<ProcessIoVariable>();
    displayedColumns: string[] = ['select', 'unix_timestamp_in_s', 'key', 'process_instance_id', 'process_definition_id', 'value', 'edit', 'delete'];

    private searchSub: Subscription = new Subscription();

    constructor(
        private processIoService: ProcessIoService,
        private snackBar: MatSnackBar,
        private dialogsService: DialogsService,
        private dialog: MatDialog,
        private searchbarService: SearchbarService,
        public utilsService: UtilService
    ) {
        this.updateTotal();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    ngOnInit() {
        this.initSearch();
    }

    ngAfterViewInit(): void {
        this.dataSource.sort = this.matSort;
        this.dataSource.sort.sortChange.subscribe(() => {
            this.updateSortAndPagination();
        });
        this.paginator.page.subscribe(()=>{
            this.pageSize = this.paginator.pageSize
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.loadVariables();
        });
    }

    initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            if(this.keyRegex !== searchText) {
                this.keyRegex = searchText;
                this.offset = 0;
            }
            this.reload();
        });
    }

    reload(){
        this.selectionClear();
        this.offset = 0;
        this.pageSize = 20;
        this.updateTotal();
        this.updateSortAndPagination();
    }

    updateTotal(){
        this.processIoService.countVariables(this.keyRegex).subscribe(value => {
            if (value) {
                this.totalCount = value.count;
            }
        });
    }

    updateSortAndPagination(){
        if(this.matSort && this.matSort.active){
            this.sort = this.matSort.active+'.'+this.matSort.direction;
        }
        this.loadVariables();
    }

    loadVariables(){
        this.ready = false;
        this.processIoService.listVariables(this.pageSize, this.offset, this.sort, this.keyRegex).subscribe(value => {
            if(value){
                this.dataSource.data = value || [];
            }
            this.ready = true;
        });
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
                        this.snackBar.open('Error while updating process-io variable!', 'close', { panelClass: 'snack-bar-error' });
                    }else {
                        this.updateSortAndPagination();
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
                            this.snackBar.open('process-io variable with this key already exists', 'close', { panelClass: 'snack-bar-error' });
                        } else {
                            this.processIoService.set(result).subscribe(value => {
                                if(value.status >= 300){
                                    this.snackBar.open('Error while setting process-io variable!', 'close', { panelClass: 'snack-bar-error' });
                                }else {
                                    this.updateSortAndPagination();
                                }
                            });
                        }
                    } else {
                        this.snackBar.open('Error while checking for existing process-io variable!', 'close', { panelClass: 'snack-bar-error' });
                    }
                });

            }
        });
    }

    remove(key: string){
        this.dialogsService
            .openDeleteDialog('Process-IO Variable')
            .afterClosed()
            .subscribe((variableDelete: boolean) => {
                if (variableDelete) {
                    this.processIoService.remove(key).subscribe(value => {
                        if(value.status >= 300){
                            this.snackBar.open('Error while deleting process-io variable!', 'close', { panelClass: 'snack-bar-error' });
                        }else {
                            this.dataSource.data = this.dataSource.data.filter(value1 => value1.key !== key);
                        }
                    });
                }
            });
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

    deleteMultipleItems(): void {
        const deletionJobs: Observable<any>[] = [];
        var text = this.selection.selected.length + (this.selection.selected.length > 1 ? ' processes' : ' process')

        this.dialogsService
        .openDeleteDialog(text)
        .afterClosed()
        .subscribe((deletePipelines: boolean) => {
            if (deletePipelines) {
                this.ready = false;
                this.selection.selected.forEach((variable: ProcessIoVariable) => {
                    deletionJobs.push(this.processIoService.remove(variable.key))    
                });
            }
            
            forkJoin(deletionJobs).subscribe((deletionJobResults) => {
                const ok = deletionJobResults.findIndex((r: any) => r === null || r.status === 500) === -1;
                if (ok) {
                    this.snackBar.open(text + ' deleted successfully.', undefined, {duration: 2000});            
                } else {
                    this.snackBar.open('Error while deleting ' + text + '!', 'close', {panelClass: 'snack-bar-error'});
                }
                this.reload()
            })
        });
    }


}
