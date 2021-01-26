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

import {ImportTypesCreateEditComponent} from './import-types-create-edit.component';
import {ActivatedRoute, RouterModule} from '@angular/router';
import {ReactiveFormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';
import {MatDialogModule} from '@angular/material/dialog';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {FunctionsService} from '../../devices/functions/shared/functions.service';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {AspectsService} from '../../devices/aspects/shared/aspects.service';
import {of} from 'rxjs';
import {CoreModule} from '../../../core/core.module';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {WidgetModule} from '../../../widgets/widget.module';
import {FlexModule} from '@angular/flex-layout';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatDividerModule} from '@angular/material/divider';
import {MatSelectModule} from '@angular/material/select';
import {MatTreeModule} from '@angular/material/tree';
import {ImportTypesService} from '../import-types/shared/import-types.service';
import {environment} from '../../../../environments/environment';
import {ImportTypeModel} from '../import-types/shared/import-types.model';
import {ImportTypesComponent} from '../import-types/import-types.component';
import {ConceptsService} from '../../devices/concepts/shared/concepts.service';

describe('ImportTypesCreateEditComponent', () => {
    let component: ImportTypesCreateEditComponent;
    let fixture: ComponentFixture<ImportTypesCreateEditComponent>;
    const functionsServiceSpy: Spy<FunctionsService> = createSpyFromClass(FunctionsService);
    const aspectsServiceSpy: Spy<AspectsService> = createSpyFromClass(AspectsService);
    const conceptsServiceSpy: Spy<ConceptsService> = createSpyFromClass(ConceptsService);
    const importTypesServiceSpy: Spy<ImportTypesService> = createSpyFromClass(ImportTypesService);


    functionsServiceSpy.getFunctions.and.returnValue(of([]));
    aspectsServiceSpy.getAspects.and.returnValue(of([]));
    conceptsServiceSpy.getConceptsWithCharacteristics.and.returnValue(of([]));
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
    importTypesServiceSpy.saveImportType.and.returnValue(of(true));

    const paramMap: Map<string, string> = new Map();
    paramMap.set('id', 'urn:infai:ses:import-type:1234');

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ImportTypesCreateEditComponent],
            imports: [
                CoreModule,
                RouterModule.forRoot([{
                    path: 'imports/types/list',
                    pathMatch: 'full',
                    component: ImportTypesComponent,
                    data: {header: 'Import Types'}
                }]),
                ReactiveFormsModule,
                HttpClientModule,
                MatDialogModule,
                MatSnackBarModule,
                MatCheckboxModule,
                FlexModule,
                MatTooltipModule,
                MatButtonModule,
                MatIconModule,
                MatFormFieldModule,
                MatInputModule,
                MatDividerModule,
                MatSelectModule,
                MatDialogModule,
                MatTreeModule,
                WidgetModule,
            ],
            providers: [
                {provide: FunctionsService, useValue: functionsServiceSpy},
                {provide: AspectsService, useValue: aspectsServiceSpy},
                {provide: ImportTypesService, useValue: importTypesServiceSpy},
                {provide: ConceptsService, useValue: conceptsServiceSpy},
                {
                    provide: ActivatedRoute, useValue: {
                        url: of(['edit', '1234']),
                        snapshot: {paramMap: paramMap}
                    }
                }
            ]
        })
            .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ImportTypesCreateEditComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create and load import type', () => {
        expect(component).toBeTruthy();
    });

    it('should only show user defined output', () => {
        expect(component.dataSource.data.length).toBe(2);
        expect(component.dataSource.data[1].sub_content_variables?.length).toBe(3);
    });

    it('should should show config', () => {
        expect(component.getConfigsFormArray().controls.length).toBe(1);
    });

    it('should save correctly', () => {
        importTypesServiceSpy.saveImportType.calls.reset();
        component.save();
        expect(importTypesServiceSpy.saveImportType).toHaveBeenCalled();
        expect(importTypesServiceSpy.saveImportType.calls.mostRecent().args.length).toBe(1);
        expect(importTypesServiceSpy.saveImportType.calls.mostRecent().args[0]).toEqual(testType);
    });
});
