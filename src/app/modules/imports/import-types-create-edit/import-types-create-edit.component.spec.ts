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
import {CharacteristicsService} from '../../devices/characteristics/shared/characteristics.service';
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

describe('ImportTypesCreateEditComponent', () => {
    let component: ImportTypesCreateEditComponent;
    let fixture: ComponentFixture<ImportTypesCreateEditComponent>;
    const functionsServiceSpy: Spy<FunctionsService> = createSpyFromClass(FunctionsService);
    const aspectsServiceSpy: Spy<AspectsService> = createSpyFromClass(AspectsService);
    const characteristicsServiceSpy: Spy<CharacteristicsService> = createSpyFromClass(CharacteristicsService);

    functionsServiceSpy.getFunctions.and.returnValue(of([]));
    aspectsServiceSpy.getAspects.and.returnValue(of([]));
    characteristicsServiceSpy.getCharacteristics.and.returnValue(of([]));

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ImportTypesCreateEditComponent],
            imports: [
                CoreModule,
                RouterModule.forRoot([]),
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
                {provide: CharacteristicsService, useValue: characteristicsServiceSpy},
                {
                    provide: ActivatedRoute, useValue: {
                        url: of(['new']),
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

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
