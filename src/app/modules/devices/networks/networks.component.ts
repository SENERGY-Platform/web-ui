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

import { AfterViewInit, Component, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NetworksService } from './shared/networks.service';
import { ExtendedHubModel, ExtendedHubTotalModel, HubModel } from './shared/networks.model';
import { forkJoin, Observable, map } from 'rxjs';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NetworksDeleteDialogComponent } from './dialogs/networks-delete-dialog.component';
import { DeviceInstancesService } from '../device-instances/shared/device-instances.service';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { Sort, MatSort, MatSortHeader } from '@angular/material/sort';
import { ListSelection } from 'src/app/core/classes/list-selection';
import { PagedListState } from 'src/app/core/classes/paged-list-state';
import { MatPaginator } from '@angular/material/paginator';
import { DialogsService } from 'src/app/core/services/dialogs.service';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { SearchbarComponent } from '../../../core/components/searchbar/searchbar.component';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { MatCheckbox } from '@angular/material/checkbox';
import { StateIconComponent } from '../../../core/components/state-icon/state-icon.component';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconButton, MatFabButton } from '@angular/material/button';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';

@Component({
    selector: 'senergy-networks',
    templateUrl: './networks.component.html',
    styleUrls: ['./networks.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [SearchbarComponent, SpinnerComponent, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatSortHeader, StateIconComponent, MatIcon, MatTooltip, MatIconButton, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, MatFabButton]
})
export class NetworksComponent implements OnInit, AfterViewInit {
    private networksService = inject(NetworksService);
    private searchbarService = inject(SearchbarService);
    private destroyRef = inject(DestroyRef);
    private router = inject(Router);
    private dialog = inject(MatDialog);
    private deviceInstancesService = inject(DeviceInstancesService);
    private dialogsService = inject(DialogsService);
    private snackBar = inject(MatSnackBar);
    private permissionsDialogService = inject(PermissionsDialogService);
    private permissionsService = inject(PermissionsService);
    private preferencesService = inject(PreferencesService);

    displayedColumns = ['select', 'connection', 'shared', 'name', 'number_devices', 'show', 'clear'];
    dataSource = new MatTableDataSource<HubModel>();
    list = new PagedListState(this.preferencesService, () => this.getNetworks(), { sortBy: 'name', sortDirection: 'asc' });
    listSelection = new ListSelection<HubModel>(() => this.dataSource.connect().value);
    selection = this.listSelection.model;
    searchText = '';
    totalCount = 200;
    ready = false;
    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;
    userHasUpdateAuthorization = false;
    userHasDeleteAuthorization = false;
    userHasShareAuthorization = false;
    userHasCreateAuthorization = false;

    userIdToName: { [key: string]: string } = {};


    ngOnInit() {
        this.initSearch();
        this.checkAuthorization();
    }

    checkAuthorization() {
        this.userHasShareAuthorization = this.networksService.userHasShareAuthorization();
        if (this.userHasShareAuthorization) {
            this.displayedColumns.push('share');
        }

        if (this.networksService.userHasLoraCertAuthorization()) {
            this.displayedColumns.push('certs');
        }

        this.userHasUpdateAuthorization = this.networksService.userHasUpdateAuthorization();
        if (this.userHasUpdateAuthorization) {
            this.displayedColumns.push('edit');
        }

        this.userHasDeleteAuthorization = this.networksService.userHasDeleteAuthorization();
        if (this.userHasDeleteAuthorization) {
            this.displayedColumns.push('delete');
        }

        this.userHasCreateAuthorization = this.networksService.userHasCreateAuthorization();
    }

    private initSearch() {
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    matSortChange($event: Sort) {
        // TODO Ingo suche connection
        this.list.sortChanged($event, { connection: 'annotations.connected', number_devices: 'device_local_ids' });
        this.reload();
    }

    ngAfterViewInit(): void {
        this.list.connect(this.paginator, this.destroyRef);
    }

    edit(network?: HubModel) {
        this.networksService.openNetworkEditDialog(network);
    }

    showDevices(network: HubModel) {
        this.router.navigate(['/devices/deviceinstances'], {
            queryParams: {
                'network-id': network.id,
                'network-name': network.name,
            },
        });
    }

    clear(network: HubModel) {
        this.networksService.openNetworkClearDialog(network);
    }

    delete(network: HubModel) {
        this.deviceInstancesService.getDeviceInstances({ limit: 9999, offset: 0, sortBy: this.list.sortBy, sortDesc: this.list.sortDirection === 'desc', hubId: network.id }).subscribe((devices) => {
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
            .listExtendedHubs({ limit: this.list.pageSize, offset: this.list.offset, sortBy: this.list.sortBy, sortDesc: this.list.sortDirection !== 'asc', searchText: this.searchText })
            .pipe(
                map((networks: ExtendedHubTotalModel) => {
                    this.totalCount = networks.total;
                    this.loadUserNames(networks.result.map(n => ({ creator: n.owner_id, shared: n.shared })));
                    this.dataSource.data = networks.result;
                    return networks.result;
                })
            );
    }

    private loadUserNames(elements: { creator: string; shared: boolean }[]) {
        const missingCreators: string[] = [];
        elements?.forEach(element => {
            if (element.shared && element.creator && !this.userIdToName[element.creator] && !missingCreators.includes(element.creator)) {
                missingCreators.push(element.creator);
            }
        });
        missingCreators.forEach(creator => {
            this.permissionsService.getUserById(creator).subscribe(value => {
                if (value) {
                    this.userIdToName[value.id] = value.username;
                }
            });
        });
    }

    reload() {
        this.ready = false;
        this.selectionClear();

        this.list.reload({
            next: (_) => {
                this.ready = true;
            },
            error: (_) => {
                this.ready = true;
            }
        });
    }

    isAllSelected() {
        return this.listSelection.isAllSelected();
    }

    masterToggle() {
        this.listSelection.masterToggle();
    }

    selectionClear(): void {
        this.selection.clear();
    }

    deleteMultipleItems() {
        this.dialogsService
            .openDeleteDialog(this.selection.selected.length + (this.selection.selected.length > 1 ? ' networks' : ' network'))
            .afterClosed()
            .subscribe((deleteNetworks: boolean | undefined) => {
                if (!deleteNetworks) {
                    return;
                }

                const deletionJobs: Observable<any>[] = [];
                const getDevicesJobs: Observable<any>[] = [];
                let allDeviceIds: string[] = [];
                const allNetworkIDs = this.selection.selected.map((network) => network.id);

                allNetworkIDs.forEach((networkID) => {
                    getDevicesJobs.push(
                        this.deviceInstancesService.getDeviceInstances({ limit: 9999, offset: 0, sortBy: this.list.sortBy, sortDesc: this.list.sortDirection === 'desc', hubId: networkID }).pipe(
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
                                snackSuccess(this.snackBar, 'Hub ' + (allDeviceIds.length > 0 ? 'and devices ' : '') + 'deleted successfully.');
                            } else {
                                snackError(this.snackBar, 'Error while deleting the hub' + (allDeviceIds.length > 0 ? ' and devices' : '') + '!');
                                this.ready = true;
                            }

                            this.removeNetworksClientSide(allNetworkIDs);
                        });
                    },
                    error: (_) => {
                        snackError(this.snackBar, 'Error while deleting the hub' + (allDeviceIds.length > 0 ? ' and devices' : '') + '!');
                        this.reload();
                    }
                });
            });
    }

    private removeNetworksClientSide(allNetworkIDs: string[]) {
        for (const networkID of allNetworkIDs) {
            const foundIndex = this.dataSource.data.findIndex((network) => network.id === networkID);
            if (foundIndex === -1) {
                continue;
            }
            this.dataSource.data.splice(foundIndex, 1);
        };
    }

    shareNetwork(network: HubModel): void {
        this.permissionsDialogService.openPermissionV2Dialog('hubs', network.id, network.name);
    }

    getLoraCerts(network: HubModel): void {
        let expires = '';
        network.attributes?.forEach(attribute => {
            if (attribute.key === 'senergy/lora/certs-expiration' && attribute.value) {
                expires = attribute.value;
            }
        });
        const showDialog = () => {
            this.networksService.getLoraCerts(network).subscribe(certs => {
                this.networksService.openLoraCertsDialog(network, certs);
            }
            );
        };
        if (new Date(expires).valueOf() - new Date().valueOf() > 30 * 24 * 3600 * 1000) {
            this.dialogsService.openConfirmDialog('LoRaWAN Certificates', 'The current certificates will NOT expire soon. If you\'ve lost access to the current certificates, it is recommended to first change the EUI of the gateway and then retrieve new certs. Do you still want to generate new certificates?').afterClosed().subscribe((generate: boolean | undefined) => {
                if (generate) {
                    showDialog();
                }
            });
        } else {
            showDialog();
        }
    }

    getLoraCertsDisabled(network: ExtendedHubModel): boolean {
        if (!network.permissions.write || !network.permissions.administrate) {
            return true;
        }
        let hasEUI = false;
        network.attributes?.forEach(attribute => {
            if (attribute.key === 'senergy/lora/eui' && attribute.value) {
                hasEUI = true;
            }
        });
        return !hasEUI;
    }
}
