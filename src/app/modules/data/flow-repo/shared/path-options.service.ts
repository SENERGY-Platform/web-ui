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

import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {environment} from '../../../../../environments/environment';
import {catchError} from 'rxjs/internal/operators';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {
    DeviceTypeContentVariableModel,
    DeviceTypeServiceModel
} from '../../../metadata/device-types-overview/shared/device-type.model';
import {ImportTypeContentVariableModel, ImportTypeModel} from '../../../imports/import-types/shared/import-types.model';
import {ImportInstancesModel} from '../../../imports/import-instances/shared/import-instances.model';

export interface PathOption {
    service_id: string;
    json_path: string[];
}

export interface PathOptionFull extends PathOption {
    service: DeviceTypeServiceModel;
}

@Injectable({
    providedIn: 'root',
})
export class PathOptionsService {
    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) {
    }

    getPathOptions(
        deviceTypeIds: string[],
        functionId: string,
        aspectId: string,
        withoutEnvelope: boolean = false,
        characteristicIdFilter: string[] = [],
    ): Observable<Map<string, PathOption[]>> {
        return this.http
            .post<any>(environment.marshallerUrl + '/query/path-options', {
                device_type_ids: deviceTypeIds,
                function_id: functionId,
                aspect_id: aspectId,
                characteristic_id_filter: characteristicIdFilter,
                without_envelope: withoutEnvelope,
            })
            .pipe(
                map((obj) => {
                    const m = new Map<string, PathOption[]>();
                    for (const key of Object.keys(obj)) {
                        m.set(key, obj[key]);
                    }
                    return m;
                }),
                catchError(this.errorHandlerService.handleError<Map<string, PathOption[]>>(
                    'PathOptionsService',
                    'getPathOptions',
                    new Map<string, PathOption[]>(),
                ),
                ),
            );
    }

    getPathOptionsLocal(
        services: DeviceTypeServiceModel[],
        withoutEnvelope: boolean = false,
        characteristicIdFilter: string[] = [],
    ): PathOptionFull[] {
        const pathOptions: PathOptionFull[] = [];
        services.forEach((service) => {
            const serviceOptions: PathOptionFull = {service_id: service.id, json_path: [], service};
            service.outputs.forEach((output) => {
                this.getPathOptionsRecursive(
                    !withoutEnvelope ? 'value' : '',
                    serviceOptions.json_path,
                    output.content_variable,
                    characteristicIdFilter,
                );
            });
            if (serviceOptions.json_path.length > 0) {
                pathOptions.push(serviceOptions);
            }
        });
        return pathOptions;
    }

    getPathOptionsLocalImport(type: ImportTypeModel, instance: ImportInstancesModel, characteristicIdFilter: string[] = []): PathOption {
        const pathOption: PathOption = {service_id: instance.kafka_topic, json_path: []};
        type.output.sub_content_variables?.forEach((sub) => {
            this.getPathOptionsRecursive('', pathOption.json_path, sub, characteristicIdFilter);
        });
        return pathOption;
    }

    private getPathOptionsRecursive(
        parentPath: string,
        pathArray: string[],
        contentVariable: DeviceTypeContentVariableModel | ImportTypeContentVariableModel,
        characteristicIdFilter: string[],
    ) {
        const path = (parentPath.length > 0 ? parentPath + '.' : '') + contentVariable.name;
        if (
            contentVariable.characteristic_id !== undefined &&
            characteristicIdFilter.findIndex((c) => c === contentVariable.characteristic_id) !== -1
        ) {
            pathArray.push(path);
        }
        contentVariable.sub_content_variables?.forEach((sub: DeviceTypeContentVariableModel | ImportTypeContentVariableModel) =>
            this.getPathOptionsRecursive(path, pathArray, sub, characteristicIdFilter),
        );
    }
}
