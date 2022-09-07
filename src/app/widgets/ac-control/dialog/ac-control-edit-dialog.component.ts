import {Component, Inject, OnInit} from '@angular/core';
import {DashboardResponseMessageModel} from '../../../modules/dashboard/shared/dashboard-response-message.model';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {DeviceTypeService} from '../../../modules/metadata/device-types-overview/shared/device-type.service';
import {DeviceInstancesPermSearchModel} from '../../../modules/devices/device-instances/shared/device-instances.model';
import {
    DeviceTypeContentVariableModel,
    DeviceTypeModel
} from '../../../modules/metadata/device-types-overview/shared/device-type.model';
import {environment} from '../../../../environments/environment';
import {DeviceInstancesService} from '../../../modules/devices/device-instances/shared/device-instances.service';
import {map, mergeAll} from 'rxjs/internal/operators';
import {FormBuilder, Validators} from '@angular/forms';
import {AcControlElementModel} from '../shared/ac-control.model';

const INTEGER = 'https://schema.org/Integer';
const FLOAT = 'https://schema.org/Float';

@Component({
    selector: 'senergy-ac-control-edit-dialog',
    templateUrl: './ac-control-edit-dialog.component.html',
    styleUrls: ['./ac-control-edit-dialog.component.css']
})
export class AcControlEditDialogComponent implements OnInit {

    ready = false;
    widget: WidgetModel;
    dashboardId: string;
    deviceInstances: DeviceInstancesPermSearchModel[] = [];
    deviceTypes: DeviceTypeModel[] = [];
    form = this.fb.group([]);
    tempStep = -1;

    constructor(private dialogRef: MatDialogRef<AcControlEditDialogComponent>,
                private dashboardService: DashboardService,
                private deviceTypeService: DeviceTypeService,
                private deviceInstancesService: DeviceInstancesService,
                private fb: FormBuilder,
                @Inject(MAT_DIALOG_DATA) data: { widget: WidgetModel; dashboardId: string },
    ) {
        this.widget = data.widget;
        this.dashboardId = data.dashboardId;
    }

    ngOnInit(): void {
        this.deviceTypeService.getDeviceTypeFiltered([
            {
                function_id: environment.setTargetTemperatureFunctionId,
            }
        ]).pipe(
            map(types => {
                this.deviceTypes = types;
                return this.deviceInstancesService.getDeviceInstancesByDeviceTypes(types.map(t => t.id), 9999, 0);
            }),
            mergeAll(),
            map(devices => this.deviceInstances = devices))
            .subscribe(() => {
                this.form = this.fb.group({
                    name: [this.widget.name, Validators.required],
                    deviceId: [this.widget.properties.acControl?.deviceId, Validators.required],
                    minTarget: [this.widget.properties.acControl?.minTarget || 15, Validators.required],
                    maxTarget: [this.widget.properties.acControl?.maxTarget || 30, Validators.required],
                });
                this.ready = true;
            });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.ready = false;
        this.widget.properties.acControl = {
            deviceId: this.form.get('deviceId')?.value,
            minTarget: this.form.get('minTarget')?.value,
            maxTarget: this.form.get('maxTarget')?.value,
            tempStep: this.tempStep,
        };
        this.widget.name = this.form.get('name')?.value;

        const instance = this.deviceInstances.find(d => d.id === this.widget.properties.acControl?.deviceId);
        const dt = this.deviceTypes.find(t => t.id === instance?.device_type_id);
        const mappings: Map<string, { serviceId: string; aspectId: string }[]> = new Map();
        const functionIds: string[] = [
            environment.getTemperatureFunctionId,
            environment.getTargetTemperatureFunctionId,
            environment.getCleaningRequiredFunctionId,
            environment.getOnOffFunctionId,
            environment.setOnFunctionId,
            environment.setOffFunctionId,
            environment.getAcModeFunctionId,
            environment.setAcModeFunctionId,
            environment.getLockedFunctionId,
            environment.setUnlockedFunctionId,
            environment.setLockedFunctionId,
            environment.setTargetTemperatureFunctionId,
            environment.getFanSpeedLevelFunctionId,
            environment.setFanSpeedLevelFunctionId,
            environment.getFanSpeedLevelAutomaticFunctionId,
            environment.setFanSpeedLevelAutomaticFunctionId,
            environment.getBatteryLevelFunctionId,
        ];
        dt?.services.forEach(s => {
            s.outputs.forEach(o => this.traverseDataStructure(s.id, o.content_variable, functionIds, mappings));
            s.inputs.forEach(o => this.traverseDataStructure(s.id, o.content_variable, functionIds, mappings));
        });
        if (mappings.has(environment.getTemperatureFunctionId)) {
            this.widget.properties.acControl.getTemperatureMeasurements = [];
            mappings.get(environment.getTemperatureFunctionId)?.forEach(m => {
                this.widget.properties.acControl?.getTemperatureMeasurements?.push(this.getElement(m, environment.getTemperatureFunctionId));
            });
        }
        if (mappings.has(environment.getTargetTemperatureFunctionId)) {
            this.widget.properties.acControl.getTargetTemperature = [];
            mappings.get(environment.getTargetTemperatureFunctionId)?.forEach(m => {
                this.widget.properties.acControl?.getTargetTemperature?.push(this.getElement(m, environment.getTargetTemperatureFunctionId));
            });
        }
        if (mappings.has(environment.getCleaningRequiredFunctionId)) {
            const m = mappings.get(environment.getCleaningRequiredFunctionId)?.[0];
            this.widget.properties.acControl.getCleaningRequired = this.getElement(m, environment.getCleaningRequiredFunctionId);
        }
        if (mappings.has(environment.getOnOffFunctionId)) {
            const m = mappings.get(environment.getOnOffFunctionId)?.[0];
            this.widget.properties.acControl.getOnOff = this.getElement(m, environment.getOnOffFunctionId);
        }
        if (mappings.has(environment.setOnFunctionId)) {
            const m = mappings.get(environment.setOnFunctionId)?.[0];
            this.widget.properties.acControl.setOn = this.getElement(m, environment.setOnFunctionId);
        }
        if (mappings.has(environment.setOffFunctionId)) {
            const m = mappings.get(environment.setOffFunctionId)?.[0];
            this.widget.properties.acControl.setOff = this.getElement(m, environment.setOffFunctionId);
        }
        if (mappings.has(environment.getAcModeFunctionId)) {
            const m = mappings.get(environment.getAcModeFunctionId)?.[0];
            this.widget.properties.acControl.getMode = this.getElement(m, environment.getAcModeFunctionId);
        }
        if (mappings.has(environment.setAcModeFunctionId)) {
            const m = mappings.get(environment.setAcModeFunctionId)?.[0];
            this.widget.properties.acControl.setModeDry = this.getElement(m, environment.setAcModeFunctionId, 'DRY');
            this.widget.properties.acControl.setModeVent = this.getElement(m, environment.setAcModeFunctionId, 'VENTILATION');
            this.widget.properties.acControl.setModeHeat = this.getElement(m, environment.setAcModeFunctionId, 'HEAT');
            this.widget.properties.acControl.setModeCool = this.getElement(m, environment.setAcModeFunctionId, 'COOL');
            this.widget.properties.acControl.setModeAuto = this.getElement(m, environment.setAcModeFunctionId, 'AUTO');
        }
        if (mappings.has(environment.getLockedFunctionId)) {
            const m = mappings.get(environment.getLockedFunctionId)?.[0];
            this.widget.properties.acControl.getLocked = this.getElement(m, environment.getLockedFunctionId);
        }
        if (mappings.has(environment.setUnlockedFunctionId)) {
            const m = mappings.get(environment.setUnlockedFunctionId)?.[0];
            this.widget.properties.acControl.setUnlocked = this.getElement(m, environment.setUnlockedFunctionId);
        }
        if (mappings.has(environment.setLockedFunctionId)) {
            const m = mappings.get(environment.setLockedFunctionId)?.[0];
            this.widget.properties.acControl.setLocked = this.getElement(m, environment.setLockedFunctionId);
        }
        if (mappings.has(environment.setTargetTemperatureFunctionId)) {
            this.widget.properties.acControl.setTargetTemperature = [];
            mappings.get(environment.setTargetTemperatureFunctionId)?.forEach(m => {
                this.widget.properties.acControl?.setTargetTemperature?.push(this.getElement(m, environment.setTargetTemperatureFunctionId));
            });
        }
        if (mappings.has(environment.getFanSpeedLevelFunctionId)) {
            const m = mappings.get(environment.getFanSpeedLevelFunctionId)?.[0];
            this.widget.properties.acControl.getFanSpeedLevel = this.getElement(m, environment.getFanSpeedLevelFunctionId);
        }
        if (mappings.has(environment.setFanSpeedLevelFunctionId)) {
            const m = mappings.get(environment.setFanSpeedLevelFunctionId)?.[0];
            this.widget.properties.acControl.setFanSpeedLevel = this.getElement(m, environment.setFanSpeedLevelFunctionId);
        }
        if (mappings.has(environment.getFanSpeedLevelAutomaticFunctionId)) {
            const m = mappings.get(environment.getFanSpeedLevelAutomaticFunctionId)?.[0];
            this.widget.properties.acControl.getFanSpeedLevelAutomatic = this.getElement(m, environment.getFanSpeedLevelAutomaticFunctionId);
        }
        if (mappings.has(environment.setFanSpeedLevelAutomaticFunctionId)) {
            const m = mappings.get(environment.setFanSpeedLevelAutomaticFunctionId)?.[0];
            this.widget.properties.acControl.setFanSpeedLevelAutomatic = this.getElement(m, environment.setFanSpeedLevelAutomaticFunctionId);
        }
        if (mappings.has(environment.getBatteryLevelFunctionId)) {
            const m = mappings.get(environment.getBatteryLevelFunctionId)?.[0];
            this.widget.properties.acControl.getBatteryLevel = this.getElement(m, environment.getBatteryLevelFunctionId);
        }
        console.log(this.widget); // TODO
        this.dashboardService.updateWidget(this.dashboardId, this.widget).subscribe((resp: DashboardResponseMessageModel) => {
            if (resp.message === 'OK') {
                this.dialogRef.close(this.widget);
            } else {
                this.ready = true;
            }
        });

    }

    private traverseDataStructure(serviceId: string, field: DeviceTypeContentVariableModel | undefined, functionIds: string[], results: Map<string, { serviceId: string; aspectId: string }[]>) {
        if (field === undefined || field === null) {
            return;
        }
        const functionId = functionIds.find(f => f === field.function_id);
        if (functionId !== undefined) {
            const f = {serviceId, aspectId: field.aspect_id || ''};
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            if (results.has(field.function_id!)) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                results.get(field.function_id!)?.push(f);
            } else {
                if (field.function_id != null) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    results.set(field.function_id!, [f]);
                }
            }
            if (functionId === environment.setTargetTemperatureFunctionId) {
                if (field.type === INTEGER) {
                    this.tempStep = 1;
                } else if (field.type === FLOAT && this.tempStep === -1) {
                    this.tempStep = 0.5;
                }
            }
        }
        if (field.type === 'https://schema.org/StructuredValue') {
            if (field.sub_content_variables !== undefined) {
                field.sub_content_variables.forEach((innerField: DeviceTypeContentVariableModel) => {
                    this.traverseDataStructure(serviceId, innerField, functionIds, results);
                });
            }
        }
    }

    private getElement(m: { serviceId: string; aspectId: string } | undefined, functionId: string, value?: any): AcControlElementModel {
        return {
            aspectId: m?.aspectId || '',
            serviceId: m?.serviceId || '',
            functionId,
            value
        };
    }

}
