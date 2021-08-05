/*
 * Copyright 2021 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
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
import {MatSnackBar} from '@angular/material/snack-bar';
import {Observable} from 'rxjs';
import {LocationModel} from '../../locations/shared/locations.model';
import {environment} from '../../../../../environments/environment';
import {catchError, map} from 'rxjs/operators';
import {ExportResponseModel} from '../../../exports/shared/export.model';
import {WaitingDeviceListModel} from './waiting-room.model';

@Injectable({
    providedIn: 'root'
})
export class WaitingRoomService {
    constructor(private http: HttpClient,
                private errorHandlerService: ErrorHandlerService,
                private snackBar: MatSnackBar) {
    }

    searchDevices(search?: string, limit?: number, offset?: number, sort?: string, order?: string, showHidden?: boolean): Observable<WaitingDeviceListModel | null> {
        const params = [
            'limit=' + limit,
            'offset=' + offset,
            'sort=' + sort + '.' + order,
        ];
        if (search) {
            params.push('search=' + encodeURIComponent(search));
        }
        if (showHidden) {
            params.push('show_hidden=true');
        }
        const url = environment.waitingRoomUrl + '/devices?' + params.join('&');

        return this.http.get<WaitingDeviceListModel>(url)
            .pipe(
                map((resp: WaitingDeviceListModel) => resp || []),
                catchError(this.errorHandlerService.handleError(WaitingRoomService.name, 'searchDevices: Error', null)
                )
            );
    }

}
