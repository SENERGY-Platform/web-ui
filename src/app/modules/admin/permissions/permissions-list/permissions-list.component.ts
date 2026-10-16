/*
 *
 *     Copyright 2018 InfAI (CC SES)
 *
 *     Licensed under the Apache License, Version 2.0 (the “License”);
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an “AS IS” BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */

import {SelectionModel} from '@angular/cdk/collections';
import { AfterViewInit, Component, isDevMode, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {MatDialog} from '@angular/material/dialog';
import { MatSort, Sort, MatSortHeader } from '@angular/material/sort';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import {DomSanitizer} from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { snackError } from 'src/app/core/services/snack-bar-messages';
import {interval, Observable} from 'rxjs';
import {debounce, map, startWith} from 'rxjs/operators';
import { AuthorizationService } from 'src/app/core/services/authorization.service';
import { KongService } from '../shared/services/kong.service';
import { LadonService } from '../shared/services/ladom.service';
import { PermissionModel, PermissionTestResponse } from '../shared/permission.model';
import {PermissionsDialogImportComponent} from '../permissions-dialog-import/permissions-dialog-import.component';
import {PermissionImportModel} from '../permissions-dialog-import/permissions-dialog-import.model';
import {PermissionsEditComponent} from '../permissions-edit/permissions-edit.component';
import {DialogsService} from '../../../../core/services/dialogs.service';
import {MatPaginator, PageEvent} from '@angular/material/paginator';
import { PreferencesService } from 'src/app/core/services/preferences.service';
import { PageHeaderComponent } from '../../../../core/components/page-header/page-header.component';
import { ListToolbarComponent } from '../../../../core/components/list-toolbar/list-toolbar.component';
import { EmptyStateComponent } from '../../../../core/components/empty-state/empty-state.component';
import { FormSectionComponent } from '../../../../core/components/form-section/form-section.component';
import { SearchbarService } from '../../../../core/components/searchbar/shared/searchbar.service';
import { PermissionsFilterDialogComponent, PermissionsFilterDialogData, PermissionsFilterSelection } from '../permissions-filter-dialog/permissions-filter-dialog.component';
import { MatChip, MatChipAvatar, MatChipRemove, MatChipSet } from '@angular/material/chips';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { MatInput } from '@angular/material/input';
import { MatAutocompleteTrigger, MatAutocomplete } from '@angular/material/autocomplete';
import { MatOption } from '@angular/material/core';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { SpinnerComponent } from '../../../../core/components/spinner/spinner.component';
import { AsyncPipe } from '@angular/common';

@Component({
    selector: 'senergy-permissions-list',
    templateUrl: './permissions-list.component.html',
    styleUrls: ['./permissions-list.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [PageHeaderComponent, ListToolbarComponent, EmptyStateComponent, FormSectionComponent, MatFormField, MatLabel, MtxSelect, MtxOption, MatInput, MatAutocompleteTrigger, ReactiveFormsModule, MatAutocomplete, MatOption, MatError, MatErrorMessagesDirective, MatCheckbox, MatIcon, MatButton, MatIconButton, MatChipSet, MatChip, MatChipAvatar, MatChipRemove, MatMenu, MatMenuItem, MatMenuTrigger, MatTable, MatSort, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatSortHeader, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, SpinnerComponent, AsyncPipe]
})
export class PermissionsListComponent implements OnInit, AfterViewInit {
    private authService = inject(AuthorizationService);
    private destroyRef = inject(DestroyRef);
    private ladonService = inject(LadonService);
    dialog = inject(MatDialog);
    private sanitizer = inject(DomSanitizer);
    private kongService = inject(KongService);
    private dialogsService = inject(DialogsService);
    private snackBar = inject(MatSnackBar);
    private searchbarService = inject(SearchbarService);
    preferencesService = inject(PreferencesService);


    public displayedColumns = ['select', 'subject', 'resource', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'actions'];
    public policies: PermissionModel[] = [];
    public userIsAdmin = false;
    public sortedData: PermissionModel[] = [];
    /** The policies that pass the search and the filters, before sorting and paging. */
    private matching: PermissionModel[] = [];
    selection = new SelectionModel<PermissionModel>(true, []);
    public matPolicies: MatTableDataSource<PermissionModel> = new MatTableDataSource<PermissionModel>([]);
    public query = '';
    public sort: Sort = new MatSort();
    public ready = false;
    public importing = false;
    public roles: any[] = [];
    public users: any[] = [];
    public clients: any[] = [];
    public endpointControl = new FormControl();
    public filteredOptions: Observable<string[]> = new Observable();
    public uris: string[] = [];
    public test: {
        clientID: string;
        userId: string;
        roles: string[];
        username: string;
        target_method: string;
        target_uri: string;
    } = {
            clientID: '',
            userId: '',
            roles: [],
            username: '',
            target_method: '',
            target_uri: ''
        };
    public testResult: PermissionTestResponse = {
        GET: false,
        POST: false,
        PUT: false,
        PATCH: false,
        DELETE: false,
        HEAD: false
    };
    @ViewChild('paginator', {static: false}) paginator!: MatPaginator;
    total = 0;
    selectedUser = '';
    selectedRole = '';
    selectedClientID = '';
    selectedEndpoint = '';

    constructor() {
        this.authService.loadAllRoles().subscribe((roles: any | { error: string }) => {
            if (roles != null) {
                this.roles = roles;
            } else {
                console.error('Could not load roles from Keycloak. Reason was : ', roles.error);
            }
        });

        this.authService.loadAllUsers().subscribe((users: any | { error: string }) => {
            if (users != null) {
                this.users = users;
            } else {
                console.error('Could not load users from Keycloak. Reason was : ', users.error);
            }
        });

        this.authService.loadAllClients().subscribe((clients: any | { error: string }) => {
            if (clients != null) {
                this.clients = clients;
            } else {
                console.error('Could not load clients from Keycloak. Reason was : ', clients.error);
            }
        });
    }

    private static compare(a: number | string | boolean, b: number | string | boolean, isAsc: boolean) {
        return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
    }

    public ngOnInit() {
        this.loadPolicies();
        this.userIsAdmin = this.authService.userIsAdmin();
        this.initAutoComplete();
        this.searchbarService.currentSearchText.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((text) => {
            this.query = text;
            if (this.ready) {
                this.filter();
            }
        });
    }

    ngAfterViewInit() {
        this.paginator.page.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
            this.preferencesService.pageSize = e.pageSize;
            this.sortData(this.sort, this.matching, e);
        });
    }

    initAutoComplete() {
        try {
            this.kongService.loadUris().subscribe(uris => {
                this.uris = uris as string[];

                // autocomplete filter
                this.filteredOptions = this.endpointControl.valueChanges
                    .pipe(
                        startWith(''),
                        map((value) => this._filter(value)),
                    );
                this.filteredOptions.pipe(debounce(() => interval(300)), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.testAccess());
            });
        } catch (e) {
            console.error('Could not load Uris from kong: ' + e);
        }
    }

    public loadPolicies() {
        this.ready = false;
        this.policies = [];
        this.sortedData = [];
        this.selection.clear();
        this.ladonService.getAllPolicies().subscribe((response) => {
            this.policies = response;
            // A reload keeps the active search and filters.
            this.matching = this.matchingPolicies() ?? this.policies;
            this.sortedData = this.matching;

            if (this.sort == null) {
                this.sortData({active: 'subject', direction: 'asc'});
            } else {
                this.sortData(this.sort);
            }
            this.addModes();
        });
    }

    private addModes() {
        if (this.roles == null || this.clients == null || this.users == null) {
            setTimeout(() => this.addModes(), 100);
            return;
        }
        this.policies.forEach(policy => {
            if (this.roles.some((e) => e.name === policy.subject)) {
                policy.mode = 'role';
            } else if (this.users.some((e) => e.username === policy.subject)) {
                policy.mode = 'user';
            } else if (this.clients.some((e) => e.clientId === policy.subject)) {
                policy.mode = 'client';
            }
        });
        // data for mata table
        this.matPolicies.data = this.sortedData;
        this.ready = true;
    }

    public createPolicy() {
        const dialogRef = this.dialog.open(PermissionsEditComponent,
            {
                data: {permission: {} as PermissionModel, roles: this.roles, users: this.users, clients: this.clients},
                width: '38.2%',
            });

        dialogRef.afterClosed().subscribe((result) => {
            if (result === 'yes') {
                this.loadPolicies();
            } else if (result === 'error') {
                window.alert('Could not create policy!');
            }
        });
    }

    public editPolicy(policy: PermissionModel) {
        const dialogRef = this.dialog.open(PermissionsEditComponent,
            {
                data:
                    {permission: policy, roles: this.roles, users: this.users, clients: this.clients},
                width: '38.2%',
            });

        dialogRef.afterClosed().subscribe((res) => {
            if (res != null) {
                this.loadPolicies();
            }
        });
    }

    public deletePolicy(policy: PermissionModel) {
        this.ladonService.deletePolicies([policy]).subscribe((ok) => {
            if (ok) {
                this.loadPolicies();
            } else {
                snackError(this.snackBar, 'Could not delete the policy');
            }
        });
    }

    public sortData(sort: Sort, policies: PermissionModel[] | undefined = undefined, pageEvent: PageEvent | undefined = undefined) {
        this.sort = sort;
        policies = policies || this.matching;
        const pageSize = pageEvent?.pageSize || this.paginator?.pageSize || 20;
        const pageIndex = pageEvent?.pageIndex || 0;
        if (!pageEvent && this.paginator) {
            this.paginator.pageIndex = 0;
        }
        if (sort == null) {
            this.total = policies.length;
            this.sortedData = policies.slice(pageSize * pageIndex, pageSize * (pageIndex + 1));
        }
        const data = policies.slice();

        if (!sort.active || sort.direction === '') {
            this.total = data.length;
            this.sortedData = data.slice(pageSize * pageIndex, pageSize * (pageIndex + 1));
            return;
        }
        data.sort((a, b) => {
            const isAsc = sort.direction === 'asc';
            switch (sort.active) {
            case 'subject':
                return PermissionsListComponent.compare(a.subject, b.subject, isAsc);
            case 'GET':
                return PermissionsListComponent.compare(a.actions.includes('GET'), b.actions.includes('GET'), isAsc);
            case 'POST':
                return PermissionsListComponent.compare(a.actions.includes('POST'), b.actions.includes('POST'), isAsc);
            case 'PUT':
                return PermissionsListComponent.compare(a.actions.includes('PUT'), b.actions.includes('PUT'), isAsc);
            case 'PATCH':
                return PermissionsListComponent.compare(a.actions.includes('PATCH'), b.actions.includes('PATCH'), isAsc);
            case 'DELETE':
                return PermissionsListComponent.compare(a.actions.includes('DELETE'), b.actions.includes('DELETE'), isAsc);
            case 'HEAD':
                return PermissionsListComponent.compare(a.actions.includes('HEAD'), b.actions.includes('HEAD'), isAsc);
            case 'resource':
                return PermissionsListComponent.compare(a.resource, b.resource, isAsc);

            default:
                return 0;
            }
        });
        this.total = data.length;
        this.sortedData = data.slice(pageSize * pageIndex, pageSize * (pageIndex + 1));
    }

    public askfordelete(policy: PermissionModel) {
        this.dialogsService.openDeleteDialog('policy').afterClosed().subscribe((del: boolean | undefined) => {
            if (del) {
                this.deletePolicy(policy);
            }
        });
    }

    public export() {
        if (this.policies && this.policies.length > 0) {
            const theJSON = JSON.stringify(this.policies.filter((p) => p.id !== 'admin-all'));
            return this.sanitizer.bypassSecurityTrustUrl('data:text/json;charset=UTF-8,' + encodeURIComponent(theJSON));
        }
        return;
    }

    public import() {
        const dialogRef = this.dialog.open(PermissionsDialogImportComponent,
            {minWidth: '850px', minHeight: '200px'});

        dialogRef.afterClosed().subscribe((result: PermissionImportModel) => {
            if (result != null) {
                this.ready = false;
                this.importing = true;
                const filteredPolicies = result.policies.filter((p) => p.id !== 'admin-all');
                if (result.overwrite) {
                    const currentPolicies = this.policies.filter((p) => p.id !== 'admin-all');
                    this.ladonService.deletePolicies(currentPolicies).subscribe((deleted) => {
                        if (!deleted) {
                            this.failImport();
                            return;
                        }
                        this.ladonService.postPolicies(filteredPolicies).subscribe((ok) => {
                            if (!ok) {
                                // the old policies are already gone, so the list has to be reloaded
                                this.failImport();
                                this.loadPolicies();
                                return;
                            }
                            this.importing = false;
                            this.loadPolicies();
                        });
                    });
                } else {
                    this.ladonService.putPolicies(filteredPolicies).subscribe((ok) => {
                        if (!ok) {
                            this.failImport();
                            return;
                        }
                        this.importing = false;
                        this.loadPolicies();
                    });
                }

            }
        });
    }

    private failImport() {
        this.importing = false;
        this.ready = true;
        snackError(this.snackBar, 'Could not import the policies');
    }

    /** True while the search or a filter narrows the list; picks the empty-state text. */
    get filtered(): boolean {
        return this.query !== '' || !!(this.selectedUser || this.selectedRole || this.selectedClientID || this.selectedEndpoint);
    }

    /** The subject's kind; looked up at render time, because the policies can arrive before the subject lists. */
    policyMode(policy: PermissionModel): string | undefined {
        if (policy.mode) {
            return policy.mode;
        }
        if (this.roles.some((e) => e.name === policy.subject)) {
            return 'role';
        }
        if (this.users.some((e) => e.username === policy.subject)) {
            return 'user';
        }
        return this.clients.some((e) => e.clientId === policy.subject) ? 'client' : undefined;
    }

    modeLabel(mode: string): string {
        return mode.charAt(0).toUpperCase() + mode.slice(1);
    }

    openFilterDialog() {
        const data: PermissionsFilterDialogData = {
            selection: { user: this.selectedUser, role: this.selectedRole, client: this.selectedClientID, endpoint: this.selectedEndpoint },
            users: this.users.map((u) => u.username),
            roles: this.roles.map((r) => r.name),
            clients: this.clients.map((c) => c.clientId),
            endpoints: this.uris,
        };
        this.dialog.open<PermissionsFilterDialogComponent, PermissionsFilterDialogData, PermissionsFilterSelection>(PermissionsFilterDialogComponent, { data, minWidth: '50vw' })
            .afterClosed().subscribe((result) => {
                if (result) {
                    this.selectedUser = result.user;
                    this.selectedRole = result.role;
                    this.selectedClientID = result.client;
                    this.selectedEndpoint = result.endpoint;
                    this.filter();
                }
            });
    }

    removeFilter(which: 'user' | 'role' | 'client' | 'endpoint') {
        switch (which) {
        case 'user': this.selectedUser = ''; break;
        case 'role': this.selectedRole = ''; break;
        case 'client': this.selectedClientID = ''; break;
        case 'endpoint': this.selectedEndpoint = ''; break;
        }
        this.filter();
    }

    /** Applies the search and the filters to the loaded policies and shows the first page. */
    filter() {
        const matching = this.matchingPolicies();
        if (matching) {
            this.matching = matching;
            this.sortData(this.sort);
        }
    }

    /** The policies that pass the search and the filters; undefined while the search is an invalid regular expression. */
    private matchingPolicies(): PermissionModel[] | undefined {
        const filtered: PermissionModel[] = [];
        let query: RegExp;
        try {
            query = new RegExp(this.query, 'i');
        } catch (e) {
            // An invalid regex while typing leaves the list as it is.
            if (isDevMode()) {
                console.error('Error filtering policies', e);
            }
            return undefined;
        }
        this.policies.forEach((policy) => {
            try {
                if(
                    !(
                        (this.selectedEndpoint && !policy.resource.startsWith(this.selectedEndpoint)) ||
                        (this.query && (!(query.test(policy.subject) || query.test(policy.actions.join()) || query.test(policy.resource)))) ||
                        (this.selectedUser && policy.subject != this.selectedUser) ||
                        (this.selectedRole && policy.subject != this.selectedRole) ||
                        (this.selectedClientID && policy.subject != this.selectedClientID)
                    )
                ) {
                    filtered.push(policy);
                }
            } catch (e) {
                // Probably invalid regex, ignore in prod mode
                if (isDevMode()) {
                    console.error('Error filtering policies',
                        'This is most likely due to an invalid regex and you can ignore this error', e);
                }
            }



        });

        return filtered;
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length + 1; // admin-all won't be selected
        const currentViewed = this.matPolicies.connect().value.length;
        return numSelected === currentViewed;
    }

    masterToggle() {
        if (this.isAllSelected()) {
            this.selectionClear();
        } else {
            this.matPolicies.connect().value.forEach((row) => {
                if (row.id !== 'admin-all') {
                    this.selection.select(row);
                }
            });
        }
    }

    selectionClear(): void {
        this.selection.clear();
    }

    deleteMultipleItems() {
        this.dialogsService.openDeleteDialog('policies').afterClosed().subscribe((del: boolean | undefined) => {
            if (del) {
                this.ladonService.deletePolicies(this.selection.selected).subscribe((ok) => {
                    if (ok) {
                        this.loadPolicies();
                    } else {
                        snackError(this.snackBar, 'Could not delete the selected policies');
                    }
                });
            }
        });
    }

    setTestUser(user: any) {
        this.test.username = user.username;
        this.test.userId = user.id;
        this.testAccess();
    }

    setTestRole(role: string) {
        this.test.roles = [role];
        this.testAccess();
    }

    setTestClient(id: string) {
        this.test.clientID = id;
        this.testAccess();
    }

    // autocomplete filter
    private _filter(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.uris.filter((option) => option.toLowerCase().includes(filterValue));
    }

    public testAccess() {
        this.test.target_uri = this.endpointControl.value || '';
        this.ladonService.test(this.test).subscribe((res) => this.testResult = res);
    }
}
