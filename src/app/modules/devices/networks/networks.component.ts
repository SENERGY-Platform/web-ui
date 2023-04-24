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

import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';

import { NetworksService } from './shared/networks.service';
import { NetworksModel } from './shared/networks.model';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { DeviceInstancesRouterState, DeviceInstancesRouterStateTypesEnum } from '../device-instances/device-instances.component';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { NetworksDeleteDialogComponent } from './dialogs/networks-delete-dialog.component';
import { DeviceInstancesService } from '../device-instances/shared/device-instances.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { FormControl } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';

@Component({
    selector: 'senergy-networks',
    templateUrl: './networks.component.html',
    styleUrls: ['./networks.component.css'],
})
export class NetworksComponent implements OnInit, OnDestroy {
    networks: NetworksModel[] = [];
    dataSource = new MatTableDataSource(this.networks)
    @ViewChild(MatSort) sort!: MatSort

    searchControl = new FormControl('');

    ready = false;

    private limitInit = 54;
    private limit = this.limitInit;
    private offset = 0;
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    constructor(
        private networksService: NetworksService,
        private router: Router,
        private dialog: MatDialog,
        private deviceInstancesService: DeviceInstancesService,
    ) {}

    ngOnInit() {
        this.getNetworks();
        this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe(() => this.reload());

    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.setRepoItemsParams(this.limitInit);
            this.getNetworks();
        }
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
                        this.networks.splice(this.networks.indexOf(network), 1);
                        this.setRepoItemsParams(1);
                        setTimeout(() => {
                            this.getNetworks();
                        }, 1000);
                    }
                });
        });
    }

    private getNetworks() {
        this.networksService
            .searchNetworks(this.searchControl.value, this.limit, this.offset, "name", "asc")
            .subscribe((networks: NetworksModel[]) => {
                if (networks.length !== this.limit) {
                    this.allDataLoaded = true;
                }
                this.networks = this.networks.concat(networks);
                this.dataSource = new MatTableDataSource(this.networks)
                this.dataSource.sort = this.sort
                this.ready = true;
            });
    }

    private setRepoItemsParams(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.networks.length;
    }

    reload() {
        this.limit = this.limitInit;
        this.offset = 0;
        this.networks = [];
        this.getNetworks();
    }

    resetSearch() {
        this.searchControl.setValue('');
    }
}
