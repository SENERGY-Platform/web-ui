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
import {ComponentFixture, TestBed, fakeAsync, flush} from '@angular/core/testing';

import { ImportTypesCreateEditComponent } from './import-types-create-edit.component';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { AspectsService } from '../../metadata/aspects/shared/aspects.service';
import { of } from 'rxjs';
import { CoreModule } from '../../../core/core.module';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { WidgetModule } from '../../../widgets/widget.module';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatTreeModule } from '@angular/material/tree';
import { ImportTypesService } from '../import-types/shared/import-types.service';
import { environment } from '../../../../environments/environment';
import { ImportTypeContentVariableModel, ImportTypeModel } from '../import-types/shared/import-types.model';
import { ImportTypesComponent } from '../import-types/import-types.component';
import { ConceptsService } from '../../metadata/concepts/shared/concepts.service';
import { DeviceTypeService } from '../../metadata/device-types-overview/shared/device-type.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { CloseMtxSelectOnScrollDirective } from 'src/app/core/directives/close-mtx-select-on-scroll.directive';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

describe('ImportTypesCreateEditComponent', () => {

    let component: ImportTypesCreateEditComponent;
    let fixture: ComponentFixture<ImportTypesCreateEditComponent>;
    const deviceTypeService: Spy<DeviceTypeService> = createSpyFromClass(DeviceTypeService);
    const aspectsServiceSpy: Spy<AspectsService> = createSpyFromClass(AspectsService);
    const conceptsServiceSpy: Spy<ConceptsService> = createSpyFromClass(ConceptsService);
    const importTypesServiceSpy: Spy<ImportTypesService> = createSpyFromClass(ImportTypesService);

    deviceTypeService.getMeasuringFunctions.and.returnValue(of([]));
    deviceTypeService.getAspects.and.returnValue(of([]));
    conceptsServiceSpy.getConceptsWithCharacteristics.and.returnValue(of([]));
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
                    function_id: environment.getTimestampFunctionId,
                    sub_content_variables: [],
                    use_as_tag: false,
                    aspect_id: undefined,
                    aspect_ids: [],
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
    importTypesServiceSpy.getImportType.and.returnValue(of(testType));
    importTypesServiceSpy.saveImportType.and.returnValue(of(true));

    const paramMap: Map<string, string> = new Map();
    paramMap.set('id', 'urn:infai:ses:import-type:1234');

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [
                CoreModule,
                RouterModule.forRoot([
                        {
                            path: 'imports/types/list',
                            pathMatch: 'full',
                            component: ImportTypesComponent,
                            data: { header: 'Import Types' },
                        },
                    ], {}),
                ReactiveFormsModule,
                MatDialogModule,
                MatSnackBarModule,
                MatCheckboxModule,
                MatTooltipModule,
                MatButtonModule,
                MatIconModule,
                MatFormFieldModule,
                MatInputModule,
                MatDividerModule,
                MatDialogModule,
                MatTreeModule,
                WidgetModule,
                MtxSelectModule,
                NoopAnimationsModule,
                CloseMtxSelectOnScrollDirective,
                ImportTypesCreateEditComponent,
            ],
            providers: [
                { provide: DeviceTypeService, useValue: deviceTypeService },
                { provide: AspectsService, useValue: aspectsServiceSpy },
                { provide: ImportTypesService, useValue: importTypesServiceSpy },
                { provide: ConceptsService, useValue: conceptsServiceSpy },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        url: of(['edit', '1234']),
                        snapshot: { paramMap },
                    },
                },
                provideHttpClient(withXhr(), withInterceptorsFromDi()),
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ImportTypesCreateEditComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        // some tests below point getImportType at a variant of testType; restore the default so
        // later tests' shared beforeEach (which always loads through getImportType) is unaffected.
        importTypesServiceSpy.getImportType.and.returnValue(of(testType));
    });

    /** Loads a fresh component whose time sub_content_variable is testType's with the given overrides. */
    function loadWithTimeAspect(overrides: Partial<ImportTypeContentVariableModel>) {
        const type: ImportTypeModel = JSON.parse(JSON.stringify(testType));
        Object.assign(type.output.sub_content_variables![1], overrides);
        importTypesServiceSpy.getImportType.and.returnValue(of(type));
        const localFixture = TestBed.createComponent(ImportTypesCreateEditComponent);
        localFixture.detectChanges();
        return localFixture.componentInstance;
    }

    it('reads the time aspect list-first, ahead of the deprecated aspect_id', () => {
        const loaded = loadWithTimeAspect({
            aspect_id: 'urn:infai:ses:aspect:stale',
            aspect_ids: ['urn:infai:ses:aspect:current'],
        });

        expect(loaded.timeAspect.value).toBe('urn:infai:ses:aspect:current');
    });

    it('falls back to the deprecated aspect_id for the time aspect when aspect_ids is absent', () => {
        const loaded = loadWithTimeAspect({ aspect_id: 'urn:infai:ses:aspect:legacy', aspect_ids: undefined });

        expect(loaded.timeAspect.value).toBe('urn:infai:ses:aspect:legacy');
    });

    it('writes both aspect_ids and aspect_id for the time aspect on save', fakeAsync(() => {
        component.timeAspect.setValue('urn:infai:ses:aspect:time');
        importTypesServiceSpy.saveImportType.calls.reset();

        component.save();
        fixture.detectChanges();
        flush();

        const saved = importTypesServiceSpy.saveImportType.calls.mostRecent().args[0];
        expect(saved.output.sub_content_variables[1].aspect_ids).toEqual(['urn:infai:ses:aspect:time']);
        expect(saved.output.sub_content_variables[1].aspect_id).toBe('urn:infai:ses:aspect:time');
    }));

    describe('a time variable stored with several aspects', () => {
        const stored = ['urn:infai:ses:aspect:b', 'urn:infai:ses:aspect:a', 'urn:infai:ses:aspect:c'];

        function savedTimeVariable(loaded: ImportTypesCreateEditComponent) {
            importTypesServiceSpy.saveImportType.calls.reset();
            loaded.save();
            return importTypesServiceSpy.saveImportType.calls.mostRecent().args[0].output.sub_content_variables![1];
        }

        it('opens with the alias selected and writes the stored list back when the user leaves it alone', () => {
            const loaded = loadWithTimeAspect({ aspect_id: 'urn:infai:ses:aspect:a', aspect_ids: stored });

            expect(loaded.timeAspect.value).toBe('urn:infai:ses:aspect:a');
            const saved = savedTimeVariable(loaded);
            expect(saved.aspect_ids).toEqual(stored);
            expect(saved.aspect_id).toBe('urn:infai:ses:aspect:a');
        });

        it('writes only the chosen aspect once the user picked another', () => {
            const loaded = loadWithTimeAspect({ aspect_id: 'urn:infai:ses:aspect:a', aspect_ids: stored });
            loaded.timeAspect.setValue('urn:infai:ses:aspect:z');

            const saved = savedTimeVariable(loaded);
            expect(saved.aspect_ids).toEqual(['urn:infai:ses:aspect:z']);
            expect(saved.aspect_id).toBe('urn:infai:ses:aspect:z');
        });

        it('writes no aspect once the user cleared the selection', () => {
            const loaded = loadWithTimeAspect({ aspect_id: 'urn:infai:ses:aspect:a', aspect_ids: stored });
            loaded.timeAspect.setValue(null);

            const saved = savedTimeVariable(loaded);
            expect(saved.aspect_ids).toEqual([]);
            expect(saved.aspect_id).toBeUndefined();
        });
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

    it('should save correctly',
        fakeAsync(() => {
            importTypesServiceSpy.saveImportType.calls.reset();
            component.save();
            fixture.detectChanges();
            flush();
            expect(importTypesServiceSpy.saveImportType).toHaveBeenCalled();
            expect(importTypesServiceSpy.saveImportType.calls.mostRecent().args.length).toBe(1);
            expect(importTypesServiceSpy.saveImportType.calls.mostRecent().args[0]).toEqual(testType);
        }),
    );
});
