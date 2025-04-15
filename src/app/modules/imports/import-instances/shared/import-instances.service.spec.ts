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
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ImportInstancesService } from './import-instances.service';
import { ImportInstancesModel } from './import-instances.model';
import 'zone.js/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('ImportInstancesService', () => {
    let service: ImportInstancesService;
    let httpClientSpy: Spy<HttpClient>;

    beforeEach(() => {
        httpClientSpy = createSpyFromClass(HttpClient);
        httpClientSpy.get.and.returnValue(of(null));
        httpClientSpy.put.and.returnValue(of(null));
        httpClientSpy.post.and.returnValue(of(null));
        httpClientSpy.delete.and.returnValue(of(null));

        TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
            providers: [
                { provide: HttpClient, useValue: httpClientSpy },
                provideHttpClientTesting(),
            ],
        });

        service = TestBed.inject(ImportInstancesService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should correctly request lists', () => {
        service.listImportInstances('search', 10, 1, 'name.asc').subscribe((val) => {
            expect(val).toEqual([]);
        });

        expect(httpClientSpy.get.calls.mostRecent().args[0]).toEqual(
            environment.importDeployUrl + '/instances?&search=search&limit=10&offset=1&sort=name.asc'
        );
    });

    it('should correctly create an instance', () => {
        const exampleInstance: ImportInstancesModel = { id: '', name: 'test' } as ImportInstancesModel;

        service.saveImportInstance(exampleInstance).subscribe(() => {
            expect(httpClientSpy.post.calls.mostRecent().args[0]).toEqual(environment.importDeployUrl + '/instances');
            expect(httpClientSpy.post.calls.mostRecent().args[1]).toEqual(exampleInstance);
        });

        expect(httpClientSpy.post).toHaveBeenCalled();
    });

    it('should correctly update an instance', () => {
        const exampleInstance: ImportInstancesModel = { id: '1234' } as ImportInstancesModel;

        service.saveImportInstance(exampleInstance).subscribe(() => {
            expect(httpClientSpy.put.calls.mostRecent().args[0]).toEqual(environment.importDeployUrl + '/instances/1234');
            expect(httpClientSpy.put.calls.mostRecent().args[1]).toEqual(exampleInstance);
        });

        expect(httpClientSpy.put).toHaveBeenCalled();
    });

    it('should correctly delete an instance', () => {
        service.deleteImportInstance('1234').subscribe(() => {
            expect(httpClientSpy.delete.calls.mostRecent().args[0]).toEqual(environment.importDeployUrl + '/instances/1234');
        });

        expect(httpClientSpy.delete).toHaveBeenCalled();
    });
});
