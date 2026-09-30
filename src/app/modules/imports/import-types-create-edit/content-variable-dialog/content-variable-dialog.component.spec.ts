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

import { ContentVariableDialogComponent } from './content-variable-dialog.component';
import { CoreModule } from '../../../../core/core.module';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FlexModule } from '@ngbracket/ngx-layout';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DeviceTypeCharacteristicsModel } from '../../../metadata/device-types-overview/shared/device-type.model';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { CloseMtxSelectOnScrollDirective } from 'src/app/core/directives/close-mtx-select-on-scroll.directive';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { DeviceTypeAspectModel } from '../../../metadata/device-types-overview/shared/device-type.model';
import { ImportTypeContentVariableModel } from '../../import-types/shared/import-types.model';
import { AspectClassesService } from '../../../metadata/aspects/shared/aspect-classes.service';
import { createSpyFromClass } from 'jasmine-auto-spies';
import { of } from 'rxjs';

describe('ContentVariableDialogComponent', () => {
    let component: ContentVariableDialogComponent;
    let fixture: ComponentFixture<ContentVariableDialogComponent>;
    const exampleChar: DeviceTypeCharacteristicsModel = {
        id: 'char0',
        name: 'char0',
        display_unit: '',
        type: 'https://schema.org/Text',
        sub_characteristics: null,
    };
    const typeConceptCharacteristics: Map<string, Map<string, DeviceTypeCharacteristicsModel[]>> = new Map();
    const m: Map<string, DeviceTypeCharacteristicsModel[]> = new Map();
    m.set('testconcept', [exampleChar]);
    typeConceptCharacteristics.set('https://schema.org/Text', m);

    const aspects: DeviceTypeAspectModel[] = [
        { id: 'urn:infai:ses:aspect:b', name: 'b', sub_aspects: [] },
        { id: 'urn:infai:ses:aspect:a', name: 'a', sub_aspects: [] },
    ];
    let dialogData: { typeConceptCharacteristics: typeof typeConceptCharacteristics; content?: ImportTypeContentVariableModel; infoOnly: boolean; aspects: DeviceTypeAspectModel[] };
    let r: any;

    function init(content: ImportTypeContentVariableModel | undefined) {
        const aspectClassesService = createSpyFromClass(AspectClassesService);
        aspectClassesService.userHasReadAuthorization.and.returnValue(true);
        aspectClassesService.getAspectClasses.and.returnValue(of([]));
        dialogData = {
            typeConceptCharacteristics,
            content,
            infoOnly: false,
            aspects,
        };
        TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
            declarations: [ContentVariableDialogComponent],
            imports: [
                CoreModule,
                ReactiveFormsModule,
                MatDialogModule,
                MatSnackBarModule,
                MatCheckboxModule,
                FlexModule,
                MatTooltipModule,
                MatButtonModule,
                MatFormFieldModule,
                MatInputModule,
                MatDialogModule,
                MtxSelectModule,
                NoopAnimationsModule,
                CloseMtxSelectOnScrollDirective,
            ],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: dialogData },
                {
                    provide: MatDialogRef,
                    useValue: {
                        close: (rv: any) => {
                            r = rv;
                        },
                    },
                },
                { provide: AspectClassesService, useValue: aspectClassesService },
                provideHttpClient(withXhr(), withInterceptorsFromDi()),
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(ContentVariableDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    beforeEach(() => {
        r = undefined;
    });

    it('should create', () => {
        init(undefined);
        expect(component).toBeTruthy();
    });

    it('should allow editing', () => {
        init(undefined);
        expect(component.form.disabled).toBeFalse();
    });

    it('should return a valid value', () => {
        init(undefined);
        const val = {
            name: 'test',
            type: component.STRING,
            characteristic_id: 'char0',
            use_as_tag: true,
            function_id: null,
            aspect_ids: [] as string[],
            aspect_id: undefined,
        };
        component.form.patchValue(val);
        component.save();
        expect(r).toEqual(val);
    });

    it('keeps every aspect and derives the deprecated aspect_id from the selection, alphabetically first', () => {
        init(undefined);
        component.form.patchValue({
            name: 'test',
            type: component.STRING,
            aspect_ids: ['urn:infai:ses:aspect:b', 'urn:infai:ses:aspect:a'],
        });
        component.save();

        expect(r.aspect_ids).toEqual(['urn:infai:ses:aspect:b', 'urn:infai:ses:aspect:a']);
        expect(r.aspect_id).toBe('urn:infai:ses:aspect:a');
    });

    it('does not resurrect a removed aspect through a stale aspect_id', () => {
        // simulates a record read before the aspect selection changed in the open dialog
        const content: ImportTypeContentVariableModel = {
            name: 'test',
            type: 'https://schema.org/Text',
            sub_content_variables: [],
            use_as_tag: false,
            aspect_id: 'urn:infai:ses:aspect:a',
            aspect_ids: ['urn:infai:ses:aspect:a', 'urn:infai:ses:aspect:b'],
        };
        init(content);

        component.form.patchValue({ aspect_ids: ['urn:infai:ses:aspect:b'] });
        component.save();

        expect(r.aspect_ids).toEqual(['urn:infai:ses:aspect:b']);
        expect(r.aspect_id).toBe('urn:infai:ses:aspect:b');
    });

    it('opens with the one aspect a legacy record selects through aspect_id alone', () => {
        const content: ImportTypeContentVariableModel = {
            name: 'test',
            type: 'https://schema.org/Text',
            sub_content_variables: [],
            use_as_tag: false,
            aspect_id: 'urn:infai:ses:aspect:a',
        };
        init(content);

        expect(component.form.get('aspect_ids')?.value).toEqual(['urn:infai:ses:aspect:a']);
    });
});
