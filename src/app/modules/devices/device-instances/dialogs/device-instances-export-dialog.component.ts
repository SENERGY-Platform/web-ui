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

import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ExportModel} from '../../../exports/shared/export.model';
import {FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {ExportService} from '../../../exports/shared/export.service';
import {forkJoin, Observable} from 'rxjs';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';

@Component({
    templateUrl: './device-instances-export-dialog.component.html',
    styleUrls: ['./device-instances-export-dialog.component.css'],
})
export class DeviceInstancesExportDialogComponent implements OnInit {
    exports: ExportModel[] = [];
    formArray = new FormArray([]);

    constructor(
        private dialogRef: MatDialogRef<DeviceInstancesExportDialogComponent>,
        private exportService: ExportService,
        private formBuilder: FormBuilder,
        private snackBar: MatSnackBar,
        private router: Router,
        @Inject(MAT_DIALOG_DATA) private data: { exports: ExportModel[] },
    ) {
        this.exports = data.exports;
    }

    ngOnInit() {
        this.exports.forEach((singleExport) => {
            this.formArray.push(
                this.formBuilder.group({
                    name: this.formBuilder.control(singleExport.Name),
                }),
            );
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        const obs: Observable<ExportModel>[] = [];
        this.exports.forEach((singleExport, index) => {
            if (this.formArray.at(index).get('name')?.enabled === true) {
                singleExport.Name = this.formArray.at(index).get('name')?.value;
                obs.push(this.exportService.startPipeline(singleExport));
            }
        });
        forkJoin(obs).subscribe(
            (_) => {
                const msg = 'Created ' + obs.length + ' export' + (obs.length !== 1 ? 's' : ''); // plural s
                const snackBarRef = this.snackBar.open(msg, 'View', {duration: 5000});
                snackBarRef.onAction().subscribe(() => this.router.navigateByUrl('exports'));

                this.dialogRef.close();
            },
            (err) => {
                console.error(err);
                this.snackBar.open('Error creating exports', '', {duration: 2000});
            },
        );
    }

    getFormGroup(index: number): FormGroup {
        return this.formArray.at(index) as FormGroup;
    }

    toggle(i: number, state: boolean) {
        const fg = this.getFormGroup(i);
        if (state) {
            fg.get('name')?.enable();
        } else {
            fg.get('name')?.disable();
        }
    }
}
