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
import {DashboardResponseMessageModel} from '../../../modules/dashboard/shared/dashboard-response-message.model';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {DeviceTypeService} from '../../../modules/metadata/device-types-overview/shared/device-type.service';
import {DeviceSelectablesFullModel} from '../../../modules/devices/device-instances/shared/device-instances.model';
import {environment} from '../../../../environments/environment';
import {DeviceInstancesService} from '../../../modules/devices/device-instances/shared/device-instances.service';
import {map} from 'rxjs/operators';
import { FormBuilder, FormControl, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {AcControlCandidate, acControlElements, deviceGroupCandidates, deviceTypeCandidates} from '../shared/ac-control-elements';
import {Observable, of, concatMap, forkJoin} from 'rxjs';
import {DeviceGroupsService} from '../../../modules/devices/device-groups/shared/device-groups.service';
import {rangeValidator} from '../../../core/validators/range.validator';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../core/directives/close-mtx-select-on-scroll.directive';
import { WidgetSpinnerComponent } from '../../components/widget-spinner/widget-spinner.component';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../core/directives/matError.directive';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { MatButton } from '@angular/material/button';
import { DialogHeaderComponent } from '../../../core/components/dialog-header/dialog-header.component';

interface AcControlFormControls {
    name: FormControl<string | null>;
    selectable: FormControl<string | null | undefined>;
    minTarget: FormControl<number | null>;
    maxTarget: FormControl<number | null>;
}

@Component({
    selector: 'senergy-ac-control-edit-dialog',
    templateUrl: './ac-control-edit-dialog.component.html',
    styleUrls: ['./ac-control-edit-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [DialogHeaderComponent, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, WidgetSpinnerComponent, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, MatErrorMessagesDirective, MtxSelect, MtxOption, MatDialogActions, MatButton]
})
export class AcControlEditDialogComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<AcControlEditDialogComponent>>(MatDialogRef);
    private dashboardService = inject(DashboardService);
    private deviceTypeService = inject(DeviceTypeService);
    private deviceInstancesService = inject(DeviceInstancesService);
    private deviceGroupsService = inject(DeviceGroupsService);
    private fb = inject(FormBuilder);


    ready = false;
    widget: WidgetModel;
    dashboardId: string;
    // Empty until the selectables are loaded; the template renders it only once ready.
    form = this.fb.group([]) as unknown as FormGroup<AcControlFormControls>;
    selectables: DeviceSelectablesFullModel[] = [];
    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;

    constructor() {
        const data = inject<{
            widget: WidgetModel;
            dashboardId: string;
            userHasUpdateNameAuthorization: boolean;
            userHasUpdatePropertiesAuthorization: boolean;
        }>(MAT_DIALOG_DATA);

        this.widget = data.widget;
        this.dashboardId = data.dashboardId;
        this.userHasUpdateNameAuthorization = data.userHasUpdateNameAuthorization;
        this.userHasUpdatePropertiesAuthorization = data.userHasUpdatePropertiesAuthorization;
    }

    ngOnInit(): void {
        this.deviceInstancesService.getDeviceSelectionsFull([{
            function_id: environment.setTemperatureFunctionId,
            interaction: 'request',
            device_class_id: environment.deviceClassThermostat
        }],
        false, null, null, true, false).subscribe(r => {
            this.selectables = r;
            this.form = this.fb.group({
                name: [this.widget.name, Validators.required],
                selectable: this.fb.control<string | null | undefined>(this.widget.properties.acControl?.deviceGroupId || this.widget.properties.acControl?.deviceId, Validators.required),
                minTarget: [this.widget.properties.acControl?.minTarget || 15, [Validators.required, rangeValidator(-270, 1000)]],
                maxTarget: [this.widget.properties.acControl?.maxTarget || 30, [Validators.required, rangeValidator(-270, 1000)]],
            });
            this.ready = true;
        });
    }

    getSelectableName(s: DeviceSelectablesFullModel): string {
        return s.device?.display_name || s.device_group?.name || s.import?.name || 'undefined';
    }

    getSelectableId(s: DeviceSelectablesFullModel): string | undefined {
        return s.device?.id || s.device_group?.id || s.import?.id;
    }


    close(): void {
        this.dialogRef.close();
    }

    updateName(): Observable<DashboardResponseMessageModel> {
        const newName = this.form.get('name')?.value as string;
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, newName);
    }

    updateACProperties(): Observable<DashboardResponseMessageModel> {
        this.widget.properties.acControl = {
            minTarget: this.form.get('minTarget')?.value as number,
            maxTarget: this.form.get('maxTarget')?.value as number,
            tempStep: -1,
        };

        const selectable = this.selectables.find(s => s.device?.id === this.form.get('selectable')?.value || s.device_group?.id === this.form.get('selectable')?.value);

        let observableCandidates: Observable<AcControlCandidate[]> | undefined;
        if (selectable?.device !== undefined) {
            this.widget.properties.acControl.deviceId = selectable.device.id;
            observableCandidates = this.deviceTypeService.getDeviceType(selectable.device.device_type_id)
                .pipe(map(dt => dt === null ? [] : deviceTypeCandidates(dt)));
        } else if (selectable?.device_group !== undefined) {
            this.widget.properties.acControl.deviceGroupId = selectable.device_group.id;
            observableCandidates = this.deviceGroupsService.getDeviceGroup(selectable.device_group.id)
                .pipe(map(group => group === null ? [] : deviceGroupCandidates(group)));
        }

        if (observableCandidates !== undefined) {
            return observableCandidates.pipe(map(candidates => {
                if (this.widget.properties.acControl === undefined) {
                    return;
                }
                Object.assign(this.widget.properties.acControl, acControlElements(candidates));
            }), concatMap(_ => this.dashboardService.updateWidgetProperty(this.dashboardId, this.widget.id, [], this.widget.properties)));
        }

        return of({message: ''});
    }

    save(): void {
        this.ready = false;
        const obs = [];
        if(this.userHasUpdatePropertiesAuthorization) {
            obs.push(this.updateACProperties());
        }
        if(this.userHasUpdateNameAuthorization) {
            obs.push(this.updateName());
        }
        forkJoin(obs).subscribe(results => {
            const errorOccured = results.find((response) => response.message !== 'OK');
            if(errorOccured) {
                this.ready = true;
            } else {
                this.dialogRef.close(this.widget);
            }
        });
    }

}
