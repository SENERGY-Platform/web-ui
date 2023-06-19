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

import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';

import {NetworksService} from './shared/networks.service';
import {NetworksModel} from './shared/networks.model';
import {forkJoin, Observable, Subscription} from 'rxjs';
import {Router} from '@angular/router';
import {
    DeviceInstancesRouterState,
    DeviceInstancesRouterStateTypesEnum
} from '../device-instances/device-instances.component';
import {MatDialog} from '@angular/material/dialog';
import {NetworksDeleteDialogComponent} from './dialogs/networks-delete-dialog.component';
import {DeviceInstancesService} from '../device-instances/shared/device-instances.service';
import {MatTableDataSource} from '@angular/material/table';
import {MatSort, Sort, SortDirection} from '@angular/material/sort';
import {SelectionModel} from '@angular/cdk/collections';
import {MatPaginator} from '@angular/material/paginator';
import {DialogsService} from 'src/app/core/services/dialogs.service';
import {SearchbarService} from 'src/app/core/components/searchbar/shared/searchbar.service';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
    selector: 'senergy-networks',
    templateUrl: './networks.component.html',
    styleUrls: ['./networks.component.css'],
})
export class NetworksComponent implements OnInit, OnDestroy {
    displayedColumns = ['select', 'connection', 'name', 'number_devices', 'show', 'clear']
    pageSize = 20;
    dataSource = new MatTableDataSource<NetworksModel>();
    sortBy: string = "name"
    sortDirection: SortDirection = "asc"    
    selection = new SelectionModel<NetworksModel>(true, []);
    searchText = '';
    totalCount = 200;
    offset = 0;
    ready = false;
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    userHasUpdateAuthorization: boolean = false
    userHasDeleteAuthorization: boolean = false

    private searchSub: Subscription = new Subscription();

    constructor(
        private networksService: NetworksService,
        private searchbarService: SearchbarService,
        private router: Router,
        private dialog: MatDialog,
        private deviceInstancesService: DeviceInstancesService,
        private dialogsService: DialogsService,
        private snackBar: MatSnackBar,
    ) {}

    ngOnInit() {
        this.networksService.getTotalCountOfNetworks().subscribe(totalCount => this.totalCount = totalCount)
        this.initSearch();
        this.checkAuthorization();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    checkAuthorization() {
        this.networksService.userHasUpdateAuthorization().subscribe(hasAuth => {
            this.userHasUpdateAuthorization = hasAuth
            if(hasAuth) {
                this.displayedColumns.push("edit")
            }
        })
        this.networksService.userHasDeleteAuthorization().subscribe(hasAuth => {
            this.userHasDeleteAuthorization = hasAuth
            if(hasAuth) {
                this.displayedColumns.push("delete")
            }
        })
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active 

        // TODO Ingo suche connection 
        if (this.sortBy == "connection") {
            this.sortBy = "annotations.connected"
        } else if (this.sortBy == "number_devices") {
            this.sortBy = "device_local_ids"
        }
        this.sortDirection = $event.direction;
        this.reload();
    }

    ngAfterViewInit(): void {
        this.paginator.page.subscribe(()=>{
            this.pageSize = this.paginator.pageSize
            this.offset = this.paginator.pageSize * this.paginator.pageIndex;
            this.getNetworks();
        });
    }

    edit(network: NetworksModel) {
        this.networksService.openNetworkEditDialog(network);
    }

    showDevices(network: NetworksModel) {
        this.router.navigateByUrl('/devices/deviceinstances', {
            state: { type: DeviceInstancesRouterStateTypesEnum.NETWORK, value: network } as DeviceInstancesRouterState,
        });
    }

    clear(network: NetworksModel) {
        this.networksService.openNetworkClearDialog(network);
    }

    delete(network: NetworksModel) {
        this.deviceInstancesService.getDeviceInstancesByHubId(9999, 0, this.sortBy, this.sortDirection, network.id, null).subscribe((devices) => {
            this.dialog
                .open(NetworksDeleteDialogComponent, { data: { networkId: network.id, devices }, minWidth: '300px' })
                .afterClosed()
                .subscribe((deleteNetwork: boolean) => {
                    if (deleteNetwork) {
                        setTimeout(() => {
                            this.getNetworks();
                        }, 1000);
                    }
                });
        });
    }

    private getNetworks() {
        this.ready = false;

        this.networksService
            .searchNetworks(this.searchText, this.pageSize, this.offset, this.sortBy, this.sortDirection)
            .subscribe((networks: NetworksModel[]) => {
                this.dataSource.data = networks;
                this.ready = true;
            });
    }

    reload() {
        this.offset = 0;
        this.pageSize = 20;
        this.ready = false;
        this.selectionClear();
        this.getNetworks();
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
                if (deleteNetworks) {
                    const deletionJobs: Observable<any>[] = [];
                    let allDeviceIds: string[] = [];

                    this.selection.selected.forEach((network: NetworksModel) => {
                        this.deviceInstancesService.getDeviceInstancesByHubId(9999, 0, this.sortBy, this.sortDirection, network.id, null).subscribe((devices) => {
                            const deviceIds = devices.map((p) => p.id);
                            allDeviceIds = allDeviceIds.concat(deviceIds);

                            if (deviceIds.length > 0) {
                                deletionJobs.push(this.deviceInstancesService.deleteDeviceInstances(deviceIds));
                            }
                            deletionJobs.push(this.networksService.delete(network.id));
                        });
                    });

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

                        this.reload();
                    });
                }
            });
    }
}
