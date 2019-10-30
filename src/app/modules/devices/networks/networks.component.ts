/*
 * Copyright 2018 InfAI (CC SES)
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

import {Component, OnDestroy, OnInit} from '@angular/core';

import {NetworksService} from './shared/networks.service';
import {NetworksModel} from './shared/networks.model';
import {ResponsiveService} from '../../../core/services/responsive.service';
import {SearchbarService} from '../../../core/components/searchbar/shared/searchbar.service';
import {Subscription} from 'rxjs';
import {SortModel} from '../../../core/components/sort/shared/sort.model';
import {Router} from '@angular/router';
import {DialogsService} from '../../../core/services/dialogs.service';
import {MatSnackBar} from '@angular/material';

const grids = new Map([
    ['xs', 1],
    ['sm', 3],
    ['md', 3],
    ['lg', 4],
    ['xl', 6],
]);

@Component({
    selector: 'senergy-networks',
    templateUrl: './networks.component.html',
    styleUrls: ['./networks.component.css']
})
export class NetworksComponent implements OnInit, OnDestroy {

    networks: NetworksModel[] = [];
    gridCols = 0;
    ready = false;
    sortAttributes = new Array(new SortModel('Name', 'name', 'asc'));

    private searchText = '';
    private limitInit = 54;
    private limit = this.limitInit;
    private offset = 0;
    private sortAttribute = this.sortAttributes[0];
    private searchSub: Subscription = new Subscription();
    private allDataLoaded = false;

    constructor(private searchbarService: SearchbarService,
                private responsiveService: ResponsiveService,
                private networksService: NetworksService,
                private router: Router,
                private dialogsService: DialogsService,
                private snackBar: MatSnackBar) {
    }

    ngOnInit() {
        this.initGridCols();
        this.initSearchAndGetNetworks();
    }

    ngOnDestroy() {
        this.searchSub.unsubscribe();
    }

    receiveSortingAttribute(sortAttribute: SortModel) {
        this.sortAttribute = sortAttribute;
        this.getNetworks(true);
    }

    onScroll() {
        if (!this.allDataLoaded && this.ready) {
            this.setRepoItemsParams(this.limitInit);
            this.getNetworks(false);
        }
    }

    edit(network: NetworksModel) {
        this.networksService.openNetworkEditDialog(network);
    }

    showDevices(network: NetworksModel) {
        this.router.navigateByUrl('/devices/deviceinstances', {state: network});
    }

    clear(network: NetworksModel) {
        this.networksService.openNetworkClearDialog(network);
    }

    delete(network: NetworksModel) {
        this.dialogsService.openDeleteDialog('hub').afterClosed().subscribe((deleteNetwork: boolean) => {
            if (deleteNetwork) {
                this.networksService.delete(network.id).subscribe((resp: {status: number}) => {
                    if (resp.status === 200) {
                        this.networks.splice(this.networks.indexOf(network), 1);
                        this.snackBar.open('Hub deleted successfully.', undefined, {duration: 2000});
                        this.setRepoItemsParams(1);
                        setTimeout(() => {
                            this.getNetworks(false);
                        }, 1000);
                    } else {
                        this.snackBar.open('Error while deleting the hub!', undefined, {duration: 2000});
                    }
                });
            }
        });
    }

    private initSearchAndGetNetworks() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.getNetworks(true);
        });
    }

    private getNetworks(reset: boolean) {
        if (reset) {
            this.setRepoItemsParams(this.limitInit);
            this.reset();
        }

        this.networksService.getNetworks(
            this.searchText, this.limit, this.offset, this.sortAttribute.value, this.sortAttribute.order).subscribe(
            (networks: NetworksModel[]) => {
                if (networks.length !== this.limit) {
                    this.allDataLoaded = true;
                }
                this.networks = this.networks.concat(networks);
                this.ready = true;
            });
    }

    private initGridCols(): void {
        this.gridCols = grids.get(this.responsiveService.getActiveMqAlias()) || 0;
        this.responsiveService.observeMqAlias().subscribe((mqAlias) => {
            this.gridCols = grids.get(mqAlias) || 0;
        });
    }

    private reset() {
        this.networks = [];
        this.offset = 0;
        this.allDataLoaded = false;
        this.ready = false;
    }

    private setRepoItemsParams(limit: number) {
        this.ready = false;
        this.limit = limit;
        this.offset = this.networks.length;
    }

}
