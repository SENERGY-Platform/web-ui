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

import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
    UsedInDeviceTypeResponseDeviceTypeRef,
    UsedInDeviceTypeResponseElement
} from "../shared/used-in-device-type.model";
import {MatTableDataSource} from "@angular/material/table";
import {AuthorizationService} from "../../../../core/services/authorization.service";
import {Router} from "@angular/router";

@Component({
    templateUrl: './used-in-device-types-dialog.component.html',
    styleUrls: ['./used-in-device-types-dialog.component.css'],
})
export class UsedInDeviceTypesDialogComponent {
    dataSource = new MatTableDataSource<UsedInDeviceTypeResponseDeviceTypeRef>();
    displayedColumns = ["name"];
    userHasUpdateAuthorization = false;

    constructor(
        private dialogRef: MatDialogRef<UsedInDeviceTypesDialogComponent>,
        private authService: AuthorizationService,
        private router: Router,
        @Inject(MAT_DIALOG_DATA) data: { element: UsedInDeviceTypeResponseElement },
    ) {
        this.userHasUpdateAuthorization = authService.userIsAdmin()
        if(this.userHasUpdateAuthorization) {
            this.displayedColumns.push("edit");
        } else {
            this.displayedColumns.push("view");
        }
        this.dataSource = new MatTableDataSource(data.element.used_in || []);
    }

    close(): void {
        this.dialogRef.close();
    }
}
