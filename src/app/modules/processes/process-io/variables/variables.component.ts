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

import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {ProcessIoService} from '../shared/process-io.service';
import {ProcessIoVariable} from '../shared/process-io.model';
import {MatTableDataSource} from '@angular/material/table';
import {MonitorProcessModel} from '../../monitor/shared/monitor-process.model';
import {MatSort} from '@angular/material/sort';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DeviceInstancesUpdateModel} from '../../../devices/device-instances/shared/device-instances-update.model';
import {DialogsService} from '../../../../core/services/dialogs.service';



@Component({
    selector: 'process-io-variables',
    templateUrl: './variables.component.html',
    styleUrls: ['./variables.component.css'],
})
export class ProcessIoVariablesComponent implements AfterViewInit{
    limit: number = 0 //all variables
    offset: number = 0
    sort: string = "key.asc"

    @ViewChild('matSort', { static: false }) matSort!: MatSort;

    dataSource = new MatTableDataSource<ProcessIoVariable>();
    displayedColumns: string[] = ["unix_timestamp_in_s", "key", "process_instance_id", "process_definition_id", "value", "action"]

    constructor(
        private processIoService: ProcessIoService,
        private snackBar: MatSnackBar,
        private dialogsService: DialogsService,
    ) {
        this.loadVariables();
    }

    updateSortAndPagination(){
        if(this.matSort && this.matSort.active){
            this.sort = this.matSort.active+"."+this.matSort.direction;
        }
        this.loadVariables()
    }

    loadVariables(){
        this.processIoService.listVariables(this.limit, this.offset, this.sort).subscribe(value => {
            if(value){
                this.dataSource.data = value || [];
            }
        })
    }

    ngAfterViewInit(): void {
        this.dataSource.sort = this.matSort;
        this.dataSource.sort.sortChange.subscribe(() => {
            this.updateSortAndPagination()
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
                            this.snackBar.open('Error while deleting process-io variable!', "close", { panelClass: "snack-bar-error" });
                        }else {
                            this.dataSource.data = this.dataSource.data.filter(value1 => {
                                return value1.key != key
                            })
                        }
                    })
                }
            });
    }

}
