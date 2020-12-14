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

import {ContentVariableDialogComponent} from './content-variable-dialog.component';
import {CoreModule} from '../../../../core/core.module';
import {ReactiveFormsModule} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {FlexModule} from '@angular/flex-layout';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';

describe('ContentVariableDialogComponent', () => {
    let component: ContentVariableDialogComponent;
    let fixture: ComponentFixture<ContentVariableDialogComponent>;


    beforeEach(async () => {
        await TestBed.configureTestingModule({
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
                MatSelectModule,
                MatDialogModule,
            ],
            providers: [
                {provide: MAT_DIALOG_DATA, useValue: {characteristics: []}},
                {
                    provide: MatDialogRef,
                    useValue: {
                        close: (_: any) => {
                        }
                    }
                },
            ]
        })
            .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ContentVariableDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
