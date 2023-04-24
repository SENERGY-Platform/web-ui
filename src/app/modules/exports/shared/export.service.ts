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
import { HttpClient } from '@angular/common/http';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { environment } from '../../../../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import {
    ExportDatabaseModel,
    ExportModel,
    ExportResponseModel,
    ExportValueBaseModel,
    ExportValueCharacteristicModel,
    ExportValueModel
} from './export.model';
import { DeviceTypeContentVariableModel, DeviceTypeServiceModel } from '../../metadata/device-types-overview/shared/device-type.model';
import { DeviceInstancesModel } from '../../devices/device-instances/shared/device-instances.model';
import { DeviceInstancesUpdateModel } from '../../devices/device-instances/shared/device-instances-update.model';
import { PathOption } from '../../data/flow-repo/shared/path-options.service';
import {DeviceInstancesService} from '../../devices/device-instances/shared/device-instances.service';

@Injectable({
    providedIn: 'root',
})
export class ExportService {
    typeString = 'https://schema.org/Text';
    typeInteger = 'https://schema.org/Integer';
    typeFloat = 'https://schema.org/Float';
    typeBoolean = 'https://schema.org/Boolean';
    typeStructure = 'https://schema.org/StructuredValue';
    typeList = 'https://schema.org/ItemList';

    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService, private deviceService: DeviceInstancesService) {}

    getExports(
        internalOnly: boolean,
        search?: string,
        limit?: number,
        offset?: number,
        sort?: string,
        order?: string,
        generated?: boolean,
        searchField?: string,
    ): Observable<ExportResponseModel | null> {
        if (searchField === undefined || searchField === null) {
            searchField = 'name';
        }
        return this.http
            .get<ExportResponseModel>(
                environment.exportService +
                    '/instance?limit=' +
                    limit +
                    '&offset=' +
                    offset +
                    '&order=' +
                    sort +
                    ':' +
                    order +
                    (search ? '&search=' + searchField + ':' + search : '') +
                    (generated !== undefined ? '&generated=' + generated.valueOf() : '') +
                    '&internal_only=' + internalOnly,
            )
            .pipe(
                map((resp: ExportResponseModel) => resp || []),
                catchError(this.errorHandlerService.handleError(ExportService.name, 'getExports: Error', null)),
            );
    }

    getExport(id: string): Observable<ExportModel | null> {
        return this.http.get<ExportModel>(environment.exportService + '/instance/' + id).pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(ExportService.name, 'getExport: Error', null)),
        );
    }

    startPipeline(exp: ExportModel): Observable<ExportModel> {
        return this.http
            .post<ExportModel>(environment.exportService + '/instance', exp)
            .pipe(catchError(this.errorHandlerService.handleError(ExportService.name, 'startPipeline: Error', {} as ExportModel)));
    }

    editExport(id: string, exp: ExportModel): Observable<{ status: number }> {
        return this.http.put(environment.exportService + '/instance/' + id, exp, { responseType: 'text', observe: 'response' }).pipe(
            map((resp) => ({ status: resp.status })),
            catchError(this.errorHandlerService.handleError(ExportService.name, 'editExport: Error', { status: 400 })),
        );
    }

    stopPipeline(exp: ExportModel): Observable<{ status: number }> {
        return this.stopPipelineById(exp.ID || '');
    }

    stopPipelineById(id: string): Observable<{ status: number }> {
        return this.http.delete(environment.exportService + '/instance/' + id, { responseType: 'text', observe: 'response' }).pipe(
            map((resp) => ({ status: resp.status })),
            catchError(this.errorHandlerService.handleError(ExportService.name, 'stopPipelineById: Error', { status: 404 })),
        );
    }

    stopPipelines(exp: string[]): Observable<{ status: number }> {
        return this.http
            .request('DELETE', environment.exportService + '/instances', { body: exp, responseType: 'text', observe: 'response' })
            .pipe(
                map((resp) => ({ status: resp.status })),
                catchError(this.errorHandlerService.handleError(ExportService.name, 'stopPipelines: Error', { status: 404 })),
            );
    }

    prepareDeviceServiceExport(
        deviceInstancesModel: DeviceInstancesModel | DeviceInstancesUpdateModel,
        service: DeviceTypeServiceModel,
    ): ExportModel[] {
        const device = this.deviceService.addDisplayName(deviceInstancesModel);
        device.name = device.display_name || device.name;
        const exports: ExportModel[] = [];
        service.outputs.forEach((output, index) => {
            const traverse = this.addCharacteristicToDeviceTypeContentVariable(output.content_variable);
            const timePath = this.getTimePath(traverse);
            const hasAmbiguousNames = this.hasAmbiguousNames(traverse);

            const exportValues: ExportValueModel[] = [];

            traverse.forEach((trav) => {
                if (trav.Path !== timePath.path) {
                    let type = '';
                    switch (trav.Type) {
                    case this.typeString:
                        type = 'string';
                        break;
                    case this.typeFloat:
                        type = 'float';
                        break;
                    case this.typeInteger:
                        type = 'int';
                        break;
                    case this.typeBoolean:
                        type = 'bool';
                        break;
                    case this.typeList:
                        type = 'string_json';
                        break;
                    }
                    exportValues.push({
                        Name: hasAmbiguousNames ? trav.Path : trav.Name,
                        Type: type,
                        Path: trav.Path,
                    } as ExportValueModel);
                }
            });

            exports.push({
                Name: deviceInstancesModel.name + '_' + service.name + (service.outputs.length > 1 ? '_' + index : ''),
                TimePath: timePath.path,
                TimePrecision: timePath.precision,
                Values: exportValues,
                EntityName: deviceInstancesModel.name,
                Filter: deviceInstancesModel.id,
                FilterType: 'deviceId',
                ServiceName: service.name,
                Topic: service.id.replace(/#/g, '_').replace(/:/g, '_'),
                Offset: 'largest',
                Generated: true,
                ExportDatabaseID: environment.exportDatabaseIdInternalInfluxDb, // data already in timescale
            } as ExportModel);
        });
        return exports;
    }

    addCharacteristicToDeviceTypeContentVariable(field: DeviceTypeContentVariableModel): ExportValueCharacteristicModel[] {
        return this.addCharacteristicToDeviceTypeContentVariableRecursion('value', field, []);
    }

    private addCharacteristicToDeviceTypeContentVariableRecursion(
        pathString: string,
        field: DeviceTypeContentVariableModel,
        array: ExportValueCharacteristicModel[],
    ): ExportValueCharacteristicModel[] {
        if (field.type === this.typeStructure && field.type !== undefined && field.type !== null) {
            pathString += '.' + field.name;
            if (field.sub_content_variables !== undefined) {
                field.sub_content_variables.forEach((innerField: DeviceTypeContentVariableModel) => {
                    this.addCharacteristicToDeviceTypeContentVariableRecursion(pathString, innerField, array);
                });
            }
        } else {
            array.push({
                Name: field.name || '',
                Path: pathString + '.' + field.name,
                Type: field.type || '',
                characteristicId: field.characteristic_id || '',
            });
        }
        return array;
    }

    hasAmbiguousNames(values: ExportValueBaseModel[]): boolean {
        const nameMap = new Map<string, null>();
        for (const value of values) {
            if (nameMap.has(value.Name)) {
                return true;
            }
            nameMap.set(value.Name, null);
        }
        return false;
    }

    getTimePath(traverse: ExportValueCharacteristicModel[]): { path: string; precision: string | undefined;} {
        let path = '';
        let precision: string | undefined;
        traverse.forEach((t: ExportValueCharacteristicModel) => {
            if (
                t.characteristicId === environment.timeStampCharacteristicId ||
                t.characteristicId === environment.timeStampCharacteristicUnixNanoSecondsId
            ) {
                path = t.Path;
                precision = undefined; // No precision for iso string or nanos
            } else if (t.characteristicId === environment.timeStampCharacteristicUnixSecondsId) {
                path = t.Path;
                precision = 's';
            } else if (t.characteristicId === environment.timeStampCharacteristicUnixMilliSecondsId) {
                path = t.Path;
                precision = 'ms';
            }
        });
        return { path, precision };
    }

    getExportTags(exportId: string): Observable<Map<string, string[]>> {
        return this.http.get<any>(environment.influxAPIURL + '/v2/tags/' + exportId).pipe(
            map((res) => {
                const m = new Map<string, string[]>();
                for (const key of Object.keys(res)) {
                    m.set(key, res[key]);
                }
                return m;
            }),
        );
    }


    getExportDatabases(): Observable<ExportDatabaseModel[]> {
        return this.http.get<ExportDatabaseModel[]>(environment.exportService + '/databases').pipe(
            map((resp) => resp || []),
            catchError(this.errorHandlerService.handleError(ExportService.name, 'getExportDatabases: Error', [])),
        );
    }
}
