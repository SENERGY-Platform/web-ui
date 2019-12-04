/*
 *
 *  Copyright 2019 InfAI (CC SES)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef, MatSnackBar} from '@angular/material';
import {FormControl, Validators} from '@angular/forms';
import {
    DeviceTypeConceptModel,
    DeviceTypeFunctionModel,
    DeviceTypeFunctionType
} from '../../shared/device-type.model';
import {util} from 'jointjs';
import uuid = util.uuid;
import {ConceptsService} from '../../../concepts/shared/concepts.service';
import {ConceptsPermSearchModel} from '../../../concepts/shared/concepts-perm-search.model';

@Component({
    templateUrl: './device-types-new-function-dialog.component.html',
    styleUrls: ['./device-types-new-function-dialog.component.css']
})
export class DeviceTypesNewFunctionDialogComponent implements OnInit {

    nameControl = new FormControl('', [Validators.required]);
    conceptControl = new FormControl('');
    concepts: ConceptsPermSearchModel[] = [];
    functionType = {} as DeviceTypeFunctionType;

    constructor(private snackBar: MatSnackBar,
                private conceptsService: ConceptsService,
                private dialogRef: MatDialogRef<DeviceTypesNewFunctionDialogComponent>,
                @Inject(MAT_DIALOG_DATA) data: { functionType: DeviceTypeFunctionType }) {
        this.functionType = data.functionType;
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {

        const func: DeviceTypeFunctionModel = {
            id: this.setId(),
            name: this.nameControl.value,
            rdf_type: this.functionType.rdf_type,
            concept_id: this.conceptControl.value.id || null,
        };
        this.dialogRef.close(func);
    }

    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id && a.name === b.name;
    }

    ngOnInit(): void {
        this.conceptsService.getConcepts('', 9999, 0, 'name', 'asc').subscribe((concepts: ConceptsPermSearchModel[]) => {
            this.concepts = concepts;
        });
    }

    private setId(): string {
        return 'urn:infai:ses:' + this.functionType.urn_part + ':' + uuid();
    }
}
