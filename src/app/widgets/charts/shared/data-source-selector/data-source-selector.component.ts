import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AbstractControl, ControlEvent, FormArray, FormBuilder, FormControl, FormGroup, TouchedChangeEvent, UntypedFormGroup, ValidatorFn, Validators } from '@angular/forms';
import { catchError, concatMap, defaultIfEmpty, forkJoin, map, Observable, of, Subject, throwError } from 'rxjs';
import { DeviceGroupCriteriaModel, DeviceGroupDisplayModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';
import { DeviceInstanceModel } from 'src/app/modules/devices/device-instances/shared/device-instances.model';
import { ExportModel, ExportResponseModel, ExportValueModel } from 'src/app/modules/exports/shared/export.model';
import { ConceptsCharacteristicsModel } from 'src/app/modules/metadata/concepts/shared/concepts-characteristics.model';
import { ConceptsService } from 'src/app/modules/metadata/concepts/shared/concepts.service';
import { DeviceTypeAspectModel, DeviceTypeContentVariableModel, DeviceTypeDeviceClassModel, DeviceTypeFunctionModel, DeviceTypeModel } from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from 'src/app/modules/metadata/device-types-overview/shared/device-type.service';
import { ChartsExportMeasurementDisplayModel, ChartsExportVAxesModel } from '../../export/shared/charts-export-properties.model';
import { environment } from 'src/environments/environment';
import { ChartsExportRangeTimeTypeEnum } from '../../export/shared/charts-export-range-time-type.enum';
import { ExportService } from 'src/app/modules/exports/shared/export.service';
import { DeviceInstancesService } from 'src/app/modules/devices/device-instances/shared/device-instances.service';
import { DeviceGroupsService } from 'src/app/modules/devices/device-groups/shared/device-groups.service';
import { LocationDisplayModel } from 'src/app/modules/devices/locations/shared/locations.model';
import { LocationsService } from 'src/app/modules/devices/locations/shared/locations.service';
import { FunctionsService } from 'src/app/modules/metadata/functions/shared/functions.service';
import _ from 'lodash';
import { debounceTime, switchMap } from 'rxjs/operators';

export interface DataSourceConfig {
    exports?: (ChartsExportMeasurementDisplayModel | DeviceInstanceModel | DeviceGroupDisplayModel | LocationDisplayModel)[];
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
}


interface ChartsExportVAxesModelWithGroup extends ChartsExportVAxesModel {
    group?: string;
}

@Component({
    selector: 'data-source-selector',
    templateUrl: './data-source-selector.component.html',
    styleUrls: ['./data-source-selector.component.css']
})
export class DataSourceSelectorComponent implements OnInit {
    form: UntypedFormGroup = new UntypedFormGroup({});
    dataSourceClasses = ['Devices', 'Device Groups', 'Exports', 'Locations'];

    searchSubject = new Subject<{ term: string, sourceForm: AbstractControl }>();

    deviceTypes: Map<string, DeviceTypeModel> = new Map();
    deviceGroups: DeviceGroupDisplayModel[] = [];
    aspects: DeviceTypeAspectModel[] = [];
    functions: DeviceTypeFunctionModel[] = [];
    deviceClasses: DeviceTypeDeviceClassModel[] = [];
    concepts: Map<string, ConceptsCharacteristicsModel | null> = new Map();
    fieldOptionsTMP: ChartsExportVAxesModelWithGroup[] = [];

    timeRangeEnum = ChartsExportRangeTimeTypeEnum;
    timeRangeTypes = [this.timeRangeEnum.Relative, this.timeRangeEnum.RelativeAhead, this.timeRangeEnum.Absolute];

    dataSourceOptions: Map<string, ChartsExportMeasurementDisplayModel[] | DeviceInstanceModel[] | DeviceGroupDisplayModel[] | LocationDisplayModel[]> = new Map();
    selectedExportsBySource: Map<string, ChartsExportMeasurementDisplayModel[] | DeviceInstanceModel[] | DeviceGroupDisplayModel[] | LocationDisplayModel[]> = new Map();

    showDataSourceError = false;
    ready = false;
    loadingDataSource = false;
    waitingForDataSourceChange = false;

    scrollDynInitLimit = 30;    // number of items that each data source is initialized with
    scrollDynReloadLimit = 20;  // number of items that get additionally loaded whenever scrolled

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
        private fb: FormBuilder,
        private cdref: ChangeDetectorRef,
        private deviceTypeService: DeviceTypeService,
        private conceptsService: ConceptsService,
        private exportService: ExportService,
        private deviceInstancesService: DeviceInstancesService,
        private deviceGroupsService: DeviceGroupsService,
        private locationsService: LocationsService,
        private functionsService: FunctionsService,
    ) { }

    get exportsControlBySource() {
        return this.form.controls['exportsBySource'] as FormArray;
    }

    ngOnInit(): void {
        this.waitingForDataSourceChange = true;
        this.initForm();
        this.initOnSelectSearch();
        this.setupDataSources().pipe(
            concatMap(() => this.loadFieldOptions(this.dataSourceConfig?.exports || [])),
            map((fieldOptions) => {
                const tmp: ChartsExportVAxesModelWithGroup[] = [];
                fieldOptions.forEach((v, k) => {
                    v.forEach(v2 => {
                        const v3 = v2 as ChartsExportVAxesModelWithGroup;
                        v3.group = k;
                        tmp.push(v3);
                    });
                });
                this.fieldOptionsTMP = tmp;
                const f = this.form.get('fieldOptions');
                if (f !== null) {
                    f.patchValue(fieldOptions);
                }
                this.setupGroupTypes();
            })
        ).subscribe({
            next: () => {
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


    private initForm() {
        this.form = new FormGroup({
            dataSourceClasses: new FormControl([], Validators.required),
            exportsBySource: new FormArray([]),
            exports: new FormControl(this.dataSourceConfig?.exports || [], Validators.required),
            timeRange: new FormGroup({
                type: new FormControl(this.dataSourceConfig?.timeRange?.type || '', Validators.required),
                start: new FormControl(this.dataSourceConfig?.timeRange?.start || ''),
                end: new FormControl(this.dataSourceConfig?.timeRange?.end || ''),
                time: new FormControl(this.dataSourceConfig?.timeRange?.time || '',),
                level: new FormControl(this.dataSourceConfig?.timeRange?.level || '')
            }),
            group: new FormGroup({
                time: new FormControl(this.dataSourceConfig?.group?.time || '', this.validateInterval),
                type: new FormControl(this.dataSourceConfig?.group?.type || ''),
                level: new FormControl(this.dataSourceConfig?.group?.level || '')
            }),
            fields: new FormControl(this.dataSourceConfig?.fields || []),
            fieldOptions: new FormControl([])
        });
        this.initExportsBySource();
        this.initDataSourceClasses();
        this.subscribeToFormUpdates();
    }

    private initExportsBySource() {
        const preSelections = this.getPreSelectionsByClass();
        this.dataSourceClasses.forEach((sourceClass) => {
            const sourceExportsControl = this.fb.group({
                sourceClass: sourceClass,
                sourceExports: [(preSelections.get(sourceClass)?.ids)],
                lastScrollStart: 0,
                lastScrollEnd: this.scrollDynInitLimit,
                lastSearch: '',
                lastOffset: 0,
            });
            this.exportsControlBySource.push(sourceExportsControl);
            this.selectedExportsBySource.set(sourceClass, preSelections.get(sourceClass)?.exports || []);
        });
    }

    private initDataSourceClasses() {
        const control = this.form.controls['dataSourceClasses'];
        const newValue: string[] = [];
        this.selectedExportsBySource.forEach((value: any[], key: string) => {
            if (value.length > 0) {
                newValue.push(key);
            }
        });
        control.patchValue(newValue);
    }

    private subscribeToFormUpdates() {
        this.exportsControlBySource.controls.forEach(fieldControl => {
            const selectionControl = (fieldControl as FormGroup).controls['sourceExports'];
            selectionControl.valueChanges.subscribe(
                (val: any) => {
                    this.updateExportSelections(fieldControl, val);
                    this.updateErrorMessage();
                    this.updateCriteriaAndAspects(fieldControl);
                    this.updateFieldOptions();
                });
            selectionControl.events.subscribe(
                (event: ControlEvent) => {
                    if (event instanceof TouchedChangeEvent) {
                        this.updateErrorMessage();
                    }
                });
        });

        this.form.controls['dataSourceClasses'].valueChanges.subscribe(chosenClasses => { // delete exports of class when class gets unselected
            const notChosen = this.dataSourceClasses.filter(x => !chosenClasses.includes(x));
            this.exportsControlBySource.controls.forEach(control => {
                const sourceClass = this.getSourceClass(control);
                if (notChosen.includes(sourceClass)) {
                    control.patchValue({
                        'sourceExports': []
                    });
                }
            });
        });

        this.form.valueChanges.subscribe({
            next: () => {
                if (!this.ready) {
                    return;
                }
                const newDataSourceConfig: DataSourceConfig = this.form.value;
                this.updatedDataSourceConfig.emit(newDataSourceConfig);
            }
        });
    }

    private updateErrorMessage() {
        if (this.form.controls['exports'].value?.length > 0) {
            this.showDataSourceError = false;
            return;
        } else {
            let untouched = false;
            this.exportsControlBySource.controls.forEach(fieldControl => {
                const sourceClass = this.getSourceClass(fieldControl);
                const activeSources = this.form.controls['dataSourceClasses'].value || [];
                if (activeSources.includes(sourceClass) && !fieldControl.get('sourceExports')?.touched) {
                    untouched = true;
                }
            });
            this.showDataSourceError = !untouched;
        }
    }

    private updateExportFields(selectedElement: ChartsExportMeasurementDisplayModel) {
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

    private updateGroupFields(deviceGroup: DeviceGroupDisplayModel): Observable<{ name: string; fieldOptions: ChartsExportVAxesModel[] } | null> {
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

    private updateLocationFields(location: LocationDisplayModel): Observable<{ name: string; fieldOptions: ChartsExportVAxesModel[] } | null> {
        return this.updateDeviceTypes(location.device_ids).pipe(
            switchMap((results: { device: DeviceInstanceModel, type: DeviceTypeModel }[]) => {
                const observables: Observable<{ name: string; fieldOptions: ChartsExportVAxesModel[] } | null>[] = [];

                results.forEach((r: { device: DeviceInstanceModel, type: DeviceTypeModel }) => {
                    if (!r) {
                        return;
                    }
                    const device = r.device;
                    const deviceType = r.type;
                    if (!deviceType) {
                        return;
                    }
                    const options = this.getFieldsForDeviceType(device, deviceType);
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

                    observables.push(of(options));
                });

                location.device_group_ids.forEach(deviceGroupId => {
                    observables.push(
                        this.deviceGroupsService.getDeviceGroup(deviceGroupId).pipe(
                            switchMap(deviceGroup => {
                                if (!deviceGroup) {
                                    return of(null);
                                }
                                return this.updateGroupFields(deviceGroup).pipe(
                                    map(options => {
                                        options?.fieldOptions.forEach(o => o.deviceGroupId = undefined);
                                        return options;
                                    })
                                );
                            })
                        ));
                });

                return forkJoin(observables).pipe(
                    map(options => {
                        const res: { name: string; fieldOptions: ChartsExportVAxesModel[] } = {
                            name: location.name,
                            fieldOptions: []
                        };
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
                        res.fieldOptions = [...new Set(res.fieldOptions)];
                        return res;
                    })
                );
            })
        );
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

    private getFieldsForDeviceType(selectedElement: DeviceInstanceModel, dt: DeviceTypeModel) {
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
        };
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
            return (func?.display_name || func?.name || criteria.function_id) + ' ' +
                (criteria.device_class_id !== '' ? this.deviceClasses.find(dc => dc.id === criteria.device_class_id)?.name || '' : '') + ' ' +
                (criteria.aspect_id !== '' ? this.aspects.find(a => a.id === criteria.aspect_id)?.name || '' : '');
        };
    }

    getExports(request: { search?: string, limit?: number, offset?: number }) {
        return this.exportService.getExports(
            true, request.search, request.limit, request.offset, 'name', 'asc', undefined, undefined).pipe(
                map((exports: ExportResponseModel | null) => {
                    if (exports !== null) {
                        const exportList: ChartsExportMeasurementDisplayModel[] = [];
                        exports.instances?.forEach((exportModel: ExportModel) => {
                            if (exportModel.ID !== undefined && exportModel.Name !== undefined) {
                                exportList.push({
                                    id: exportModel.ID,
                                    name: exportModel.Name,
                                    values: exportModel.Values,
                                    exportDatabaseId: exportModel.ExportDatabaseID,
                                    display_name: exportModel.Name
                                });
                            }
                        });

                        let newOptions: any[];
                        if (request.offset === 0) {
                            const selectedOnes = this.selectedExportsBySource.get('Exports') as ChartsExportMeasurementDisplayModel[] || [];
                            newOptions = _.unionBy(selectedOnes, exportList, 'id');
                        } else {
                            const current = this.dataSourceOptions.get('Exports') as ChartsExportMeasurementDisplayModel[] || [];
                            newOptions = _.unionBy(current, exportList, 'id');

                        }
                        newOptions = newOptions.map(value => this.setDisplayName(value) as ChartsExportMeasurementDisplayModel);
                        this.dataSourceOptions.set('Exports', newOptions);

                        if (this.dataSourceConfig?.exports != null) {
                            // exports values or names might have changed
                            this.dataSourceConfig.exports.forEach((selected) => {
                                const latestExisting = exports.instances?.find((existing) => existing.ID === (selected as ChartsExportMeasurementDisplayModel).id);
                                if (latestExisting !== undefined && latestExisting.Name !== undefined && latestExisting.ID !== undefined) {
                                    (selected as ChartsExportMeasurementDisplayModel).values = latestExisting.Values;
                                    (selected as ChartsExportMeasurementDisplayModel).name = latestExisting.Name;
                                    selected.display_name = selected.display_name ? selected.display_name : (selected as ChartsExportMeasurementDisplayModel).name;
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

    getDevices(request: { limit: number, offset: number, searchText?: string }) {
        return this.deviceInstancesService.getDeviceInstances(request).pipe(
            map(devices => {
                const newResults: DeviceInstanceModel[] = devices.result;
                let newOptions: any[];
                if (request.offset === 0) {  // create new item list
                    const selectedOnes = this.selectedExportsBySource.get('Devices') as DeviceInstanceModel[] || [];
                    newOptions = _.unionBy(selectedOnes, newResults, 'id');
                } else {                    // append newly loaded items
                    const current = this.dataSourceOptions.get('Devices') as DeviceInstanceModel[] || [];
                    newOptions = _.unionBy(current, newResults, 'id');
                }
                newOptions = newOptions.map(value => this.setDisplayName(value) as DeviceGroupDisplayModel);
                this.dataSourceOptions.set('Devices', newOptions);
            }),
            catchError(err => {
                console.log('could not get devices');
                console.log(err);
                return throwError(() => err);
            })
        );
    }

    getDeviceGroups(request: { search?: string, limit: number, offset: number }) {
        return this.deviceGroupsService.getDeviceGroups(request.search || '', request.limit, request.offset, 'name', 'asc', false).pipe(
            map(deviceGroupsResult => {
                const deviceGroups = deviceGroupsResult.result;
                deviceGroups.forEach(dg => {
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

                const newResults: DeviceGroupDisplayModel[] = deviceGroups;
                let newOptions: any[];
                if (request.offset === 0) {  // create new item list
                    const selectedOnes = this.selectedExportsBySource.get('Device Groups') as DeviceGroupDisplayModel[] || [];
                    newOptions = _.unionBy(selectedOnes, newResults, 'id');
                } else {                    // append newly loaded items
                    const current = this.dataSourceOptions.get('Device Groups') as DeviceGroupDisplayModel[] || [];
                    newOptions = _.unionBy(current, newResults, 'id');
                }
                newOptions = newOptions.map(value => this.setDisplayName(value) as DeviceGroupDisplayModel);
                this.dataSourceOptions.set('Device Groups', newOptions);
            }),
            catchError(err => {
                console.log('could not get device group');
                console.log(err);
                return throwError(() => err);
            })
        );
    }

    getLocations(request: { search?: string, limit: number, offset: number }): Observable<unknown> {
        return this.locationsService.getLocations(request).pipe(
            map(locations => {
                const newResults: LocationDisplayModel[] = locations.result;
                let newOptions: any[];

                if (request.offset === 0) {  // create new item list
                    const selectedOnes = this.selectedExportsBySource.get('Locations') as LocationDisplayModel[] || [];
                    newOptions = _.unionBy(selectedOnes, newResults, 'id');
                } else {                    // append newly loaded items
                    const current = this.dataSourceOptions.get('Locations') as LocationDisplayModel[] || [];
                    newOptions = _.unionBy(current, newResults, 'id');
                }
                newOptions = newOptions.map(value => this.setDisplayName(value) as LocationDisplayModel);
                this.dataSourceOptions.set('Locations', newOptions);
            }));
    }

    setupDataSources(): Observable<any> {
        const obs: Observable<any>[] = [];

        if (this.showExportsAsSource) {
            obs.push(this.getExports({ limit: this.scrollDynInitLimit, offset: 0 }));
        }
        if (this.showDevicesAsSource) {
            obs.push(this.getDevices({ limit: this.scrollDynInitLimit, offset: 0 }));
        }
        if (this.showDeviceGroupsAsSource) {
            obs.push(this.getDeviceGroups({ limit: this.scrollDynInitLimit, offset: 0 }));
        }
        if (this.showLocationsAsSource) {
            obs.push(this.getLocations({ limit: this.scrollDynInitLimit, offset: 0 }));
        }

        obs.push(this.functionsService.getFunctions('', 9999, 0, 'name', 'asc').pipe(map(functions => this.functions = functions.result)));

        if (obs.length === 0) {
            obs.push(of(true));
        }
        return forkJoin(obs).pipe(defaultIfEmpty(true)); // in case no data sources are selected
    }

    updateFieldOptions() {
        this.waitingForDataSourceChange = true;
        const selectedExports = this.form.get('exports')?.value;
        this.loadFieldOptions(selectedExports).pipe(
            map((fieldOptions) => {
                const tmp: ChartsExportVAxesModelWithGroup[] = [];
                fieldOptions.forEach((v, k) => {
                    v.forEach(v2 => {
                        const v3 = v2 as ChartsExportVAxesModelWithGroup;
                        v3.group = k;
                        tmp.push(v3);
                    });
                });
                this.fieldOptionsTMP = tmp;
                setTimeout(() => {
                    let f = this.form.get('fieldOptions');
                    if (f !== null) {
                        f.setValue(fieldOptions);
                    }
                    const filteredFields = this.filterSelectedFields(selectedExports);
                    f = this.form.get('fields');
                    if (f !== null) {
                        f.setValue(filteredFields);
                    }
                });
                return null;
            })
        ).subscribe({
            next: () => {
                this.cdref.detectChanges();
                this.waitingForDataSourceChange = false;
            },
            error: (err: any) => {
                console.log(err);
                this.waitingForDataSourceChange = false;
            }
        });
    }

    filterSelectedFields(selectedDataSources: (ChartsExportMeasurementDisplayModel | DeviceInstanceModel | DeviceGroupDisplayModel)[]) {
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

    loadFieldOptions(selectedExports: (ChartsExportMeasurementDisplayModel | DeviceInstanceModel | DeviceGroupDisplayModel | LocationDisplayModel)[]) {
        /* Load available fields based on the choosen data source and set as options in the select-search */
        const observables: Observable<any>[] = [of(null)];
        (selectedExports || []).forEach((selectedElement: ChartsExportMeasurementDisplayModel | DeviceInstanceModel | DeviceGroupDisplayModel | LocationDisplayModel) => {
            if ((selectedElement as ChartsExportMeasurementDisplayModel).values !== undefined) { // is export
                observables.push(this.updateExportFields(selectedElement as ChartsExportMeasurementDisplayModel));
            } else if ((selectedElement as DeviceGroupDisplayModel)?.criteria !== undefined) { // is device group
                observables.push(this.updateGroupFields(selectedElement as DeviceGroupDisplayModel));
            } else if (selectedElement.id.startsWith('urn:infai:ses:location:')) {
                observables.push(this.updateLocationFields(selectedElement as LocationDisplayModel));
            } else {
                observables.push(this.updateDeviceFields(selectedElement as DeviceInstanceModel));
            }
        });

        return forkJoin(observables).pipe(
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
        const influxExp = (this.form.get('exports')?.value as (ChartsExportMeasurementDisplayModel | DeviceInstanceModel | DeviceGroupDisplayModel)[])
            ?.find(exp => (exp as DeviceInstanceModel).device_type_id === undefined &&
                (((exp as ChartsExportMeasurementDisplayModel).exportDatabaseId === undefined && (exp as DeviceGroupDisplayModel).criteria === undefined) || (exp as ChartsExportMeasurementDisplayModel).exportDatabaseId === environment.exportDatabaseIdInternalInfluxDb));
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

    setDisplayName(dataSource: ChartsExportMeasurementDisplayModel | DeviceInstanceModel | LocationDisplayModel | DeviceGroupDisplayModel) {
        if (dataSource.display_name === undefined && 'name' in dataSource) {
            dataSource.display_name = dataSource?.name;
        }
        return dataSource;
    }

    patchFields(fields: ChartsExportVAxesModel[]) {
        this.form.patchValue({ fields });
    }


    getExportOptions(sourceClass: string): any[] {
        const exportOptions = this.dataSourceOptions.get(sourceClass);
        if (exportOptions === undefined) {
            return [];
        } else {
            return exportOptions;
        }
    }

    private getPreSelectionsByClass(): Map<string, { ids: string[], exports: any[] }> {
        const preExports = this.dataSourceConfig?.exports;
        const selections: Map<string, { ids: string[], exports: any[] }> = new Map();
        this.dataSourceClasses.forEach((sourceClass) => {
            selections.set(sourceClass, { ids: [], exports: [] });
        });
        if (preExports !== undefined && Array.isArray(preExports)) {
            preExports.forEach(exp => {
                const dataSourceClass = this.getSourceClassFromId(exp.id);
                selections.get(dataSourceClass)?.ids.push(exp.id);
                selections.get(dataSourceClass)?.exports.push(exp);
            });
        }
        return selections;
    }

    private getSourceClassFromId(id: string): string {
        if (id.includes('device-group')) {
            return 'Device Groups';
        } else if (id.includes('device')) {
            return 'Devices';
        } else if (id.includes('location')) {
            return 'Locations';
        } else {
            return 'Exports';
        }
    }

    sourceIsUsed(sourceForm: AbstractControl) {
        const cls = sourceForm.get('sourceClass')?.value;
        if (cls !== null) {
            const chosen = this.form.controls['dataSourceClasses'].value;
            return chosen.some((a: string | string[]) => a.includes(cls));
        }
        return false;
    }

    getSourceClass(sourceForm: AbstractControl) {
        if (sourceForm.get('sourceClass')?.value) {
            return sourceForm.get('sourceClass')?.value as string;
        }
        return '';
    }


    private updateExportSelections(sourceControl: AbstractControl, changedIds: string[]) {
        const sourceExports: any[] = [];
        const sourceClass = this.getSourceClass(sourceControl);
        changedIds.forEach((id: string) => {
            const exp = this.getExportById(id, sourceClass);
            if (exp !== null) {
                sourceExports.push(exp);
            } else {
                throwError(() => new Error('Could not add export with id: ' + id));
            }
        });
        this.selectedExportsBySource.set(sourceClass, sourceExports);

        let allExports: any[] = [];
        this.selectedExportsBySource.forEach((value: any[]) => {
            allExports = [...allExports, ...value];
        });
        this.form.controls['exports'].patchValue(allExports);
    }

    private getExportById(id: string, sourceClass: string) {
        const options = this.dataSourceOptions.get(sourceClass) || [];
        const exportIdx = options.findIndex(exp => exp.id === id);
        let exp = null;
        if (exportIdx !== -1) {
            exp = options[exportIdx];
            return exp;
        }
        return exp;
    }

    onSelectScroll(scroll: { start: number, end: number }, sourceForm: AbstractControl) {
        // allows to load next bulk of data before reaching the end of list. However sometimes the start and end
        // given by (scroll) are not accurate and may lead to an unwanted stop in scrolling => use onSelectScrollEnd as backup
        const sourceClass = this.getSourceClass(sourceForm);
        const lastStart = sourceForm.get('lastScrollStart')?.value;
        const lastEnd = sourceForm.get('lastScrollEnd')?.value;
        const searchTerm: string = sourceForm.get('lastSearch')?.value;
        const limit = this.scrollDynReloadLimit;
        const lenOptions = this.dataSourceOptions.get(sourceClass)?.length || this.scrollDynInitLimit;

        const noDuplicate = lastStart != scroll.start || lastEnd != scroll.end;
        const reachingEnd = scroll.end > (lenOptions - limit);

        if (noDuplicate && reachingEnd && !this.loadingDataSource) {
            this.loadNextOptionsBatch(scroll.start, scroll.end, sourceForm, limit, lenOptions, searchTerm);
        }
    }

    onSelectScrollEnd(sourceForm: AbstractControl) {
        // backup for onSelectScroll
        const sourceClass = this.getSourceClass(sourceForm);
        const searchTerm: string = sourceForm.get('lastSearch')?.value;
        const limit = this.scrollDynReloadLimit;
        const lenOptions = this.dataSourceOptions.get(sourceClass)?.length || this.scrollDynInitLimit;

        this.loadNextOptionsBatch(lenOptions, (lenOptions + this.scrollDynReloadLimit), sourceForm, limit, lenOptions, searchTerm);
    }

    onSelectClose(sourceForm: AbstractControl) {
        this.resetDataSourceOptions(sourceForm);
    }

    initOnSelectSearch() {
        this.searchSubject.pipe(
            debounceTime(250)
        ).subscribe(({ term, sourceForm }) => {
            this.resetDataSourceOptions(sourceForm, term);
        });
    }
    onSelectSearch(search: { term: string, items: any[] }, sourceForm: AbstractControl) {
        this.searchSubject.next({ term: search.term, sourceForm });
    }

    resetDataSourceOptions(sourceForm: AbstractControl, search: string = '') {
        const sourceClass = this.getSourceClass(sourceForm);
        const limit = this.scrollDynInitLimit;
        const offset = 0;
        this.loadDataSourceOptions(sourceClass, limit, offset, search).pipe(
            map(() => {
                sourceForm.patchValue({
                    lastScrollStart: 0,
                    lastScrollEnd: (this.scrollDynInitLimit - this.scrollDynReloadLimit),
                    lastSearch: search,
                    lastOffset: 0,
                });
            })).subscribe({
                next: () => {
                    this.cdref.detectChanges();
                },
                error: (err) => {
                    console.log('Could not reload ' + sourceClass + ':' + err);
                }
            });
    }

    loadNextOptionsBatch(scrollStart: number, scrollEnd: number,
        sourceForm: AbstractControl, limit: number, offset: number, searchTerm: string) {
        const sourceClass = this.getSourceClass(sourceForm);
        sourceForm.patchValue({
            lastScrollStart: scrollStart,
            lastScrollEnd: scrollEnd,
        });

        this.loadingDataSource = true;
        this.loadDataSourceOptions(sourceClass, limit, offset, searchTerm).pipe().subscribe({
            next: () => {
                this.cdref.detectChanges();
                this.loadingDataSource = false;
            },
            error: (err) => {
                console.log('Could not reload ' + sourceClass + ':' + err);
                this.loadingDataSource = false;
            }
        });
    }

    loadDataSourceOptions(sourceClass: string, limit: number, offset: number, search?: string) {
        if (sourceClass === 'Exports') {
            return this.getExports({ limit: limit, offset: offset, search: search });
        } else if (sourceClass === 'Devices') {
            return this.getDevices({ limit: limit, offset: offset, searchText: search });
        } else if (sourceClass === 'Device Groups') {
            return this.getDeviceGroups({ limit: limit, offset: offset, search: search });
        } else if (sourceClass === 'Locations') {
            return this.getLocations({ limit: limit, offset: offset, search: search });
        }
        return throwError(() => new Error('No valid DataSourceClass'));
    }


    private updateCriteriaAndAspects(fieldControl: AbstractControl) {
        const selectedDeviceGroups = this.selectedExportsBySource.get('Device Groups') as DeviceGroupDisplayModel[];
        if (this.getSourceClass(fieldControl) === 'Device Groups') {
            const aspectIds: string[] = [];
            const deviceClassIds: string[] = [];
            selectedDeviceGroups.forEach((deviceGroup: DeviceGroupDisplayModel) => {
                deviceGroup.criteria?.forEach(criteria => {
                    if (criteria.aspect_id !== '') aspectIds.push(criteria.aspect_id);
                    if (criteria.device_class_id !== '') deviceClassIds.push(criteria.device_class_id);
                });
            });
            this.deviceGroupsService.getAspectListByIds(aspectIds).subscribe(aspects => this.aspects = this.aspects.concat(aspects));
            this.deviceGroupsService.getDeviceClassListByIds(deviceClassIds).subscribe(deviceClasses => this.deviceClasses = this.deviceClasses.concat(deviceClasses));
        }
    }

    private updateDeviceTypes(deviceIds: string[]): Observable<{ device: DeviceInstanceModel, type: DeviceTypeModel }[]> {
        const obs: Observable<any>[] = [];
        deviceIds.forEach(deviceId => {
            obs.push(this.deviceInstancesService.getDeviceInstance(deviceId).pipe(switchMap(
                (device: any) => {
                    if (device !== null) {
                        if (!this.deviceTypes.has((device as DeviceInstanceModel).device_type_id)) {
                            return this.deviceTypeService.getDeviceType(device.device_type_id).pipe(map(dType => {
                                if (dType !== null) {
                                    this.deviceTypes.set((device as DeviceInstanceModel).device_type_id, dType);
                                    return { device: device, type: dType };
                                }
                                return null;
                            }));
                        } else {
                            return of({ device: device, type: this.deviceTypes.get((device as DeviceInstanceModel).device_type_id) });
                        }
                    } else {
                        return of(null);
                    }
                }
            )));
        });
        return forkJoin(obs).pipe(defaultIfEmpty([]));
    }
}