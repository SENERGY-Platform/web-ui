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
import { MatDialogModule } from '@angular/material/dialog';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { MatCardModule } from '@angular/material/card';
import { WidgetModule } from '../widget.module';
import {MatSnackBar} from '@angular/material/snack-bar';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { EMPTY, of } from 'rxjs';
import { SwitchService } from './shared/switch.service';

describe('SwitchComponent', () => {
    let component: SwitchComponent;
    let fixture: ComponentFixture<SwitchComponent>;

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                schemas: [NO_ERRORS_SCHEMA],
                imports: [MatDialogModule, WidgetModule, MatCardModule, SwitchComponent],
                providers: [MatDialogModule, MatSnackBar, { provide: DashboardService, useClass: DashboardService }, provideHttpClient(withXhr(), withInterceptorsFromDi())],
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

describe('SwitchComponent toggle', () => {
    let component: SwitchComponent;
    let switchService: jasmine.SpyObj<SwitchService>;
    let dashboardService: jasmine.SpyObj<DashboardService>;
    let snackOpen: jasmine.Spy;

    beforeEach(() => {
        switchService = jasmine.createSpyObj<SwitchService>('SwitchService', ['stopMultipleDeployments', 'startMultipleDeployments']);
        dashboardService = jasmine.createSpyObj<DashboardService>('DashboardService', ['updateWidgetProperty']);
        (dashboardService as any).initWidgetObservable = EMPTY;
        dashboardService.updateWidgetProperty.and.returnValue(of({ message: 'OK' }));
        TestBed.configureTestingModule({
            providers: [
                { provide: SwitchService, useValue: switchService },
                { provide: DashboardService, useValue: dashboardService },
                { provide: MatSnackBar, useValue: { open: (snackOpen = jasmine.createSpy('open')) } },
            ],
        });
        component = TestBed.createComponent(SwitchComponent).componentInstance;
        component.widget = {
            id: 'w1',
            properties: {
                active: true,
                instances: [{ id: 'i1', ended: false }],
                deployments: [{ id: 'dep1', trigger: 'on' }],
            },
        } as any;
    });

    it('does not start the new deployments, restores the toggle and names the action when the stop failed', () => {
        switchService.stopMultipleDeployments.and.returnValue(of(null));
        component.toggle();
        expect(switchService.startMultipleDeployments).not.toHaveBeenCalled();
        expect(dashboardService.updateWidgetProperty).not.toHaveBeenCalled();
        expect(component.widget.properties.active).toBeFalse();
        expect(snackOpen.calls.mostRecent().args[0]).toContain('Running deployments could not be stopped');
    });

    it('starts the new deployments after a successful stop', () => {
        switchService.stopMultipleDeployments.and.returnValue(of(['']));
        switchService.startMultipleDeployments.and.returnValue(of([{ id: 'i2' }] as any));
        component.toggle();
        expect(switchService.startMultipleDeployments).toHaveBeenCalled();
        expect(component.widget.properties.active).toBeTrue();
        expect(snackOpen).not.toHaveBeenCalled();
    });
});
