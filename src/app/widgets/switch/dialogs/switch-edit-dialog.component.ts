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

import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { DeploymentsModel } from '../../../modules/processes/deployments/shared/deployments.model';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { DashboardResponseMessageModel } from '../../../modules/dashboard/shared/dashboard-response-message.model';
import { SwitchPropertiesDeploymentsModel } from '../shared/switch-properties.model';
import { MatTable } from '@angular/material/table';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface TableElement {
    name: string;
    id: string;
    trigger: string;
}

@Component({
    templateUrl: './switch-edit-dialog.component.html',
    styleUrls: ['./switch-edit-dialog.component.css'],
})
export class SwitchEditDialogComponent implements OnInit {
    @ViewChild(MatTable, { static: false }) table!: MatTable<DeploymentsModel>;
    deployments: DeploymentsModel[] = [];
    filteredDeployments: Observable<DeploymentsModel[]> = new Observable();

    displayedColumns: string[] = ['name', 'trigger', 'delete'];
    columnsToDisplay: string[] = this.displayedColumns.slice();
    data: TableElement[] = [];
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = { properties: { imgUrl: '' } } as WidgetModel;
    newTrigger = 'on';
    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;
    formGroup: FormGroup;

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<SwitchEditDialogComponent>,
        private deploymentsService: DeploymentsService,
        private dashboardService: DashboardService,
        @Inject(MAT_DIALOG_DATA) data: {
            dashboardId: string;
            widgetId: string;
            userHasUpdateNameAuthorization: boolean;
            userHasUpdatePropertiesAuthorization: boolean;
        },
    ) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
        this.userHasUpdateNameAuthorization = data.userHasUpdateNameAuthorization;
        this.userHasUpdatePropertiesAuthorization = data.userHasUpdatePropertiesAuthorization;
        this.formGroup = this.fb.group({
            name: [this.widget.name, Validators.required],
            imgUrl: [this.widget.properties.imgUrl],
            deployment: [this.widget.properties.deployment],
        });
    }

    ngOnInit() {
        this.getWidgetData();
        this.initDeployments();
        this.onChanges();
    }

    onChanges(): void {
        this.formGroup.controls['name'].valueChanges.subscribe(val => {
            this.widget.name = val;
        });
        this.formGroup.controls['imgUrl'].valueChanges.subscribe(val => {
            this.widget.properties.imgUrl = val;
        });
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.widget = widget;
            this.formGroup.patchValue({
                name: this.widget.name,
                imgUrl: this.widget.properties.imgUrl,
            });
            if (widget.properties.deployments) {
                widget.properties.deployments.forEach((deploy: SwitchPropertiesDeploymentsModel) => {
                    this.data.push({ name: deploy.name, id: deploy.id, trigger: deploy.trigger });
                });
            }
            this.table.renderRows();
        });
    }

    initDeployments() {
        this.deploymentsService.getAll('', 99999, 0, 'deploymentTime', 'desc', '').subscribe((deployments: DeploymentsModel[]) => {
            this.deployments = deployments;
            this.filteredDeployments = this.formGroup.controls['deployment'].valueChanges.pipe(
                startWith(''),
                map((value) => (typeof value === 'string' || value === null ? value : value.name)),
                map((name) => (name ? this._filter(name) : this.deployments.slice())),
            );
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    updateName(): Observable<DashboardResponseMessageModel> {
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, this.widget.name);
    }

    updateSwitchProperties(): Observable<DashboardResponseMessageModel> {
        const deploymentsArray: SwitchPropertiesDeploymentsModel[] = [];
        this.data.forEach((deployments: SwitchPropertiesDeploymentsModel) => {
            deploymentsArray.push(deployments);
        });
        this.widget.properties.deployments = deploymentsArray;
        return this.dashboardService.updateWidgetProperty(this.dashboardId, this.widget.id, [], this.widget.properties);
    }

    save(): void {
        const obs = [];
        if(this.userHasUpdateNameAuthorization) {
            obs.push(this.updateName());
        }
        if(this.userHasUpdatePropertiesAuthorization) {
            obs.push(this.updateSwitchProperties());
        }

        forkJoin(obs).subscribe(responses => {
            const errorOccured = responses.find((response) => response.message != 'OK');
            if(!errorOccured) {
                this.dialogRef.close(this.widget);
            }
        });
    }

    private _filter(value: string): DeploymentsModel[] {
        const filterValue = value.toLowerCase();
        return this.deployments.filter((option) => option.name.toLowerCase().indexOf(filterValue) === 0);
    }

    addColumn() {
        let value = this.formGroup.controls['deployment'].value;
        if (value === null || this.deployments.indexOf(value as DeploymentsModel) >= 0) {
            value = value as DeploymentsModel;
            this.data.push({
                name: value.name,
                id: value.id,
                trigger: this.newTrigger,
            });
            this.table.renderRows();
            this.formGroup.controls['deployment'].reset('');
        } else {
            this.formGroup.controls['deployment'].setErrors({ valid: false });
        }
    }

    deleteRow(index: number) {
        this.data.splice(index, 1);
        this.table.renderRows();
    }

    displayFn(input?: DeploymentsModel): string {
        return input ? input.name : '';
    }
}
