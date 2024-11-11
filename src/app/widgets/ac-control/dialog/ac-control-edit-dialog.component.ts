import {Component, Inject, OnInit} from '@angular/core';
import {DashboardResponseMessageModel} from '../../../modules/dashboard/shared/dashboard-response-message.model';
import {
    MAT_DIALOG_DATA,
    MatDialogRef
} from '@angular/material/dialog';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {DeviceTypeService} from '../../../modules/metadata/device-types-overview/shared/device-type.service';
import {DeviceSelectablesFullModel} from '../../../modules/devices/device-instances/shared/device-instances.model';
import {DeviceTypeContentVariableModel} from '../../../modules/metadata/device-types-overview/shared/device-type.model';
import {environment} from '../../../../environments/environment';
import {DeviceInstancesService} from '../../../modules/devices/device-instances/shared/device-instances.service';
import {map} from 'rxjs/operators';
import {UntypedFormBuilder, Validators} from '@angular/forms';
import {AcControlElementModel} from '../shared/ac-control.model';
import {Observable, of, concatMap, forkJoin} from 'rxjs';
import {DeviceGroupsService} from '../../../modules/devices/device-groups/shared/device-groups.service';
import {rangeValidator} from '../../../core/validators/range.validator';

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
    form = this.fb.group([]);
    tempStep = -1;
    functionIds: string[] = [
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
    selectables: DeviceSelectablesFullModel[] = [];
    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;

    constructor(private dialogRef: MatDialogRef<AcControlEditDialogComponent>,
                private dashboardService: DashboardService,
                private deviceTypeService: DeviceTypeService,
                private deviceInstancesService: DeviceInstancesService,
                private deviceGroupsService: DeviceGroupsService,
                private fb: UntypedFormBuilder,
                @Inject(MAT_DIALOG_DATA) data: {
                    widget: WidgetModel;
                    dashboardId: string;
                    userHasUpdateNameAuthorization: boolean;
                    userHasUpdatePropertiesAuthorization: boolean;
                },
    ) {
        this.widget = data.widget;
        this.dashboardId = data.dashboardId;
        this.userHasUpdateNameAuthorization = data.userHasUpdateNameAuthorization;
        this.userHasUpdatePropertiesAuthorization = data.userHasUpdatePropertiesAuthorization;
    }

    ngOnInit(): void {
        this.deviceInstancesService.getDeviceSelectionsFull([{
            function_id: environment.setTargetTemperatureFunctionId,
            interaction: 'request',
            device_class_id: environment.deviceClassThermostat
        }],
        false, null, null, true, false).subscribe(r => {
            this.selectables = r;
            this.form = this.fb.group({
                name: [this.widget.name, Validators.required],
                selectable: [this.widget.properties.acControl?.deviceGroupId || this.widget.properties.acControl?.deviceId, Validators.required],
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
        const newName = this.form.get('name')?.value;
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, newName);
    }

    updateACProperties(): Observable<DashboardResponseMessageModel> {
        this.widget.properties.acControl = {
            minTarget: this.form.get('minTarget')?.value,
            maxTarget: this.form.get('maxTarget')?.value,
            tempStep: this.tempStep,
        };

        const selectable = this.selectables.find(s => s.device?.id === this.form.get('selectable')?.value || s.device_group?.id === this.form.get('selectable')?.value);

        let observableMappings: Observable<Map<string, { serviceId?: string; aspectId: string }[]>> | undefined;
        if (selectable?.device !== undefined) {
            this.widget.properties.acControl.deviceId = selectable.device.id;
            observableMappings = this.deviceTypeService.getDeviceType(selectable.device.device_type_id).pipe(map(dt => {
                const mappings: Map<string, { serviceId: string; aspectId: string }[]> = new Map();
                dt?.services.forEach(s => {
                    s.outputs.forEach(o => this.traverseDataStructure(s.id, o.content_variable, this.functionIds, mappings));
                    s.inputs.forEach(o => this.traverseDataStructure(s.id, o.content_variable, this.functionIds, mappings));
                });
                return mappings;
            }));
        } else if (selectable?.device_group !== undefined) {
            this.widget.properties.acControl.deviceGroupId = selectable.device_group.id;
            observableMappings = this.deviceGroupsService.getDeviceGroup(selectable.device_group.id).pipe(map(group => {
                const mappings: Map<string, { aspectId: string }[]> = new Map();
                group?.criteria?.forEach(c => {
                    if (!mappings.has(c.function_id)) {
                        mappings.set(c.function_id, []);
                    }
                    if (mappings.get(c.function_id)?.findIndex(m => m.aspectId === c.aspect_id) !== -1) {
                        return; // no duplicates based on interaction
                    }
                    mappings.get(c.function_id)?.push({aspectId: c.aspect_id});
                });
                return mappings;
            }));
        }

        if (observableMappings !== undefined) {
            return observableMappings.pipe(map(mappings => {
                if (this.widget.properties.acControl === undefined) {
                    return;
                }
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

    private getElement(m: { serviceId?: string; aspectId: string } | undefined, functionId: string, value?: any): AcControlElementModel {
        return {
            aspectId: m?.aspectId || '',
            serviceId: m?.serviceId,
            functionId,
            value
        };
    }

}
