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
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { DeviceTypeFunctionModel } from '../../shared/device-type.model';
import { ConceptsService } from '../../../concepts/shared/concepts.service';
import { ConceptsCharacteristicsModel } from '../../../concepts/shared/concepts-characteristics.model';

@Component({
    templateUrl: './device-types-show-concept-dialog.component.html',
    styleUrls: ['./device-types-show-concept-dialog.component.css'],
})
export class DeviceTypesShowConceptDialogComponent implements OnInit {
    functions: DeviceTypeFunctionModel[] = [];
    concepts: string[] = [];

    constructor(
        private dialogRef: MatDialogRef<DeviceTypesShowConceptDialogComponent>,
        @Inject(MAT_DIALOG_DATA) data: { functions: DeviceTypeFunctionModel[] },
        private conceptsService: ConceptsService,
    ) {
        this.functions = data.functions;
    }

    ngOnInit(): void {
        this.functions.forEach((func: DeviceTypeFunctionModel) => {
            if (func.concept_id === '') {
                this.concepts.push('Function ' + func.name + ' has no Concept');
            } else {
                this.conceptsService
                    .getConceptWithCharacteristics(func.concept_id)
                    .subscribe((concept: ConceptsCharacteristicsModel | null) => {
                        if (concept !== null) {
                            this.concepts.push(JSON.stringify(concept, null, 5));
                        }
                    });
            }
        });
    }

    close(): void {
        this.dialogRef.close();
    }
}
