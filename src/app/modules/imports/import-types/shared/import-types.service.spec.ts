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
import {TestBed} from '@angular/core/testing';

import {ImportTypesService} from './import-types.service';
import {HttpClient} from '@angular/common/http';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {of} from 'rxjs';
import {ImportTypeModel} from './import-types.model';
import {environment} from '../../../../../environments/environment';

describe('ImportTypesService', () => {
    let service: ImportTypesService;

    const httpClientSpy: Spy<HttpClient> = createSpyFromClass(HttpClient);
    httpClientSpy.get.and.returnValue(of(null));
    httpClientSpy.put.and.returnValue(of(null));
    httpClientSpy.post.and.returnValue(of(null));
    httpClientSpy.delete.and.returnValue(of(null));


    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
            ],
            providers: [
                {provide: HttpClient, useValue: httpClientSpy},
            ]
        });
        service = TestBed.inject(ImportTypesService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should correctly request lists', () => {
        service.listImportTypes('search', 10, 1, 'name.asc')
            .subscribe(val => expect(val).toEqual([]));
        expect(httpClientSpy.get.calls.mostRecent().args[0]).toEqual(
            environment.permissionSearchUrl + '/v2/import-types?&search=search&limit=10&offset=1&sort=name.asc'
        );
    });

    it('should correctly request a single type', () => {
        service.getImportType('1234');
        expect(httpClientSpy.get.calls.mostRecent().args[0]).toEqual(
            environment.importRepoUrl + '/import-types/1234'
        );
    });

    it('should correctly create a type', () => {
        const exampleType: ImportTypeModel = {id: '', name: 'test'} as ImportTypeModel;
        service.saveImportType(exampleType);
        expect(httpClientSpy.post.calls.mostRecent().args[0]).toEqual(
            environment.importRepoUrl + '/import-types'
        );
        expect(httpClientSpy.post.calls.mostRecent().args[1]).toEqual(exampleType);
    });

    it('should correctly update a type', () => {
        const exampleType: ImportTypeModel = {id: '1234'} as ImportTypeModel;
        service.saveImportType(exampleType);
        expect(httpClientSpy.put.calls.mostRecent().args[0]).toEqual(
            environment.importRepoUrl + '/import-types/1234'
        );
        expect(httpClientSpy.put.calls.mostRecent().args[1]).toEqual(exampleType);
    });

    it('should correctly delete a type', () => {
        service.deleteImportInstance('1234');
        expect(httpClientSpy.delete.calls.mostRecent().args[0]).toEqual(
            environment.importRepoUrl + '/import-types/1234'
        );
    });
});
