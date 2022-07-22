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
import {SmartServiceTaskInputDescription, SmartServiceTaskDescription, SmartServiceInputsDescription} from '../../shared/designer.model';
import {ProcessRepoService} from '../../../../processes/process-repo/shared/process-repo.service';
import {DeploymentsService} from '../../../../processes/deployments/shared/deployments.service';
import {ProcessModel} from '../../../../processes/process-repo/shared/process.model';
import {V2DeploymentsPreparedModel} from '../../../../processes/deployments/shared/deployments-prepared-v2.model';
import {FlowRepoService} from '../../../../data/flow-repo/shared/flow-repo.service';
import {FlowModel} from '../../../../data/flow-repo/shared/flow.model';
import {FlowEngineService} from '../../../../data/flow-repo/shared/flow-engine.service';
import {ParserService} from '../../../../data/flow-repo/shared/parser.service';
import {ParseModel} from '../../../../data/flow-repo/shared/parse.model';
import {BpmnElement, BpmnParameter, BpmnParameterWithLabel} from '../../../../processes/designer/shared/designer.model';

@Component({
    templateUrl: './edit-smart-service-input-dialog.component.html',
    styleUrls: ['./edit-smart-service-input-dialog.component.css'],
})
export class EditSmartServiceInputDialogComponent implements OnInit {
    result: SmartServiceInputsDescription;

    constructor(
        private dialogRef: MatDialogRef<EditSmartServiceInputDialogComponent>,
        @Inject(MAT_DIALOG_DATA) private dialogParams: { info: SmartServiceInputsDescription, element: BpmnElement},
    ) {
        this.result = dialogParams.info;
    }

    ngOnInit() {}


    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        let result = JSON.parse(JSON.stringify(this.result)) as SmartServiceInputsDescription;
        this.dialogRef.close(result);
    }
}
