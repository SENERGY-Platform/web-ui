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

import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { CamundaVariable } from '../shared/deployments-definition.model';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { MatButton } from '@angular/material/button';
import { KeyValuePipe } from '@angular/common';

@Component({
    templateUrl: './deployments-start-parameter-dialog.component.html',
    styleUrls: ['./deployments-start-parameter-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, MatError, MatFormField, MatLabel, MatInput, FormsModule, MtxSelect, MtxOption, MatErrorMessagesDirective, MatDialogActions, MatButton, KeyValuePipe]
})
export class DeploymentsStartParameterDialogComponent {
    private dialogRef = inject<MatDialogRef<DeploymentsStartParameterDialogComponent>>(MatDialogRef);

    deploymentId: string;
    parameter: Map<string, CamundaVariable> = new Map<string, CamundaVariable>();
    err: string | null;

    starting = false;

    deploymentsService: {
        startDeploymentWithParameter(deploymentId: string, parameter: Map<string, CamundaVariable>): Observable<any | null>;
    };

    constructor() {
        const data = inject<{
            deploymentId: string;
            parameter: Map<string, CamundaVariable>;
            deploymentService: {
                startDeploymentWithParameter(deploymentId: string, parameter: Map<string, CamundaVariable>): Observable<any | null>;
            };
        }>(MAT_DIALOG_DATA);

        this.deploymentsService = data.deploymentService;
        this.parameter = data.parameter;
        this.deploymentId = data.deploymentId;
        this.err = null;
    }

    close(): void {
        this.dialogRef.close();
    }

    start(): void {
        this.starting = true;
        this.deploymentsService.startDeploymentWithParameter(this.deploymentId, this.parameter).subscribe(
            () => {
                this.dialogRef.close();
            },
            (err: HttpErrorResponse) => {
                try {
                    this.err = JSON.parse(err.error.substring(5)).message;
                } catch (_) {
                    this.err = err.error;
                }
                this.starting = false;
            },
        );
    }
}
