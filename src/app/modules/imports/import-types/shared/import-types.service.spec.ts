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
import { ImportTypeModel } from './import-types.model';
import { environment } from '../../../../../environments/environment';
import { ImportTypesService } from './import-types.service';
import { ExportValueModel } from '../../../exports/shared/export.model';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('ImportTypesService', () => {
    let service: ImportTypesService;
    let httpClientSpy: Spy<HttpClient>;

    const testType: ImportTypeModel = {
        id: 'urn:infai:ses:import-type:1234',
        name: 'test',
        description: 'test',
        image: 'test-image',
        default_restart: true,
        cost: 5,
        configs: [
            {
                name: 'test-config',
                description: 'none',
                type: 'https://schema.org/Text',
                default_value: 'config-value',
            },
        ],
        output: {
            name: 'root',
            type: 'https://schema.org/StructuredValue',
            characteristic_id: '',
            sub_content_variables: [
                {
                    name: 'import_id',
                    type: 'https://schema.org/Text',
                    characteristic_id: '',
                    sub_content_variables: [],
                    use_as_tag: false,
                },
                {
                    name: 'time',
                    type: 'https://schema.org/Text',
                    characteristic_id: environment.timeStampCharacteristicId,
                    sub_content_variables: [],
                    use_as_tag: false,
                },
                {
                    name: 'value',
                    type: 'https://schema.org/StructuredValue',
                    characteristic_id: '',
                    sub_content_variables: [
                        {
                            name: 'value',
                            type: 'https://schema.org/Float',
                            characteristic_id: '',
                            sub_content_variables: [],
                            use_as_tag: false,
                        },
                        {
                            name: 'meta',
                            type: 'https://schema.org/StructuredValue',
                            characteristic_id: '',
                            sub_content_variables: [
                                {
                                    name: 'value2',
                                    type: 'https://schema.org/Float',
                                    characteristic_id: '',
                                    sub_content_variables: null,
                                    use_as_tag: false,
                                },
                                {
                                    name: 'tag1',
                                    type: 'https://schema.org/Float',
                                    characteristic_id: '',
                                    sub_content_variables: null,
                                    use_as_tag: true,
                                },
                                {
                                    name: 'tag2',
                                    type: 'https://schema.org/Text',
                                    characteristic_id: '',
                                    sub_content_variables: null,
                                    use_as_tag: true,
                                },
                            ],
                            use_as_tag: false,
                        },
                    ],
                    use_as_tag: false,
                },
            ],
            use_as_tag: false,
        },
        owner: 'test-owner',
    };

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

        service = TestBed.inject(ImportTypesService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should correctly parse export values', () => {
        expect(service.parseImportTypeExportValues(testType)).toEqual([
            {
                Name: 'value',
                Path: 'value.value',
                Type: 'float',
                Tag: false,
            },
            {
                Name: 'value2',
                Path: 'value.meta.value2',
                Type: 'float',
                Tag: false,
            },
            {
                Name: 'tag1',
                Path: 'value.meta.tag1',
                Type: 'float',
                Tag: false,
            },
            {
                Name: 'tag1_tag',
                Path: 'value.meta.tag1',
                Type: 'string',
                Tag: true,
            },
            {
                Name: 'tag2',
                Path: 'value.meta.tag2',
                Type: 'string',
                Tag: true,
            },
        ] as ExportValueModel[]);
    });
});
