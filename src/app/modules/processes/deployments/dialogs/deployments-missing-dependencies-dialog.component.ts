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

import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import {DeploymentsService} from '../shared/deployments.service';
import {
    DeploymentsMissingDependenciesModel
} from '../shared/deployments-missing-dependencies.model';

@Component({
    templateUrl: './deployments-missing-dependencies-dialog.component.html',
    styleUrls: ['./deployments-missing-dependencies-dialog.component.css']
})
export class DeploymentsMissingDependenciesDialogComponent {

    displayedColumns: string[] = ['name', 'device_id'];
    missingDependencies: DeploymentsMissingDependenciesModel | null = null;

    constructor(private dialogRef: MatDialogRef<DeploymentsMissingDependenciesDialogComponent>,
                private deploymentsService: DeploymentsService,
                @Inject(MAT_DIALOG_DATA) data: { id: string }) {

        this.deploymentsService.getMissingDependencies(data.id).subscribe((missingDependencies: DeploymentsMissingDependenciesModel | null) => {
            if (missingDependencies != null) {
                this.missingDependencies = missingDependencies;
            }
        });
    }

    close(): void {
        this.dialogRef.close();
    }

}
