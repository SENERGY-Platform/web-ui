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

import { Component, OnInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {DeploymentsModel} from '../../../modules/processes/deployments/shared/deployments.model';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {MatTable} from '@angular/material/table';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {DashboardResponseMessageModel} from '../../../modules/dashboard/shared/dashboard-response-message.model';
import {CamundaVariable} from '../../../modules/processes/deployments/shared/deployments-definition.model';
import {checkValueValidator} from './range-slider-edit-dialog.validators';
import {forkJoin, Observable } from 'rxjs';
import {rangeValidator} from '../../../core/validators/range.validator';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../core/directives/matError.directive';
import { MtxSelect } from '@ng-matero/extensions/select';
import { MatButton } from '@angular/material/button';

@Component({
    templateUrl: './range-slider-edit-dialog.component.html',
    styleUrls: ['./range-slider-edit-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatErrorMessagesDirective, MtxSelect, MatDialogActions, MatButton]
})
export class RangeSliderEditDialogComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<RangeSliderEditDialogComponent>>(MatDialogRef);
    private dashboardService = inject(DashboardService);
    private deploymentsService = inject(DeploymentsService);
    private formBuilder = inject(FormBuilder);
    private destroyRef = inject(DestroyRef);

    @ViewChild(MatTable, { static: false }) table!: MatTable<DeploymentsModel>;

    formGroup = this.formBuilder.group(
        {
            name: ['', Validators.required],
            deployment: this.formBuilder.control<DeploymentsModel | string | null | undefined>(''),
            parameter: '',
            // A boxed value needs both keys, so this starts as the object itself, not as ''.
            minValue: this.formBuilder.control<number | { value: string } | null | undefined>({ value: '' }, [Validators.required, rangeValidator(0, 100)]),
            maxValue: this.formBuilder.control<number | { value: string } | null | undefined>({ value: '' }, [Validators.required, rangeValidator(0, 100)]),
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

    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;

    constructor() {
        const data = inject<{
            dashboardId: string;
            widgetId: string;
            userHasUpdateNameAuthorization: boolean;
            userHasUpdatePropertiesAuthorization: boolean;
        }>(MAT_DIALOG_DATA);

        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
        this.userHasUpdateNameAuthorization = data.userHasUpdateNameAuthorization;
        this.userHasUpdatePropertiesAuthorization = data.userHasUpdatePropertiesAuthorization;
    }

    ngOnInit() {
        this.formGroup.get('deployment')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((deployment) => {
            if (deployment) {
                this.deploymentsService.getDeploymentInputParameters((deployment as DeploymentsModel).id).subscribe((pars) => {
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
        this.formGroup.controls['name'].valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(val => {
            this.widget.name = val as string;
        });
        this.getWidgetData();
        this.initDeployments();
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.widget = widget;
            this.formGroup.patchValue({
                name: this.widget.name,
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
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, this.widget.name);
    }

    updateProperties(): Observable<DashboardResponseMessageModel> {
        this.widget.name = this.formGroup.get('name')?.value as string;
        this.widget.properties.deployment = this.formGroup.get('deployment')?.value as DeploymentsModel | undefined;
        this.widget.properties.selectedParameter = this.formGroup.get('parameter')?.value as string | undefined;
        this.widget.properties.selectedMinValue = this.formGroup.get('minValue')?.value as number | undefined;
        this.widget.properties.selectedMaxValue = this.formGroup.get('maxValue')?.value as number | undefined;
        this.widget.properties.selectedUnit = this.formGroup.get('unit')?.value as string | undefined;
        this.widget.properties.selectedParameterModel = this.parametersMap.get(this.formGroup.get('parameter')?.value as string);

        return this.dashboardService.updateWidgetProperty(this.dashboardId, this.widget.id, [], this.widget.properties);
    }

    save(): void {
        const obs = [];
        if(this.userHasUpdateNameAuthorization) {
            obs.push(this.updateName());
        }
        if(this.userHasUpdatePropertiesAuthorization) {
            obs.push(this.updateProperties());
        }

        forkJoin(obs).subscribe(responses => {
            const errorOccured = responses.find((response) => response.message != 'OK');
            if(!errorOccured) {
                this.dialogRef.close(this.widget);
            }
        });
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
