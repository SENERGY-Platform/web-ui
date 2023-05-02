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
import {MatLegacyDialog as MatDialog} from '@angular/material/legacy-dialog';
import {NetworksDeleteDialogComponent} from './dialogs/networks-delete-dialog.component';
import {DeviceInstancesService} from '../device-instances/shared/device-instances.service';
import {MatTableDataSource} from '@angular/material/table';
import {MatSort, Sort} from '@angular/material/sort';
import {UntypedFormControl} from '@angular/forms';
import {debounceTime} from 'rxjs/operators';
import { SelectionModel } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { DialogsService } from 'src/app/core/services/dialogs.service';
import {MatLegacySnackBar as MatSnackBar} from '@angular/material/legacy-snack-bar';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';

@Component({
    selector: 'senergy-networks',
    templateUrl: './networks.component.html',
    styleUrls: ['./networks.component.css'],
})
export class NetworksComponent implements OnInit, OnDestroy {
    readonly pageSize = 20;
    dataSource = new MatTableDataSource<NetworksModel>();
    @ViewChild(MatSort) sort!: MatSort;
    selection = new SelectionModel<NetworksModel>(true, []);
    searchText: string = ""
    totalCount = 200;
    ready = false;
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;

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
        this.initSearch();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    ngAfterViewInit(): void {
        this.dataSource.sortingDataAccessor = (row: any, sortHeaderId: string) => {
            var value;
            if(sortHeaderId == 'connection') {
                value = row.annotations?.connected;
            } else if(sortHeaderId == 'number_devices') {
                if(!row.device_local_ids) {
                    value = 0;
                } else {
                    value = row.device_local_ids?.length;
                }
            } else {
                    value = row[sortHeaderId];
            }
            value = (typeof(value) === 'string') ? value.toUpperCase(): value;
            return value
        };
        this.dataSource.sort = this.sort;

        this.paginator.page.subscribe(()=>{
            this.getNetworks()
        });
        this.getNetworks();
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
        this.deviceInstancesService.getDeviceInstancesByHubId(9999, 0, 'name', 'asc', network.id, null).subscribe((devices) => {
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
        var offset = this.paginator.pageSize * this.paginator.pageIndex;

        this.networksService
            .searchNetworks(this.searchText, this.pageSize, offset, 'name', 'asc')
            .subscribe((networks: NetworksModel[]) => {
                this.dataSource.data = networks;
                this.ready = true;
            });
    }

    reload() {
        this.paginator.pageIndex = 0;
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
                var allDeviceIds: string[] = []
        
                this.selection.selected.forEach((network: NetworksModel) => {
                    this.deviceInstancesService.getDeviceInstancesByHubId(9999, 0, 'name', 'asc', network.id, null).subscribe((devices) => {
                        const deviceIds = devices.map((p) => p.id);
                        allDeviceIds = allDeviceIds.concat(deviceIds)

                        if (deviceIds.length > 0) {
                            deletionJobs.push(this.deviceInstancesService.deleteDeviceInstances(deviceIds));
                        }
                        deletionJobs.push(this.networksService.delete(network.id));
                    })
                })
                
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

                    this.reload()
                });
            }
        })
    }
}
