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

import {DeviceTypeService} from '../../../modules/metadata/device-types-overview/shared/device-type.service';
import {Observable} from 'rxjs';
import {Injectable} from '@angular/core';
import {DeviceInstancesService} from '../../../modules/devices/device-instances/shared/device-instances.service';
import {map} from 'rxjs/operators';
import {environment} from '../../../../environments/environment';


@Injectable({
    providedIn: 'root'
})
export class AirQualityRequirementsService {
    constructor(private deviceTypeService: DeviceTypeService,
                private deviceInstancesService: DeviceInstancesService) {
    }

    requirementsFulfilled(): Observable<boolean> {
        const filter: { function_id: string, device_class_id: string, aspect_id: string }[] = [];
        filter.push({function_id: environment.getPm1FunctionId, device_class_id: '', aspect_id: environment.aspectAirId});
        filter.push({function_id: environment.getPm10FunctionId, device_class_id: '', aspect_id: environment.aspectAirId});
        filter.push({function_id: environment.getPm25FunctionId, device_class_id: '', aspect_id: environment.aspectAirId});
        filter.push({function_id: environment.getHumidityFunctionId, device_class_id: '', aspect_id: environment.aspectAirId});
        filter.push({function_id: environment.getTemperatureFunctionId, device_class_id: '', aspect_id: environment.aspectAirId});
        filter.push({function_id: environment.getPressureFunctionId, device_class_id: '', aspect_id: environment.aspectAirId});
        filter.push({function_id: environment.getCo2FunctionId, device_class_id: '', aspect_id: environment.aspectAirId});


        return new Observable<boolean>(obs => {
            this.deviceTypeService.getDeviceTypeFilteredOr(filter).pipe(
                map(deviceTypes => deviceTypes.map(d => d.id)),
                map(ids => this.deviceInstancesService.getDeviceInstancesByDeviceTypes(ids, null))
            ).subscribe(o => {
                o.subscribe(deviceInstances => {
                    obs.next(deviceInstances.length > 0);
                    obs.complete();
                });
            });
        });
    }
}
