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

import { Injectable } from '@angular/core';
import { ExportService } from '../../../modules/exports/shared/export.service';
import { DeviceTypeService } from '../../../modules/metadata/device-types-overview/shared/device-type.service';
import { DeviceInstancesService } from '../../../modules/devices/device-instances/shared/device-instances.service';
import {
    DeviceTypeAspectModel,
    DeviceTypeFunctionModel,
    DeviceTypeModel,
    DeviceTypeServiceModel,
} from '../../../modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceSelectablesModel } from '../../../modules/devices/device-instances/shared/device-instances.model';
import { forkJoin, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ExportModel, ExportValueCharacteristicModel, ExportValueModel } from '../../../modules/exports/shared/export.model';
import { PipelineRegistryService } from '../../../modules/data/pipeline-registry/shared/pipeline-registry.service';
import { PipelineModel } from '../../../modules/data/pipeline-registry/shared/pipeline.model';
import { OperatorModel } from '../../../modules/data/operator-repo/shared/operator.model';
import { OperatorRepoService } from '../../../modules/data/operator-repo/shared/operator-repo.service';
import { ExportValueTypes } from './data-table.model';
import { ImportInstancesService } from '../../../modules/imports/import-instances/shared/import-instances.service';
import { ImportTypesService } from '../../../modules/imports/import-types/shared/import-types.service';
import { ImportInstancesModel } from '../../../modules/imports/import-instances/shared/import-instances.model';
import { ImportTypeModel, ImportTypePermissionSearchModel } from '../../../modules/imports/import-types/shared/import-types.model';

@Injectable({
    providedIn: 'root',
})
export class DataTableHelperService {
    exportCache: ExportModel[] | undefined = undefined;
    exportTagCache: Map<string, Map<string, { value: string; parent: string }[]>> | undefined = undefined;
    pipelineCache: PipelineModel[] | undefined = undefined;
    deviceTypeCache = new Map<string, DeviceTypeModel>();
    deviceInstancesCache = new Map<string, DeviceSelectablesModel[]>();
    aspectCache: DeviceTypeAspectModel[] = [];
    aspectFunctionsCache = new Map<string, DeviceTypeFunctionModel[]>();
    operatorCache = new Map<string, OperatorModel>();
    serviceExportValueCache = new Map<string, ExportValueCharacteristicModel[]>();
    importInstances: ImportInstancesModel[] = [];
    importTypes: ImportTypePermissionSearchModel[] = [];
    fullImportTypes = new Map<string, ImportTypeModel>();
    importTypeValues = new Map<string, ExportValueModel[]>();

    constructor(
        private exportService: ExportService,
        private deviceTypeService: DeviceTypeService,
        private deviceInstancesService: DeviceInstancesService,
        private pipelineRegistryService: PipelineRegistryService,
        private operatorRepoService: OperatorRepoService,
        private importInstancesService: ImportInstancesService,
        private importTypesService: ImportTypesService,
    ) {}

    private static translateValueType(schemaOrgType: string): string {
        switch (schemaOrgType) {
        case 'https://schema.org/Text':
            return ExportValueTypes.STRING;
        case 'https://schema.org/Integer':
            return ExportValueTypes.INTEGER;
        case 'https://schema.org/Float':
            return ExportValueTypes.FLOAT;
        case 'https://schema.org/Boolean':
            return ExportValueTypes.BOOLEAN;
        case 'https://schema.org/ItemList':
            return ExportValueTypes.STRING_JSON;
        default:
            return '';
        }
    }

    initialize(): Observable<null> {
        this.exportCache = undefined;
        this.exportTagCache = new Map<string, Map<string, { value: string; parent: string }[]>>();
        this.pipelineCache = undefined;
        this.deviceTypeCache = new Map<string, DeviceTypeModel>();
        this.deviceInstancesCache = new Map<string, DeviceSelectablesModel[]>();
        this.aspectCache = [];
        this.aspectFunctionsCache = new Map<string, DeviceTypeFunctionModel[]>();
        this.operatorCache = new Map<string, OperatorModel>();
        this.serviceExportValueCache = new Map<string, ExportValueCharacteristicModel[]>();
        this.importInstances = [];
        this.importTypes = [];
        this.fullImportTypes = new Map<string, ImportTypeModel>();
        this.importTypeValues = new Map<string, ExportValueModel[]>();

        const obs: Observable<any>[] = [];
        obs.push(this.preloadExports());
        obs.push(this.preloadAspectsWithMeasuringFunction());
        obs.push(this.preloadPipelines());
        obs.push(this.preloadAllOperators());
        obs.push(this.preloadImportInstances());
        obs.push(this.preloadImportTypes());

        return forkJoin(obs).pipe(map(() => null));
    }

    preloadAspectsWithMeasuringFunction(): Observable<DeviceTypeAspectModel[]> {
        return this.deviceTypeService.getAspectsWithMeasuringFunction().pipe(map((aspects) => (this.aspectCache = aspects)));
    }

    getAspectsWithMeasuringFunction(): DeviceTypeAspectModel[] {
        return this.aspectCache;
    }

    preloadMeasuringFunctionsOfAspect(aspectId: string): Observable<DeviceTypeFunctionModel[]> {
        if (this.aspectFunctionsCache.has(aspectId)) {
            return of(this.aspectFunctionsCache.get(aspectId) || []);
        }
        return this.deviceTypeService.getAspectsMeasuringFunctions(aspectId).pipe(
            map((functions) => {
                this.aspectFunctionsCache.set(aspectId, functions);
                return functions;
            }),
        );
    }

    getMeasuringFunctionsOfAspect(aspectId: string): DeviceTypeFunctionModel[] {
        return this.aspectFunctionsCache.get(aspectId) || [];
    }

    preloadDevicesOfFunctionAndAspect(aspectId: string, functionId: string): Observable<DeviceSelectablesModel[]> {
        const key = aspectId + functionId;
        if (this.aspectFunctionsCache.has(key)) {
            return of(this.deviceInstancesCache.get(key) || []);
        }
        const filter = [{ function_id: functionId, aspect_id: aspectId }];

        return this.deviceInstancesService.getDeviceSelections(filter, true).pipe(
            map((devices) => {
                this.deviceInstancesCache.set(aspectId + functionId, devices);
                return devices;
            }),
        );
    }

    getDevicesOfFunctionAndAspect(aspectId: string, functionId: string): DeviceSelectablesModel[] {
        const devices = this.deviceInstancesCache.get(aspectId + functionId);
        return devices || [];
    }

    preloadExports(): Observable<ExportModel[]> {
        if (this.exportCache !== undefined) {
            return of(this.exportCache);
        }
        return this.exportService
            .getExports('', -1, 0, 'name', 'asc')
            .pipe(map((exports) => (this.exportCache = exports === null ? [] : exports.instances)));
    }

    getExportsForDeviceAndValue(serviceId: string, deviceId: string, path: string): ExportModel[] {
        if (this.exportCache === undefined) {
            console.error('DataTableHelperService:getExportsForDeviceAndValue(): Cache uninitialized, call preloadExports() first');
            return [];
        }
        const topic = serviceId.replace(/:/gi, '_');
        return this.exportCache.filter(
            (exp) =>
                exp.FilterType === 'deviceId' &&
                exp.Filter === deviceId &&
                exp.Topic === topic &&
                exp.Values.findIndex((value) => value.Path === path) !== -1,
        );
    }

    getExportsForPipelineOperatorValue(pipelineId: string, operatorName: string, operatorId: string, path: string): ExportModel[] {
        if (this.exportCache === undefined) {
            console.error('DataTableHelperService:getExportsForPipelineOperatorValue(): Cache uninitialized, call preloadExports() first');
            return [];
        }
        return this.exportCache.filter(
            (exp) =>
                exp.FilterType === 'operatorId' &&
                exp.Filter === pipelineId + ':' + operatorId &&
                exp.Topic === 'analytics-' + operatorName &&
                exp.Values.findIndex((value) => value.Path === path) !== -1,
        );
    }

    preloadPipelines(): Observable<PipelineModel[]> {
        if (this.pipelineCache !== undefined) {
            return of(this.pipelineCache);
        }
        return this.pipelineRegistryService.getPipelines().pipe(map((pipes) => (this.pipelineCache = pipes)));
    }

    getPipelines(): PipelineModel[] {
        if (this.pipelineCache === undefined) {
            console.error('DataTableHelperService:getPipelines(): Cache uninitialized, call preloadPipelines() first');
            return [];
        }
        return this.pipelineCache;
    }

    preloadOperator(operatorId: string): Observable<OperatorModel> {
        if (this.operatorCache.has(operatorId)) {
            return of(this.operatorCache.get(operatorId) || ({} as OperatorModel));
        }
        return this.operatorRepoService.getOperator(operatorId).pipe(
            map((operator) => {
                if (operator !== null) {
                    this.operatorCache.set(operatorId, operator);
                    return operator;
                }
                return {} as OperatorModel;
            }),
        );
    }

    preloadAllOperators(): Observable<OperatorModel[]> {
        return this.operatorRepoService.getOperators('', 9999, 0, 'name', 'asc').pipe(
            map((operators) => {
                operators.operators.forEach((operator) => this.operatorCache.set(operator._id || '', operator));
                return operators.operators;
            }),
        );
    }

    getOperator(operatorId: string): OperatorModel | undefined {
        return this.operatorCache.get(operatorId);
    }

    getServiceValues(service: DeviceTypeServiceModel): ExportValueCharacteristicModel[] {
        const key = service.id;
        if (this.serviceExportValueCache.has(key)) {
            return this.serviceExportValueCache.get(key) || [];
        }
        const collection: ExportValueCharacteristicModel[] = [];
        service.outputs.forEach((output) => {
            const values = this.exportService.addCharacteristicToDeviceTypeContentVariable(output.content_variable);
            values.map((value) => (value.Type = DataTableHelperService.translateValueType(value.Type)));
            collection.push(...values);
        });
        this.serviceExportValueCache.set(key, collection);
        return collection;
    }

    preloadExportTags(exportId: string | null): Observable<Map<string, { value: string; parent: string }[]>> {
        if (exportId === null) {
            return of(new Map());
        }
        if (this.exportTagCache?.get(exportId) !== undefined) {
            return of(this.getExportTags(exportId));
        }
        this.exportTagCache?.set(exportId, new Map());
        return this.exportService.getExportTags(exportId).pipe(
            map((res) => {
                const m = new Map<string, { value: string; parent: string }[]>();
                res.forEach((v, k) =>
                    m.set(
                        k,
                        v.map((t) => ({ value: t, parent: k })),
                    ),
                );
                this.exportTagCache?.set(exportId, m);
                return m;
            }),
        );
    }

    getExportTags(exportId: string): Map<string, { value: string; parent: string }[]> {
        return this.exportTagCache?.get(exportId) || new Map();
    }

    preloadImportInstances(): Observable<ImportInstancesModel[]> {
        return this.importInstancesService.listImportInstances('', undefined, undefined, 'name.asc').pipe(
            map((instances) => {
                this.importInstances = instances;
                return instances;
            }),
        );
    }

    preloadImportTypes(): Observable<ImportTypePermissionSearchModel[]> {
        return this.importTypesService.listImportTypes('', undefined, undefined, 'name.asc').pipe(
            map((types) => {
                this.importTypes = types;
                return types;
            }),
        );
    }

    getImportTypes(): ImportTypePermissionSearchModel[] {
        return this.importTypes;
    }

    preloadFullImportType(id: string | null): Observable<ImportTypeModel | undefined> {
        if (id === null) {
            return of(undefined);
        }
        if (this.fullImportTypes.has(id)) {
            return of(this.fullImportTypes.get(id));
        }
        return this.importTypesService.getImportType(id).pipe(
            map((t) => {
                this.fullImportTypes.set(id, t);
                return t;
            }),
        );
    }

    getFullImportType(id: string): ImportTypeModel | undefined {
        return this.fullImportTypes.get(id);
    }

    getImportInstancesOfType(id: string | null | undefined): ImportInstancesModel[] {
        if (id === undefined || id === null) {
            return [];
        }
        return this.importInstances.filter((i) => i.import_type_id === id);
    }

    getImportTypeValues(id: string): ExportValueModel[] {
        if (this.importTypeValues.has(id)) {
            return this.importTypeValues.get(id) || [];
        }
        const type = this.fullImportTypes.get(id);
        if (type === undefined) {
            return [];
        }
        const values = this.importTypesService.parseImportTypeExportValues(type);
        this.importTypeValues.set(id, values);
        return values;
    }

    getExportsOfImportInstance(instanceId: string, path: string): ExportModel[] {
        return (
            this.exportCache?.filter(
                (e) => e.FilterType === 'import_id' && e.Filter === instanceId && e.Values.findIndex((v) => v.Path === path) !== -1,
            ) || []
        );
    }
}
