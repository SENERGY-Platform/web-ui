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

import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../../environments/environment';
import { Environment } from '../../shared/environments.model';
import { EnvironmentsService } from '../../shared/environments.service';
import { EnvironmentsLiveStateTabComponent } from './environments-live-state-tab.component';
import { EnvironmentsLiveState } from './environments-live-state.service';
import { EnvironmentsLiveStateTilesComponent } from './environments-live-state-tiles.component';

// zone.js 0.15 drains all timers after a fakeAsync test, and discardPeriodicTasks() leaves the poll's interval in that
// queue, so it would fire one more GET after the test; the polling specs keep the 0.14 end-of-test behaviour.
const pollingFakeAsync = (fn: () => void) => fakeAsync(fn, { flush: false });

/** A signal written by a poll answer schedules the zoneless change-detection timer; let it run before dropping the poll's interval. */
function endPolling(): void {
    tick();
    discardPeriodicTasks();
}

/** Provides the state service the way the editor does, so destroying the host destroys it. */
@Component({
    selector: 'senergy-live-state-tab-host',
    providers: [EnvironmentsLiveState],
    imports: [EnvironmentsLiveStateTabComponent],
    template: '<senergy-environments-live-state-tab [environment]="env()" />',
})
class HostComponent {
    readonly env = signal<Environment>({} as Environment);
}

const baseEnvironment: Environment = {
    id: 'e1',
    name: 'Plant A',
    type: 'industrial_site',
    seed: 1,
    zones: [
        {
            id: 'z1',
            name: 'Building',
            type: 'building',
            assets: [
                {
                    id: 'a1',
                    name: 'Meter 1',
                    kind: 'meter',
                    channels: [{ id: 'c1', name: 'Power', direction: 'sensor', source: { kind: 'script', script: { code: 'return 1;' } } }],
                },
            ],
        },
    ],
};

describe('EnvironmentsLiveStateTabComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let httpMock: HttpTestingController;
    let liveState: EnvironmentsLiveState;
    const stateUrl = environment.mosesUrl + '/environments/e1/state';

    // z1 also carries initial_states/time_constants and a1 initial_states, so the
    // live-state drafts have something to seed from and to touch.
    const envWithState: Environment = JSON.parse(JSON.stringify(baseEnvironment));
    envWithState.zones![0].initial_states = { occupied: true };
    envWithState.zones![0].time_constants = { occupied: 900 };
    envWithState.zones![0].assets![0].initial_states = { power: 0 };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NoopAnimationsModule, HostComponent],
            providers: [
                provideZonelessChangeDetection(),
                EnvironmentsService,
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
            ],
        });
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    /** Seeds the drafts from the definition, as the editor does after a load, and renders the tab. */
    function open(env: Environment): EnvironmentsLiveStateTabComponent {
        fixture = TestBed.createComponent(HostComponent);
        liveState = fixture.debugElement.injector.get(EnvironmentsLiveState);
        fixture.componentInstance.env.set(env);
        liveState.reset(env);
        fixture.detectChanges();
        return tab();
    }

    function tab(): EnvironmentsLiveStateTabComponent {
        return fixture.debugElement.query(By.directive(EnvironmentsLiveStateTabComponent)).componentInstance;
    }

    function activateLiveStateTab(): void {
        liveState.startPolling();
    }

    function leaveLiveStateTab(): void {
        liveState.stopPolling();
    }

    describe('drafts and Apply', () => {
        it('seeds context/zone/asset drafts from initial_states but starts with nothing pending', () => {
            open(envWithState);

            expect(liveState.zoneStates().length).toBe(1);
            expect(liveState.zoneStates()[0].draft()).toEqual({ occupied: true });
            expect(liveState.assetStates().length).toBe(1);
            expect(liveState.assetStates()[0].draft()).toEqual({ power: 0 });
            expect(liveState.pendingChange()).toBeUndefined(); // nothing touched yet -- Apply stays disabled
        });

        it('only includes a key in the pending change once it has actually been edited', () => {
            const component = open(envWithState);

            const zoneEntry = liveState.zoneStates()[0];
            // untouched re-emit of the same values (e.g. a sibling row's edit) must not appear
            component.onZoneStateChange(zoneEntry, { occupied: true });
            expect(liveState.pendingChange()).toBeUndefined();

            component.onZoneStateChange(zoneEntry, { occupied: false });
            expect(liveState.pendingChange()).toEqual({ zones: { z1: { occupied: false } } });
        });

        it('combines touched context, zone and asset keys into one StateChange sent via setStateChecked', () => {
            const component = open(envWithState);

            component.onContextChange({ outdoor_temp: 5 });
            component.onZoneStateChange(liveState.zoneStates()[0], { occupied: false });
            component.onAssetStateChange(liveState.assetStates()[0], { power: 42 });

            component.applyLiveState();

            const req = httpMock.expectOne(stateUrl);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toEqual({
                context: { outdoor_temp: 5 },
                zones: { z1: { occupied: false } },
                assets: { a1: { power: 42 } },
            });
            req.flush(null, { status: 204, statusText: 'No Content' });
        });

        it('clears the touched keys after a successful apply, disabling Apply again', () => {
            const component = open(envWithState);
            component.onZoneStateChange(liveState.zoneStates()[0], { occupied: false });

            component.applyLiveState();
            httpMock.expectOne(stateUrl).flush(null, { status: 204, statusText: 'No Content' });

            expect(liveState.pendingChange()).toBeUndefined();
        });

        it('shows the API message on a 404 (environment not running) instead of silently failing', () => {
            const component = open(envWithState);
            component.onZoneStateChange(liveState.zoneStates()[0], { occupied: false });
            const snackBarSpy = spyOn(TestBed.inject(MatSnackBar), 'open');

            component.applyLiveState();
            httpMock.expectOne(stateUrl).flush('environment e1 is not running', { status: 404, statusText: 'Not Found' });

            expect(snackBarSpy).toHaveBeenCalledWith('environment e1 is not running', 'close', { panelClass: 'snack-bar-error' });
        });

        it('shows the server-given reason on a 400 ValidationError (e.g. a timeline-governed key) instead of a generic error', () => {
            const component = open(envWithState);
            component.onZoneStateChange(liveState.zoneStates()[0], { occupied: false });
            const snackBarSpy = spyOn(TestBed.inject(MatSnackBar), 'open');

            component.applyLiveState();
            httpMock.expectOne(stateUrl).flush(
                { problems: [{ path: 'context.energy_price', message: 'driven by the timeline, cannot be changed here' }] },
                { status: 400, statusText: 'Bad Request' },
            );

            expect(snackBarSpy).toHaveBeenCalledWith(
                'context.energy_price: driven by the timeline, cannot be changed here',
                'close',
                { panelClass: 'snack-bar-error' },
            );
        });

        it('does not call the API when nothing is touched', () => {
            const component = open(envWithState);

            expect(liveState.pendingChange()).toBeUndefined();
            component.applyLiveState();

            httpMock.expectNone(stateUrl);
        });
    });

    describe('real-time polling', () => {
        const envWithPollState: Environment = JSON.parse(JSON.stringify(baseEnvironment));
        envWithPollState.zones![0].initial_states = { occupied: true };
        envWithPollState.zones![0].assets![0].initial_states = { power: 0 };

        it('does not poll while the tab has not been activated', () => {
            open(envWithPollState);
            httpMock.expectNone(stateUrl);
        });

        it('polls GET .../state immediately on activating the Live state tab, and again every 10s while it stays active', pollingFakeAsync(() => {
            open(envWithPollState);
            activateLiveStateTab();
            tick(); // flushes timer(0, ...)'s immediate (0ms due) first emission

            const req1 = httpMock.expectOne(stateUrl);
            expect(req1.request.method).toBe('GET');
            req1.flush({ running: true, as_of: '2026-08-27T10:00:00Z', context: {}, zones: {}, assets: {} });

            httpMock.expectNone(stateUrl); // nothing again before 10s pass
            tick(10000);
            const req2 = httpMock.expectOne(stateUrl);
            req2.flush({ running: true, as_of: '2026-08-27T10:00:10Z', context: {}, zones: {}, assets: {} });

            endPolling();
        }));

        it('stops polling once the tab is left, and does not resume on its own', pollingFakeAsync(() => {
            open(envWithPollState);
            activateLiveStateTab();
            tick();
            httpMock.expectOne(stateUrl).flush({ running: true, as_of: '2026-08-27T10:00:00Z', context: {}, zones: {}, assets: {} });

            leaveLiveStateTab();
            tick(20000);

            httpMock.expectNone(stateUrl);
            endPolling();
        }));

        it('stops polling on destroy', pollingFakeAsync(() => {
            open(envWithPollState);
            activateLiveStateTab();
            tick();
            httpMock.expectOne(stateUrl).flush({ running: true, as_of: '2026-08-27T10:00:00Z', context: {}, zones: {}, assets: {} });

            fixture.destroy();
            tick(20000);

            httpMock.expectNone(stateUrl);
        }));

        it('shows the real runtime values when running, updating running/asOf', pollingFakeAsync(() => {
            open(envWithPollState);
            activateLiveStateTab();
            tick(); // flushes timer(0, ...)'s immediate (0ms due) first emission

            httpMock.expectOne(stateUrl).flush({
                running: true,
                as_of: '2026-08-27T10:00:00Z',
                context: {},
                zones: { z1: { occupied: false } },
                assets: { a1: { power: 42 } },
            });

            expect(liveState.running()).toBe(true);
            expect(liveState.asOf()).toEqual(new Date('2026-08-27T10:00:00Z'));
            expect(liveState.zoneStates()[0].draft()).toEqual({ occupied: false });
            expect(liveState.assetStates()[0].draft()).toEqual({ power: 42 });

            endPolling();
        }));

        it('falls back to the reference values and flags not-running when the simulation is not running', pollingFakeAsync(() => {
            open(envWithPollState);
            activateLiveStateTab();
            tick(); // flushes timer(0, ...)'s immediate (0ms due) first emission

            httpMock.expectOne(stateUrl).flush({ running: false, as_of: '2026-08-27T10:00:00Z' });

            expect(liveState.running()).toBe(false);
            // untouched by the (running:false) poll -- still the definition's initial_states
            expect(liveState.zoneStates()[0].draft()).toEqual({ occupied: true });
            expect(liveState.assetStates()[0].draft()).toEqual({ power: 0 });

            endPolling();
        }));

        it('does not overwrite a touched (edited but not yet applied) key with a poll update, but does refresh untouched ones', pollingFakeAsync(() => {
            const component = open(envWithPollState);
            component.onZoneStateChange(liveState.zoneStates()[0], { occupied: false }); // user edit, not yet applied
            activateLiveStateTab();
            tick(); // flushes timer(0, ...)'s immediate (0ms due) first emission

            httpMock.expectOne(stateUrl).flush({
                running: true,
                as_of: '2026-08-27T10:00:00Z',
                context: {},
                zones: { z1: { occupied: true } }, // server disagrees with the untouched-from-server-POV edit
                assets: { a1: { power: 7 } }, // untouched -- must be applied
            });

            expect(liveState.zoneStates()[0].draft()).toEqual({ occupied: false }); // kept: still touched, not applied
            expect(liveState.assetStates()[0].draft()).toEqual({ power: 7 }); // refreshed: was untouched

            endPolling();
        }));

        it('leaves the drafts alone on a failed poll (null from the service) instead of clearing them', pollingFakeAsync(() => {
            open(envWithPollState);
            activateLiveStateTab();
            tick();
            httpMock.expectOne(stateUrl).flush('environment e1 is not running', { status: 404, statusText: 'Not Found' });

            expect(liveState.running()).toBeUndefined();
            expect(liveState.zoneStates()[0].draft()).toEqual({ occupied: true });

            endPolling();
        }));
    });

    describe('rendering under OnPush without zone.js change detection', () => {
        const text = () => (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ');
        const applyButton = () => fixture.debugElement.query(By.css('.live-state-actions button')).nativeElement as HTMLButtonElement;

        it('keeps the host out of the layout and renders the panel as its only child, in the old order', () => {
            open(envWithState);
            const host = fixture.debugElement.query(By.directive(EnvironmentsLiveStateTabComponent)).nativeElement as HTMLElement;

            expect(getComputedStyle(host).display).toBe('contents');
            expect(Array.from(host.children).map((c) => c.tagName.toLowerCase() + '.' + c.className)).toEqual(['div.live-state-panel']);
            const panel = host.children[0];
            expect(Array.from(panel.children).map((c) => c.tagName.toLowerCase() + '.' + c.className)).toEqual([
                'p.live-state-intro',
                'div.live-state-status',
                'div.live-state-section',
                'div.live-state-section',
                'div.live-state-section',
                'div.live-state-actions',
            ]);
            expect(Array.from(panel.querySelectorAll('h3')).map((h) => h.textContent!.trim())).toEqual(['Context', 'Zone: Building', 'Asset: Meter 1']);
        });

        it('enables Apply once a value is edited and disables it while the request is in flight', () => {
            const component = open(envWithState);
            expect(applyButton().disabled).toBe(true);

            component.onZoneStateChange(liveState.zoneStates()[0], { occupied: false });
            fixture.detectChanges();
            expect(applyButton().disabled).toBe(false);

            component.applyLiveState();
            fixture.detectChanges();
            expect(applyButton().disabled).toBe(true);
            expect(fixture.debugElement.query(By.css('.live-state-status-dot')).nativeElement.classList).toContain('applying');

            httpMock.expectOne(stateUrl).flush(null, { status: 204, statusText: 'No Content' });
            fixture.detectChanges();
            expect(fixture.debugElement.query(By.css('.live-state-status-dot')).nativeElement.classList).not.toContain('applying');
            expect(applyButton().disabled).toBe(true);
        });

        it('switches the status line and shows the not-running hint from a poll without any markForCheck', pollingFakeAsync(() => {
            open(envWithState);
            expect(text()).toContain('Reference values as of');
            expect(text()).not.toContain('The simulation is not running');

            activateLiveStateTab();
            tick();
            httpMock.expectOne(stateUrl).flush({ running: false, as_of: '2026-08-27T10:00:00Z' });
            fixture.detectChanges();
            expect(text()).toContain('The simulation is not running');

            tick(10000);
            httpMock.expectOne(stateUrl).flush({ running: true, as_of: '2026-08-27T10:00:10Z', context: {}, zones: { z1: { occupied: false } }, assets: {} });
            fixture.detectChanges();
            expect(text()).toContain('Live · as of');
            expect(text()).not.toContain('The simulation is not running');
            const zoneTiles = fixture.debugElement.queryAll(By.directive(EnvironmentsLiveStateTilesComponent))[1];
            expect(zoneTiles.componentInstance.record).toEqual({ occupied: false });

            endPolling();
        }));

        it('shows the not-saved hint for an environment without an id and the nothing-to-show hint for an empty saved one', () => {
            open({ ...baseEnvironment, id: undefined, zones: [] });
            expect(text()).toContain('This environment is not saved yet');
            expect(fixture.debugElement.query(By.css('.live-state-actions'))).toBeNull();
            fixture.destroy();

            open({ ...baseEnvironment, zones: [] });
            expect(text()).toContain('Nothing to show yet: this environment has no context values, zones or assets.');
            expect(text()).not.toContain('not saved yet');
        });

        it('drops unsent edits on Reload current values', () => {
            const component = open(envWithState);
            component.onZoneStateChange(liveState.zoneStates()[0], { occupied: false });

            fixture.detectChanges();

            expect(liveState.pendingChange()).toEqual({ zones: { z1: { occupied: false } } });
            expect(applyButton().disabled).toBe(false);

            const reload = fixture.debugElement.query(By.css('.live-state-status button')).nativeElement as HTMLButtonElement;
            reload.click();
            fixture.detectChanges();

            expect(liveState.pendingChange()).toBeUndefined();
            expect(liveState.zoneStates()[0].draft()).toEqual({ occupied: true });
            expect(applyButton().disabled).toBe(true);
        });

        it('shows a replaced context baseline in the tile without any other change', () => {
            open({ ...envWithState, context: { outdoor_temp: 5 } });
            const tile = () => fixture.debugElement.query(By.css('.live-state-section .live-tile')).nativeElement as HTMLElement;
            expect(tile().textContent).not.toContain('was');

            liveState.contextBaseline.set({ outdoor_temp: 10 });
            fixture.detectChanges();

            expect(tile().classList).toContain('changed');
            expect(tile().textContent).toContain('was 10');
        });

        it('locks a timeline-governed context key out of the pending change and into the tile', () => {
            const component = open({ ...envWithState, context: { energy_price: 0.3, other: 1 } });
            liveState.lockedContextKeys.set(new Set(['energy_price']));
            fixture.detectChanges();

            component.onContextChange({ energy_price: 0.99, other: 2 });

            expect(liveState.pendingChange()).toEqual({ context: { other: 2 } });
            const contextTiles = fixture.debugElement.queryAll(By.directive(EnvironmentsLiveStateTilesComponent))[0];
            expect(contextTiles.componentInstance.lockedKeys.has('energy_price')).toBe(true);
        });
    });
});
