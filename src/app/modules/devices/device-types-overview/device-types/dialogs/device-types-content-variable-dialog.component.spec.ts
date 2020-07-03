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

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {DeviceTypesContentVariableDialogComponent} from './device-types-content-variable-dialog.component';
import {CoreModule} from '../../../../../core/core.module';
import {createSpyFromClass, Spy} from 'jasmine-auto-spies';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ConceptsService} from '../../../concepts/shared/concepts.service';
import {DeviceTypeContentVariableModel, DeviceTypeFunctionModel} from '../../shared/device-type.model';

fdescribe('DeviceTypesContentVariableDialog', () => {
    let component: DeviceTypesContentVariableDialogComponent;
    let fixture: ComponentFixture<DeviceTypesContentVariableDialogComponent>;

    const matDialogRefSpy: Spy<MatDialogRef<DeviceTypesContentVariableDialogComponent>> = createSpyFromClass<MatDialogRef<DeviceTypesContentVariableDialogComponent>>(MatDialogRef);
    const conceptServiceSpy: Spy<ConceptsService> = createSpyFromClass(ConceptsService);

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [CoreModule],
            declarations: [
                DeviceTypesContentVariableDialogComponent
            ],
            providers: [
                {provide: MatDialogRef, useValue: matDialogRefSpy},
                {provide: ConceptsService, useValue: conceptServiceSpy},
                {provide: MAT_DIALOG_DATA, useValue: {contentVariable: {} as DeviceTypeContentVariableModel, functions: [] as DeviceTypeFunctionModel[]}},
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(DeviceTypesContentVariableDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }));

    it('should create the app', async(() => {
        expect(component).toBeTruthy();
    }));



});
