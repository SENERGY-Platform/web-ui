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

import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { asapScheduler, BehaviorSubject, of, scheduled } from 'rxjs';
import { ProcessMonitorComponent } from './monitor.component';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { MonitorService } from './shared/monitor.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { NetworksService } from '../../devices/networks/shared/networks.service';
import { MonitorFogFactory } from './shared/monitor-fog.service';
import { UtilService } from '../../../core/services/util.service';
import { PreferencesService } from '../../../core/services/preferences.service';

// Animations stay enabled on purpose: with them disabled Material simulates the tab transition
// and fires animationDone, which hides the missing first load.
describe('ProcessMonitorComponent first load with animations enabled', () => {
    it('reveals the instance tables without waiting for a tab animation', async () => {
        const monitorService = jasmine.createSpyObj<MonitorService>('MonitorService', ['getFilteredHistoryInstances']);
        // asynchronous like the HTTP call it stands for
        monitorService.getFilteredHistoryInstances.and.returnValue(scheduled([{ total: 1, data: [] } as any], asapScheduler));

        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            declarations: [ProcessMonitorComponent],
            imports: [MatTabsModule, MatTableModule, MatSortModule, MatPaginatorModule, MatMenuModule],
            providers: [
                provideRouter([]),
                { provide: SearchbarService, useValue: { currentSearchText: new BehaviorSubject('') } },
                { provide: MonitorService, useValue: monitorService },
                { provide: DialogsService, useValue: {} },
                { provide: NetworksService, useValue: { listSyncNetworks: () => of([]) } },
                { provide: MonitorFogFactory, useValue: {} },
                { provide: UtilService, useValue: { dateIsToday: () => false } },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: false } },
            ],
        }).compileComponents();

        const fixture = TestBed.createComponent(ProcessMonitorComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(fixture.componentInstance.animation).toBeFalse();
    });
});
