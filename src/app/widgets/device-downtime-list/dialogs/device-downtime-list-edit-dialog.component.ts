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

import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
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
    templateUrl: './device-downtime-list-edit-dialog.component.html',
    styleUrls: ['./device-downtime-list-edit-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatErrorMessagesDirective, MtxSelect, MatCheckbox, MatDialogActions, MatButton]
})
export class DeviceDowntimeListEditDialogComponent implements OnInit {
    private fb = inject(FormBuilder);
    private dialogRef = inject<MatDialogRef<DeviceDowntimeListEditDialogComponent>>(MatDialogRef);
    private dashboardService = inject(DashboardService);
    private locationService = inject(LocationsService);

    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;
    formGroup: FormGroup;
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
        this.formGroup = this.fb.group({
            name: [this.widget.name, Validators.required],
            location: [''],
            filter_inactive: [false],
            minutes_green: [60, Validators.required],
            minutes_yellow: [240, Validators.required],
        });
    }

    ngOnInit() {
        this.getWidgetData();
        this.onChanges();
         this.locationService.getLocations({limit: -1}).subscribe(locationsTotal => {
            this.locations = locationsTotal.result;
        });
    }

    onChanges(): void {
        this.formGroup.controls['name'].valueChanges.subscribe(val => {
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
                location: this.widget.properties.deviceDowntimeList?.location,
                filter_inactive: this.widget.properties.deviceDowntimeList?.filter_inactive,
                minutes_green: this.widget.properties.deviceDowntimeList?.minutes_green,
                minutes_yellow: this.widget.properties.deviceDowntimeList?.minutes_yellow,
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
            obs.push( this.dashboardService.updateWidgetProperty(this.dashboardId, this.widget.id, [], {deviceDowntimeList: this.formGroup.getRawValue()}));

        }
        forkJoin(obs).subscribe(responses => {
                const errorOccured = responses.find((response) => response.message !== 'OK');
                if (!errorOccured) {
                if (this.widget) {
                    this.widget.name = this.formGroup.controls.name.value || '';
                    this.widget.properties.deviceDowntimeList = this.formGroup.getRawValue() as any;
                }
                this.dialogRef.close(this.widget);
                }
            });
    }
}
