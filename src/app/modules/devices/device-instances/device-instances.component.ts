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

import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DeviceInstancesService } from './shared/device-instances.service';
import {
    Attribute,
    DeviceInstanceModel,
    DeviceInstancesRouterStateTabEnum,
    DeviceInstancesTotalModel,
    FilterSelection
} from './shared/device-instances.model';
import { PermissionsDialogService } from '../../permissions/shared/permissions-dialog.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { bulkDelete, countLabel, noneNullOrServerError } from '../../../core/services/delete-flows';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import { DeviceInstancesDialogService } from './shared/device-instances-dialog.service';
import { DeviceTypeService } from '../../metadata/device-types-overview/shared/device-type.service';
import { Sort, MatSort, MatSortHeader } from '@angular/material/sort';
import { ListSelection } from 'src/app/core/classes/list-selection';
import { PagedListState } from 'src/app/core/classes/paged-list-state';
import { UrlStateService } from '../../../core/services/url-state.service';
import { KeepPageInRangeDirective } from '../../../core/directives/keep-page-in-range.directive';
import { MatPaginator } from '@angular/material/paginator';
import { Observable, map, of } from 'rxjs';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';
import { DeviceInstancesFilterDialogComponent } from './dialogs/device-instances-filter-dialog/device-instances-filter-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ExportDataService } from 'src/app/widgets/shared/export-data.service';
import { concatMap } from 'rxjs/operators';
import { PermissionsService } from '../../permissions/shared/permissions.service';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { DeviceInstancesDefaultAttributesDialogComponent } from './dialogs/device-instances-default-attributes-dialog.component';
import { PageHeaderComponent } from '../../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../../core/components/empty-state/empty-state.component';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatChipSet, MatChip, MatChipAvatar, MatChipRemove } from '@angular/material/chips';
import { SpinnerComponent } from '../../../core/components/spinner/spinner.component';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatMenuTrigger, MatMenu, MatMenuContent, MatMenuItem } from '@angular/material/menu';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';

export interface DeviceInstancesRouterState {
    type: DeviceInstancesRouterStateTypesEnum | undefined | null;
    value: any;
}


export enum DeviceInstancesRouterStateTypesEnum {
    NETWORK,
    DEVICE_TYPE,
    LOCATION,
    DEVICE_GROUP,
    CONNECTION_STATE
}

@Component({
    selector: 'senergy-device-instances',
    templateUrl: './device-instances.component.html',
    styleUrls: ['./device-instances.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, MatButton, MatIconButton, MatTooltip, MatIcon, MatChipSet, MatChip, MatChipAvatar, MatChipRemove, SpinnerComponent, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCheckbox, MatCellDef, MatCell, MatSortHeader, RouterLink, MatMenuTrigger, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatMenu, MatMenuContent, MatMenuItem, MatPaginator, KeepPageInRangeDirective]
})
export class DeviceInstancesComponent implements OnInit, AfterViewInit {
    private deviceInstancesService = inject(DeviceInstancesService);
    private router = inject(Router);
    private deviceInstancesDialogService = inject(DeviceInstancesDialogService);
    private snackBar = inject(MatSnackBar);
    private permissionsDialogService = inject(PermissionsDialogService);
    private dialogsService = inject(DialogsService);
    private deviceTypesService = inject(DeviceTypeService);
    private searchbarService = inject(SearchbarService);
    private destroyRef = inject(DestroyRef);
    private dialog = inject(MatDialog);
    private exportDataService = inject(ExportDataService);
    private permissionsService = inject(PermissionsService);
    preferencesService = inject(PreferencesService);
    private cd = inject(ChangeDetectorRef);
    private activatedRoute = inject(ActivatedRoute);
    private urlState = inject(UrlStateService);

    displayedColumns: string[] = [];
    maxShownAttributes = 3;
    dataSource = new MatTableDataSource<DeviceInstanceModel>();
    listSelection = new ListSelection<DeviceInstanceModel>(() => this.dataSource.connect().value);
    selection = this.listSelection.model;
    // 0 until the first answer, so the paginator keeps a page from the URL until the real length is known
    totalCount = 0;
    ready = false;
    searchText = '';
    usage: {
        deviceId: string;
        updateAt: Date;
        bytes: number;
        bytesPerDay: number;
    }[] = [];

    @ViewChild('paginator', { static: false }) paginator!: MatPaginator;

    routerNetwork: string | undefined = undefined;
    routerNetworkName: string | undefined = undefined;
    routerDeviceType: string[] | undefined = undefined;
    routerDeviceTypeNames: string[] = [];
    routerLocation: string | undefined = undefined;
    routerLocationName: string | undefined = undefined;
    routerDeviceIds: string[] | undefined = undefined;
    routerConnectionState: DeviceInstancesRouterStateTabEnum | undefined = undefined;
    routerDeviceAttributeBlacklist?: Attribute[];
    routerAttributeKeys: string[] = [];
    routerAttributeValues: string[] = [];
    DeviceInstancesRouterStateTabEnum = DeviceInstancesRouterStateTabEnum;

    list = new PagedListState(this.preferencesService, () => this.load(), {
        sortBy: 'display_name',
        sortDirection: 'asc',
        remap: { log_state: 'annotations.connected' },
        urlState: this.urlState,
    });

    userHasDeleteAuthorization = false;
    userHasUpdateAuthorization = false;
    userHasReadDeviceUsageAuthorization = false;
    userHasUpdateDisplayNameAuthorization = false;
    userHasUpdateAttributesAuthorization = false;
    userHasCreateAuthoriation = false;
    userHasDefaultAttributesAuthoriation = false;
    userHasShareAuthoriation = false;

    userIdToName: { [key: string]: string } = {};

    ngOnInit(): void {
        this.checkAuthorization();
    }

    ngAfterViewInit(): void {
        this.getRouterParams();
        this.initSearch(); // does automatically load data on first page load
        this.list.connect(this.paginator, this.destroyRef);
    }

    checkAuthorization() {
        this.userHasShareAuthoriation = this.deviceInstancesService.userHasShareAuthorization();
        this.userHasReadDeviceUsageAuthorization = this.exportDataService.userHasUsageAuthroization();
        this.userHasDeleteAuthorization = this.deviceInstancesService.userHasDeleteAuthorization();
        this.userHasCreateAuthoriation = this.deviceInstancesService.userHasCreateAuthorization();
        this.userHasUpdateDisplayNameAuthorization = this.deviceInstancesService.userHasUpdateDisplayNameAuthorization();
        this.userHasUpdateAttributesAuthorization = this.deviceInstancesService.userHasUpdateAttributesAuthorization();
        this.userHasUpdateAuthorization = this.deviceInstancesService.userHasUpdateAuthorization();
        this.userHasDefaultAttributesAuthoriation = this.deviceInstancesService.userHasDefaultAttributesPermissions();

        // The selection column only exists for the bulk actions.
        this.displayedColumns = [
            ...(this.userHasShareAuthoriation || this.userHasDeleteAuthorization ? ['select'] : []),
            'display_name',
            'log_state',
            ...(this.deviceTypesService.userHasReadAuthorization() ? ['device_type'] : []),
            ...(this.userHasReadDeviceUsageAuthorization ? ['usage'] : []),
            'attributes',
            'shared',
            'actions',
        ];
    }

    /** Whether the user may change this device: a right to change name or attributes and the write right on the device. */
    canEdit(device: DeviceInstanceModel): boolean {
        return (this.userHasUpdateDisplayNameAuthorization || this.userHasUpdateAttributesAuthorization) && !!device.permissions?.write;
    }

    get filtered(): boolean {
        const connectionFiltered = this.routerConnectionState !== undefined && this.routerConnectionState !== null
            && this.routerConnectionState !== DeviceInstancesRouterStateTabEnum.ALL;
        return this.searchText !== '' || connectionFiltered || !!this.routerNetwork || !!this.routerLocation
            || (this.routerDeviceType?.length ?? 0) > 0 || this.routerDeviceIds !== undefined
            || this.routerAttributeKeys.length > 0 || this.routerAttributeValues.length > 0
            || (this.routerDeviceAttributeBlacklist?.length ?? 0) > 0;
    }

    private initSearch() {
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    matSortChange($event: Sort) {
        this.list.sortChanged($event);
        this.reload();
    }

    private loadDevicesByIds(): Observable<DeviceInstanceModel[]> {
        // Only called when beeing redirected from device group page
        if (this.routerDeviceIds) {
            return this.deviceInstancesService.getDeviceInstances({ deviceIds: this.routerDeviceIds, limit: this.list.pageSize, offset: this.list.offset }).pipe(
                map(result => {
                    this.setDevicesAndTotal(result);
                    return result.result;
                })
            );
        }
        return of([]);

    }

    openFilterDialog() {
        const filterSelection: FilterSelection = {
            connectionState: this.routerConnectionState,
            network: this.routerNetwork,
            deviceTypes: this.routerDeviceType,
            location: this.routerLocation,
            deviceTypesNames: [],
            deviceAttributeBlacklist: this.routerDeviceAttributeBlacklist,
            attributeKeys: this.routerAttributeKeys,
            attributeValues: this.routerAttributeValues,
        };

        const editDialogRef = this.dialog.open(DeviceInstancesFilterDialogComponent, {
            data: filterSelection,
            minWidth: '50vw',
        });
        editDialogRef.afterClosed().subscribe({
            next: (filterSelectionInner: FilterSelection) => {
                if (filterSelectionInner != null) {
                    this.routerConnectionState = filterSelectionInner.connectionState;
                    this.routerDeviceType = filterSelectionInner.deviceTypes;
                    this.routerDeviceTypeNames = filterSelectionInner.deviceTypesNames;
                    this.routerNetwork = filterSelectionInner.network;
                    this.routerNetworkName = filterSelectionInner.networkName;
                    this.routerLocation = filterSelectionInner.location;
                    this.routerLocationName = filterSelectionInner.locationName;
                    this.routerDeviceAttributeBlacklist = filterSelectionInner.deviceAttributeBlacklist;
                    this.routerAttributeKeys = filterSelectionInner.attributeKeys || [];
                    this.routerAttributeValues = filterSelectionInner.attributeValues || [];
                    this.updateQueryParams();
                    this.cd.detectChanges();
                }
                this.reload();
            }
        });
    }

    openDefaultAttributesDialog() {
        const dialogRef = this.dialog.open(DeviceInstancesDefaultAttributesDialogComponent, {
            minWidth: '50vw',
        });
        dialogRef.afterClosed().subscribe(t => {
            if (t) {
                this.reload();
            }
        });
    }

    private load(): Observable<any> {
        if (this.routerDeviceIds !== undefined) {
            return this.loadDevicesByIds();
        } else {
            return this.deviceInstancesService
                .getDeviceInstances({
                    limit: this.list.pageSize,
                    offset: this.list.offset,
                    sortBy: this.list.sortBy,
                    sortDesc: this.list.sortDirection === 'desc',
                    searchText: this.searchText,
                    locationId: this.routerLocation,
                    hubId: this.routerNetwork,
                    deviceTypeIds: this.routerDeviceType,
                    connectionState: this.routerConnectionState,
                    deviceAttributeBlacklist: this.routerDeviceAttributeBlacklist,
                    attributeKeys: this.routerAttributeKeys,
                    attributeValues: this.routerAttributeValues,
                })
                .pipe(
                    // if no result is found: try to interpret the search as shortDeviceId, convert it to a deviceId and load it
                    concatMap((deviceInstanceWithTotal: DeviceInstancesTotalModel): Observable<DeviceInstancesTotalModel> => {
                        if (deviceInstanceWithTotal.result.length > 0) {
                            return of(deviceInstanceWithTotal);
                        }
                        // we may also search for normal ids
                        if (this.searchText.trim().startsWith('urn:infai:ses:device:')) {
                            return this.deviceInstancesService.getDeviceInstances({ deviceIds: [this.searchText.trim()], limit: 1, offset: 0 });
                        }
                        // short ids are expected to be 22 chars long
                        if (this.searchText.trim().length !== 22) {
                            return of(deviceInstanceWithTotal);
                        }
                        return this.deviceInstancesService.shortIdToUUID(this.searchText).pipe(
                            concatMap((id: string): Observable<DeviceInstancesTotalModel> => {
                                if (id === '' || this.searchText === id) {
                                    return of(deviceInstanceWithTotal);
                                }
                                return this.deviceInstancesService.getDeviceInstances({ deviceIds: [id], limit: 1, offset: 0 });
                            })
                        );
                    }),
                    // handle results
                    map((deviceInstancesWithTotal: DeviceInstancesTotalModel) => {
                        this.loadUserNames(deviceInstancesWithTotal.result);
                        this.setDevicesAndTotal(deviceInstancesWithTotal);
                        return deviceInstancesWithTotal;
                    }),
                    map(deviceInstancesWithTotal => {
                        if (this.userHasReadDeviceUsageAuthorization && deviceInstancesWithTotal.result.length > 0) {
                            this.exportDataService.getTimescaleDeviceUsage(deviceInstancesWithTotal.result.map(di => di.id)).subscribe(r => this.usage.push(...r));
                        }
                    })
                );
        }
    }

    private loadUserNames(elements: { owner_id: string; shared: boolean }[]) {
        const missingCreators: string[] = [];
        elements?.forEach(element => {
            if (element.shared && element.owner_id && !this.userIdToName[element.owner_id] && !missingCreators.includes(element.owner_id)) {
                missingCreators.push(element.owner_id);
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

    private setDevicesAndTotal(result: DeviceInstancesTotalModel) {
        this.dataSource.data = result.result;
        this.totalCount = result.total;
    }

    reload() {
        this.ready = false;
        this.selectionClear();
        this.usage = [];

        this.list.reload({
            error: (err) => {
                console.log(err);
                this.ready = true;
            },
            next: () => {
                this.ready = true;
            }
        });
    }

    /** The data dialog; its Edit action opens the edit dialog and exists only where the row menu offers Edit. */
    showInfoOfDevice(device: DeviceInstanceModel): void {
        this.deviceInstancesDialogService.openDeviceServiceDialog(device, this.canEdit(device) ? () => this.editDevice(device) : undefined);
    }

    /** Row click: the data dialog with the current values and the connection history. */
    openDevice(device: DeviceInstanceModel): void {
        this.showInfoOfDevice(device);
    }

    editDevice(device: DeviceInstanceModel, readOnly = false): void {
        this.deviceInstancesDialogService.openDeviceEditDialog(
            device,
            this.userHasUpdateAuthorization && !readOnly,
            this.userHasUpdateDisplayNameAuthorization && !readOnly,
            this.userHasUpdateAttributesAuthorization && !readOnly,
            (spinnerState: boolean) => {
                this.ready = !spinnerState;
            }).subscribe({
                next: (newDevice) => {
                    if (newDevice != null) {
                        const index = this.dataSource.data.findIndex(element => element.id === device.id);
                        const data = this.dataSource.data.slice();
                        data[index] = newDevice;
                        this.dataSource.data = data;
                    }
                }
            });
    }

    duplicateDevice(device: DeviceInstanceModel): void {
        this.deviceInstancesDialogService.openDeviceCreateDialog(undefined, device);
    }

    replaceDevice(device: DeviceInstanceModel): void {
        this.deviceInstancesDialogService.openDeviceReplaceDialog(device).afterClosed().subscribe((needReload: boolean) => {
            if (needReload) {
                this.reload();
            }
        });
    }

    deleteDevice(device: DeviceInstanceModel): void {
        this.dialogsService
            .openDeleteDialog('device')
            .afterClosed()
            .subscribe((deviceDelete: boolean | undefined) => {
                if (deviceDelete) {
                    this.ready = false;
                    this.deviceInstancesService.deleteDeviceInstance(device.id).subscribe((resp: DeviceInstanceModel | null) => {
                        this.ready = true;
                        if (resp !== null) {
                            snackSuccess(this.snackBar, 'Device deleted successfully.');
                        } else {
                            snackError(this.snackBar, 'Error while deleting device!');
                        }
                        // do deletion on the client instead of reloading, because of caching/slow deletion
                        const index = this.dataSource.data.findIndex(element => element.id === device.id);
                        const data = this.dataSource.data.slice();
                        data.splice(index, 1);
                        this.dataSource.data = data;
                    });
                }
            });
    }

    shareDevice(device: DeviceInstanceModel): void {
        this.permissionsDialogService.openPermissionV2Dialog('devices', device.id, device.display_name || device.name);
    }

    // devices without administrate rights cannot be shared, they are left out of a bulk share
    administrableSelection(): DeviceInstanceModel[] {
        return this.selection.selected.filter((device: DeviceInstanceModel) => device.permissions.administrate);
    }

    shareMultipleDevices(): void {
        const devices = this.administrableSelection();
        if (devices.length === 0) {
            snackError(this.snackBar, 'You may only share devices you administrate.');
            return;
        }
        const skipped = this.selection.selected.length - devices.length;
        let hint = 'The permissions are added to the permissions these devices already have.';
        if (skipped > 0) {
            hint += ' ' + skipped + (skipped > 1 ? ' selected devices are' : ' selected device is') +
                ' left out, because you do not administrate ' + (skipped > 1 ? 'them.' : 'it.');
        }
        this.permissionsDialogService
            .openPermissionV2BulkDialog(
                'devices',
                devices.map((device: DeviceInstanceModel) => device.id),
                devices.length + (devices.length > 1 ? ' devices' : ' device'),
                hint,
            )
            .subscribe((saved: boolean) => {
                if (saved) {
                    this.selectionClear();
                }
            });
    }

    // the filter values the page holds; search, sort and page writes leave them unchanged
    private filterState(): string {
        return JSON.stringify([
            this.routerConnectionState, this.routerDeviceType, this.routerDeviceTypeNames, this.routerNetwork,
            this.routerNetworkName, this.routerLocation, this.routerLocationName, this.routerDeviceIds,
            this.routerAttributeKeys, this.routerAttributeValues, this.routerDeviceAttributeBlacklist,
        ]);
    }

    private getRouterParams(): void {
        let opening = true;
        this.activatedRoute.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            const before = this.filterState();
            if (params !== undefined && params !== null) {
                if (params.has('device-type-id')) {
                    this.routerDeviceType = params.getAll('device-type-id');
                } else {
                    this.routerDeviceType = undefined;
                }
                if (params.has('device-type-name')) {
                    this.routerDeviceTypeNames = params.getAll('device-type-name');
                } else {
                    this.routerDeviceTypeNames = [];
                }
                this.routerNetwork = params.get('network-id') || undefined;
                this.routerNetworkName = params.get('network-name') || undefined;
                this.routerLocation = params.get('location-id') || undefined;
                this.routerLocationName = params.get('location-name') || undefined;
                if (params.has('device-id')) {
                    this.routerDeviceIds = params.getAll('device-id');
                } else {
                    this.routerDeviceIds = undefined;
                }
                if (params.has('connection-state')) {
                    this.routerConnectionState = parseInt(params.get('connection-state') || '0') as DeviceInstancesRouterStateTabEnum || undefined;
                } else {
                    this.routerConnectionState = undefined;
                }
                this.routerAttributeKeys = params.has('attribute-key') ? params.getAll('attribute-key') : [];
                this.routerAttributeValues = params.has('attribute-value') ? params.getAll('attribute-value') : [];
                if (params.has('device-attribute-blacklist')) {
                    const rawAttributes = params.getAll('device-attribute-blacklist');
                    this.routerDeviceAttributeBlacklist = [];
                    rawAttributes.forEach(attr => {
                       this.routerDeviceAttributeBlacklist!.push(...(JSON.parse(decodeURIComponent(attr)) as Attribute[]));
                    });
                } else {
                    this.routerDeviceAttributeBlacklist = undefined;
                }
            }
            this.cd.detectChanges();
            // The first emission only reads the filters: the search subscription makes the opening load. A filter set
            // from this page is already in the fields and loads from its own call.
            if (!opening && this.filterState() !== before) {
                this.reload();
            }
            opening = false;
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
        bulkDelete(this.dialogsService, this.snackBar, {
            text: countLabel(this.selection.selected.length, 'device', 'devices'),
            before: () => {
                this.ready = false;
            },
            jobs: () => this.selection.selected.map((device: DeviceInstanceModel) => this.deviceInstancesService.deleteDeviceInstance(device.id)),
            isSuccess: noneNullOrServerError,
            successMessage: 'Devices deleted successfully.',
            errorMessage: 'Error while deleting devices!',
            after: () => this.reload(),
        });
    }

    getUsage(d: DeviceInstanceModel) {
        return this.usage.find(u => u.deviceId === d.id);
    }

    formatBytes(bytes: number, decimals = 2) {
        if (bytes === -1) {
            return '';
        }
        if (!+bytes) {
            return '0 Bytes';
        }

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    getUsageTooltip(d: DeviceInstanceModel): string {
        const usage = this.getUsage(d);
        if (usage === undefined) {
            return '';
        }
        return this.formatBytes(usage?.bytesPerDay || 0) + '/day, ' + this.formatBytes((usage?.bytesPerDay || 0) * 30) + '/month';
    }


    attributes(device: DeviceInstanceModel): Attribute[] {
        const attributes = device.attributes?.filter(a => a.key !== this.deviceInstancesService.nicknameAttributeKey) || [];
        // keeps filtered attributes visible on devices that have more attributes than the table shows
        return attributes.sort((a, b) => Number(this.isAttributeFiltered(b)) - Number(this.isAttributeFiltered(a)));
    }

    shownAttributes(device: DeviceInstanceModel): Attribute[] {
        return this.attributes(device).slice(0, this.maxShownAttributes);
    }

    hiddenAttributes(device: DeviceInstanceModel): Attribute[] {
        return this.attributes(device).slice(this.maxShownAttributes);
    }

    attributeTooltip(attr: Attribute): string {
        return attr.key + ' = ' + attr.value + (attr.origin ? ' (' + attr.origin + ')' : '');
    }

    attributeChipTooltip(attr: Attribute): string {
        return this.attributeTooltip(attr) + (this.isAttributeFiltered(attr) ? ' - click to remove filter' : ' - click to filter');
    }

    isAttributeFiltered(attr: Attribute): boolean {
        return this.routerAttributeKeys.includes(attr.key);
    }

    toggleAttributeFilter(attr: Attribute) {
        const index = this.routerAttributeKeys.indexOf(attr.key);
        if (index === -1) {
            this.routerAttributeKeys.push(attr.key);
        } else {
            this.routerAttributeKeys.splice(index, 1);
        }
        this.updateQueryParams();
        this.reload();
    }

    hasFilteredHiddenAttribute(device: DeviceInstanceModel): boolean {
        return this.hiddenAttributes(device).some(a => this.isAttributeFiltered(a));
    }

    isActive(device: DeviceInstanceModel): boolean {
        return device.attributes?.find(a => a.key === 'inactive' && a.value === 'true') === undefined;
    }

    updateQueryParams() {
        // every key of this page is set, so absent filters are removed; merge keeps search, sort and dir
        const queryParams: any = {
            'connection-state': null,
            'device-type-id': null,
            'device-type-name': null,
            'network-id': null,
            'network-name': null,
            'location-id': null,
            'location-name': null,
            'device-id': null,
            'attribute-key': null,
            'attribute-value': null,
            'device-attribute-blacklist': null,
            page: null,
        };
        if (this.routerConnectionState) {
            queryParams['connection-state'] = this.routerConnectionState;
        }
        if (this.routerDeviceType) {
            queryParams['device-type-id'] = this.routerDeviceType;
            if (this.routerDeviceTypeNames) {
                queryParams['device-type-name'] = this.routerDeviceTypeNames;
            }
        }
        if (this.routerNetwork) {
            queryParams['network-id'] = this.routerNetwork;
            if (this.routerNetworkName) {
               queryParams['network-name'] = this.routerNetworkName;
            }
        }
        if (this.routerLocation) {
            queryParams['location-id'] = this.routerLocation;
            if (this.routerLocationName) {
               queryParams['location-name'] = this.routerLocationName;
            }
        }
        if (this.routerAttributeKeys.length > 0) {
            queryParams['attribute-key'] = this.routerAttributeKeys;
        }
        if (this.routerAttributeValues.length > 0) {
            queryParams['attribute-value'] = this.routerAttributeValues;
        }
        if (this.routerDeviceAttributeBlacklist && this.routerDeviceAttributeBlacklist.length > 0) {
            queryParams['device-attribute-blacklist'] = encodeURIComponent(JSON.stringify(this.routerDeviceAttributeBlacklist));
        }
        this.router.navigate(
            [],
            {
                relativeTo: this.activatedRoute,
                queryParams,
                queryParamsHandling: 'merge',
            },
        );
    }
}
