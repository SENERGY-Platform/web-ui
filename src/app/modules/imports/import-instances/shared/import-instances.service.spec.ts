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
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ImportInstancesService } from './import-instances.service';
import { ImportInstancesModel } from './import-instances.model';

describe('ImportInstancesService', () => {
    let service: ImportInstancesService;

    const httpClientSpy: Spy<HttpClient> = createSpyFromClass(HttpClient);
    httpClientSpy.get.and.returnValue(of(null));
    httpClientSpy.put.and.returnValue(of(null));
    httpClientSpy.post.and.returnValue(of(null));
    httpClientSpy.delete.and.returnValue(of(null));

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [{ provide: HttpClient, useValue: httpClientSpy }],
        });
        service = TestBed.inject(ImportInstancesService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should correctly request lists', () => {
        service.listImportInstances('search', 10, 1, 'name.asc').subscribe((val) => expect(val).toEqual([]));
        expect(httpClientSpy.get.calls.mostRecent().args[0]).toEqual(
            environment.importDeployUrl + '/instances?&search=search&limit=10&offset=1&sort=name.asc',
        );
    });

    it('should correctly create an instance', () => {
        const exampleInstance: ImportInstancesModel = { id: '', name: 'test' } as ImportInstancesModel;
        service.saveImportInstance(exampleInstance);
        expect(httpClientSpy.post.calls.mostRecent().args[0]).toEqual(environment.importDeployUrl + '/instances');
        expect(httpClientSpy.post.calls.mostRecent().args[1]).toEqual(exampleInstance);
    });

    it('should correctly update an instance', () => {
        const exampleInstance: ImportInstancesModel = { id: '1234' } as ImportInstancesModel;
        service.saveImportInstance(exampleInstance);
        expect(httpClientSpy.put.calls.mostRecent().args[0]).toEqual(environment.importDeployUrl + '/instances/1234');
        expect(httpClientSpy.put.calls.mostRecent().args[1]).toEqual(exampleInstance);
    });

    it('should correctly delete an instance', () => {
        service.deleteImportInstance('1234');
        expect(httpClientSpy.delete.calls.mostRecent().args[0]).toEqual(environment.importDeployUrl + '/instances/1234');
    });
});
