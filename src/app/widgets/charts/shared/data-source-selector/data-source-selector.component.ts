import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { catchError, concatMap, defaultIfEmpty, EMPTY, forkJoin, map, mergeMap, Observable, of, Subject, throwError } from 'rxjs';
import { DeviceGroupCriteriaModel, DeviceGroupModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';
import { DeviceInstanceModel } from 'src/app/modules/devices/device-instances/shared/device-instances.model';
import { ExportModel, ExportResponseModel, ExportValueModel } from 'src/app/modules/exports/shared/export.model';
import { AspectsPermSearchModel } from 'src/app/modules/metadata/aspects/shared/aspects-perm-search.model';
import { ConceptsCharacteristicsModel } from 'src/app/modules/metadata/concepts/shared/concepts-characteristics.model';
import { ConceptsService } from 'src/app/modules/metadata/concepts/shared/concepts.service';
import { DeviceClassesPermSearchModel } from 'src/app/modules/metadata/device-classes/shared/device-classes-perm-search.model';
import { DeviceTypeFunctionModel, DeviceTypeModel } from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from 'src/app/modules/metadata/device-types-overview/shared/device-type.service';
import { ChartsExportMeasurementModel, ChartsExportVAxesModel } from '../../export/shared/charts-export-properties.model';
import { environment } from 'src/environments/environment';
import { ChartsExportRangeTimeTypeEnum } from '../../export/shared/charts-export-range-time-type.enum';
import { ExportService } from 'src/app/modules/exports/shared/export.service';
import { DeviceInstancesService } from 'src/app/modules/devices/device-instances/shared/device-instances.service';
import { DeviceGroupsService } from 'src/app/modules/devices/device-groups/shared/device-groups.service';

export interface DataSourceConfig {
    exports?: (ChartsExportMeasurementModel | DeviceInstanceModel | DeviceGroupModel)[];
    timeRange?: {
        time?: number;
        start?: string;
        end?: string;
        level?: string;
        type?: string;
    };
    group?: {
        time?: number;
        type?: string;
        level?: string;
    };
    fields?: ChartsExportVAxesModel[];
    fieldOptions?: ChartsExportVAxesModel[];
};

@Component({
  selector: 'data-source-selector',
  templateUrl: './data-source-selector.component.html',
  styleUrls: ['./data-source-selector.component.css']
})
export class DataSourceSelectorComponent implements OnInit {

    form: any;
    deviceTypes: Map<string, DeviceTypeModel> = new Map();
    deviceGroups: DeviceGroupModel[] = [];
    aspects: AspectsPermSearchModel[] = [];
    functions: DeviceTypeFunctionModel[] = [];
    deviceClasses: DeviceClassesPermSearchModel[] = [];
    concepts: Map<string, ConceptsCharacteristicsModel | null> = new Map();
    fieldOptionsTMP: Map<string, ChartsExportVAxesModel[]> = new Map();

    timeRangeEnum = ChartsExportRangeTimeTypeEnum;
    timeRangeTypes = [this.timeRangeEnum.Relative, this.timeRangeEnum.RelativeAhead, this.timeRangeEnum.Absolute];
    dataSourceOptions: Map<string, ChartsExportMeasurementModel[] | DeviceInstanceModel[] | DeviceGroupModel[]> = new Map();
    ready = false;
    waitingForDataSourceChange = false;
    exportList: ChartsExportMeasurementModel[] = [];

    levels = [
        {
            name: 'Miliseconds',
            value: 'ms'
        },
        {
            name: 'Seconds',
            value: 's'
        },
        {
            name: 'Minutes',
            value: 'm'
        },
        {
            name: 'Hours',
            value: 'h'
        },
        {
            name: 'Days',
            value: 'd'
        },
        {
            name: 'Weeks',
            value: 'w'
        },
        {
            name: 'Months',
            value: 'months'
        },
        {
            name: 'Years',
            value: 'y'
        }
    ];
    groupTypes: any = [];

    @Input() dataSourceConfig?: DataSourceConfig;
    @Input() enableAggretationConfig = true;
    @Input() enableFieldSelection = true;
    @Input() showExportsAsSource = true;
    @Input() showDeviceGroupsAsSource = true;
    @Input() showDevicesAsSource = true;
    @Input() showTimeRange = true;
    @Input() showSource = true;
    @Output() updatedDataSourceConfig = new EventEmitter<DataSourceConfig>();
    dataSourcePlaceholder = '';

    constructor(
        private deviceTypeService: DeviceTypeService,
        private conceptsService: ConceptsService,
        private exportService: ExportService,
        private deviceInstancesService: DeviceInstancesService,
        private deviceGroupsService: DeviceGroupsService
    ) {}

    ngOnInit(): void {
        console.log(this.dataSourceConfig)
        this.setDataSourcePlaceholder();
        this.setupDataSources().pipe(
            concatMap((_) => this.loadFieldOptions(this.dataSourceConfig?.exports || [])),
            map((fieldOptions) => {
                this.fieldOptionsTMP = fieldOptions;
                this.initForm();
                this.form.get('fieldOptions').patchValue(fieldOptions);
                this.setupOutput();
                this.setupGroupTypes();
                console.log(this.form)
            })
        ).subscribe({
            next: (_) => {
                this.ready = true;
                this.waitingForDataSourceChange = false;
            },
            error: (err) => {
                console.log("Could not init: " + err);
                this.ready = true;
                this.waitingForDataSourceChange = false;
            }
        });
    }

    setDataSourcePlaceholder() {
        let seperatorNeeded = false;
        if(this.showDevicesAsSource) {
            this.dataSourcePlaceholder += 'Device';
            seperatorNeeded = true;
        }
        if(this.showDeviceGroupsAsSource) {
            if(seperatorNeeded) {
                this.dataSourcePlaceholder += '/';
            }
            this.dataSourcePlaceholder += 'Device Group';
        }

        if(this.showExportsAsSource) {
            if(seperatorNeeded) {
                this.dataSourcePlaceholder += '/';
            }
            this.dataSourcePlaceholder += 'Export';
        }
    }

    initForm() {
        this.form = new FormGroup({
            exports: new FormControl(this.dataSourceConfig?.exports || []),
            timeRange: new FormGroup({
                type: new FormControl(this.dataSourceConfig?.timeRange?.type || '', Validators.required),
                start: new FormControl(this.dataSourceConfig?.timeRange?.start || ''),
                end: new FormControl(this.dataSourceConfig?.timeRange?.end || ''),
                time: new FormControl(this.dataSourceConfig?.timeRange?.time || ''),
                level: new FormControl(this.dataSourceConfig?.timeRange?.level || '')
            }),
            group: new FormGroup({
                time: new FormControl(this.dataSourceConfig?.group?.time || ''), //TODO form validator [this.validateInterval]),
                type: new FormControl(this.dataSourceConfig?.group?.type || ''),
                level: new FormControl(this.dataSourceConfig?.group?.level || '')
            }),
            fields: new FormControl(this.dataSourceConfig?.fields || []),
            fieldOptions: new FormControl([])
        });
    }

    setupOutput() {
        this.form.valueChanges.subscribe({
            next: (_: any) => {
                const newDataSourceConfig: DataSourceConfig = this.form.value;
                this.updatedDataSourceConfig.emit(newDataSourceConfig);
            }
        });
    }

    private updateExportFields(selectedElement: ChartsExportMeasurementModel) {
        const deviceFields: ChartsExportVAxesModel[] = [];
        selectedElement.values?.forEach((value: ExportValueModel) => {
            const newVAxis: ChartsExportVAxesModel = {
                instanceId: value.InstanceID,
                exportName: selectedElement.name,
                valueName: value.Name,
                valueType: value.Type,
                color: '',
                math: '',
                displayOnSecondVAxis: false,
                tagSelection: [],
            };
            deviceFields.push(newVAxis);
        });
        return of({
            name: selectedElement.name,
            fieldOptions: deviceFields
        });
    }

    private updateGroupFields(deviceGroup: DeviceGroupModel) {
        const observables: Observable<ChartsExportVAxesModel | undefined>[] = [];

        deviceGroup.criteria.forEach(criteria => {
            const f = this.functions.find(func => func.id === criteria.function_id);
            if (f === undefined || f.concept_id == null || f.concept_id === '') {
                return;
            }
            let conceptSubs: Observable<ConceptsCharacteristicsModel|null|undefined>;
            const conceptTmp = this.concepts.get(f.concept_id);

            if(conceptTmp !== undefined) {
                conceptSubs = of(conceptTmp);
            } else {
                conceptSubs = this.conceptsService.getConceptWithCharacteristics(f.concept_id).pipe(
                    map(c => {
                        if (c!==null) {
                            this.concepts.set(c?.id, c);
                        }
                        return c;
                    })
                );
            }

            observables.push(
                conceptSubs.pipe(
                    map(concept => {
                        if (concept === undefined || concept === null) {
                            return;
                        }
                        const newVAxis: ChartsExportVAxesModel = {
                            exportName: deviceGroup.name,
                            valueName: this.describeCriteria()(criteria),
                            criteria,
                            deviceGroupId: deviceGroup.id,
                            valueType: this.translateTypeDeviceToExport(concept.characteristics.find(char => char.id === concept.base_characteristic_id)?.type || ''),
                            color: '',
                            math: '',
                            displayOnSecondVAxis: false,
                            tagSelection: [],
                        };
                        return newVAxis;
                    })
                ));
        });

        return forkJoin(observables).pipe(
            defaultIfEmpty([]),
            map((fieldOptions) => {
                const filteredFieldOptions: ChartsExportVAxesModel[] = [];
                fieldOptions.forEach(fieldOption => {
                    if(fieldOption != null) {
                        filteredFieldOptions.push(fieldOption);
                    }
                });
                if(filteredFieldOptions.length !== 0) {
                    return {
                        name: deviceGroup.name,
                        fieldOptions: filteredFieldOptions
                    };
                }
                return null;
            })
        );
    }

    private updateDeviceFields(selectedElement: DeviceInstanceModel) {
        let observableDeviceType: Observable<DeviceTypeModel | undefined>;
        if (this.deviceTypes.has(selectedElement.device_type_id)) {
            observableDeviceType = of(this.deviceTypes.get(selectedElement.device_type_id));
        } else {
            observableDeviceType = this.deviceTypeService.getDeviceType(selectedElement.device_type_id).pipe(map(dt => {
                if (dt === null) {
                    return;
                }
                this.deviceTypes.set((selectedElement as DeviceInstanceModel).device_type_id, dt);
                return dt;
            }));
        }
        return observableDeviceType.pipe(
            map(dt => {
                const deviceFieldOptions: ChartsExportVAxesModel[] = [];
                dt?.services.forEach(service => {
                    service.outputs.forEach(output => {
                        this.deviceTypeService.getValuePathsAndTypes(output.content_variable).forEach(path => {
                            const newVAxis = {
                                exportName: selectedElement.name,
                                valueName: service.name + ': ' + path.path,
                                valuePath: path.path,
                                serviceId: service.id,
                                deviceId: selectedElement.id,
                                valueType: this.translateTypeDeviceToExport(path.type),
                                color: '',
                                math: '',
                                displayOnSecondVAxis: false,
                                tagSelection: [],
                            };
                            deviceFieldOptions.push(newVAxis);
                        });
                    });
                });
                return {
                    name: selectedElement.name,
                    fieldOptions: deviceFieldOptions
                };;
            })
        );
    }

    private translateTypeDeviceToExport(type: string): string {
        const typeString = 'https://schema.org/Text';
        const typeInteger = 'https://schema.org/Integer';
        const typeFloat = 'https://schema.org/Float';
        const typeBoolean = 'https://schema.org/Boolean';
        const typeStructure = 'https://schema.org/StructuredValue';
        const typeList = 'https://schema.org/ItemList';

        switch (type) {
        case typeString:
            return 'string';
        case typeFloat:
            return 'float';
        case typeInteger:
            return 'int';
        case typeBoolean:
            return 'bool';
        case typeList:
        case typeStructure:
            return 'string_json';
        }
        console.error('unknown type ' + type);
        return '';
    }

    describeCriteria(): (criteria: DeviceGroupCriteriaModel) => string {
        return criteria => (this.functions.find(f => f.id === criteria.function_id)?.display_name || criteria.function_id) + ' ' + (criteria.device_class_id !== '' ? this.deviceClasses.find(dc => dc.id === criteria.device_class_id)?.name || '' : '') + ' ' + (criteria.aspect_id !== '' ? this.aspects.find(a => a.id === criteria.aspect_id)?.name || '' : '');
    }

    getExports() {
        return this.exportService.getExports(true, '', 9999, 0, 'name', 'asc', undefined, undefined).pipe(
            map((exports: ExportResponseModel | null) => {
                if (exports !== null) {
                    exports.instances?.forEach((exportModel: ExportModel) => {
                        if (exportModel.ID !== undefined && exportModel.Name !== undefined) {
                            this.exportList.push({
                                id: exportModel.ID,
                                name: exportModel.Name,
                                values: exportModel.Values,
                                exportDatabaseId: exportModel.ExportDatabaseID
                            });
                        }
                        this.dataSourceOptions.set('Exports', this.exportList);
                    });
                    if (this.dataSourceConfig?.exports != null) {
                        // exports values or names might have changed
                        this.dataSourceConfig.exports.forEach((selected) => {
                            const latestExisting = exports.instances?.find((existing) => existing.ID === selected.id);
                            if (latestExisting !== undefined && latestExisting.Name !== undefined && latestExisting.ID !== undefined) {
                                (selected as ChartsExportMeasurementModel).values = latestExisting.Values;
                                selected.name = latestExisting.Name;
                            }
                        });
                    }
                }
            }),
            catchError(err => {
                console.log("could not get exports");
                console.log(err);
                return throwError(() => err);
            })
        );
    }

    getDevices() {
        return this.deviceInstancesService.getDeviceInstances({limit: 9999, offset: 0}).pipe(
            map(devices => {
                this.dataSourceOptions.set('Devices', devices.result);
            }),
            catchError(err => {
                console.log("could not get devices");
                console.log(err);
                return throwError(() => err);
            })
        );
    }

    getDeviceGroups() {
        return this.deviceGroupsService.getDeviceGroups('', 10000, 0, 'name', 'asc').pipe(
            mergeMap(deviceGroups => {
                this.deviceGroups = deviceGroups;
                const ascpectIds: Map<string, null> = new Map();
                const functionIds: Map<string, null> = new Map();
                const deviceClassids: Map<string, null> = new Map();
                const innerObs: Observable<any>[] = [];
                this.deviceGroups.forEach(dg => {
                    dg.criteria.forEach(c => {
                        ascpectIds.set(c.aspect_id, null);
                        functionIds.set(c.function_id, null);
                        deviceClassids.set(c.device_class_id, null);
                    });
                    innerObs.push(this.deviceGroupsService.getDeviceGroup(dg.id, true).pipe(map(newDg => {
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
                this.dataSourceOptions.set('Device Groups', this.deviceGroups);
                innerObs.push(this.deviceGroupsService.getAspectListByIds(Array.from(ascpectIds.keys())).pipe(map(aspects => this.aspects = aspects)));
                innerObs.push(this.deviceGroupsService.getFunctionListByIds(Array.from(functionIds.keys())).pipe(map(functions => this.functions = functions)));
                innerObs.push(this.deviceGroupsService.getDeviceClassListByIds(Array.from(deviceClassids.keys())).pipe(map(deviceClasses => this.deviceClasses = deviceClasses)));
                return forkJoin(innerObs);
            }),
            catchError(err => {
                console.log("could not get device group");
                console.log(err);
                return throwError(() => err);
            })
        );
    }

    setupDataSources(): Observable<any> {
        const obs: Observable<any>[] = [];

        if(this.showExportsAsSource) {
            obs.push(this.getExports());
        }
        if(this.showDevicesAsSource) {
            obs.push(this.getDevices());
        }
        if(this.showDeviceGroupsAsSource) {
            obs.push(this.getDeviceGroups());
        }
        if(obs.length === 0) {
            obs.push(of(true));
        }
        return forkJoin(obs).pipe(defaultIfEmpty(true)); // in case no datsa sources are selected
    }

    dataSourceChanged(selectedDataSource: (ChartsExportMeasurementModel | DeviceInstanceModel | DeviceGroupModel)[]) {
        this.waitingForDataSourceChange = true;
        this.loadFieldOptions(selectedDataSource).pipe(
            map((fieldOptions) => {
                this.fieldOptionsTMP = fieldOptions;
                this.form.get('fieldOptions').value = fieldOptions;

                const filteredFields = this.filterSelectedFields(selectedDataSource);
                this.form.get('fields').setValue(filteredFields);

                return null;
            })
        ).subscribe({
            next: (_) => {
                this.waitingForDataSourceChange = false;
            },
            error: (err: any) => {
                console.log(err);
                this.waitingForDataSourceChange = false;
            }
        });
    }

    filterSelectedFields(selectedDataSources: (ChartsExportMeasurementModel | DeviceInstanceModel | DeviceGroupModel)[]) {
        /* Filter the selected fields depending on the current selection of the data source 
        */
        const selectedFields = JSON.parse(JSON.stringify(this.form.value['fields']));
        const filteredFields: ChartsExportVAxesModel[] = [];
        selectedFields.forEach((field: ChartsExportVAxesModel) => {
            let dataSourceIsSelected = false;

            selectedDataSources.forEach(dataSource => {
                const exportDataSourceExists = (field.instanceId != null &&
                                                field.instanceId === dataSource.id &&
                                                field.exportName === dataSource.name);
                const deviceDataSourceExists = (field.deviceId != null &&
                                                field.deviceId === dataSource.id);
                const deviceGroupDataSourceExists = (field.deviceGroupId != null &&
                                                     field.deviceGroupId === dataSource.id);
                dataSourceIsSelected = exportDataSourceExists || deviceDataSourceExists || deviceGroupDataSourceExists;
                if(dataSourceIsSelected) {
                    filteredFields.push(field);
                    return;
                }
            });
        });
        return filteredFields;
    }

    loadFieldOptions(selectedExports: (ChartsExportMeasurementModel | DeviceInstanceModel | DeviceGroupModel)[]) {
        /* Load available fields based on the choosen data source and set as options in the select-search */
        let observables: Observable<any>[] = [];
        (selectedExports || []).forEach((selectedElement: ChartsExportMeasurementModel | DeviceInstanceModel | DeviceGroupModel) => {
            if ((selectedElement as ChartsExportMeasurementModel).values !== undefined) { // is export
                observables = observables.concat(this.updateExportFields(selectedElement as ChartsExportMeasurementModel));
            } else if ((selectedElement as DeviceGroupModel)?.criteria !== undefined) { // is device group
                observables = observables.concat(this.updateGroupFields(selectedElement as DeviceGroupModel));
            } else {
                observables = observables.concat(this.updateDeviceFields(selectedElement as DeviceInstanceModel));
            }
        });
 

        return forkJoin(observables).pipe(
            defaultIfEmpty([]), // in case observables is empty
            map((results: any) => {
                const options: Map<string, ChartsExportVAxesModel[]> = new Map();
                results.forEach((result: any) => {
                    if(result != null) {
                        options.set(result.name, result.fieldOptions);
                    }
                });
                return options;
            }),
            catchError(err => {
                console.log("could not load field options");
                console.log(err);
                return throwError(() => err);
            })
        );
    }


    setupGroupTypes() {
        const res = [
            {
                value: 'mean',
                name: 'Mean'
            },
            {
                value: 'sum',
                name: 'Sum'
            },
            {
                value: 'count',
                name: 'Count'
            },
            {
                value: 'median',
                name: 'Median'
            },
            {
                value: 'min',
                name: 'Minimum'
            },
            {
                value: 'max',
                name: 'Maximum'
            },
            {
                value: 'first',
                name: 'First'
            },
            {
                value: 'last',
                name: 'Last'
            },
            {
                value: 'difference-first',
                name: 'Difference-First'
            },
            {
                value: 'difference-last',
                name: 'Difference-Last'
            },
            {
                value: 'difference-min',
                name: 'Difference-Minimum'
            },
            {
                value: 'difference-max',
                name: 'Difference-Maximum'
            },
            {
                value: 'difference-count',
                name: 'Difference-Count'
            },
            {
                value: 'difference-mean',
                name: 'Difference-Mean'
            },
            {
                value: 'difference-sum',
                name: 'Difference-Sum'
            },
            {
                value: 'difference-median',
                name: 'Difference-Median'
            }
        ];
        const influxExp = (this.form.get('exports').value as (ChartsExportMeasurementModel | DeviceInstanceModel | DeviceGroupModel)[])
            ?.find(exp => (exp as DeviceInstanceModel).device_type_id === undefined &&
                (((exp as ChartsExportMeasurementModel).exportDatabaseId === undefined && (exp as DeviceGroupModel).criteria === undefined) || (exp as ChartsExportMeasurementModel).exportDatabaseId === environment.exportDatabaseIdInternalInfluxDb));
        if (influxExp === undefined) {
            res.push({
                value: 'time-weighted-mean-linear',
                name: 'Time weighted mean linear'
            });
            res.push({
                value: 'time-weighted-mean-locf',
                name: 'Time weighted mean LOCF'
            });
        }
        this.groupTypes = res;
    }

    validateInterval: ValidatorFn = (control: AbstractControl) => {
        const type = this.form.control.get('group.type')?.value;
        if (type === undefined || type === null || type.length === 0) {
            return null;
        }
        if (control.value === undefined || control.value === null || control.value.length === 0) {
            return {validateInterval: {value: control.value}};
        }
        const re = new RegExp('\\d+(ns|u|µ|ms|s|months|y|m|h|d|w)');
        const matches = re.exec(control.value);
        if (matches == null || matches.length === 0 || matches[0].length !== control.value.length) {
            return {validateInterval: {value: control.value}};
        }
        return null;
    };

    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id && a.name === b.name;
    }

    compareFields(a: any, b: any): boolean {
        const exportsMatch = (a.instanceId != null && b.instanceId != null &&
                                        a.instanceId === b.instanceId &&
                                        a.exportName === b.exportName &&
                                        a.valueName === b.valueName);
        const deviceMatch = (a.deviceId != null && b.deviceId != null &&
                                        a.deviceId === b.deviceId &&
                                        a.serviceId === b.serviceId && 
                                        a.valuePath === b.valuePath);
        const deviceGroupMatch = (a.deviceGroupId != null && b.deviceGroupId != null &&
                                             a.deviceGroupId === b.deviceGroupId &&
                                             a.criteria.function_id === b.criteria.function_id);
        return exportsMatch || deviceMatch || deviceGroupMatch;
    }
}
