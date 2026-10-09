/*
 * Copyright 2025 InfAI (CC SES)
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
import { FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { concatMap, Observable, map } from 'rxjs';
import { DashboardResponseMessageModel } from 'src/app/modules/dashboard/shared/dashboard-response-message.model';
import { saveWidgetEdits } from 'src/app/modules/dashboard/shared/save-widget-edits';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { ExportModel } from 'src/app/modules/exports/shared/export.model';
import { ExportService } from 'src/app/modules/exports/shared/export.service';
import { ConsumptionProfileProperties } from '../../shared/consumption-profile.model';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { WidgetSpinnerComponent } from '../../../components/widget-spinner/widget-spinner.component';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../../core/directives/matError.directive';
import { MtxSelect } from '@ng-matero/extensions/select';
import { MatButton } from '@angular/material/button';

@Component({
    selector: 'app-edit',
    templateUrl: './edit.component.html',
    styleUrls: ['./edit.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, WidgetSpinnerComponent, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatErrorMessagesDirective, MtxSelect, MatDialogActions, MatButton]
})
export class ConsumptionProfileEditComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<ConsumptionProfileEditComponent>>(MatDialogRef);
    private exportService = inject(ExportService);
    private dashboardService = inject(DashboardService);
    private formBuilder = inject(FormBuilder);

    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;
    form = this.formBuilder.group({
        name: ['', Validators.required],
        export: this.formBuilder.control<ExportModel | string | null | undefined>('', Validators.required),
    });
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    exports: ExportModel[] = [];
    ready = false;

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

    close(): void {
        this.dialogRef.close(this.widget);
    }

    ngOnInit() {
        this.exportService.getAvailableExports().pipe(
            concatMap((exports) => {
                this.exports = exports;
                return this.getWidgetData();
            })
        ).subscribe({
            next: (_) => {
                this.ready = true;
            },
            error: (_) => {
                this.ready = true;
            }
        });

    }

    getWidgetData(): Observable<WidgetModel> {
        return this.dashboardService.getWidget(this.dashboardId, this.widgetId).pipe(
            map((widget: WidgetModel) => {
                this.widget = widget;
                const exportElement = this.exports.find((availableExport) => availableExport.ID === this.widget.properties.consumptionProfile?.exportID);
                this.form.patchValue({
                    name: widget.name,
                    export: exportElement,
                });
                return widget;
            })
        );
    }

    updateName(): Observable<DashboardResponseMessageModel> {
        const newName =  this.form.get('name')?.value as string;
        this.widget.name = newName;
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, newName);
    }

    updateProperties(): Observable<DashboardResponseMessageModel> {
        const widgetProperties: ConsumptionProfileProperties = {
            exportID: (this.form.controls.export.value as ExportModel).ID as string,
        };
        this.widget.properties.consumptionProfile = widgetProperties;

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
        saveWidgetEdits(obs).subscribe(() => {
            this.dialogRef.close(this.widget);
        });
    }

    displayFn(input?: ExportModel): string {
        return (input != null && input.Name != null) ? input.Name : '';
    }
}
