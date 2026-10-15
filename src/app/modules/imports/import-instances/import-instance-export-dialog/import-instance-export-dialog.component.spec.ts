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

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportInstanceExportDialogComponent } from './import-instance-export-dialog.component';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { ImportTypesService } from '../../import-types/shared/import-types.service';
import { of, throwError } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ImportInstancesModel } from '../shared/import-instances.model';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatTableModule } from '@angular/material/table';
import { ImportTypeModel } from '../../import-types/shared/import-types.model';
import { environment } from '../../../../../environments/environment';
import { ExportService } from '../../../exports/shared/export.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';

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
    importTypesServiceSpy.getImportType.and.returnValue(of(testType));
    const parsedValues = [
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
    ];
    // fresh objects per dialog, because the dialog edits the names in place
    importTypesServiceSpy.parseImportTypeExportValues.and.callFake(() => parsedValues.map((v) => ({...v})) as any);

    const exportServiceSpy: Spy<ExportService> = createSpyFromClass(ExportService);
    exportServiceSpy.startPipeline.and.returnValue(of(true));

    let r: any;

    beforeEach(async () => {
        await TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
    declarations: [ImportInstanceExportDialogComponent],
    imports: [MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        FormsModule,
        ReactiveFormsModule,
        MatSnackBarModule,
        MatCheckboxModule,
        MatTableModule,
        BrowserAnimationsModule],
    providers: [
        {
            provide: MAT_DIALOG_DATA,
            useValue: {
                name: 'name',
                id: 'instance-id',
                kafka_topic: 'kafka-topic',
                import_type_id: 'urn:infai:ses:import-type:1234',
            } as ImportInstancesModel,
        },
        {
            provide: MatDialogRef,
            useValue: {
                close: (rv: any) => {
                    r = rv;
                },
            },
        },
        { provide: ImportTypesService, useValue: importTypesServiceSpy },
        { provide: ExportService, useValue: exportServiceSpy },
        provideHttpClient(withInterceptorsFromDi()),
    ]
}).compileComponents();
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
            ],
            EntityName: 'name',
            ServiceName: 'urn:infai:ses:import-type:1234',
            ExportDatabaseID: environment.exportDatabaseIdInternalTimescaleDb,
            TimestampFormat: '%Y-%m-%dT%H:%M:%SZ',
        });
        expect(r).toBeDefined();
    });

    it('starts at the newest message when not all messages are to be consumed', () => {
        exportServiceSpy.startPipeline.calls.reset();
        component.allMessagesControl.setValue(false);
        component.create();
        expect(exportServiceSpy.startPipeline.calls.mostRecent().args[0].Offset).toBe('largest');
    });

    it('saves a renamed value under its new name', () => {
        exportServiceSpy.startPipeline.calls.reset();
        component.values[0].Name = 'renamed';
        component.create();
        expect(exportServiceSpy.startPipeline.calls.mostRecent().args[0].Values[0].Name).toBe('renamed');
    });

    it('stops the create while two exported values share a name', () => {
        const [first, second] = component.values;
        second.Name = first.Name;
        expect(component.nameError(first)).toBe('Name is used more than once');
        expect(component.nameError(second)).toBe('Name is used more than once');
        expect(component.hasNameErrors()).toBeTrue();

        component.valueSelection.deselect(second);
        expect(component.nameError(first)).toBe('');
        expect(component.hasNameErrors()).toBeFalse();
    });

    it('stops the create when a value takes the name of a tag', () => {
        component.values[0].Name = 'tag2';
        expect(component.nameError(component.values[0])).toBe('Name is used more than once');
        expect(component.hasNameErrors()).toBeTrue();
    });

    it('stops the create when a selected value has no name', () => {
        component.values[0].Name = ' ';
        expect(component.nameError(component.values[0])).toBe('Name required');
        expect(component.hasNameErrors()).toBeTrue();
    });

    it('stops the create when a value takes the time column or a character the backend splits at', () => {
        component.values[0].Name = 'time';
        expect(component.nameError(component.values[0])).toBe('Name is taken by the time column');
        component.values[0].Name = 'a:b';
        expect(component.nameError(component.values[0])).toBe('Name must not contain : or "');
        expect(component.hasNameErrors()).toBeTrue();
    });

    it('lists a name that two tags share, though no row shows it', () => {
        component.tags[1].Name = component.tags[0].Name;
        expect(component.values.every((value) => component.nameError(value) === '')).toBeTrue();
        expect(component.invalidNames()).toEqual(['tag1_tag']);
        expect(component.hasNameErrors()).toBeTrue();
    });

    it('sends the tags once when a failed create is repeated', () => {
        spyOn(console, 'error');
        exportServiceSpy.startPipeline.and.returnValue(throwError(() => new Error('failed')));
        component.create();
        exportServiceSpy.startPipeline.and.returnValue(of(true));
        component.create();
        const names = exportServiceSpy.startPipeline.calls.mostRecent().args[0].Values.map((v: any) => v.Name);
        expect(names).toEqual(['value', 'value2', 'tag1', 'tag1_tag', 'tag2']);
        expect(component.hasNameErrors()).toBeFalse();
    });
});
