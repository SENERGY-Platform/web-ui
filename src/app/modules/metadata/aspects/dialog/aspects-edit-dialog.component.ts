/*
 * Copyright 2021 InfAI (CC SES)
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
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ConceptsService} from '../../concepts/shared/concepts.service';
import {AspectsPermSearchModel} from '../shared/aspects-perm-search.model';

@Component({
    templateUrl: './aspects-edit-dialog.component.html',
    styleUrls: ['./aspects-edit-dialog.component.css']
})
export class AspectsEditDialogComponent implements OnInit {

    aspectsFormGroup!: FormGroup;

    constructor(private conceptsService: ConceptsService,
                private dialogRef: MatDialogRef<AspectsEditDialogComponent>,
                private _formBuilder: FormBuilder,
                @Inject(MAT_DIALOG_DATA) data: { aspect: AspectsPermSearchModel }) {
        this.initAspectFormGroup(data.aspect);
    }

    ngOnInit(): void {
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close(this.aspectsFormGroup.getRawValue());
    }

    compare(a: any, b: any): boolean {
        return a.id === b.id;
    }

    private initAspectFormGroup(aspect: AspectsPermSearchModel): void {
        this.aspectsFormGroup = this._formBuilder.group({
            id: [{value: aspect.id, disabled: true}],
            name: [aspect.name, Validators.required],
        });
    }

}
