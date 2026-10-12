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

import { Injectable, inject, signal } from '@angular/core';
import { catchError, defaultIfEmpty, forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';
import _ from 'lodash';
import { DeviceGroupCriteriaModel, DeviceGroupDisplayModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';
import { DeviceInstanceModel } from 'src/app/modules/devices/device-instances/shared/device-instances.model';
import { ExportModel, ExportResponseModel, ExportValueModel } from 'src/app/modules/exports/shared/export.model';
import { ConceptsCharacteristicsModel } from 'src/app/modules/metadata/concepts/shared/concepts-characteristics.model';
import { ConceptsService } from 'src/app/modules/metadata/concepts/shared/concepts.service';
import { contentVariableAspectIds, criteriaAspectIds, deprecatedAspectAlias, DeviceTypeAspectModel, DeviceTypeContentVariableModel, DeviceTypeDeviceClassModel, DeviceTypeFunctionModel, DeviceTypeModel } from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from 'src/app/modules/metadata/device-types-overview/shared/device-type.service';
import { ChartsExportMeasurementDisplayModel, ChartsExportVAxesModel } from '../../export/shared/charts-export-properties.model';
import { ExportService } from 'src/app/modules/exports/shared/export.service';
import { DeviceInstancesService } from 'src/app/modules/devices/device-instances/shared/device-instances.service';
import { DeviceGroupsService } from 'src/app/modules/devices/device-groups/shared/device-groups.service';
import { LocationDisplayModel } from 'src/app/modules/devices/locations/shared/locations.model';
import { LocationsService } from 'src/app/modules/devices/locations/shared/locations.service';
import { FunctionsService } from 'src/app/modules/metadata/functions/shared/functions.service';
import type { DataSourceConfig } from './data-source-selector.component';

export interface ChartsExportVAxesModelWithGroup extends ChartsExportVAxesModel {
    group?: string;
}

export interface DataSourceFlags {
    showExportsAsSource: boolean;
    showDevicesAsSource: boolean;
    showDeviceGroupsAsSource: boolean;
    showLocationsAsSource: boolean;
}

/** Per-selector state: the offered and selected data sources, their paging and the loaded field options. Provided by the component. */
@Injectable()
export class DataSourceOptionsService {
    private deviceTypeService = inject(DeviceTypeService);
    private conceptsService = inject(ConceptsService);
    private exportService = inject(ExportService);
    private deviceInstancesService = inject(DeviceInstancesService);
    private deviceGroupsService = inject(DeviceGroupsService);
    private locationsService = inject(LocationsService);
    private functionsService = inject(FunctionsService);

    /** Set by the component; read on every export load, so it follows the component's input. */
    dataSourceConfig: () => DataSourceConfig | undefined = () => undefined;

    deviceTypes: Map<string, DeviceTypeModel> = new Map();
    aspects: DeviceTypeAspectModel[] = [];
    functions: DeviceTypeFunctionModel[] = [];
    deviceClasses: DeviceTypeDeviceClassModel[] = [];
    concepts: Map<string, ConceptsCharacteristicsModel | null> = new Map();

    // Replaced, not mutated, on every change so the signal notifies the open select lists.
    private readonly optionsBySource = signal<Map<string, ChartsExportMeasurementDisplayModel[] | DeviceInstanceModel[] | DeviceGroupDisplayModel[] | LocationDisplayModel[]>>(new Map());
    selectedExportsBySource: Map<string, ChartsExportMeasurementDisplayModel[] | DeviceInstanceModel[] | DeviceGroupDisplayModel[] | LocationDisplayModel[]> = new Map();

    scrollDynInitLimit = 30;    // number of items that each data source is initialized with
    scrollDynReloadLimit = 20;  // number of items that get additionally loaded whenever scrolled

    get dataSourceOptions() {
        return this.optionsBySource();
    }

    private setOptions(sourceClass: string, options: ChartsExportMeasurementDisplayModel[] | DeviceInstanceModel[] | DeviceGroupDisplayModel[] | LocationDisplayModel[]) {
        this.optionsBySource.update(current => new Map(current).set(sourceClass, options));
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
                        // single aspect only: adding aspect_ids here would AND every aspect of the variable
                        // into the query and drop devices carrying only one of them
                        const aspectId = contentVariable?.aspect_id ||
                            deprecatedAspectAlias(contentVariable !== undefined ? contentVariableAspectIds(contentVariable) : []) || '';
                        f.criteria = {
                            aspect_id: aspectId,
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

                // a location without devices or groups gives no observables; forkJoin([]) completes without a value
                return forkJoin(observables).pipe(
                    defaultIfEmpty([]),
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
                        this.setOptions('Exports', newOptions);

                        const configExports = this.dataSourceConfig()?.exports;
                        if (configExports != null) {
                            // exports values or names might have changed
                            configExports.forEach((selected) => {
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
                this.setOptions('Devices', newOptions);
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
                    dg.criteria
                        // this widget offers single-aspect choices only; the backend also generates one
                        // criterion per single aspect (with ancestors), so no aspect is lost by dropping these
                        ?.filter(c => criteriaAspectIds(c).length <= 1)
                        .forEach(c => {
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
                this.setOptions('Device Groups', newOptions);
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
                this.setOptions('Locations', newOptions);
            }));
    }

    setupDataSources(flags: DataSourceFlags): Observable<any> {
        const obs: Observable<any>[] = [];

        if (flags.showExportsAsSource) {
            obs.push(this.getExports({ limit: this.scrollDynInitLimit, offset: 0 }));
        }
        if (flags.showDevicesAsSource) {
            obs.push(this.getDevices({ limit: this.scrollDynInitLimit, offset: 0 }));
        }
        if (flags.showDeviceGroupsAsSource) {
            obs.push(this.getDeviceGroups({ limit: this.scrollDynInitLimit, offset: 0 }));
        }
        if (flags.showLocationsAsSource) {
            obs.push(this.getLocations({ limit: this.scrollDynInitLimit, offset: 0 }));
        }

        obs.push(this.functionsService.getFunctions('', 9999, 0, 'name', 'asc').pipe(map(functions => this.functions = functions.result)));

        if (obs.length === 0) {
            obs.push(of(true));
        }
        return forkJoin(obs).pipe(defaultIfEmpty(true)); // in case no data sources are selected
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

    setDisplayName(dataSource: ChartsExportMeasurementDisplayModel | DeviceInstanceModel | LocationDisplayModel | DeviceGroupDisplayModel) {
        if (dataSource.display_name === undefined && 'name' in dataSource) {
            dataSource.display_name = dataSource?.name;
        }
        return dataSource;
    }

    getExportOptions(sourceClass: string): any[] {
        const exportOptions = this.dataSourceOptions.get(sourceClass);
        if (exportOptions === undefined) {
            return [];
        } else {
            return exportOptions;
        }
    }

    getExportById(id: string, sourceClass: string) {
        const options = this.dataSourceOptions.get(sourceClass) || [];
        const exportIdx = options.findIndex(exp => exp.id === id);
        let exp = null;
        if (exportIdx !== -1) {
            exp = options[exportIdx];
            return exp;
        }
        return exp;
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

    updateCriteriaAndAspects(sourceClass: string) {
        const selectedDeviceGroups = this.selectedExportsBySource.get('Device Groups') as DeviceGroupDisplayModel[];
        if (sourceClass === 'Device Groups') {
            const aspectIds: string[] = [];
            const deviceClassIds: string[] = [];
            selectedDeviceGroups.forEach((deviceGroup: DeviceGroupDisplayModel) => {
                deviceGroup.criteria?.forEach(criteria => {
                    aspectIds.push(...criteriaAspectIds(criteria));
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
