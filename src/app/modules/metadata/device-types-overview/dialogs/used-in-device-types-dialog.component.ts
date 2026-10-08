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

import { Component, Inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import {
    UsedInDeviceTypeResponseDeviceTypeRef,
    UsedInDeviceTypeResponseElement
} from '../shared/used-in-device-type.model';
import { MatTableDataSource, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow } from '@angular/material/table';
import {AuthorizationService} from '../../../../core/services/authorization.service';
import { Router, RouterLink } from '@angular/router';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatButton } from '@angular/material/button';

@Component({
    templateUrl: './used-in-device-types-dialog.component.html',
    styleUrls: ['./used-in-device-types-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, RouterLink, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatDialogActions, MatButton]
})
export class UsedInDeviceTypesDialogComponent implements OnInit {
    dataSource = new MatTableDataSource<UsedInDeviceTypeResponseDeviceTypeRef>();
    displayedColumns = ['name'];
    userHasUpdateAuthorization = false;

    constructor(
        private dialogRef: MatDialogRef<UsedInDeviceTypesDialogComponent>,
        private authService: AuthorizationService,
        private router: Router,
        @Inject(MAT_DIALOG_DATA) data: { element: UsedInDeviceTypeResponseElement },
    ) {
        this.dataSource = new MatTableDataSource(data.element.used_in || []);
    }

    ngOnInit() {
        this.userHasUpdateAuthorization = this.authService.userIsAdmin();
        if(this.userHasUpdateAuthorization) {
            this.displayedColumns.push('edit');
        } else {
            this.displayedColumns.push('view');
        }
    }

    close(): void {
        this.dialogRef.close();
    }
}
