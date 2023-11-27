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

import {Component, Inject, OnInit, ViewChild} from '@angular/core';
import {UntypedFormBuilder, Validators} from '@angular/forms';
import {DeploymentsModel} from '../../../modules/processes/deployments/shared/deployments.model';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {MatTable} from '@angular/material/table';
import {
    MAT_DIALOG_DATA,
    MatDialogRef
} from '@angular/material/dialog';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {DashboardResponseMessageModel} from '../../../modules/dashboard/shared/dashboard-response-message.model';
import {CamundaVariable} from '../../../modules/processes/deployments/shared/deployments-definition.model';
import {checkValueValidator} from './range-slider-edit-dialog.validators';
import { forkJoin, Observable } from 'rxjs';

@Component({
    templateUrl: './range-slider-edit-dialog.component.html',
    styleUrls: ['./range-slider-edit-dialog.component.css'],
})
export class RangeSliderEditDialogComponent implements OnInit {
    @ViewChild(MatTable, { static: false }) table!: MatTable<DeploymentsModel>;

    formGroup = this.formBuilder.group(
        {
            deployment: '',
            parameter: '',
            minValue: [{ value: '' }, [Validators.required, Validators.min(0), Validators.max(100)]],
            maxValue: [{ value: '' }, [Validators.required, Validators.min(0), Validators.max(100)]],
            unit: '',
        },
        { validators: [checkValueValidator()] },
    );

    deployments: DeploymentsModel[] = [];
    parametersMap: Map<string, CamundaVariable> = new Map<string, CamundaVariable>();
    parameters: string[] = [];

    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;

    userHasUpdateNameAuthorization: boolean = false
    userHasUpdatePropertiesAuthorization: boolean = false 

    constructor(
        private dialogRef: MatDialogRef<RangeSliderEditDialogComponent>,
        private dashboardService: DashboardService,
        private deploymentsService: DeploymentsService,
        private formBuilder: UntypedFormBuilder,
        @Inject(MAT_DIALOG_DATA) data: { 
            dashboardId: string; 
            widgetId: string, 
            userHasUpdateNameAuthorization: boolean;
            userHasUpdatePropertiesAuthorization: boolean 
        },
    ) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
        this.userHasUpdateNameAuthorization = data.userHasUpdateNameAuthorization;
        this.userHasUpdatePropertiesAuthorization = data.userHasUpdatePropertiesAuthorization;
    }

    ngOnInit() {
        this.formGroup.get('deployment')?.valueChanges.subscribe((deployment: DeploymentsModel) => {
            if (deployment) {
                this.deploymentsService.getDeploymentInputParameters(deployment.id).subscribe((pars) => {
                    if (pars !== null) {
                        this.parametersMap = pars;
                        this.parameters = [];
                        pars.forEach((_, key) => {
                            this.parameters.push(key);
                        });
                    }
                });
            }
        });
        this.getWidgetData();
        this.initDeployments();
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.widget = widget;
            this.formGroup.patchValue({
                deployment: this.widget.properties.deployment,
                parameter: this.widget.properties.selectedParameter,
                minValue: this.widget.properties.selectedMinValue,
                maxValue: this.widget.properties.selectedMaxValue,
                unit: this.widget.properties.selectedUnit,
            });
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    updateName(): Observable<DashboardResponseMessageModel> {
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, this.widget.name)
    }

    updateProperties(): Observable<DashboardResponseMessageModel> {
        this.widget.properties.deployment = this.formGroup.get('deployment')?.value;
        this.widget.properties.selectedParameter = this.formGroup.get('parameter')?.value;
        this.widget.properties.selectedMinValue = this.formGroup.get('minValue')?.value;
        this.widget.properties.selectedMaxValue = this.formGroup.get('maxValue')?.value;
        this.widget.properties.selectedUnit = this.formGroup.get('unit')?.value;
        this.widget.properties.selectedParameterModel = this.parametersMap.get(this.formGroup.get('parameter')?.value);
       
        return this.dashboardService.updateWidgetProperty(this.dashboardId, this.widget.id, [], this.widget.properties)
    }

    save(): void {
        var obs = []
        if(this.userHasUpdateNameAuthorization) {
            obs.push(this.updateName())
        }
        if(this.userHasUpdatePropertiesAuthorization) {
            obs.push(this.updateProperties())
        }        
        
        forkJoin(obs).subscribe(responses => {
            var errorOccured = responses.find((response) => response.message != "OK")
            if(!errorOccured) {
                this.dialogRef.close(this.widget);
            }
        })
    }

    initDeployments() {
        this.deploymentsService.getAllMinimal('', 99999, 0, 'deploymentTime', 'desc', '').subscribe((deployments: DeploymentsModel[]) => {
            this.deployments = deployments;
        });
    }

    compareDeployments(first: DeploymentsModel, second: DeploymentsModel) {
        return second && first && first.id === second.id;
    }
}
