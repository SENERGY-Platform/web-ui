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

import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ImportInstanceExportDialogComponent} from './import-instance-export-dialog.component';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {ImportTypesService} from '../../import-types/shared/import-types.service';
import {of} from 'rxjs';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {ImportInstancesModel} from '../shared/import-instances.model';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {ReactiveFormsModule} from '@angular/forms';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {HttpClientModule} from '@angular/common/http';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatTableModule} from '@angular/material/table';
import {ImportTypeModel} from '../../import-types/shared/import-types.model';
import {environment} from '../../../../../environments/environment';
import {ExportService} from '../../../data/export/shared/export.service';

describe('ImportInstanceExportDialogComponent', () => {
    let component: ImportInstanceExportDialogComponent;
    let fixture: ComponentFixture<ImportInstanceExportDialogComponent>;

    const importTypesServiceSpy: Spy<ImportTypesService> = createSpyFromClass(ImportTypesService);
    const testType: ImportTypeModel = {
        id: 'urn:infai:ses:import-type:1234',
        name: 'test',
        description: 'test',
        image: 'test-image',
        default_restart: true,
        configs: [
            {
                name: 'test-config',
                description: 'none',
                type: 'https://schema.org/Text',
                default_value: 'config-value'
            }
        ],
        aspect_ids: [],
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
                    use_as_tag: false
                },
                {
                    name: 'time',
                    type: 'https://schema.org/Text',
                    characteristic_id: environment.timeStampCharacteristicId,
                    sub_content_variables: [],
                    use_as_tag: false
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
                            use_as_tag: false
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
                                    use_as_tag: false
                                },
                                {
                                    name: 'tag1',
                                    type: 'https://schema.org/Float',
                                    characteristic_id: '',
                                    sub_content_variables: null,
                                    use_as_tag: true
                                },
                                {
                                    name: 'tag2',
                                    type: 'https://schema.org/Text',
                                    characteristic_id: '',
                                    sub_content_variables: null,
                                    use_as_tag: true
                                }
                            ],
                            use_as_tag: false
                        }
                    ],
                    use_as_tag: false
                }
            ],
            use_as_tag: false
        },
        function_ids: [],
        owner: 'test-owner'
    };
    importTypesServiceSpy.getImportType.and.returnValue(of(testType));

    const exportServiceSpy: Spy<ExportService> = createSpyFromClass(ExportService);
    exportServiceSpy.startPipeline.and.returnValue(of(true));

    let r: any;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ImportInstanceExportDialogComponent],
            imports: [
                MatDialogModule,
                MatButtonModule,
                MatIconModule,
                MatFormFieldModule,
                MatInputModule,
                ReactiveFormsModule,
                MatSnackBarModule,
                HttpClientModule,
                MatCheckboxModule,
                MatTableModule,
                BrowserAnimationsModule,
            ],
            providers: [
                {
                    provide: MAT_DIALOG_DATA, useValue: {
                        name: 'name',
                        id: 'instance-id',
                        kafka_topic: 'kafka-topic',
                        import_type_id: 'urn:infai:ses:import-type:1234',
                    } as ImportInstancesModel
                },
                {
                    provide: MatDialogRef,
                    useValue: {
                        close: (rv: any) => {
                            r = rv;
                        }
                    }
                },
                {provide: ImportTypesService, useValue: importTypesServiceSpy},
                {provide: ExportService, useValue: exportServiceSpy},
            ]
        })
            .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ImportInstanceExportDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create and load type', () => {
        expect(component).toBeTruthy();
        expect(importTypesServiceSpy.getImportType).toHaveBeenCalled();
    });

    it('should correctly select all values and tags', () => {
        exportServiceSpy.startPipeline.calls.reset();
        component.descControl.setValue('desc');
        component.create();
        expect(exportServiceSpy.startPipeline).toHaveBeenCalled();
        expect(exportServiceSpy.startPipeline.calls.mostRecent().args.length).toBe(1);
        expect(exportServiceSpy.startPipeline.calls.mostRecent().args[0]).toEqual({
            Name: 'name',
            Description: 'desc',
            FilterType: 'import_id',
            Filter: 'instance-id',
            Topic: 'kafka-topic',
            Generated: false,
            Offset: 'earliest',
            TimePath: 'time',
            Values: [
                {
                    Name: 'value',
                    Path: 'value.value',
                    Type: 'float'
                },
                {
                    Name: 'value2',
                    Path: 'value.meta.value2',
                    Type: 'float'
                },
                {
                    Name: 'tag1',
                    Path: 'value.meta.tag1',
                    Type: 'float'
                }],
            Tags: [
                {
                    Name: 'tag1_tag',
                    Path: 'value.meta.tag1',
                    Type: 'string'
                }, {
                    Name: 'tag2',
                    Path: 'value.meta.tag2',
                    Type: 'string'
                }],
            EntityName: 'name',
            ServiceName: 'urn:infai:ses:import-type:1234',
        });
        expect(r).toBeDefined();
    });
});
