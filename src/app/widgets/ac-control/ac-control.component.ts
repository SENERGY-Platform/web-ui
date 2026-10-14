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

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { WidgetModel } from '../../modules/dashboard/shared/dashboard-widget.model';
import { concatMap, map, Observable, of, Subscription } from 'rxjs';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { DeviceCommandModel, DeviceCommandService } from '../../core/services/device-command.service';
import { AcControlElementModel } from './shared/ac-control.model';
import { AcControlEditDialogComponent } from './dialog/ac-control-edit-dialog.component';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DashboardManipulationEnum } from '../../modules/dashboard/shared/dashboard-manipulation.enum';
import { environment } from '../../../environments/environment';
import { DeviceInstancesService } from '../../modules/devices/device-instances/shared/device-instances.service';
import { DeviceTypeService } from '../../modules/metadata/device-types-overview/shared/device-type.service';
import { DeviceGroupsService } from '../../modules/devices/device-groups/shared/device-groups.service';
import { AcControlCandidate, acControlElements, deviceGroupCandidates, deviceTypeCandidates, isLegacyAcControl, keepsEveryRole } from './shared/ac-control-elements';

@Component({
    selector: 'senergy-ac-control',
    templateUrl: './ac-control.component.html',
    styleUrls: ['./ac-control.component.css']
})
export class AcControlComponent implements OnInit, OnDestroy {
    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;

    ready = false;
    refreshing = false;
    destroy = new Subscription();


    constructor(private dashboardService: DashboardService, private deviceCommandService: DeviceCommandService, private dialog: MatDialog,
                private deviceInstancesService: DeviceInstancesService, private deviceTypeService: DeviceTypeService,
                private deviceGroupsService: DeviceGroupsService,
    ) {
    }

    ngOnInit(): void {
        // reload events wait for the migration, a refresh before it would send the removed functions
        this.destroy.add(this.migrateLegacyConfiguration().subscribe(() => {
            this.update();
            this.refresh();
        }));
    }

    ngOnDestroy(): void {
        this.destroy.unsubscribe();
    }


    edit() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widget: this.widget,
            dashboardId: this.dashboardId,
            userHasUpdateNameAuthorization: this.userHasUpdateNameAuthorization,
            userHasUpdatePropertiesAuthorization: this.userHasUpdatePropertiesAuthorization
        };
        dialogConfig.minWidth = '350px';
        const editDialogRef = this.dialog.open(AcControlEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.widget = widget;
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    /**
     * Derives a configuration saved before the aspect lists again from the current device type or group, the way
     * saving the edit dialog does. Device, group and the target range are kept. It is stored only if the user may
     * change the widget and every role is filled again; otherwise it is derived on every load, so that a corrected
     * environment or device type still reaches it. A device or group that cannot be read leaves it unchanged.
     */
    private migrateLegacyConfiguration(): Observable<unknown> {
        const acControl = this.widget.properties.acControl;
        if (acControl === undefined || !isLegacyAcControl(acControl)) {
            return of(null);
        }
        let candidates: Observable<AcControlCandidate[] | null>;
        if (acControl.deviceId) {
            candidates = this.deviceInstancesService.getDeviceInstanceBaseModel(acControl.deviceId).pipe(
                concatMap(device => device === null ? of(null) : this.deviceTypeService.getDeviceType(device.device_type_id)),
                map(deviceType => deviceType === null ? null : deviceTypeCandidates(deviceType)));
        } else if (acControl.deviceGroupId) {
            candidates = this.deviceGroupsService.getDeviceGroup(acControl.deviceGroupId)
                .pipe(map(group => group === null ? null : deviceGroupCandidates(group)));
        } else {
            return of(null);
        }
        return candidates.pipe(concatMap(c => {
            // the edit dialog may have replaced the configuration in the meantime
            if (c === null || this.widget.properties.acControl !== acControl) {
                return of(null);
            }
            this.widget.properties.acControl = {
                deviceId: acControl.deviceId,
                deviceGroupId: acControl.deviceGroupId,
                minTarget: acControl.minTarget,
                maxTarget: acControl.maxTarget,
                ...acControlElements(c),
            };
            return this.userHasUpdatePropertiesAuthorization && keepsEveryRole(acControl, this.widget.properties.acControl)
                ? this.dashboardService.updateWidgetProperty(this.dashboardId, this.widget.id, [], this.widget.properties)
                : of(null);
        }));
    }

    private update() {
        this.destroy.add(this.dashboardService.initWidgetObservable.subscribe(async (event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.refresh();
            }
        }));
    }

    private refresh() {
        this.refreshing = true;
        const m: Map<DeviceCommandModel, AcControlElementModel> = new Map();
        if (this.widget.properties.acControl?.getCleaningRequired !== undefined) {
             
            m.set(this.toCommand(this.widget.properties.acControl!.getCleaningRequired!, null), this.widget.properties.acControl!.getCleaningRequired!);
        }
        if (this.widget.properties.acControl?.getOnOff !== undefined) {
             
            m.set(this.toCommand(this.widget.properties.acControl!.getOnOff!, null), this.widget.properties.acControl!.getOnOff!);
        }
        if (this.widget.properties.acControl?.getMode !== undefined) {
             
            m.set(this.toCommand(this.widget.properties.acControl!.getMode!, null), this.widget.properties.acControl!.getMode!);
        }
        if (this.widget.properties.acControl?.getTargetTemperature !== undefined) {
             
            this.widget.properties.acControl?.getTargetTemperature!.forEach(e => m.set(this.toCommand(e, null), e));
        }
        if (this.widget.properties.acControl?.getTemperatureMeasurements !== undefined) {
             
            this.widget.properties.acControl?.getTemperatureMeasurements!.forEach(e => m.set(this.toCommand(e, null), e));
        }
        if (this.widget.properties.acControl?.getFanSpeedLevel !== undefined) {
             
            m.set(this.toCommand(this.widget.properties.acControl!.getFanSpeedLevel!, null), this.widget.properties.acControl!.getFanSpeedLevel!);
        }
        if (this.widget.properties.acControl?.getFanSpeedLevelAutomatic !== undefined) {
             
            m.set(this.toCommand(this.widget.properties.acControl!.getFanSpeedLevelAutomatic!, null), this.widget.properties.acControl!.getFanSpeedLevelAutomatic!);
        }
        if (this.widget.properties.acControl?.getBatteryLevel !== undefined) {
             
            m.set(this.toCommand(this.widget.properties.acControl!.getBatteryLevel!, null), this.widget.properties.acControl!.getBatteryLevel!);
        }

        if (m.size === 0) {
            this.ready = true;
            this.refreshing = false;
            return;
        }
        const keys = Array.from(m.keys());
        this.deviceCommandService.runCommands(keys).subscribe(resp => {
            resp.forEach((r, i) => {
                if (r.status_code !== 200) {
                    console.warn(this.widget.name + ' failed to collect data with code ' + r.status_code);
                    return;
                }
                const elem = m.get(keys[i]);
                if (elem === undefined) {
                    return;
                }
                if (r.message.length === 1) {
                    if (elem.value === r.message[0]) {
                        return;
                    }
                    elem.value = r.message[0];
                } else {
                    elem.value = r.message;
                }
            });
            this.ready = true;
            this.refreshing = false;
        });
    }

    joinMeasurementsString(elements?: (AcControlElementModel | undefined)[], unique: boolean = false) {
        let values: number[] = [];
        elements?.filter(e => e !== undefined && e.value !== null)?.forEach(e => {
            if (e === undefined) {
                return;
            }
            if (Array.isArray(e.value)) {
                values.push(...e.value);
            } else {
                values.push(e.value);
            }
        });
        if (unique) {
            const m = new Map();
            values.forEach(v => m.set(v, null));
            values = Array.from(m.keys());
        }
        if (values.length > 2) {
            return Math.min(...values) + ' - ' + Math.max(...values);
        } else {
            return values?.join(', ');
        }
    }

    getBatteryIcon(element?: AcControlElementModel | undefined): string {
        if (element === undefined) {
            return '';
        }
        let value = element.value;
        if (Array.isArray(value)) {
            value = Math.min(...value);
        }
        if (value <= 15) {
            return 'battery_0_bar';
        }
        if (value <= 30) {
            return 'battery_1_bar';
        }
        if (value <= 45) {
            return 'battery_2_bar';
        }
        if (value <= 60) {
            return 'battery_3_bar';
        }
        if (value <= 75) {
            return 'battery_4_bar';
        }
        if (value <= 90) {
            return 'battery_5_bar';
        }
        return 'battery_full';
    }

    getBatteryIconColor(element?: AcControlElementModel | undefined): string {
        return this.getBatteryIcon(element) === 'battery_0_bar' ? 'warn' : 'accent';
    }

    togglePower() {
        if (this.widget.properties.acControl?.getOnOff?.value === true) {
            this.runCommand(this.widget.properties.acControl?.setOff, null);
        } else {
            this.runCommand(this.widget.properties.acControl?.setOn, null);
        }
    }

    runCommand(e: AcControlElementModel | undefined, value: any) {
        if (e === undefined) {
            return;
        }
        this.deviceCommandService.runCommands([this.toCommand(e, value)], true).subscribe(() => this.updateValue(e, value));
    }

    set bufferedSetTemperature(value: number) {
        localStorage.setItem(this.widget.id + '_bufferTime', '' + new Date().valueOf());
        localStorage.setItem(this.widget.id + '_bufferValue', '' + value);
    }

    get bufferedSetTemperature(): number | null {
        const bufferTime = localStorage.getItem(this.widget.id + '_bufferTime');
        if (bufferTime === null) {
            return null;
        }
        if (new Date().valueOf() - parseFloat(bufferTime) > 60 * 10 * 1000) { // older than 10min
            localStorage.removeItem(this.widget.id + '_bufferTime');
            localStorage.removeItem(this.widget.id + '_bufferValue');
            return null;
        }
        const bufferValue = localStorage.getItem(this.widget.id + '_bufferValue');
        return bufferValue === null ? null : parseFloat(bufferValue);
    }

    private toCommand(e: AcControlElementModel, value: any): DeviceCommandModel {
        return {
            device_id: this.widget.properties.acControl?.deviceId,
            group_id: this.widget.properties.acControl?.deviceGroupId,
            function_id: e.functionId,
            service_id: e.serviceId,
            ...(e.aspectIds !== undefined ? {aspect_ids: e.aspectIds} : {aspect_id: e.aspectId}),
            device_class_id: environment.deviceClassThermostat,
            input: value,
        };
    }

    setAllTargets(value: any) {
        const commands: DeviceCommandModel[] = [];
        this.widget.properties.acControl?.setTargetTemperature?.forEach(c => commands.push(this.toCommand(c, value)));
        this.deviceCommandService.runCommands(commands, true).subscribe(() => {
            this.updateValue(this.widget.properties.acControl?.setTargetTemperature?.[0], value);
            this.bufferedSetTemperature = value;
        });
    }

    private updateValue(e: AcControlElementModel | undefined, value: any) {
        if (e === undefined) {
            return;
        }
        const acControl = this.widget.properties.acControl;
        if ((e === acControl?.setOff || e === acControl?.setOn) && acControl.getOnOff !== undefined) {
            acControl.getOnOff.value = value;
        }
        if ((e === acControl?.setModeAuto || e === acControl?.setModeCool || e === acControl?.setModeHeat || e === acControl?.setModeVent || e === acControl?.setModeDry) && acControl.getMode !== undefined) {
            acControl.getMode.value = value;
        }
        if (e === acControl?.setTargetTemperature?.[0] && acControl.getTargetTemperature !== undefined) {
            acControl.getTargetTemperature?.forEach(e2 => e2.value = value);
        }
        if (e === acControl?.setFanSpeedLevel && acControl.getFanSpeedLevel !== undefined) {
            acControl.getFanSpeedLevel.value = value;
        }
        if (e === acControl?.setFanSpeedLevelAutomatic && acControl.getFanSpeedLevelAutomatic !== undefined) {
            acControl.getFanSpeedLevelAutomatic.value = value;
        }
    }
}
