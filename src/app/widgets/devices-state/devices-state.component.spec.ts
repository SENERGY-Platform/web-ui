/*
 * Copyright 2026 InfAI (CC SES)
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
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { DevicesStateComponent } from './devices-state.component';
import { DevicesStateService } from './shared/devices-state.service';
import { DashboardService } from '../../modules/dashboard/shared/dashboard.service';
import { WidgetModel } from '../../modules/dashboard/shared/dashboard-widget.model';
import { DeviceInstancesRouterStateTabEnum } from '../../modules/devices/device-instances/shared/device-instances.model';

describe('DevicesStateComponent', () => {
    let fixture: ComponentFixture<DevicesStateComponent>;
    let navigate: jasmine.Spy;

    const rows = () => Array.from(fixture.nativeElement.querySelectorAll('.state')) as HTMLElement[];
    const textOf = (row: HTMLElement, selector: string) => (row.querySelector(selector) as HTMLElement)?.textContent?.trim();

    beforeEach(async () => {
        navigate = jasmine.createSpy('navigate');
        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [MatDialogModule, MatSnackBarModule, DevicesStateComponent],
            providers: [
                { provide: DevicesStateService, useValue: { getDevicesStatus: () => of({ count: 20, connected: 15, disconnected: 5, unknown: 0 }) } },
                { provide: DashboardService, useValue: { initWidgetObservable: of('reloadAll') } },
                { provide: Router, useValue: { navigate } },
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(DevicesStateComponent);
        fixture.componentInstance.widget = { properties: {} } as WidgetModel;
        fixture.detectChanges();
    });

    it('names each state once and counts it against the total', () => {
        expect(rows().map((row) => textOf(row, '.label'))).toEqual(['Online', 'Offline', 'Unknown']);
        expect(rows().map((row) => textOf(row, '.count'))).toEqual(['15/20', '5/20', '0/20']);
    });

    // Every row opens the device list on its connection state; the rows were clickable divs before.
    it('opens the device list on the state of the clicked row', () => {
        rows()[1].click();
        expect(navigate).toHaveBeenCalledWith(['devices/deviceinstances'], { queryParams: { 'connection-state': DeviceInstancesRouterStateTabEnum.OFFLINE } });
    });
});
