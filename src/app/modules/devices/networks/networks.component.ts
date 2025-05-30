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

import {NetworksService} from './shared/networks.service';
import {ExtendedHubTotalModel, HubModel} from './shared/networks.model';
import {forkJoin, Observable, Subscription, map} from 'rxjs';
import {Router} from '@angular/router';
import {
    DeviceInstancesRouterState,
    DeviceInstancesRouterStateTypesEnum
} from '../device-instances/device-instances.component';
import {MatDialog} from '@angular/material/dialog';
import {NetworksDeleteDialogComponent} from './dialogs/networks-delete-dialog.component';
import {DeviceInstancesService} from '../device-instances/shared/device-instances.service';
import {MatTableDataSource} from '@angular/material/table';
import {Sort, SortDirection} from '@angular/material/sort';
import {SelectionModel} from '@angular/cdk/collections';
import {MatPaginator} from '@angular/material/paginator';
import {DialogsService} from 'src/app/core/services/dialogs.service';
import {SearchbarService} from 'src/app/core/components/searchbar/shared/searchbar.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {PermissionsDialogService} from '../../permissions/shared/permissions-dialog.service';
import {AuthorizationService} from '../../../core/services/authorization.service';
import {PermissionsService} from '../../permissions/shared/permissions.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';

@Component({
    selector: 'senergy-networks',
    templateUrl: './networks.component.html',
    styleUrls: ['./networks.component.css'],
})
export class NetworksComponent implements OnInit, OnDestroy, AfterViewInit {
    displayedColumns = ['select', 'connection', 'shared', 'name', 'number_devices', 'show', 'clear'];
    pageSize = this.preferencesService.pageSize;
    dataSource = new MatTableDataSource<HubModel>();
    sortBy = 'name';
    sortDirection: SortDirection = 'asc';
    selection = new SelectionModel<HubModel>(true, []);
    searchText = '';
    totalCount = 200;
    offset = 0;
    ready = false;
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;

    userIdToName: {[key: string]: string} = {};

    private searchSub: Subscription = new Subscription();

    constructor(
        private networksService: NetworksService,
        private searchbarService: SearchbarService,
        private router: Router,
        private dialog: MatDialog,
        private deviceInstancesService: DeviceInstancesService,
        private dialogsService: DialogsService,
        private snackBar: MatSnackBar,
        private permissionsDialogService: PermissionsDialogService,
        private authService: AuthorizationService,
        private permissionsService: PermissionsService,
        private preferencesService: PreferencesService,
    ) {}

    ngOnInit() {
        this.initSearch();
        this.checkAuthorization();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    checkAuthorization() {
        this.userHasUpdateAuthorization = this.networksService.userHasUpdateAuthorization();
        if(this.userHasUpdateAuthorization) {
            this.displayedColumns.push('edit');
        }

        this.userHasDeleteAuthorization = this.networksService.userHasDeleteAuthorization();
        if(this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }

        if (this.authService.userIsAdmin()) {
            this.displayedColumns.push('share');
        }
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active;

        // TODO Ingo suche connection
        if (this.sortBy === 'connection') {
            this.sortBy = 'annotations.connected';
        } else if (this.sortBy === 'number_devices') {
            this.sortBy = 'device_local_ids';
        }
        this.sortDirection = $event.direction;
        this.reload();
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe((e)=>{
            this.preferencesService.pageSize = e.pageSize;
            this.pageSize = this.paginator.pageSize;
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.getNetworks().subscribe({
                next: (_) => {
                    this.ready = true;
                },
                error: (_) => {
                    this.ready = true;
                }
            });
        });
    }

    edit(network: HubModel) {
        this.networksService.openNetworkEditDialog(network);
    }

    showDevices(network: HubModel) {
        this.router.navigateByUrl('/devices/deviceinstances', {
            state: { type: DeviceInstancesRouterStateTypesEnum.NETWORK, value: network } as DeviceInstancesRouterState,
        });
    }

    clear(network: HubModel) {
        this.networksService.openNetworkClearDialog(network);
    }

    delete(network: HubModel) {
        this.deviceInstancesService.getDeviceInstances({limit: 9999, offset: 0, sortBy: this.sortBy, sortDesc: this.sortDirection === 'desc', hubId: network.id}).subscribe((devices) => {
            this.dialog
                .open(NetworksDeleteDialogComponent, { data: { networkId: network.id, devices }, minWidth: '300px' })
                .afterClosed()
                .subscribe((deleteNetwork: boolean) => {
                    if (deleteNetwork) {
                        setTimeout(() => {
                            this.getNetworks().subscribe({
                                next: (_) => {
                                    this.ready = true;
                                },
                                error: (_) => {
                                    this.ready = true;
                                }
                            });
                        }, 1000);
                    }
                });
        });
    }

    private getNetworks(): Observable<HubModel[]> {
        return this.networksService
            .listExtendedHubs({limit: this.pageSize, offset: this.offset, sortBy: this.sortBy, sortDesc: this.sortDirection !== 'asc', searchText: this.searchText})
            .pipe(
                map((networks: ExtendedHubTotalModel) => {
                    this.totalCount = networks.total;
                    this.loadUserNames(networks.result.map(n => ({creator: n.owner_id, shared: n.shared})));
                    this.dataSource.data = networks.result;
                    return networks.result;
                })
            );
    }

    private loadUserNames(elements: {creator: string; shared: boolean}[]) {
        const missingCreators: string[] = [];
        elements?.forEach(element => {
            if(element.shared && element.creator && !this.userIdToName[element.creator] && !missingCreators.includes(element.creator)) {
                missingCreators.push(element.creator);
            }
        });
        missingCreators.forEach(creator => {
            this.permissionsService.getUserById(creator).subscribe(value => {
                if(value) {
                    this.userIdToName[value.id] = value.username;
                }
            });
        });
    }

    reload() {
        this.offset = 0;
        this.ready = false;
        this.selectionClear();

        this.getNetworks().subscribe({
            next: (_) => {
                this.ready = true;
            },
            error: (_) => {
                this.ready = true;
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

    deleteMultipleItems() {
        this.dialogsService
            .openDeleteDialog(this.selection.selected.length + (this.selection.selected.length > 1 ? ' networks' : ' network'))
            .afterClosed()
            .subscribe((deleteNetworks: boolean) => {
                if (!deleteNetworks) {
                    return;
                }

                const deletionJobs: Observable<any>[] = [];
                const getDevicesJobs: Observable<any>[] = [];
                let allDeviceIds: string[] = [];
                const allNetworkIDs =  this.selection.selected.map((network) => network.id);

                allNetworkIDs.forEach((networkID) => {
                    getDevicesJobs.push(
                        this.deviceInstancesService.getDeviceInstances({limit: 9999, offset: 0, sortBy: this.sortBy, sortDesc: this.sortDirection === 'desc', hubId: networkID}).pipe(
                            map((devices) => {
                                const deviceIds = devices.result.map((p) => p.id);
                                allDeviceIds = allDeviceIds.concat(deviceIds);

                                if (deviceIds.length > 0) {
                                    deletionJobs.push(this.deviceInstancesService.deleteDeviceInstances(deviceIds));
                                }
                                deletionJobs.push(this.networksService.delete(networkID));
                            })
                        )
                    );
                });

                forkJoin(getDevicesJobs).subscribe({
                    next: (_) => {
                        forkJoin(deletionJobs).subscribe((resps) => {
                            const ok = resps.findIndex((r: any) => r === null || r.status === 500) === -1;
                            if (ok) {
                                this.snackBar.open('Hub ' + (allDeviceIds.length > 0 ? 'and devices ' : '') + 'deleted successfully.', undefined, {
                                    duration: 2000,
                                });
                            } else {
                                this.snackBar.open('Error while deleting the hub' + (allDeviceIds.length > 0 ? ' and devices' : '') + '!', 'close', { panelClass: 'snack-bar-error' });
                                this.ready = true;
                            }

                            this.removeNetworksClientSide(allNetworkIDs);
                        });
                    },
                    error: (_) => {
                        this.snackBar.open('Error while deleting the hub' + (allDeviceIds.length > 0 ? ' and devices' : '') + '!', 'close', { panelClass: 'snack-bar-error' });
                        this.reload();
                    }
                });
            });
    }

    private removeNetworksClientSide(allNetworkIDs: string[]) {
        for (const networkID of allNetworkIDs) {
            const foundIndex = this.dataSource.data.findIndex((network) => network.id === networkID);
            if(foundIndex === -1) {
                continue;
            }
            this.dataSource.data.splice(foundIndex,1);
        };
    }

    shareNetwork(network: HubModel): void {
        this.permissionsDialogService.openPermissionV2Dialog('hubs', network.id, network.name );
    }
}
