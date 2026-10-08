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

import { Component, OnInit, ViewChild, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { DeploymentsModel } from '../../../modules/processes/deployments/shared/deployments.model';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { MatTable } from '@angular/material/table';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LocationModel } from 'src/app/modules/devices/locations/shared/locations.model';
import { LocationsService } from 'src/app/modules/devices/locations/shared/locations.service';
import { forkJoin } from 'rxjs';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../core/directives/matError.directive';
import { MtxSelect } from '@ng-matero/extensions/select';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatButton } from '@angular/material/button';

@Component({
    templateUrl: './devices-state-edit-dialog.component.html',
    styleUrls: ['./devices-state-edit-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatErrorMessagesDirective, MtxSelect, MatCheckbox, MatDialogActions, MatButton]
})
export class DevicesStateEditDialogComponent implements OnInit {
    private fb = inject(FormBuilder);
    private dialogRef = inject<MatDialogRef<DevicesStateEditDialogComponent>>(MatDialogRef);
    private dashboardService = inject(DashboardService);
    private locationService = inject(LocationsService);

    @ViewChild(MatTable, { static: false }) table!: MatTable<DeploymentsModel>;

    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;
    formGroup: FormGroup = new FormGroup({});
    locations: LocationModel[] = [];

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
        this.formGroup = this.fb.group({
            name: ['', Validators.required],
            location: [''],
            filter_inactive: [false],
        });
        this.getWidgetData();
        this.onChanges();
        this.locationService.getLocations({limit: -1}).subscribe(locationsTotal => {
            this.locations = locationsTotal.result;
        });
    }

    onChanges(): void {
        this.formGroup.controls.name.valueChanges.subscribe(val => {
            this.widget.name = val;
        });
        this.formGroup.controls.location.valueChanges.subscribe(val => {
            if (val !== null && val !== undefined) {
                this.formGroup.controls.location.setValue({
                    name: val.name,
                    id: val.id,
                }, {emitEvent: false});
            }           
        });
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.widget = widget;
            this.formGroup.patchValue({
                name: this.widget.name,
                location: this.widget.properties.deviceState?.location,
                filter_inactive: this.widget.properties.deviceState?.filter_inactive
            });
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        const obs = [];
        if (this.userHasUpdateNameAuthorization) {
             obs.push( this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, this.widget.name));
        }

        if (this.userHasUpdatePropertiesAuthorization) {
           obs.push( this.dashboardService.updateWidgetProperty(this.dashboardId, this.widget.id, [], {deviceState: this.formGroup.getRawValue()}));

        }
        forkJoin(obs).subscribe(responses => {
              const errorOccured = responses.find((response) => response.message !== 'OK');
              if (!errorOccured) {
                if (this.widget) {
                  this.widget.name = this.formGroup.controls.name.value || '';
                  this.widget.properties.deviceState = this.formGroup.getRawValue() as any;
                }
                this.dialogRef.close(this.widget);
              }
            });
    }
}
