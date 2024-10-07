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

import { Component, Inject, OnInit } from '@angular/core';
import { Form, FormControl, FormGroup, UntypedFormBuilder } from '@angular/forms';
import { WidgetModel } from '../../../modules/dashboard/shared/dashboard-widget.model';
import { ChartsExportMeasurementModel } from '../../charts/export/shared/charts-export-properties.model';
import { DeploymentsService } from '../../../modules/processes/deployments/shared/deployments.service';
import { ExportModel, ExportResponseModel, ExportValueModel } from '../../../modules/exports/shared/export.model';
import { DashboardService } from '../../../modules/dashboard/shared/dashboard.service';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { DashboardResponseMessageModel } from '../../../modules/dashboard/shared/dashboard-response-message.model';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DeviceInstanceModel } from '../../../modules/devices/device-instances/shared/device-instances.model';
import { DeviceTypeCharacteristicsModel, DeviceTypeFunctionModel, DeviceTypeServiceModel } from '../../../modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from '../../../modules/metadata/device-types-overview/shared/device-type.service';
import { DeviceInstancesService } from '../../../modules/devices/device-instances/shared/device-instances.service';
import { ChartsExportRequestPayloadGroupModel } from '../../charts/export/shared/charts-export-request-payload.model';
import { concatMap, forkJoin, map, mergeMap, Observable, of } from 'rxjs';
import { DeviceGroupsService } from 'src/app/modules/devices/device-groups/shared/device-groups.service';
import { DeviceGroupCriteriaModel, DeviceGroupHelperResultModel, DeviceGroupModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';
import { AspectsPermSearchModel } from 'src/app/modules/metadata/aspects/shared/aspects-perm-search.model';
import { DeviceClassesPermSearchModel } from 'src/app/modules/metadata/device-classes/shared/device-classes-perm-search.model';
import { ConceptsCharacteristicsModel } from 'src/app/modules/metadata/concepts/shared/concepts-characteristics.model';
import { ConceptsService } from 'src/app/modules/metadata/concepts/shared/concepts.service';
import { SingleValueAggregations, ValueHighlightConfig } from '../shared/single-value.model';

@Component({
    templateUrl: './single-value-edit-dialog.component.html',
    styleUrls: ['./single-value-edit-dialog.component.css'],
})
export class SingleValueEditDialogComponent implements OnInit {
    formIsReady = false;
    dataSourceFieldsReady = true;
    exports: ChartsExportMeasurementModel[] = [];
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    vAxisValues: ExportValueModel[] = [];
    disableSave = false;
    dataSourceSelectionReady = false;
    groupTypes = [
        'mean',
        'sum',
        'count',
        'median',
        'min',
        'max',
        'first',
        'last',
        'difference-first',
        'difference-last',
        'difference-min',
        'difference-max',
        'difference-count',
        'difference-mean',
        'difference-sum',
        'difference-median',
    ];
    aggregations = Object.values(SingleValueAggregations);

    devices: DeviceInstanceModel[] = [];
    deviceGroups: DeviceGroupModel[] = [];
    services: DeviceTypeServiceModel[] = [];
    paths: { Name: string }[] = [];
    aspects: AspectsPermSearchModel[] = [];
    functions: DeviceTypeFunctionModel[] = [];
    deviceClasses: DeviceClassesPermSearchModel[] = [];
    concept?: ConceptsCharacteristicsModel | null;

    form: FormGroup = new FormGroup({});

    userHasUpdateNameAuthorization = false;
    userHasUpdatePropertiesAuthorization = false;

    constructor(
        private dialogRef: MatDialogRef<SingleValueEditDialogComponent>,
        private deploymentsService: DeploymentsService,
        private dashboardService: DashboardService,
        private exportService: ExportService,
        private fb: UntypedFormBuilder,
        private deviceTypeService: DeviceTypeService,
        private deviceInstancesService: DeviceInstancesService,
        private deviceGroupsService: DeviceGroupsService,
        private conceptsService: ConceptsService,
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
    }

    ngOnInit() {
        this.initForm();
        this.getWidgetData().pipe(
            concatMap((_: any) => this.loadDataSourceOptions(this.widget.properties.sourceType || 'export')),
            concatMap(() => this.setAllOptions()),
            map(() => {
                this.listenForFormChanges();
            })
        ).subscribe({
            next: (_) => {},
            error: (err) => {
                console.log(err);
            }
        });
    }

    initForm() {
        this.form = this.fb.group({
            vAxis: {},
            vAxisLabel: '',
            name: '',
            type: '',
            format: '',
            threshold: 128,
            math: '',
            measurement: '',
            group: this.fb.group({
                time: '',
                type: '',
            }),
            sourceType: '',
            device: {},
            service: {},
            deviceGroupId: '',
            deviceGroupCriteria: {},
            deviceGroupAggregation: 'latest',
            targetCharacteristic: '',
            timestampConfig: this.fb.group({
                showTimestamp: new FormControl<boolean>(false),
                highlightTimestamp: new FormControl<boolean>(false),
                warningTimeLevel: new FormControl<string>('d'),
                warningAge: new FormControl<number>(1),
                problemTimeLevel: new FormControl<string>('d'),
                problemAge: new FormControl<number>(7),
            }),
            valueHighlightConfig: this.fb.group({
                highlight: new FormControl<boolean>(false),
                thresholds: new FormControl([])
            })
        });
    }

    loadDataSourceOptions(sourceType: string) {
        this.dataSourceSelectionReady = false;
        let obs: Observable<any> = of();
        if(sourceType === 'export') {
            obs = this.initDeployments();
        } else if(sourceType === 'device') {
            obs = this.initDevices();
        } else if(sourceType === 'deviceGroup') {
            obs = this.initDeviceGroups();
        }

        return obs.pipe(
            map(() => this.dataSourceSelectionReady = true)
        );
    }

    listenForDeviceSelectionChange() {
        this.form.get('device')?.valueChanges.pipe(
            concatMap((device: DeviceInstanceModel) => {
                this.dataSourceFieldsReady = false;
                this.paths = [];
                this.services = [];
                this.form.get('service')?.patchValue('');
                this.form.get('vAxis')?.patchValue('');

                if (device === undefined || device == null) {
                    return of(null);
                }
                return this.loadDeviceServices(device);
            }),
            map((_) => {
                this.dataSourceFieldsReady = true;
            })
        ).subscribe();
    }

    loadDeviceServices(device: DeviceInstanceModel) {
        return this.deviceTypeService.getDeviceType(device.device_type_id).pipe(
            map((dt) => {
                this.services = dt?.services.filter(service => service.outputs.length === 1) || [];
            })
        );
    }

    listenForServiceSelectionChange() {
        this.form.get('service')?.valueChanges.subscribe((service: DeviceTypeServiceModel) => {
            this.paths = [];
            this.form.get('vAxis')?.patchValue('');
            if (service === undefined || service == null) {
                return;
            }
            this.loadDeviceServiceValues(service);
        });
    }

    loadDeviceServiceValues(service: DeviceTypeServiceModel) {
        this.paths = this.deviceTypeService.getValuePaths(service.outputs[0].content_variable).map(x => ({ Name: x }));
    }

    listenForDeviceGroupCriteriaSelectionChange() {
        this.form.get('deviceGroupCriteria')?.valueChanges.subscribe(criteria => {
            this.dataSourceFieldsReady = false;
            const conceptId = this.functions.find(f => f.id === criteria.function_id)?.concept_id;
            if (conceptId !== undefined) {
                this.loadAndSetConcept(conceptId).subscribe(() => {
                    this.dataSourceFieldsReady = true;
                });
            }
        });
    }

    loadAndSetConcept(conceptID: string) {
        return this.conceptsService.getConceptWithCharacteristics(conceptID).pipe(
            map((c) => {
                this.concept = c;
            })
        );
    }

    listenForExportSelection() {
        this.form.get('measurement')?.valueChanges.subscribe(exp => {
            this.vAxisValues = exp?.values;
        });
    }

    listenForDeviceGroupSelectionChange() {
        this.form.get('deviceGroupId')?.valueChanges.subscribe(_ => {
            this.form.get('vAxisLabel')?.patchValue('');
        });
    }

    listenForDataSourceTypeChange() {
        this.form.get('sourceType')?.valueChanges.subscribe(sourceType => {
            this.loadDataSourceOptions(sourceType).subscribe();
        });
    }

    listenForFormChanges() {
        this.listenForDataSourceTypeChange();

        this.form.get('type')?.valueChanges.subscribe(v => {
            if (v === 'String') {
                this.form.patchValue({ format: '' });
                this.form.get('format')?.disable();
            } else {
                this.form.get('format')?.enable();
            }
        });

        this.listenForExportSelection();
        this.listenForDeviceSelectionChange();
        this.listenForServiceSelectionChange();
        this.listenForDeviceGroupCriteriaSelectionChange();
        this.listenForDeviceGroupSelectionChange();

        this.form.get('vAxisLabel')?.valueChanges.subscribe(unit => {
            this.form.patchValue({targetCharacteristic: this.concept?.characteristics.find(c => this.getDisplay(c) === unit)?.id});
        });
    }

    getWidgetData() {
        return this.dashboardService.getWidget(this.dashboardId, this.widgetId).pipe(
            map((widget: WidgetModel) => {
                this.widget = widget;
                this.form.patchValue({
                    vAxis: widget.properties.vAxis,
                    vAxisLabel: widget.properties.vAxisLabel,
                    name: widget.name,
                    type: widget.properties.type,
                    format: widget.properties.format,
                    threshold: widget.properties.threshold,
                    math: widget.properties.math,
                    sourceType: this.widget.properties.sourceType || 'export',
                    measurement: this.widget.properties.measurement,
                    device: this.widget.properties.device,
                    service: this.widget.properties.service,
                    deviceGroupId: this.widget.properties.deviceGroupId,
                    deviceGroupCriteria: this.widget.properties.deviceGroupCriteria,
                    deviceGroupAggregation: this.widget.properties.deviceGroupAggregation,
                    targetCharacteristic: this.widget.properties.targetCharacteristic,
                });

                if (this.widget.properties.timestampConfig !== undefined) {
                    this.form.get('timestampConfig')?.patchValue({
                        showTimestamp: this.widget.properties.timestampConfig.showTimestamp,
                        highlightTimestamp: this.widget.properties.timestampConfig.highlightTimestamp,
                        warningTimeLevel: this.widget.properties.timestampConfig.warningTimeLevel,
                        warningAge: this.widget.properties.timestampConfig.warningAge,
                        problemTimeLevel: this.widget.properties.timestampConfig.problemTimeLevel,
                        problemAge: this.widget.properties.timestampConfig.problemAge,
                    });
                }

                this.form.get('group')?.patchValue({
                    time: widget.properties.group?.time,
                    type: widget.properties.group?.type,
                });

                this.form.get('valueHighlightConfig')?.patchValue(widget.properties.valueHighlightConfig);

                return true;
            }),
            map((_) => {
                this.formIsReady = true;
            }));
    }

    setAllOptions() {
        // when selections were made, the matching options must be loaded so that the select works
        this.setExportValueOptions(this.widget.properties.measurement);

        const selectedService = this.widget.properties.service;
        if(selectedService != null) {
            this.loadDeviceServiceValues(selectedService);
        }

        const obs: Observable<any>[] = [
            this.setDeviceServiceOptions(this.widget.properties.device),
            this.setDeviceGroupUnitOptions(this.widget.properties.deviceGroupCriteria),
        ];
        return forkJoin(obs);
    }

    setExportValueOptions(dataExport?: ChartsExportMeasurementModel) {
        // set export field options
        this.vAxisValues = dataExport?.values || [];
    }

    setDeviceServiceOptions(device?: DeviceInstanceModel) {
        // load and set device service options
        if(device == null) {
            return of(null);
        }

        return this.loadDeviceServices(device);
    }

    setDeviceGroupUnitOptions(criteria?: DeviceGroupCriteriaModel) {
        // load and set device group unit options
        if(criteria == null) {
            return of(null);
        }
        const conceptId = this.functions.find(f => f.id === criteria.function_id)?.concept_id;
        if(conceptId == null) {
            return of(null);
        }
        return this.loadAndSetConcept(conceptId);
    }

    initDeployments() {
        this.exports = [];
        return this.exportService.getExports(true, '', 9999, 0, 'name', 'asc', undefined, undefined).pipe(
            map((exports: ExportResponseModel | null) => {
                if (exports !== null) {
                    exports.instances?.forEach((exportModel: ExportModel) => {
                        if (exportModel.ID !== undefined && exportModel.Name !== undefined) {
                            this.exports.push({
                                id: exportModel.ID,
                                name: exportModel.Name,
                                values: exportModel.Values,
                                exportDatabaseId: exportModel.ExportDatabaseID
                            });
                        }
                    });
                }
            }));
    }

    initDevices() {
        return this.deviceInstancesService.getDeviceInstances({limit: 10000, offset: 0}).pipe(
            map((devices => this.devices = devices.result)));
    }

    initDeviceGroups() {
        return this.deviceGroupsService.getDeviceGroups('', 10000, 0, 'name', 'asc').pipe(mergeMap(deviceGroups => {
            this.deviceGroups = deviceGroups;
            const ascpectIds: Map<string, null> = new Map();
            const functionIds: Map<string, null> = new Map();
            const deviceClassids: Map<string, null> = new Map();
            const obs: Observable<any>[] = [];
            this.deviceGroups.forEach(dg => {
                dg.criteria.forEach(c => {
                    ascpectIds.set(c.aspect_id, null);
                    functionIds.set(c.function_id, null);
                    deviceClassids.set(c.device_class_id, null);
                });
                obs.push(this.deviceGroupsService.getDeviceGroup(dg.id, true).pipe(map(newDg => {
                    const criteria: DeviceGroupCriteriaModel[] = [];
                    newDg?.criteria.forEach(c => {
                        if (criteria.findIndex(c2 => c.aspect_id === c2.aspect_id && c.function_id === c2.function_id && c.device_class_id === c2.device_class_id) === -1) {
                            // filters interaction, irrelevant for widget
                            c.interaction = '';
                            criteria.push(c);
                        }
                    });
                    dg.criteria = criteria;
                })));

            });
            obs.push(this.deviceGroupsService.getAspectListByIds(Array.from(ascpectIds.keys())).pipe(map(aspects => this.aspects = aspects)));
            obs.push(this.deviceGroupsService.getFunctionListByIds(Array.from(functionIds.keys())).pipe(map(functions => this.functions = functions)));
            obs.push(this.deviceGroupsService.getDeviceClassListByIds(Array.from(deviceClassids.keys())).pipe(map(deviceClasses => this.deviceClasses = deviceClasses)));
            return forkJoin(obs);
        }));
    }

    close(): void {
        this.dialogRef.close();
    }

    updateName(): Observable<DashboardResponseMessageModel> {
        const newName = this.form.get('name')?.value || '';
        return this.dashboardService.updateWidgetName(this.dashboardId, this.widget.id, newName);
    }

    updateProperties(): Observable<DashboardResponseMessageModel> {
        this.widget.properties.measurement = {
            id: this.form.get('measurement')?.value?.id,
            name: this.form.get('measurement')?.value?.name,
            values: this.form.get('measurement')?.value?.values,
            exportDatabaseId: this.form.get('measurement')?.value?.ExportDatabaseId,
        };
        this.widget.properties.vAxis = this.form.get('vAxis')?.value as ExportValueModel || undefined;
        this.widget.properties.vAxisLabel = this.form.get('vAxisLabel')?.value || undefined;
        this.widget.properties.type = this.form.get('type')?.value || undefined;
        this.widget.properties.format = this.form.get('format')?.value || undefined;
        this.widget.properties.threshold = this.form.get('threshold')?.value || undefined;
        this.widget.properties.math = this.form.get('math')?.value || undefined;
        this.widget.properties.group = this.form.get('group')?.value as ChartsExportRequestPayloadGroupModel || undefined;
        this.widget.properties.device = this.form.get('device')?.value as DeviceInstanceModel || undefined;
        this.widget.properties.service = this.form.get('service')?.value as DeviceTypeServiceModel || undefined;
        this.widget.properties.sourceType = this.form.get('sourceType')?.value || undefined;
        this.widget.properties.deviceGroupId = this.form.get('deviceGroupId')?.value || undefined;
        this.widget.properties.deviceGroupCriteria = this.form.get('deviceGroupCriteria')?.value || undefined;
        this.widget.properties.targetCharacteristic = this.form.get('targetCharacteristic')?.value || undefined;
        this.widget.properties.deviceGroupAggregation = this.form.get('deviceGroupAggregation')?.value || undefined;
        this.widget.properties.timestampConfig = this.form.get('timestampConfig')?.value || undefined;
        this.widget.properties.valueHighlightConfig = this.form.get('valueHighlightConfig')?.value || undefined;
        return this.dashboardService.updateWidgetProperty(this.dashboardId, this.widget.id, [], this.widget.properties);
    }

    save(): void {
        const obs = [];
        if (this.userHasUpdateNameAuthorization) {
            obs.push(this.updateName());
        }
        if (this.userHasUpdatePropertiesAuthorization) {
            obs.push(this.updateProperties());
        }

        forkJoin(obs).subscribe(responses => {
            const errorOccured = responses.find((response) => response.message != 'OK');
            if (!errorOccured) {
                this.dialogRef.close(this.widget);
            }
        });
    }

    displayFn(input?: ChartsExportMeasurementModel): string {
        return input ? input.name : '';
    }

    compareValues(a: any, b: any) {
        if (a === null || b === null || a === undefined || b === undefined) {
            return a === b;
        }
        return a.InstanceID === b.InstanceID && a.Name === b.Name && a.Path === b.Path;
    }

    compareStrings(a: any, b: any) {
        return a === b;
    }

    compareIds(a: any, b: any) {
        if (a === null || b === null || a === undefined || b === undefined) {
            return a === b;
        }
        return a.id === b.id;
    }

    compareNames(a: any, b: any) {
        if (a === null || b === null || a === undefined || b === undefined) {
            return a === b;
        }
        return a.Name === b.Name;
    }

    compareCriteria(a: any, b: any) {
        if (a === null || b === null || a === undefined || b === undefined) {
            return a === b;
        }
        return a.interaction === b.interaction && a.function_id === b.function_id && a.aspect_id === b.aspect_id && a.device_class_id === b.device_class_id;

    }

    getCriteria(): DeviceGroupCriteriaModel[] {
        const id = this.form.get('deviceGroupId')?.value;
        return this.deviceGroups.find(dg => dg.id === id)?.criteria || [];
    }

    describeCriteria(): (criteria: DeviceGroupCriteriaModel) => string {
        return criteria => (this.functions.find(f => f.id === criteria.function_id)?.display_name || criteria.function_id) + ' ' + (criteria.device_class_id !== '' ? this.deviceClasses.find(dc => dc.id === criteria.device_class_id)?.name || '' : '') + ' ' + (criteria.aspect_id !== '' ? this.aspects.find(a => a.id === criteria.aspect_id)?.name || '' : '');
    }

    getDisplay(c: DeviceTypeCharacteristicsModel): string {
        return c.display_unit || c.name;
    }

    valueHighlightConfigUpdated(thresholdConfigs: ValueHighlightConfig[]) {
        this.form.get('valueHighlightConfig')?.patchValue({
            highlight: true,
            thresholds: thresholdConfigs
        });
    }
}
