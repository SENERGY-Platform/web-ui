/*
 *
 *  Copyright 2019 InfAI (CC SES)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {Observable} from 'rxjs';
import {environment} from '../../../../../environments/environment';
import {catchError, map} from 'rxjs/operators';
import {ValueTypesModel} from './value-types.model';
import {MatDialog, MatDialogConfig} from '@angular/material';
import {ValueTypesNewDialogComponent} from '../dialogs/value-types-new-dialog.component';
import {ValueTypeResponseModel} from './value-type-response.model';

@Injectable({
    providedIn: 'root'
})
export class ValueTypesService {

    constructor(private http: HttpClient,
                private errorHandlerService: ErrorHandlerService,
                private dialog: MatDialog) {
    }

    getValuetypes(searchText: string, limit: number, offset: number, value: string, order: string): Observable<ValueTypesModel[]> {
        if (searchText === '') {
            return this.http.get<ValueTypesModel[]>(environment.valuetypeSearchUrl + '/get/valuetype/endpoint/' + limit + '/' +
                offset + '/' + value + '/' + order).pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(ValueTypesService.name, 'getValuetypes: no search', []))
            );
        } else {
            return this.http.get<ValueTypesModel[]>(environment.valuetypeSearchUrl + '/search/valuetype/' + searchText + '/endpoint/' +
                limit + '/' + offset + '/' + value + '/' + order).pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(ValueTypesService.name, 'getValuetypes: search', []))
            );
        }
    }

    saveValuetype(valuetype: ValueTypesModel): Observable<ValueTypeResponseModel | null> {
        return this.http.post<ValueTypeResponseModel>(environment.iotRepoUrl + '/other/valueType', valuetype).pipe(
            catchError(this.errorHandlerService.handleError(ValueTypesService.name, 'saveValuetype', null))
        );
    }

    openNewValuetypeDialog(): void {
        this.getValuetypes('', 9999, 0, 'name', 'asc').subscribe((valuetypes: ValueTypesModel[]) => {
            const dialogConfig = new MatDialogConfig();
            dialogConfig.autoFocus = true;
            dialogConfig.data = {
                valuetypes: valuetypes
            };
            const editDialogRef = this.dialog.open(ValueTypesNewDialogComponent, dialogConfig);

            editDialogRef.afterClosed().subscribe((valuetype: ValueTypesModel) => {
                if (valuetype !== undefined) {
                    this.saveValuetype(valuetype).subscribe(() => {
                    });
                }
            });
        });

    }
}
