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

import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
import { animate, state, style, transition, trigger } from '@angular/animations';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { SmartServiceModuleService } from './shared/modules.service';
import { SmartServiceModuleModel } from './shared/modules.model';


@Component({
    selector: 'senergy-smart-service-instances',
    templateUrl: './instances.component.html',
    styleUrls: ['./instances.component.css'],
    animations: [
        trigger('detailExpand', [
            state('collapsed', style({ height: '0px', opacity: 0 })),
            state('expanded', style({ height: '*', opacity: 1 })),
            transition('expanded <=> collapsed', animate('220ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
        ]),
    ],
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
    pageIndex = 0;
    sortBy = 'name';
    sortDirection: SortDirection = 'asc';
    releaseId?: string;
    instanceId?: string;
    expandedInstance?: SmartServiceInstanceModel;
    expandedInstanceId?: string;
    tableScrollTop = 0;
    userIdToName = new Map<string, string>();
    modulesByInstanceId = new Map<string, SmartServiceModuleModel[]>();
    loadingModulesByInstanceId = new Set<string>();


    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    @ViewChild('tableContainer', { static: false }) tableContainer?: ElementRef<HTMLDivElement>;

    constructor(
        private instancesService: SmartServiceInstanceService,
        public preferencesService: PreferencesService,
        private dialogsService: DialogsService,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private permission: PermissionsService,
        private permissionsDialogService: PermissionsDialogService,
        private modulesService: SmartServiceModuleService,
    ) { }
    ngOnInit(): void {
        this.userHasDeleteAuthorization = this.instancesService.userHasDeleteAuthorization();
        if (this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete', 'force-delete');
        }
        this.activatedRoute.queryParamMap.subscribe((params) => {
            this.releaseId = params.get('release_id') || undefined;
            this.instanceId = params.get('instance_id') || undefined;
            this.expandedInstanceId = params.get('expanded_instance') || undefined;
            const pageParam = params.get('page');
            const parsedPageIndex = pageParam === null ? 0 : parseInt(pageParam, 10);
            this.pageIndex = Number.isNaN(parsedPageIndex) || parsedPageIndex < 0 ? 0 : parsedPageIndex;
            this.offset = this.pageSize * this.pageIndex;

            const scrollParam = params.get('scroll_top');
            const parsedScrollTop = scrollParam === null ? 0 : parseInt(scrollParam, 10);
            this.tableScrollTop = Number.isNaN(parsedScrollTop) || parsedScrollTop < 0 ? 0 : parsedScrollTop;
        });
        if (this.instanceId) {
            this.loadSingleInstance(this.instanceId);
        } else {
            this.loadInstances();
        }
        this.permission.getSharableUsers().subscribe(users => users?.forEach(u => this.userIdToName.set(u.id, u.username)));
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe((e) => {
            this.preferencesService.pageSize = e.pageSize;
            this.pageSize = this.paginator.pageSize;
            this.pageIndex = this.paginator.pageIndex;
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.updateQueryParams();
            this.loadInstances();
        });

        this.restoreScrollPosition();
    }

    loadInstances(): void {
        this.instancesService.getInstances({ limit: this.pageSize, offset: this.offset, sort: this.sortBy + '.' + this.sortDirection, releaseId: this.releaseId }).subscribe((instances) => {
            this.dataSource.data = instances.instances;
            this.totalCount = instances.total;
            this.ready = true;
            this.restoreStateFromQueryParams();
        });
    }

    loadSingleInstance(id: string): void {
        this.instancesService.getInstance(id).subscribe((instance) => {
            const data = [];
            if (instance !== undefined && instance !== null) {
                data.push(instance);
            }
            this.dataSource.data = data;
            this.totalCount = 1;
            this.ready = true;
            this.restoreStateFromQueryParams();
        });
    }

    toggleExpandedRow(instance: SmartServiceInstanceModel): void {
        if (this.expandedInstance?.id === instance.id) {
            this.expandedInstance = undefined;
            this.expandedInstanceId = undefined;
            this.updateQueryParams(true);
            return;
        }

        if (this.modulesByInstanceId.has(instance.id)) {
            this.expandedInstance = instance;
            this.expandedInstanceId = instance.id;
            this.updateQueryParams(true);
            return;
        }

        this.expandedInstance = undefined;
        this.loadModulesForInstance(instance.id, () => {
            this.expandedInstance = instance;
            this.expandedInstanceId = instance.id;
            this.updateQueryParams(true);
        });
    }

    onTableScroll(event: Event): void {
        const tableContainer = event.target as HTMLElement;
        const currentScrollTop = Math.max(0, Math.round(tableContainer.scrollTop));
        if (this.tableScrollTop === currentScrollTop) {
            return;
        }

        this.tableScrollTop = currentScrollTop;
        this.updateQueryParams(true);
    }

    getModulesByInstanceId(instanceId: string): SmartServiceModuleModel[] {
        return this.modulesByInstanceId.get(instanceId) || [];
    }

    hasLoadedModules(instanceId: string): boolean {
        return this.modulesByInstanceId.has(instanceId);
    }

    isLoadingModules(instanceId: string): boolean {
        return this.loadingModulesByInstanceId.has(instanceId);
    }

    private loadModulesForInstance(instanceId: string, onLoaded?: () => void): void {
        if (this.modulesByInstanceId.has(instanceId)) {
            onLoaded?.();
            return;
        }

        if (this.loadingModulesByInstanceId.has(instanceId)) {
            return;
        }

        this.loadingModulesByInstanceId.add(instanceId);
        this.modulesService.getModules({ instance_id: instanceId }).subscribe((modules) => {
            this.modulesByInstanceId.set(instanceId, modules || []);
            this.loadingModulesByInstanceId.delete(instanceId);
            onLoaded?.();
        });
    }

    openDeployment(module: SmartServiceModuleModel): void {
        this.router.navigateByUrl('/processes/deployments?deploymentId='
            + module.module_data.process_deployment_id
            + (module.module_data.is_fog_deployment ? ('&hubId=' + module.module_data.fog_hub) : '')
        );
    }

    canOpenDeployment(module: SmartServiceModuleModel): boolean {
        return !!module.module_data.process_deployment_id;
    }

    openProcessInstance(module: SmartServiceModuleModel): void {
        this.router.navigateByUrl('/processes/monitor?businessKey='
            + module.module_data.business_key
            + (module.module_data.fog_hub ? ('&hubId=' + module.module_data.fog_hub) : '')
        );
    }

    canOpenProcessInstance(module: SmartServiceModuleModel): boolean {
        return !!module.module_data.business_key;
    }

    openDeviceGroup(module: SmartServiceModuleModel): void {
        this.router.navigateByUrl('/devices/devicegroups/edit/' + module.module_data.device_group_id);
    }

    canOpenDeviceGroup(module: SmartServiceModuleModel): boolean {
        return !!module.module_data.device_group_id;
    }

    openImport(module: SmartServiceModuleModel): void {
        this.router.navigateByUrl('/imports/instances?id=' + module.module_data.import?.id);
    }

    openPipeline(module: SmartServiceModuleModel): void {
        this.router.navigateByUrl('/data/pipelines/details/' + module.module_data.pipeline_id);
    }

    openExport(module: SmartServiceModuleModel): void {
        this.router.navigateByUrl('/exports/details/' + module.module_data.export?.ID);
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

    updateQueryParams(replaceUrl = false) {
        const queryParams: any = {};
        if (this.releaseId !== undefined) {
            queryParams['release_id'] = this.releaseId;
        }
        if (this.instanceId !== undefined) {
            queryParams['instance_id'] = this.instanceId;
        }
        if (this.expandedInstanceId !== undefined) {
            queryParams['expanded_instance'] = this.expandedInstanceId;
        }
        if (this.pageIndex > 0) {
            queryParams['page'] = this.pageIndex;
        }
        if (this.tableScrollTop > 0) {
            queryParams['scroll_top'] = this.tableScrollTop;
        }

        this.router.navigate(
            [],
            {
                relativeTo: this.activatedRoute,
                queryParams,
                replaceUrl,
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

    clearQueryParams(): void {
        this.router.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: {},
            queryParamsHandling: ''
        });
        this.instanceId = undefined;
        this.expandedInstance = undefined;
        this.expandedInstanceId = undefined;
        this.tableScrollTop = 0;
        if (this.tableContainer?.nativeElement) {
            this.tableContainer.nativeElement.scrollTop = 0;
        }
        this.loadInstances();
    }

    private restoreStateFromQueryParams(): void {
        if (this.expandedInstanceId !== undefined) {
            const instance = this.dataSource.data.find((i) => i.id === this.expandedInstanceId);
            if (instance) {
                if (this.modulesByInstanceId.has(instance.id)) {
                    this.expandedInstance = instance;
                } else {
                    this.loadModulesForInstance(instance.id, () => {
                        this.expandedInstance = instance;
                    });
                }
            } else {
                this.expandedInstance = undefined;
            }
        } else {
            this.expandedInstance = undefined;
        }

        this.restoreScrollPosition();
    }

    private restoreScrollPosition(): void {
        if (!this.tableContainer?.nativeElement) {
            return;
        }

        const scrollTop = this.tableScrollTop;
        setTimeout(() => {
            if (this.tableContainer?.nativeElement) {
                this.tableContainer.nativeElement.scrollTop = scrollTop;
            }
        });
    }
}
