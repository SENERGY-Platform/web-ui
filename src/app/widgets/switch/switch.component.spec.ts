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

import { SwitchComponent } from './switch.component';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { HttpClientModule } from '@angular/common/http';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { WidgetModule } from '../widget.module';
import {MatLegacySnackBar as MatSnackBar} from '@angular/material/legacy-snack-bar';

describe('SwitchComponent', () => {
    let component: SwitchComponent;
    let fixture: ComponentFixture<SwitchComponent>;

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                imports: [MatDialogModule, HttpClientModule, WidgetModule, MatCardModule],
                declarations: [SwitchComponent],
                providers: [MatDialogModule, MatSnackBar, { provide: DashboardService, useClass: DashboardService }],
            }).compileComponents();
        }),
    );

    beforeEach(() => {
        fixture = TestBed.createComponent(SwitchComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
