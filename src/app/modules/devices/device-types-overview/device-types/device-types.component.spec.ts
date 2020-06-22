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
import {RouterTestingModule} from '@angular/router/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {DeviceTypesComponent} from './device-types.component';
import {CoreModule} from '../../../../core/core.module';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {ActivatedRoute, convertToParamMap} from '@angular/router';

describe('DeviceTypesComponent', () => {
    let component: DeviceTypesComponent;
    let fixture: ComponentFixture<DeviceTypesComponent>;

    beforeEach(async(() => {

        TestBed.configureTestingModule({
            imports: [CoreModule, RouterTestingModule, HttpClientTestingModule, MatSnackBarModule],
            declarations: [
                DeviceTypesComponent
            ],
            providers: [{
                provide: ActivatedRoute, useValue: {
                    snapshot: {
                        paramMap: convertToParamMap({'id': '4711'}),
                        queryParamMap: convertToParamMap({'function': 'create'})
                    }
                }
            }]
        }).compileComponents();
        fixture = TestBed.createComponent(DeviceTypesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }));

    it('should create the app', async(() => {
        expect(component).toBeTruthy();
    }));

    it('init with RouterFunction = create', async(() => {
        expect(component.id).toBe('4711');
        expect(component.queryParamFunction).toBe('create');
        expect(component.editable).toBe(true);
    }));
});
