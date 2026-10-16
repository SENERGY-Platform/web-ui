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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { asapScheduler, BehaviorSubject, of, scheduled } from 'rxjs';
import { ProcessMonitorComponent } from './monitor.component';
import { SearchbarService } from '../../../core/components/searchbar/shared/searchbar.service';
import { MonitorService } from './shared/monitor.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import { NetworksService } from '../../devices/networks/shared/networks.service';
import { MonitorFogFactory } from './shared/monitor-fog.service';
import { PreferencesService } from '../../../core/services/preferences.service';
import { MonitorProcessModel } from './shared/monitor-process.model';

describe('ProcessMonitorComponent list', () => {
    let fixture: ComponentFixture<ProcessMonitorComponent>;
    let monitorService: jasmine.SpyObj<MonitorService>;

    const run = { id: 'p1', processDefinitionName: 'Washer', startTime: '2026-01-02T10:00:00Z', state: 'ACTIVE' } as MonitorProcessModel;

    async function init() {
        monitorService = jasmine.createSpyObj<MonitorService>('MonitorService', ['getFilteredHistoryInstances', 'openDetailsDialog']);
        // asynchronous like the HTTP call it stands for
        monitorService.getFilteredHistoryInstances.and.callFake(() => scheduled([{ total: 1, data: [run] } as any], asapScheduler));
        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, ProcessMonitorComponent],
            providers: [
                provideRouter([]),
                { provide: SearchbarService, useValue: { currentSearchText: new BehaviorSubject(''), changeMessage: () => undefined } },
                { provide: MonitorService, useValue: monitorService },
                { provide: DialogsService, useValue: {} },
                { provide: NetworksService, useValue: { listSyncNetworks: () => of([]) } },
                { provide: MonitorFogFactory, useValue: {} },
                { provide: PreferencesService, useValue: { pageSize: 20 } },
                { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(ProcessMonitorComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    it('reloads exactly once when the refresh button is clicked', async () => {
        await init();
        monitorService.getFilteredHistoryInstances.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        await fixture.whenStable();

        expect(monitorService.getFilteredHistoryInstances).toHaveBeenCalledTimes(1);
    });

    it('opens the details of a running process on a row click', async () => {
        await init();

        (fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement).click();

        expect(monitorService.openDetailsDialog).toHaveBeenCalledWith('p1');
    });

    it('shows the process name with its id muted and a running status chip', async () => {
        await init();

        const row = fixture.nativeElement.querySelector('tr.clickable-row') as HTMLElement;
        expect(row.querySelector('.name-cell')?.textContent).toContain('Washer');
        expect(row.querySelector('.muted')?.textContent).toContain('p1');
        expect(row.querySelector('.status-chip.online')?.textContent).toContain('Running');
    });

    it('names the state of a finished process', async () => {
        await init();
        const component = fixture.componentInstance;

        expect(component.stateLabel('COMPLETED')).toBe('Completed');
        expect(component.stateLabel('EXTERNALLY_TERMINATED')).toBe('Stopped');
        expect(component.stateLabel('SOMETHING_ELSE')).toBe('SOMETHING_ELSE');
    });

    it('uses one action column instead of one column per action', async () => {
        await init();
        const component = fixture.componentInstance;

        expect(component.displayedColumnsRunning).toEqual(['select', 'definitionName', 'status', 'startTime', 'actions']);
        expect(component.displayedColumnsFinished).toEqual(['select', 'definitionName', 'status', 'startTime', 'endTime', 'duration', 'actions']);
    });

    it('does not open details for a placeholder row that waits for the hub sync', async () => {
        await init();
        const component = fixture.componentInstance;

        expect(component.isPlaceholder(run)).toBeFalse();
        expect(component.isPlaceholder({ ...run, is_placeholder: true } as MonitorProcessModel)).toBeTrue();
        expect(component.isPlaceholder({ ...run, marked_for_delete: true } as MonitorProcessModel)).toBeTrue();
    });

    it('leaves a placeholder row unclickable', async () => {
        await init();
        monitorService.getFilteredHistoryInstances.and.callFake(() => scheduled([{ total: 1, data: [{ ...run, is_placeholder: true }] } as any], asapScheduler));
        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        await fixture.whenStable();
        fixture.detectChanges();
        monitorService.openDetailsDialog.calls.reset();

        const row = fixture.nativeElement.querySelector('tr[mat-row]') as HTMLElement;
        row.click();

        expect(row.classList).not.toContain('clickable-row');
        expect(monitorService.openDetailsDialog).not.toHaveBeenCalled();
    });
});
