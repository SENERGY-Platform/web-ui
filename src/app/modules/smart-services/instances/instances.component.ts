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

import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormGroup } from '@angular/forms';
import { SmartServiceInstanceService } from './shared/instances.service';
import { SmartServiceInstanceModel } from './shared/instances.model';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { Sort, MatSort, MatSortHeader } from '@angular/material/sort';
import { DialogsService } from 'src/app/core/services/dialogs.service';
import { MatPaginator } from '@angular/material/paginator';
import { ActivatedRoute, Router } from '@angular/router';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { SmartServiceModuleService } from './shared/modules.service';
import { SmartServiceModuleModel } from './shared/modules.model';
import { SmartServiceInstanceDialogService } from './shared/instance-dialog.service';
import { Observable, Subscription } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { PagedListState } from 'src/app/core/classes/paged-list-state';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { environment } from 'src/environments/environment';
import { smartServiceLogsUrl } from './shared/opensearch';
import { LIST_DATE_FORMAT } from 'src/app/core/classes/list-date-format';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { MatChipSet, MatChip, MatChipAvatar, MatChipRemove } from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { JsonPipe, DatePipe } from '@angular/common';
import { SmartServiceReleasesService } from '../releases/shared/release.service';
import { SmartServiceChangedResource } from '../releases/shared/release.model';
import { ChangedResourcesHintComponent } from '../changed-resources/changed-resources-hint.component';


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
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, MatMenu, MatMenuItem, MatMenuTrigger, SpinnerComponent, MatChipSet, MatChip, MatIcon, MatChipAvatar, MatChipRemove, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatTooltip, MatSortHeader, MatIconButton, MatProgressSpinner, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, JsonPipe, DatePipe, ChangedResourcesHintComponent]
})
export class SmartServiceInstancesComponent implements OnInit, AfterViewInit {
    private instancesService = inject(SmartServiceInstanceService);
    private destroyRef = inject(DestroyRef);
    preferencesService = inject(PreferencesService);
    private dialogsService = inject(DialogsService);
    private router = inject(Router);
    private activatedRoute = inject(ActivatedRoute);
    private permission = inject(PermissionsService);
    private permissionsDialogService = inject(PermissionsDialogService);
    private modulesService = inject(SmartServiceModuleService);
    private instanceDialogService = inject(SmartServiceInstanceDialogService);
    private authorizationService = inject(AuthorizationService);
    private releasesService = inject(SmartServiceReleasesService);

    formGroup: FormGroup = new FormGroup({ repoItems: new FormArray([]) });

    userHasDeleteAuthorization = false;
    ready = false;

    displayedColumns = ['expand', 'name', 'error', 'created_at', 'updated_at', 'actions'];
    readonly dateFormat = LIST_DATE_FORMAT;
    /** The log lines only help someone who reads them, and need to know where OpenSearch is. */
    showLogs = false;
    dataSource = new MatTableDataSource<SmartServiceInstanceModel>();
    selection = new SelectionModel<SmartServiceInstanceModel>(true, []);
    totalCount = 200;
    pageIndex = 0;
    list = new PagedListState(this.preferencesService, () => this.fetchInstances(), { sortBy: 'name', sortDirection: 'asc' });
    releaseId?: string;
    instanceId?: string;
    expandedInstance?: SmartServiceInstanceModel;
    expandedInstanceId?: string;
    tableScrollTop = 0;
    userIdToName = new Map<string, string>();
    modulesByInstanceId = new Map<string, SmartServiceModuleModel[]>();
    loadingModulesByInstanceId = new Set<string>();
    upgradingInstanceIds = new Set<string>();
    changedResourcesByReleaseId = new Map<string, SmartServiceChangedResource[]>();
    private changedResourcesSubscription?: Subscription;

    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    @ViewChild('tableContainer', { static: false }) tableContainer?: ElementRef<HTMLDivElement>;
    ngOnInit(): void {
        this.userHasDeleteAuthorization = this.instancesService.userHasDeleteAuthorization();
        this.showLogs = this.authorizationService.userIsDeveloper() && !!environment.openSearchDashboardsUrl && !!environment.openSearchSmartServiceIndexId;
        this.activatedRoute.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            this.releaseId = params.get('release_id') || undefined;
            this.instanceId = params.get('instance_id') || undefined;
            this.expandedInstanceId = params.get('expanded_instance') || undefined;
            const pageParam = params.get('page');
            const parsedPageIndex = pageParam === null ? 0 : parseInt(pageParam, 10);
            this.pageIndex = Number.isNaN(parsedPageIndex) || parsedPageIndex < 0 ? 0 : parsedPageIndex;
            this.list.offset = this.list.pageSize * this.pageIndex;

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
        this.list.connect(this.paginator, this.destroyRef);
        this.paginator.page.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.pageIndex = this.paginator.pageIndex;
            this.updateQueryParams();
        });

        this.restoreScrollPosition();
    }

    /**
     * Reloads what is shown: the single instance of an `instance_id` link, otherwise the current page. `list` drops
     * the load in flight, so an older answer cannot replace a newer one.
     */
    loadInstances(): void {
        if (this.instanceId) {
            this.loadSingleInstance(this.instanceId);
            return;
        }
        this.list.refresh();
    }

    private fetchInstances(): Observable<unknown> {
        return this.instancesService.getInstances({ limit: this.list.pageSize, offset: this.list.offset, sort: this.list.sortBy + '.' + this.list.sortDirection, releaseId: this.releaseId }).pipe(
            tap((instances) => {
                this.dataSource.data = instances.instances;
                this.totalCount = instances.total;
                this.loadChangedResources(instances.instances);
                this.ready = true;
                this.restoreStateFromQueryParams();
            })
        );
    }

    /** One request for all releases on the page, not one per instance; a lookup for an older page is dropped. */
    private loadChangedResources(instances: SmartServiceInstanceModel[]): void {
        this.changedResourcesSubscription?.unsubscribe();
        const ids = Array.from(new Set(instances.map(i => i.release_id).filter(id => !!id)));
        if (ids.length === 0) {
            this.changedResourcesByReleaseId = new Map();
            return;
        }
        this.changedResourcesSubscription = this.releasesService.getExtendedReleaseList(ids.length, 0, '', 'r', false, ids).subscribe((answer) => {
            this.changedResourcesByReleaseId = new Map(answer.releases
                .filter(r => r.changed_resources && r.changed_resources.length > 0)
                .map(r => [r.id, r.changed_resources as SmartServiceChangedResource[]]));
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
            this.loadChangedResources(data);
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
            .subscribe((del: boolean | undefined) => {
                if (del) {
                    this.instancesService.deleteInstance(instance.id, force).subscribe(() => {
                        this.loadInstances();
                    });
                }
            });
    }

    /**
     * Rewriting the parameters makes the repository recreate the modules of the instance, so this needs
     * administrate rather than write - the same right the delete button asks for.
     */
    editInstance(instance: SmartServiceInstanceModel): void {
        this.instanceDialogService.edit(instance).subscribe((changed) => {
            if (changed) {
                this.loadInstances();
            }
        });
    }

    /**
     * Unlike editing, this has to fetch the parameters of the new release before it knows whether it
     * needs to ask the user anything at all, so the button reports that wait itself.
     */
    upgradeInstance(instance: SmartServiceInstanceModel): void {
        this.upgradingInstanceIds.add(instance.id);
        this.instanceDialogService
            .upgrade(instance)
            .pipe(finalize(() => this.upgradingInstanceIds.delete(instance.id)))
            .subscribe((changed) => {
                if (changed) {
                    this.loadInstances();
                }
            });
    }

    isUpgrading(instance: SmartServiceInstanceModel): boolean {
        return this.upgradingInstanceIds.has(instance.id);
    }

    /** The Discover view filtered to the log lines this instance wrote */
    logsUrl(instance: SmartServiceInstanceModel): string {
        return smartServiceLogsUrl(environment.openSearchDashboardsUrl, environment.openSearchSmartServiceIndexId, instance.id);
    }

    matSortChange($event: Sort) {
        this.list.sortChanged($event);
        // the order changed, so the current page now holds other rows
        this.pageIndex = 0;
        this.paginator.pageIndex = 0;
        this.updateQueryParams(true);
        this.list.reload();
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

    /** Edit, upgrade, share and delete need administrate; a missing flag counts as allowed, as before. */
    mayAdminister(instance: SmartServiceInstanceModel): boolean {
        return instance.permissions_info?.permissions?.administrate !== false;
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
        // the navigation resets the page only after this load has started
        this.pageIndex = 0;
        if (this.tableContainer?.nativeElement) {
            this.tableContainer.nativeElement.scrollTop = 0;
        }
        this.list.reload();
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
