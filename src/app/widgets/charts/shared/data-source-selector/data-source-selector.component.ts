import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, UntypedFormGroup, ValidatorFn, Validators } from '@angular/forms';
import { catchError, concatMap, defaultIfEmpty, forkJoin, map, mergeMap, Observable, of, throwError } from 'rxjs';
import { DeviceGroupCriteriaModel, DeviceGroupModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';
import { DeviceInstanceModel } from 'src/app/modules/devices/device-instances/shared/device-instances.model';
import { ExportModel, ExportResponseModel, ExportValueModel } from 'src/app/modules/exports/shared/export.model';
import { ConceptsCharacteristicsModel } from 'src/app/modules/metadata/concepts/shared/concepts-characteristics.model';
import { ConceptsService } from 'src/app/modules/metadata/concepts/shared/concepts.service';
import { DeviceTypeAspectModel, DeviceTypeContentVariableModel, DeviceTypeDeviceClassModel, DeviceTypeFunctionModel, DeviceTypeModel } from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from 'src/app/modules/metadata/device-types-overview/shared/device-type.service';
import { ChartsExportMeasurementModel, ChartsExportVAxesModel } from '../../export/shared/charts-export-properties.model';
import { environment } from 'src/environments/environment';
import { ChartsExportRangeTimeTypeEnum } from '../../export/shared/charts-export-range-time-type.enum';
import { ExportService } from 'src/app/modules/exports/shared/export.service';
import { DeviceInstancesService } from 'src/app/modules/devices/device-instances/shared/device-instances.service';
import { DeviceGroupsService } from 'src/app/modules/devices/device-groups/shared/device-groups.service';
import { LocationModel } from 'src/app/modules/devices/locations/shared/locations.model';
import { LocationsService } from 'src/app/modules/devices/locations/shared/locations.service';
import { FunctionsService } from 'src/app/modules/metadata/functions/shared/functions.service';

export interface DataSourceConfig {
    exports?: (ChartsExportMeasurementModel | DeviceInstanceModel | DeviceGroupModel | LocationModel)[];
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

    form: UntypedFormGroup = new UntypedFormGroup({});
    deviceTypes: Map<string, DeviceTypeModel> = new Map();
    deviceGroups: DeviceGroupModel[] = [];
    aspects: DeviceTypeAspectModel[] = [];
    functions: DeviceTypeFunctionModel[] = [];
    deviceClasses: DeviceTypeDeviceClassModel[] = [];
    concepts: Map<string, ConceptsCharacteristicsModel | null> = new Map();
    fieldOptionsTMP: Map<string, ChartsExportVAxesModel[]> = new Map();

    timeRangeEnum = ChartsExportRangeTimeTypeEnum;
    timeRangeTypes = [this.timeRangeEnum.Relative, this.timeRangeEnum.RelativeAhead, this.timeRangeEnum.Absolute];
    dataSourceOptions: Map<string, ChartsExportMeasurementModel[] | DeviceInstanceModel[] | DeviceGroupModel[]> = new Map();
    currentDataSourceOptions: ChartsExportMeasurementModel[] | DeviceInstanceModel[] | DeviceGroupModel[] = [];
    currentDataSourceClass = '';
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
    @Input() showLocationsAsSource = false;
    @Input() showTimeRange = true;
    @Input() showSource = true;
    @Output() updatedDataSourceConfig = new EventEmitter<DataSourceConfig>();

    constructor(
        private cdref: ChangeDetectorRef,
        private deviceTypeService: DeviceTypeService,
        private conceptsService: ConceptsService,
        private exportService: ExportService,
        private deviceInstancesService: DeviceInstancesService,
        private deviceGroupsService: DeviceGroupsService,
        private locationsService: LocationsService,
        private functionsService: FunctionsService,
    ) { }

    ngOnInit(): void {
        this.setupDataSources().pipe(
            concatMap((_) => this.loadFieldOptions(this.dataSourceConfig?.exports || [])),
            map((fieldOptions) => {
                this.fieldOptionsTMP = fieldOptions;
                this.initForm();
                const f = this.form.get('fieldOptions');
                if (f !== null) {
                    f.patchValue(fieldOptions);
                }
                this.setupOutput();
                this.setupGroupTypes();
                this.form.controls['dataSourceClass'].valueChanges.subscribe((val: string) => {
                    this.updateCurrentDataSourceOptions(val);
                });
            })
        ).subscribe({
            next: (_) => {
                this.ready = true;
                this.waitingForDataSourceChange = false;
            },
            error: (err) => {
                console.log('Could not init: ' + err);
                this.ready = true;
                this.waitingForDataSourceChange = false;
            }
        });
    }


    initForm() {
        this.form = new FormGroup({
            dataSourceClass: new FormControl(this.getDataSourceClassFromExports(this.dataSourceConfig?.exports) || '', Validators.required),
            exports: new FormControl(this.dataSourceConfig?.exports || [], Validators.required),
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
        setTimeout(() => {
            this.currentDataSourceOptions = this.getDataSourceOptions(this.getDataSourceClassFromExports(this.dataSourceConfig?.exports) || '');
        }, 0);
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

    private updateGroupFields(deviceGroup: DeviceGroupModel): Observable<{ name: string; fieldOptions: ChartsExportVAxesModel[] } | null> {
        const observables: Observable<ChartsExportVAxesModel | undefined>[] = [];

        deviceGroup.criteria?.forEach(criteria => {
            const f = this.functions.find(func => func.id === criteria.function_id);
            if (f === undefined || f.concept_id == null || f.concept_id === '') {
                return;
            }
            let conceptSubs: Observable<ConceptsCharacteristicsModel | null | undefined>;
            const conceptTmp = this.concepts.get(f.concept_id);

            if (conceptTmp !== undefined) {
                conceptSubs = of(conceptTmp);
            } else {
                conceptSubs = this.conceptsService.getConceptWithCharacteristics(f.concept_id).pipe(
                    map(c => {
                        if (c !== null) {
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
                    if (fieldOption != null) {
                        filteredFieldOptions.push(fieldOption);
                    }
                });
                if (filteredFieldOptions.length !== 0) {
                    return {
                        name: deviceGroup.name,
                        fieldOptions: filteredFieldOptions
                    };
                }
                return null;
            })
        );
    }

    private updateLocationFields(location: LocationModel): Observable<{ name: string; fieldOptions: ChartsExportVAxesModel[] } | null> {
        const observables: Observable<{ name: string; fieldOptions: ChartsExportVAxesModel[] } | null>[] = [];
        const devices = this.dataSourceOptions.get('Devices') as DeviceInstanceModel[] | undefined;
        if (devices === undefined) {
            return of(null);
        }

        location.device_ids.forEach(deviceId => {
            const device = devices.find(d => d.id === deviceId);
            if (device === undefined) {
                return;
            }
            const deviceType = this.deviceTypes.get(device.device_type_id);
            if (deviceType === undefined) {
                return;
            }
            observables.push(this.updateDeviceFields(device as DeviceInstanceModel).pipe(map(options => {
                options?.fieldOptions.forEach(f => {
                    const service = deviceType.services.find(s => s.id === f.serviceId);
                    const pathParts = (f.valuePath || '').split('.');
                    let contentVariable: DeviceTypeContentVariableModel | undefined = service?.outputs[0].content_variable;
                    for (let i = 0; i < pathParts.length; i++) {
                        contentVariable = contentVariable?.sub_content_variables?.find(s => s.name === pathParts[i]);
                    }
                    f.criteria = {
                        aspect_id: contentVariable?.aspect_id || '',
                        device_class_id: deviceType.device_class_id,
                        function_id: contentVariable?.function_id || '',
                        interaction: service?.interaction || '',
                    };
                    f.deviceId = undefined;
                    f.serviceId = undefined;
                    f.valuePath = undefined;
                });
                return options;
            })));
        });

        location.device_group_ids.forEach(deviceGroupId => {
            const deviceGroup = this.deviceGroups.find(d => d.id === deviceGroupId);
            if (deviceGroup === undefined) {
                return;
            }
            observables.push(this.updateGroupFields(deviceGroup).pipe(map(options => {
                options?.fieldOptions.forEach(o => o.deviceGroupId = undefined);
                return options;
            })));
        });

        return forkJoin(observables).pipe(map(options => {
            const res: { name: string; fieldOptions: ChartsExportVAxesModel[] } = { name: location.name, fieldOptions: [] };
            options.forEach(o => {
                if (o === null) {
                    return;
                }
                o.fieldOptions.forEach(f => {
                    f.exportName = location.name;
                    f.locationId = location.id;
                    res.fieldOptions.push(f);
                });
            });
            if (res.fieldOptions.length === 0) {
                return null;
            }
            const unique = [...new Set(res.fieldOptions)];
            res.fieldOptions = unique;
            return res;
        }));
    }

    private updateDeviceFields(selectedElement: DeviceInstanceModel): Observable<{ name: string; fieldOptions: ChartsExportVAxesModel[] } | null> {
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
                                exportName: selectedElement.display_name || selectedElement.name,
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
                    name: selectedElement.display_name || selectedElement.name,
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
        return criteria => {
            const func = this.functions.find(f => f.id === criteria.function_id);
            return (func?.display_name || func?.name || criteria.function_id) + ' ' + (criteria.device_class_id !== '' ? this.deviceClasses.find(dc => dc.id === criteria.device_class_id)?.name || '' : '') + ' ' + (criteria.aspect_id !== '' ? this.aspects.find(a => a.id === criteria.aspect_id)?.name || '' : '');
        };
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
                console.log('could not get exports');
                console.log(err);
                return throwError(() => err);
            })
        );
    }

    getDevices() {
        return this.deviceInstancesService.getDeviceInstances({ limit: 9999, offset: 0 }).pipe(
            map(devices => {
                this.dataSourceOptions.set('Devices', devices.result);
            }),
            catchError(err => {
                console.log('could not get devices');
                console.log(err);
                return throwError(() => err);
            })
        );
    }

    getDeviceGroups() {
        return this.deviceGroupsService.getDeviceGroups('', 10000, 0, 'name', 'asc', true).pipe(
            mergeMap(deviceGroups => {
                this.deviceGroups = deviceGroups.result;
                const ascpectIds: Map<string, null> = new Map();
                const deviceClassids: Map<string, null> = new Map();
                const innerObs: Observable<any>[] = [];
                this.deviceGroups.forEach(dg => {
                    const criteria: DeviceGroupCriteriaModel[] = [];
                    dg.criteria?.forEach(c => {
                        if (criteria.findIndex(c2 => c.aspect_id === c2.aspect_id && c.function_id === c2.function_id) === -1) {
                            // filters interaction and device class, irrelevant for widget
                            c.interaction = '';
                            c.device_class_id = '';
                            criteria.push(c);
                        }
                    });
                    dg.criteria = criteria;
                });
                this.dataSourceOptions.set('Device Groups', this.deviceGroups);
                innerObs.push(this.deviceGroupsService.getAspectListByIds(Array.from(ascpectIds.keys())).pipe(map(aspects => this.aspects = aspects)));
                innerObs.push(this.deviceGroupsService.getDeviceClassListByIds(Array.from(deviceClassids.keys())).pipe(map(deviceClasses => this.deviceClasses = deviceClasses)));
                return forkJoin(innerObs);
            }),
            catchError(err => {
                console.log('could not get device group');
                console.log(err);
                return throwError(() => err);
            })
        );
    }

    getLocations(): Observable<unknown> {
        return this.locationsService.getLocations({ limit: 9999, offset: 0 }).pipe(map(locations => this.dataSourceOptions.set('Locations', locations.result)));
    }

    setupDataSources(): Observable<any> {
        const obs: Observable<any>[] = [];

        if (this.showExportsAsSource) {
            obs.push(this.getExports());
        }
        if (this.showDevicesAsSource) {
            obs.push(this.getDevices());
        }
        if (this.showDeviceGroupsAsSource) {
            obs.push(this.getDeviceGroups());
        }
        if (this.showLocationsAsSource) {
            obs.push(this.getLocations());
        }
        obs.push(this.functionsService.getFunctions('', 9999, 0, 'name', 'asc').pipe(map(functions => this.functions = functions.result)));
        if (obs.length === 0) {
            obs.push(of(true));
        }
        return forkJoin(obs).pipe(defaultIfEmpty(true)); // in case no datsa sources are selected
    }

    dataSourceChanged(selectedDataSource: (ChartsExportMeasurementModel | DeviceInstanceModel | DeviceGroupModel)[]) {
        this.waitingForDataSourceChange = true;
        this.loadFieldOptions(selectedDataSource).pipe(
            map((fieldOptions) => {
                this.fieldOptionsTMP = fieldOptions;
                let f = this.form.get('fieldOptions');
                if (f !== null) {
                    f.setValue(fieldOptions);
                }

                const filteredFields = this.filterSelectedFields(selectedDataSource);
                f = this.form.get('fields');
                if (f !== null) {
                    f.setValue(filteredFields);
                }

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
                if (dataSourceIsSelected) {
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
            } else if (selectedElement.id.startsWith('urn:infai:ses:location:')) {
                observables = observables.concat(this.updateLocationFields(selectedElement as LocationModel));
            } else {
                observables = observables.concat(this.updateDeviceFields(selectedElement as DeviceInstanceModel));
            }
        });


        return forkJoin(observables).pipe(
            defaultIfEmpty([]), // in case observables is empty
            map((results: any) => {
                const options: Map<string, ChartsExportVAxesModel[]> = new Map();
                results.forEach((result: any) => {
                    if (result != null) {
                        options.set(result.name, result.fieldOptions);
                    }
                });
                return options;
            }),
            catchError(err => {
                console.log('could not load field options');
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
        const influxExp = (this.form.get('exports')?.value as (ChartsExportMeasurementModel | DeviceInstanceModel | DeviceGroupModel)[])
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
        const type = this.form.get('group.type')?.value;
        if (type === undefined || type === null || type.length === 0) {
            return null;
        }
        if (control.value === undefined || control.value === null || control.value.length === 0) {
            return { validateInterval: { value: control.value } };
        }
        const re = new RegExp('\\d+(ns|u|µ|ms|s|months|y|m|h|d|w)');
        const matches = re.exec(control.value);
        if (matches == null || matches.length === 0 || matches[0].length !== control.value.length) {
            return { validateInterval: { value: control.value } };
        }
        return null;
    };

    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id;
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
        const locationsMatch = (a.locationId != null && b.locationId != null &&
            a.locationId === b.locationId &&
            a.criteria.function_id === b.criteria.function_id);
        return exportsMatch || deviceMatch || deviceGroupMatch || locationsMatch;
    }

    getDataSourceName(x: any): string {
        return x.display_name || x.name;
    }

    getSortedDataSourceClasses(): string[] {
        let classes: string[] = [];
        Array.from(this.dataSourceOptions.keys()).forEach(cl => {
            const exports: any = this.dataSourceOptions.get(cl as string);
            if (exports.length > 0) {
                classes.push(cl as string);
            }
        });
        classes = classes.sort();
        return classes;
    }

    getDataSourceOptions(entity: string): ChartsExportMeasurementModel[] | DeviceInstanceModel[] | DeviceGroupModel[] | [] {
        const val = this.dataSourceOptions.get(entity);
        if (val !== undefined) {
            return val;
        } else {
            return [];
        }
    }

    updateCurrentDataSourceOptions(dataSourceClass: string) {
        if (dataSourceClass !== this.currentDataSourceClass) {
            this.form.controls['exports'].reset([]);
        }
        this.currentDataSourceClass = dataSourceClass;
        this.currentDataSourceOptions = this.getDataSourceOptions(dataSourceClass);
        this.cdref.detectChanges();
    }

    getLabelFromCurrentDataSource() {
        const val = this.form.controls['dataSourceClass'].value;
        const dataSourceSingular: Map<string, string> = new Map([
            ['Device Groups', 'Device Group'],
            ['Devices', 'Device'],
            ['Exports', 'Export'],
            ['Locations', 'Location'],
        ]);
        return dataSourceSingular.get(val) as string;
    }

    getDataSourceClassFromExports(exports: (ChartsExportMeasurementModel | DeviceInstanceModel | DeviceGroupModel)[] | undefined) {
        if (!exports) {
            return null;
        }
        const searchItem = exports[0];
        for (const [key, values] of this.dataSourceOptions.entries()) {
            if (this.getExportIDs(values).includes(searchItem.id)) {
                return key;
            }
        }
        return null;
    }

    getExportIDs(exportValues: (ChartsExportMeasurementModel | DeviceInstanceModel | DeviceGroupModel)[]) {
        const ids: string[] = [];
        exportValues.forEach(item => {
            if ('id' in item) {
                ids.push((item as any).id);
            }
        });
        return ids;
    }

    patchFields(fields: ChartsExportVAxesModel[]) {
        this.form.patchValue({ fields });
    }
}
