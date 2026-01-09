/*
 * Copyright 2026 InfAI (CC SES)
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

import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { SmartServiceInstanceService } from './shared/instances.service';
import { SmartServiceInstanceModel } from './shared/instances.model';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { Sort, SortDirection } from '@angular/material/sort';
import { DialogsService } from 'src/app/core/services/dialogs.service';
import { MatPaginator } from '@angular/material/paginator';


@Component({
    selector: 'senergy-smart-service-instances',
    templateUrl: './instances.component.html',
    styleUrls: ['./instances.component.css'],
})
export class SmartServiceInstancesComponent implements OnInit, AfterViewInit {
    formGroup: FormGroup = new FormGroup({ repoItems: new FormArray([]) });

    userHasDeleteAuthorization = false;
    ready = false;

    displayedColumns = ['name', 'description', 'created_at', 'updated_at'];
    pageSize = this.preferencesService.pageSize;
    dataSource = new MatTableDataSource<SmartServiceInstanceModel>();
    selection = new SelectionModel<SmartServiceInstanceModel>(true, []);
    totalCount = 200;
    offset = 0;
    sortBy = 'name';
    sortDirection: SortDirection = 'asc';


    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;

    constructor(
        private instancesService: SmartServiceInstanceService,
        public preferencesService: PreferencesService,
        private dialogsService: DialogsService,

    ) {}
    ngOnInit(): void {
        this.loadInstances();
        this.userHasDeleteAuthorization = this.instancesService.userHasDeleteAuthorization();
        if (this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete', 'force-delete');
        }
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe((e) => {
            this.preferencesService.pageSize = e.pageSize;
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.loadInstances();
        });
    }

    private loadInstances(): void {
        this.instancesService.getInstances({limit: this.pageSize, offset: this.offset, sort: this.sortBy + '.' + this.sortDirection}).subscribe((instances) => {
            this.dataSource.data = instances.instances;
            this.totalCount = instances.total;
            this.ready = true;
        });
    }

    deleteInstance(instance: SmartServiceInstanceModel, force: boolean): void {
         this.dialogsService
            .openDeleteDialog('instance')
            .afterClosed()
            .subscribe((del: boolean) => {
                if (del) {
                    this.instancesService.deleteInstance(instance.id, force).subscribe(() => {
                        this.loadInstances();
                    });
                }
            });   
    }

     matSortChange($event: Sort) {
        this.sortBy = $event.active;
        this.sortDirection = $event.direction;
        this.loadInstances();
    }

}
