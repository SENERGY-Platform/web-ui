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
import { PreferencesService } from '../../../core/services/preferences.service';
import { MonitorProcessModel } from './shared/monitor-process.model';
import { HubModel } from '../../devices/networks/shared/networks.model';

describe('ProcessMonitorComponent list', () => {
    let fixture: ComponentFixture<ProcessMonitorComponent>;
    let monitorService: jasmine.SpyObj<MonitorService>;

    const run = { id: 'p1', processDefinitionName: 'Washer', startTime: '2026-01-02T10:00:00Z', state: 'ACTIVE' } as MonitorProcessModel;

    async function init() {
        monitorService = jasmine.createSpyObj<MonitorService>('MonitorService', ['getInstancesOfNetworks', 'openDetailsDialog']);
        // asynchronous like the HTTP call it stands for
        monitorService.getInstancesOfNetworks.and.callFake(() => scheduled([{ total: 1, data: [run] } as any], asapScheduler));
        await TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, ProcessMonitorComponent],
            providers: [
                provideRouter([]),
                { provide: SearchbarService, useValue: { currentSearchText: new BehaviorSubject(''), changeMessage: () => undefined } },
                { provide: MonitorService, useValue: monitorService },
                { provide: DialogsService, useValue: {} },
                { provide: NetworksService, useValue: { listSyncNetworks: () => of([]) } },
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
        monitorService.getInstancesOfNetworks.calls.reset();

        (fixture.nativeElement.querySelector('senergy-searchbar button') as HTMLButtonElement).click();
        await fixture.whenStable();

        expect(monitorService.getInstancesOfNetworks).toHaveBeenCalledTimes(1);
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

        expect(component.displayedColumnsRunning).toEqual(['select', 'definitionName', 'status', 'network', 'startTime', 'actions']);
        expect(component.displayedColumnsFinished).toEqual(['select', 'definitionName', 'status', 'network', 'startTime', 'endTime', 'duration', 'actions']);
    });

    it('shows where each instance runs: the platform, a known hub by name, an unknown one by its id', async () => {
        await init();
        const component = fixture.componentInstance;
        component.hubList = [{ id: 'hub-1', name: 'Hub' } as HubModel];
        monitorService.getInstancesOfNetworks.and.callFake(() =>
            scheduled([{ total: 3, data: [run, { ...run, id: 'p2', network_id: 'hub-1' }, { ...run, id: 'p3', network_id: 'hub-x' }] } as any], asapScheduler),
        );
        component.reload();
        await fixture.whenStable();
        fixture.detectChanges();

        const cells = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('tr[mat-row] .network-cell')).map((c) => c.textContent?.replace(/\s+/g, ' ').trim());
        expect(cells).toEqual(['cloud Platform', 'router Hub', 'router hub-x']);
    });

    it('lists the instances of all networks until one is selected', async () => {
        await init();
        const component = fixture.componentInstance;
        const networks = () => monitorService.getInstancesOfNetworks.calls.allArgs().map((args) => args[8]);
        expect(networks()).toEqual([undefined, undefined]);
        monitorService.getInstancesOfNetworks.calls.reset();

        component.selectNetworkWithReload('cloud');
        await fixture.whenStable();
        component.selectNetworkWithReload('hub-1');
        await fixture.whenStable();
        component.selectNetworkWithReload(null);
        await fixture.whenStable();

        expect(networks()).toEqual(['cloud', 'hub-1', undefined]);
        expect(component.filtered).toBeFalse();
        component.selectNetwork('hub-1');
        expect(component.filtered).toBeTrue();
    });

    it('offers the debugger of an instance in its row menu, after the details', async () => {
        await init();

        (fixture.nativeElement.querySelector('tr[mat-row] button[aria-label="Actions"]') as HTMLButtonElement).click();
        fixture.detectChanges();
        await fixture.whenStable();

        const items = Array.from<HTMLElement>(document.querySelectorAll('.mat-mdc-menu-panel [mat-menu-item]'));
        expect(items.map((i) => (i.textContent || '').replace(/\s+/g, ' ').trim())).toEqual(['info Details', 'bug_report Debug', 'stop Stop']);
        expect(items[1].getAttribute('href')).toBe('/processes/monitor/debug/p1');
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
        monitorService.getInstancesOfNetworks.and.callFake(() => scheduled([{ total: 1, data: [{ ...run, is_placeholder: true }] } as any], asapScheduler));
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
