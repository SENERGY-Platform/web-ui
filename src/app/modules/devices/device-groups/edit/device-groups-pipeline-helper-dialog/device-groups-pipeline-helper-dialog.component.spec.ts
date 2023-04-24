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
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogModule as MatDialogModule, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { RouterTestingModule } from '@angular/router/testing';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';

describe('DeviceGroupsPipelineHelperDialogComponent', () => {
    let component: DeviceGroupsPipelineHelperDialogComponent;
    let fixture: ComponentFixture<DeviceGroupsPipelineHelperDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DeviceGroupsPipelineHelperDialogComponent],
            imports: [MatDialogModule, RouterTestingModule, MatTableModule, MatTooltipModule, MatCheckboxModule],
            providers: [
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
