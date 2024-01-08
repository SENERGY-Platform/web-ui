/*
 *
 *     Copyright 2020 InfAI (CC SES)
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

import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {FormControl, UntypedFormControl, Validators} from '@angular/forms';
import {MatDialogRef} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {PermissionImportModel} from './permissions-dialog-import.model';
import {MatPaginator} from '@angular/material/paginator';
import {Subscription} from 'rxjs';
import { PermissionModel } from '../shared/permission.model';

@Component({
    selector: 'senergy-permissions-dialog-import',
    templateUrl: './permissions-dialog-import.component.html',
    styleUrls: ['./permissions-dialog-import.component.css'],
})
export class PermissionsDialogImportComponent {

    // @ts-ignore
    @ViewChild('fileInput') public fileInput: HTMLInputElement;
    public overwrite = new UntypedFormControl(undefined, Validators.required);
    public policies: PermissionModel[] = [];
    public fileValid = false;
    public fileChecked = true;
    public selections: boolean[] = [];
    public isAllSelected = false;

    constructor(public dialogRef: MatDialogRef<PermissionsDialogImportComponent>,
                private snackBar: MatSnackBar) {
    }

    public yes() {
        const imports: any[] = [];
        this.policies.forEach((policy, index) => {
            if (this.selections[index]) {
                imports.push(policy);
            }
        });
        const result: PermissionImportModel = {
            policies: imports,
            overwrite: this.overwrite.value === 'true',
        };
        this.dialogRef.close(result);
    }

    public no() {
        this.dialogRef.close();
    }

    public onFileSelected() {
        const reader = new FileReader();
        reader.onload = () => {
            this.fileChecked = false;
            try {
                this.policies = JSON.parse(reader.result as string) as PermissionModel[];
                // Remove admin-all policy if needed, this policy can't be changed in the UI
                const adminAllIdx = this.policies.findIndex((policy) => policy.id === 'admin-all');
                if (adminAllIdx !== -1) {
                    this.policies.splice(adminAllIdx, 1);
                }
                this.selections = new Array<boolean>(this.policies.length);
                this.selections.fill(false);
                this.masterToggle(true);
                this.fileValid = true;
            } catch (e) {
                this.snackBar.open('Could not import permissions: Invalid JSON', undefined, {
                    duration: 3 * 1000,
                });
                this.fileValid = false;
            }
            this.fileChecked = true;
        };
        try {
            // @ts-ignore
            reader.readAsText(this.fileInput.nativeElement.files[0]);
        } catch (e) {
            console.error('fileInput undefined: Could not read file');
        }
    }

    public hasValidFileSelected() {
        try {
            // @ts-ignore
            return this.fileInput.nativeElement.files.length !== 0 && this.fileValid;
        } catch (e) {
            return false;
        }
    }

    public appendSelected() {
        const value = this.overwrite.value;
        return value === 'false';
    }

    public masterToggle(checked: boolean) {
        if (checked) {
            this.selections.forEach((_, index) => this.selections[index] = true);
            this.isAllSelected = true;
        } else {
            this.selections.forEach((_, index) => this.selections[index] = false);
            this.isAllSelected = false;
        }
    }

    public indeterminate() {
        if (!this.isAllSelected) {
            for (const i in this.selections) {
                if (this.selections[i] === true) {
                    return true;
                }
            }
        } else {
            for (const i in this.selections) {
                if (this.selections[i] === false) {
                    return true;
                }
            }
        }
        return;
    }

    public addSelected() {
        const value = this.overwrite.value;
        return value === 'true';
    }

    public atLeastOnePolicySelected() {
        return this.selections.indexOf(true) !== -1;
    }
}
