/*
 * Copyright 2020 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this fi8le except in compliance with the License.
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

import { DeviceGroupsPipelineHelperDialogComponent } from './device-groups-pipeline-helper-dialog.component';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {provideRouter} from "@angular/router";
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('DeviceGroupsPipelineHelperDialogComponent', () => {
    let component: DeviceGroupsPipelineHelperDialogComponent;
    let fixture: ComponentFixture<DeviceGroupsPipelineHelperDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
            declarations: [DeviceGroupsPipelineHelperDialogComponent],
            imports: [MatDialogModule, MatTableModule, MatTooltipModule, MatCheckboxModule],
            providers: [
                provideRouter([]),
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: [],
                },
                {
                    provide: MatDialogRef,
                    useValue: {
                        close: (_: any) => null,
                    },
                },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(DeviceGroupsPipelineHelperDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
