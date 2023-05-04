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
import {Component, OnInit, ViewChild} from '@angular/core';
import {ImportTypePermissionSearchModel} from './shared/import-types.model';
import {ImportTypesService} from './shared/import-types.service';
import {Sort} from '@angular/material/sort';
import {UntypedFormControl} from '@angular/forms';
import {debounceTime, map} from 'rxjs/operators';
import {MatLegacyTable as MatTable} from '@angular/material/legacy-table';
import {Router} from '@angular/router';
import {MatLegacyDialog as MatDialog, MatLegacyDialogConfig as MatDialogConfig} from '@angular/material/legacy-dialog';
import {ImportInstancesModel} from '../import-instances/shared/import-instances.model';
import {ImportDeployEditDialogComponent} from '../import-deploy-edit-dialog/import-deploy-edit-dialog.component';
import {PermissionsDialogService} from '../../permissions/shared/permissions-dialog.service';
import {MatLegacySnackBar as MatSnackBar} from '@angular/material/legacy-snack-bar';
import {DialogsService} from '../../../core/services/dialogs.service';
import { Subscription } from 'rxjs';
import { SearchbarService } from 'src/app/core/components/searchbar/shared/searchbar.service';

@Component({
    selector: 'senergy-import-types',
    templateUrl: './import-types.component.html',
    styleUrls: ['./import-types.component.css'],
})
export class ImportTypesComponent implements OnInit {
    @ViewChild(MatTable, { static: false }) table!: MatTable<ImportTypePermissionSearchModel>;

    importTypes: ImportTypePermissionSearchModel[] = [];
    dataReady = false;
    sort = 'name.asc';
    searchText: string = ""
    searchSub: Subscription = new Subscription()
    limitInit = 100;
    limit = this.limitInit;
    offset = 0;

    constructor(
        private importTypesService: ImportTypesService,
        private router: Router,
        private dialog: MatDialog,
        private permissionsDialogService: PermissionsDialogService,
        private snackBar: MatSnackBar,
        private deleteDialog: DialogsService,
        private searchbarService: SearchbarService
    ) {}

    ngOnInit(): void {
       
    }

    ngAfterViewInit(): void {
        this.load();
        this.initSearch();
    }

    private initSearch() {
        this.searchSub = this.searchbarService.currentSearchText.subscribe((searchText: string) => {
            this.searchText = searchText;
            this.reload();
        });
    }

    details(m: ImportTypePermissionSearchModel) {
        this.router.navigateByUrl('/imports/types/details/' + m.id);
    }

    start(m: ImportTypePermissionSearchModel) {
        const config: MatDialogConfig = {
            data: {
                name: m.name,
                import_type_id: m.id,
            } as ImportInstancesModel,
            minHeight: '400px',
            minWidth: '600px',
        };
        this.dialog
            .open(ImportDeployEditDialogComponent, config)
            .afterClosed()
            .subscribe((val) => {
                if (val !== undefined) {
                    this.router.navigateByUrl('imports/instances');
                }
            });
    }

    share(m: ImportTypePermissionSearchModel) {
        this.permissionsDialogService.openPermissionDialog('import-types', m.id, m.name);
    }

    edit(m: ImportTypePermissionSearchModel) {
        this.router.navigateByUrl('/imports/types/edit/' + m.id);
    }

    delete(m: ImportTypePermissionSearchModel) {
        this.deleteDialog
            .openDeleteDialog('import type')
            .afterClosed()
            .subscribe((del) => {
                if (del === true) {
                    this.dataReady = false;
                    this.importTypesService.deleteImportInstance(m.id).subscribe(
                        () => {
                            this.snackBar.open('Import type deleted', 'OK', { duration: 3000 });
                            this.reload();
                        },
                        (err) => {
                            console.error(err);
                            this.snackBar.open('Error deleting import type', 'close', { panelClass: 'snack-bar-error' });
                        },
                    );
                }
            });
    }

    matSortChange($event: Sort) {
        this.sort = $event.active + '.' + $event.direction;
        this.reload();
    }

    load() {
        this.importTypesService.listImportTypes(this.searchText, this.limit, this.offset, this.sort).subscribe((types) => {
            this.importTypes.push(...types);
            if (this.table !== undefined) {
                this.table.renderRows();
            }
            this.dataReady = true;
        });
    }

    reload() {
        this.limit = this.limitInit;
        this.offset = 0;
        this.importTypes = [];
        this.load();
    }

    onScroll() {
        this.limit += this.limitInit;
        this.offset = this.importTypes.length;
        this.load();
    }

    add() {
        this.router.navigateByUrl('/imports/types/new');
    }
}
