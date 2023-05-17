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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { RangeSliderComponent } from './range-slider.component';
import { MatDialogModule } from '@angular/material/dialog';
import { HttpClientModule } from '@angular/common/http';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { MatCardModule } from '@angular/material/card';
import { WidgetModule } from '../widget.module';
import {MatSnackBar} from '@angular/material/snack-bar';

describe('RangeSliderComponent', () => {
    let component: RangeSliderComponent;
    let fixture: ComponentFixture<RangeSliderComponent>;

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                imports: [MatDialogModule, HttpClientModule, WidgetModule, MatCardModule],
                declarations: [RangeSliderComponent],
                providers: [MatDialogModule, MatSnackBar, { provide: DashboardService, useClass: DashboardService }],
            }).compileComponents();
        }),
    );

    beforeEach(() => {
        fixture = TestBed.createComponent(RangeSliderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
