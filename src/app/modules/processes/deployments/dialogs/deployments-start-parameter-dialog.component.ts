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

import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DeploymentsService } from '../shared/deployments.service';
import { CamundaVariable } from '../shared/deployments-definition.model';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

@Component({
    templateUrl: './deployments-start-parameter-dialog.component.html',
    styleUrls: ['./deployments-start-parameter-dialog.component.css'],
})
export class DeploymentsStartParameterDialogComponent {
    deploymentId: string;
    parameter: Map<string, CamundaVariable> = new Map<string, CamundaVariable>();
    err: string | null;

    starting = false;

    deploymentsService: {
        startDeploymentWithParameter(deploymentId: string, parameter: Map<string, CamundaVariable>): Observable<any | null>;
    };

    constructor(
        private dialogRef: MatDialogRef<DeploymentsStartParameterDialogComponent>,
        @Inject(MAT_DIALOG_DATA)
        data: {
            deploymentId: string;
            parameter: Map<string, CamundaVariable>;
            deploymentService: {
                startDeploymentWithParameter(deploymentId: string, parameter: Map<string, CamundaVariable>): Observable<any | null>;
            };
        },
    ) {
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
                } catch (e) {
                    this.err = err.error;
                }
                this.starting = false;
            },
        );
    }
}
