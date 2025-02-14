/*
 * Copyright 2022 InfAI (CC SES)
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
import {Observable} from 'rxjs';
import { HttpClient } from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {catchError} from 'rxjs/operators';
import {ErrorHandlerService} from './error-handler.service';

@Injectable({
    providedIn: 'root',
})
export class DeviceCommandService {
    constructor(private http: HttpClient, private errorHandlerService: ErrorHandlerService) {
    }

    runCommands(commands: DeviceCommandModel[], preferEventValue: boolean = true, timeoutSeconds = 25): Observable<DeviceCommandResponseModel[]> {
        const url = environment.deviceCommandUrl + '/commands/batch?timeout=' + timeoutSeconds + 's&prefer_event_value=' + preferEventValue;
        return this.http.post<DeviceCommandResponseModel[]>(url, commands)
            .pipe(catchError(this.errorHandlerService.handleError(DeviceCommandService.name, 'runCommands()', [])));

    }
}

export interface DeviceCommandModel {
    function_id: string;
    device_id?: string;
    group_id?: string;
    device_class_id?: string;
    service_id?: string;
    aspect_id?: string;
    input?: any;
}

export interface DeviceCommandResponseModel {
    status_code: number;
    message?: any;
}
