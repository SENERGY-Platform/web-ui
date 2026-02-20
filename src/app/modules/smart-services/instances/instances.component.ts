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
import { ActivatedRoute, Router } from '@angular/router';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';


@Component({
    selector: 'senergy-smart-service-instances',
    templateUrl: './instances.component.html',
    styleUrls: ['./instances.component.css'],
})
export class SmartServiceInstancesComponent implements OnInit, AfterViewInit {
    formGroup: FormGroup = new FormGroup({ repoItems: new FormArray([]) });

    userHasDeleteAuthorization = false;
    ready = false;

    displayedColumns = ['pub', 'name', 'description', 'error', 'created_at', 'updated_at', 'release', 'share'];
    pageSize = this.preferencesService.pageSize;
    dataSource = new MatTableDataSource<SmartServiceInstanceModel>();
    selection = new SelectionModel<SmartServiceInstanceModel>(true, []);
    totalCount = 200;
    offset = 0;
    sortBy = 'name';
    sortDirection: SortDirection = 'asc';
    releaseId?: string;;
    userIdToName = new Map<string, string>();


    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;

    constructor(
        private instancesService: SmartServiceInstanceService,
        public preferencesService: PreferencesService,
        private dialogsService: DialogsService,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private permission: PermissionsService,
        private permissionsDialogService: PermissionsDialogService,
    ) {}
    ngOnInit(): void {
        this.userHasDeleteAuthorization = this.instancesService.userHasDeleteAuthorization();
        if (this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete', 'force-delete');
        }
        this.activatedRoute.queryParamMap.subscribe((params) => {
            const releaseId = params.get('release_id');
            if (releaseId) {
                this.releaseId = releaseId;
            }
        });
        this.loadInstances();
        this.permission.getSharableUsers().subscribe(users => users?.forEach(u => this.userIdToName.set(u.id, u.username)));
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe((e) => {
            this.preferencesService.pageSize = e.pageSize;
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.loadInstances();
        });
    }

    loadInstances(): void {
        this.instancesService.getInstances({limit: this.pageSize, offset: this.offset, sort: this.sortBy + '.' + this.sortDirection, releaseId: this.releaseId}).subscribe((instances) => {
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

    goToRelease(id: string) {
        this.router.navigate(['smart-services/releases'], { queryParams: { id: id } });
    }

    updateQueryParams() {
        const queryParams: any = {};
        if (this.releaseId !== undefined) {
            queryParams['release_id'] = this.releaseId;
        }

        this.router.navigate(
            [],
            {
                relativeTo: this.activatedRoute,
                queryParams,
            },
        );
    }

    calcMaxHeight(): string {
        if (this.releaseId) {
            return 'calc(100vh - 199px)';
        }
        return 'calc(100vh - 145px)';
    }

    shareInstance(instance: SmartServiceInstanceModel) {
         this.permissionsDialogService.openPermissionV2Dialog('smart_service_instances', instance.id, instance.name);
    }
}
