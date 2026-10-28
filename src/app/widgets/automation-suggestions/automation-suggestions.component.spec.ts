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

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { AutomationSuggestionsComponent } from './automation-suggestions.component';
import { ResolvedSuggestion, resolveSuggestion } from './shared/automation-suggestion.resolver';
import {
    boolCharacteristicId,
    catalogFixture,
    content,
    controlServiceId,
    lampDeviceId,
    measureServiceId,
    plugType,
    service as typeService,
    suggestionFixture,
    variable
} from './shared/automation-suggestion.fixtures';
import { CONFIRM_POLL_MS, CONFIRM_TIMEOUT_MS, SET_DEVICE_ON_FUNCTION_ID } from './shared/automation-suggestion.model';
import {
    ActiveAutomation,
    AutomationSuggestionsService,
    AutomationSuggestionsView,
    ViewItem
} from './shared/automation-suggestions.service';

describe('AutomationSuggestionsComponent', () => {
    let component: AutomationSuggestionsComponent;
    let fixture: ComponentFixture<AutomationSuggestionsComponent>;
    let service: jasmine.SpyObj<AutomationSuggestionsService>;
    let init: Subject<string>;

    const configuredWidget = { id: 'w1', name: 'Suggestions', type: 'automation_suggestions', properties: { automationSuggestions: { instanceId: 'inst-1' } } } as unknown as WidgetModel;

    const openItem = (resolved: ResolvedSuggestion): ViewItem => ({ kind: 'open', resolved });
    const acceptedItem = (automation: ActiveAutomation): ViewItem => ({ kind: 'accepted', automation });
    const viewOf = (items: ViewItem[], dismissed: ResolvedSuggestion[] = []): AutomationSuggestionsView => ({ exportMissing: false, items, dismissed });

    const resolvedView = (): AutomationSuggestionsView => viewOf([openItem(resolveSuggestion(suggestionFixture(), catalogFixture())!)]);

    beforeEach(async () => {
        init = new Subject<string>();
        service = jasmine.createSpyObj<AutomationSuggestionsService>('AutomationSuggestionsService', [
            'loadView', 'accept', 'dismiss', 'restore', 'removeAutomation', 'openEditDialog', 'askAutoOffSeconds', 'editAccepted', 'confirmRemove',
        ]);
        await TestBed.configureTestingModule({
            declarations: [AutomationSuggestionsComponent],
            schemas: [NO_ERRORS_SCHEMA],
            providers: [
                { provide: AutomationSuggestionsService, useValue: service },
                { provide: DashboardService, useValue: { initWidgetObservable: init.asObservable() } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AutomationSuggestionsComponent);
        component = fixture.componentInstance;
    });

    it('asks to configure the widget and does not load without an instance', () => {
        component.widget = { id: 'w1', name: 'x', type: 'automation_suggestions', properties: {} } as unknown as WidgetModel;
        fixture.detectChanges();
        init.next('reloadAll');
        fixture.detectChanges();

        expect(service.loadView).not.toHaveBeenCalled();
        expect(fixture.nativeElement.textContent).toContain('Please configure widget!');
    });

    it('loads the view of the configured instance and shows the suggestion with its window and share of triggers', () => {
        service.loadView.and.returnValue(of(resolvedView()));
        component.widget = configuredWidget;
        fixture.detectChanges();
        init.next('w1');
        fixture.detectChanges();

        expect(service.loadView).toHaveBeenCalledWith('inst-1');
        expect(fixture.nativeElement.textContent).toContain('Plug Stehlampe off → Licht EG on');
        expect(fixture.nativeElement.textContent).toContain('19:00–02:00 · every day · follows in 31 % of 100 triggers');
    });

    it('shows a 403 of the automation engine as a visible error', () => {
        service.loadView.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, statusText: 'Forbidden' })));
        component.widget = configuredWidget;
        fixture.detectChanges();
        init.next('reloadAll');
        fixture.detectChanges();

        expect(component.loadError).toContain('403');
        expect(fixture.nativeElement.textContent).toContain('403');
    });

    it('accepts a suggestion and reloads the view', () => {
        const suggestion = resolveSuggestion(suggestionFixture(), catalogFixture())!;
        service.loadView.and.returnValue(of(viewOf([openItem(suggestion)])));
        service.accept.and.returnValue(of({ status: 201 }));
        component.widget = configuredWidget;
        fixture.detectChanges();
        init.next('w1');

        component.accept(suggestion);

        expect(service.accept).toHaveBeenCalledWith('inst-1', jasmine.objectContaining({ label: 'Plug Stehlampe off → Licht EG on' }), null);
        expect(service.loadView).toHaveBeenCalledTimes(2);
    });

    describe('switch-off', () => {
        const onTarget = { device_id: lampDeviceId, service_id: measureServiceId, path: 'value.state', function_id: null, value: true };
        const suggestionOf = (autoOffS: number | null, catalog = catalogFixture()): ResolvedSuggestion =>
            resolveSuggestion(suggestionFixture({ auto_off_s: autoOffS, targets: [onTarget] }), catalog)!;

        const showView = (view: AutomationSuggestionsView): void => {
            service.loadView.and.returnValue(of(view));
            component.widget = configuredWidget;
            fixture.detectChanges();
            init.next('w1');
            fixture.detectChanges();
        };
        const buttonWith = (text: string): HTMLButtonElement | undefined =>
            (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes(text));

        it('offers the switch-off with the delay of the suggestion, and sends the delay chosen in the dialog', () => {
            const resolved = suggestionOf(140);
            showView(viewOf([openItem(resolved)]));
            expect(fixture.nativeElement.textContent).toContain('Off after 140 s');
            service.askAutoOffSeconds.and.returnValue(of('180'));
            service.accept.and.returnValue(of({ status: 201 }));

            component.changeDuration(resolved);
            expect(service.askAutoOffSeconds).toHaveBeenCalledWith('140');
            component.accept(resolved);

            expect(service.accept).toHaveBeenCalledWith('inst-1', resolved, 180);
        });

        it('keeps the delay when the dialog is cancelled', () => {
            const resolved = suggestionOf(140);
            showView(viewOf([openItem(resolved)]));
            service.askAutoOffSeconds.and.returnValue(of(undefined));
            service.accept.and.returnValue(of({ status: 201 }));

            component.changeDuration(resolved);
            component.accept(resolved);

            expect(service.accept).toHaveBeenCalledWith('inst-1', resolved, 140);
        });

        it('sends no delay when the user turns the switch-off off', () => {
            const resolved = suggestionOf(140);
            showView(viewOf([openItem(resolved)]));
            service.accept.and.returnValue(of({ status: 201 }));

            component.setAutoOffEnabled(resolved, false);
            component.accept(resolved);
            fixture.detectChanges();

            expect(fixture.nativeElement.textContent).toContain('No auto-off');
            expect(service.accept).toHaveBeenCalledWith('inst-1', resolved, null);
        });

        it('shows no switch-off and offers none for a target whose device type has no Set Device Off', () => {
            const catalog = catalogFixture();
            catalog.deviceTypes.set(lampDeviceId, { ...plugType(), services: [typeService(controlServiceId, [
                content(variable({ name: 'on', function_id: SET_DEVICE_ON_FUNCTION_ID, characteristic_id: boolCharacteristicId })),
            ], [])] });
            showView(viewOf([openItem(suggestionOf(140, catalog))]));

            expect(fixture.nativeElement.textContent).toContain('Licht EG on');
            expect(fixture.nativeElement.querySelector('mat-chip-option')).toBeNull();
            expect(fixture.nativeElement.textContent).not.toContain('Off after');
        });

        it('refuses to accept a delay that is not a whole number from 5 to 3600', () => {
            const resolved = suggestionOf(140);
            showView(viewOf([openItem(resolved)]));
            service.accept.and.returnValue(of({ status: 201 }));

            for (const text of ['', '4', '3601', '12.5', '-5']) {
                component.setAutoOffSeconds(resolved, text);
                expect(component.autoOffInvalid(resolved)).toBeTrue();
                component.accept(resolved);
            }
            expect(service.accept).not.toHaveBeenCalled();
        });

        it('accepts the bounds 5 and 3600 seconds', () => {
            const resolved = suggestionOf(140);
            showView(viewOf([openItem(resolved)]));
            service.accept.and.returnValue(of({ status: 201 }));

            component.setAutoOffSeconds(resolved, '5');
            expect(component.autoOffInvalid(resolved)).toBeFalse();
            component.accept(resolved);
            // the first acceptance keeps the suggestion busy until the module shows it; this test checks only the delay sent
            component.busy.clear();
            component.setAutoOffSeconds(resolved, '3600');
            component.accept(resolved);

            expect(service.accept.calls.allArgs().map((args) => args[2])).toEqual([5, 3600]);
        });

        it('disables Accept and names the range while the typed delay is invalid', () => {
            const resolved = suggestionOf(140);
            showView(viewOf([openItem(resolved)]));
            component.setAutoOffSeconds(resolved, '4');
            fixture.detectChanges();

            expect(buttonWith('Accept')?.disabled).toBeTrue();
            expect(fixture.nativeElement.textContent).toContain('5 to 3600');
        });
    });

    describe('accepted automations and dismissed suggestions', () => {
        const onTarget = { device_id: lampDeviceId, service_id: measureServiceId, path: 'value.state', function_id: null, value: true };
        const resolvedWith = (autoOffS: number | null): ResolvedSuggestion =>
            resolveSuggestion(suggestionFixture({ auto_off_s: autoOffS, targets: [onTarget] }), catalogFixture())!;
        const activeOf = (autoOffS: number | null | undefined, resolved: ResolvedSuggestion | null = resolvedWith(140)): ActiveAutomation => ({
            moduleId: 'mod-1',
            suggestionId: 'sug-1',
            label: 'Plug Stehlampe off → Licht EG on',
            suggestion: resolved,
            autoOffS,
        });
        const showView = (view: AutomationSuggestionsView): void => {
            service.loadView.and.returnValue(of(view));
            component.widget = configuredWidget;
            fixture.detectChanges();
            init.next('w1');
            fixture.detectChanges();
        };
        const buttonWith = (text: string): HTMLButtonElement | undefined =>
            (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find((b) => b.textContent?.includes(text));

        it('shows the state and the window of an accepted automation with the switch-off delay', () => {
            showView(viewOf([acceptedItem(activeOf(180))]));
            expect(fixture.nativeElement.textContent).toContain('Active · off after 180 s');
            expect(fixture.nativeElement.textContent).toContain('19:00–02:00 · every day · follows in 31 % of 100 triggers');
        });

        it('shows only Active for a module without delay whose suggestion left the export, and no Edit', () => {
            showView(viewOf([acceptedItem(activeOf(undefined, null))]));
            expect(fixture.nativeElement.textContent).toContain('Active');
            expect(fixture.nativeElement.textContent).toContain('No longer suggested');
            expect(fixture.nativeElement.textContent).not.toContain('off after');
            expect(buttonWith('Edit')).toBeUndefined();
            expect(buttonWith('Remove')).toBeDefined();
        });

        it('offers Edit only while the suggestion resolves and offers a switch-off', () => {
            showView(viewOf([acceptedItem(activeOf(140))]));
            expect(buttonWith('Edit')).toBeDefined();

            showView(viewOf([acceptedItem(activeOf(null, resolvedWith(null)))]));
            expect(buttonWith('Edit')).toBeUndefined();
        });

        it('sends the delay chosen in the Edit dialog', () => {
            service.editAccepted.and.returnValue(of({ enabled: true, seconds: '240' }));
            service.accept.and.returnValue(of({ status: 201 }));
            const active = activeOf(180);
            showView(viewOf([acceptedItem(active)]));

            component.editAutomation(active);

            expect(service.editAccepted).toHaveBeenCalledWith({ enabled: true, seconds: '180' });
            expect(service.accept).toHaveBeenCalledWith('inst-1', active.suggestion!, 240);
        });

        it('sends no delay when the Edit dialog switches the automation off', () => {
            service.editAccepted.and.returnValue(of({ enabled: false, seconds: '180' }));
            service.accept.and.returnValue(of({ status: 201 }));
            const active = activeOf(180);
            showView(viewOf([acceptedItem(active)]));

            component.editAutomation(active);

            expect(service.accept).toHaveBeenCalledWith('inst-1', active.suggestion!, null);
        });

        it('opens Edit with the switch off for a module without delay, and with the suggestion delay for an unknown one', () => {
            service.editAccepted.and.returnValue(of(undefined));

            component.editAutomation(activeOf(null));
            expect(service.editAccepted.calls.mostRecent().args[0]).toEqual({ enabled: false, seconds: '140' });

            component.editAutomation(activeOf(undefined));
            expect(service.editAccepted.calls.mostRecent().args[0]).toEqual({ enabled: true, seconds: '140' });
            expect(service.accept).not.toHaveBeenCalled();
        });

        it('keeps an accepted suggestion busy until the module shows it', fakeAsync(() => {
            const open = resolvedWith(null);
            showView(viewOf([openItem(open)]));
            service.accept.and.returnValue(of({ status: 201 }));

            component.accept(open);
            expect(component.busy.has('sug-1')).toBeTrue();
            tick(CONFIRM_POLL_MS);
            expect(component.busy.has('sug-1')).toBeTrue();

            service.loadView.and.returnValue(of(viewOf([acceptedItem(activeOf(null, open))])));
            tick(CONFIRM_POLL_MS);
            expect(component.busy.has('sug-1')).toBeFalse();
            expect(component.view.items.map((item) => item.kind)).toEqual(['accepted']);
        }));

        it('stops waiting for an acceptance after 30 seconds', fakeAsync(() => {
            const open = resolvedWith(null);
            showView(viewOf([openItem(open)]));
            service.accept.and.returnValue(of({ status: 201 }));

            component.accept(open);
            tick(CONFIRM_TIMEOUT_MS - CONFIRM_POLL_MS);
            expect(component.busy.has('sug-1')).toBeTrue();
            tick(CONFIRM_POLL_MS);
            expect(component.busy.has('sug-1')).toBeFalse();
        }));

        it('shows Updating after Edit until the module carries the new delay', fakeAsync(() => {
            service.editAccepted.and.returnValue(of({ enabled: true, seconds: '180' }));
            service.accept.and.returnValue(of({ status: 201 }));
            const active = activeOf(140);
            showView(viewOf([acceptedItem(active)]));

            component.editAutomation(active);
            fixture.detectChanges();
            expect(fixture.nativeElement.textContent).toContain('Updating');

            service.loadView.and.returnValue(of(viewOf([acceptedItem(activeOf(140))])));
            tick(CONFIRM_POLL_MS);
            fixture.detectChanges();
            expect(fixture.nativeElement.textContent).toContain('Updating');

            service.loadView.and.returnValue(of(viewOf([acceptedItem(activeOf(180))])));
            tick(CONFIRM_POLL_MS);
            fixture.detectChanges();
            expect(fixture.nativeElement.textContent).not.toContain('Updating');
        }));

        it('asks before an accepted automation is removed and removes it only when confirmed', () => {
            service.confirmRemove.and.returnValue(of(false));
            service.removeAutomation.and.returnValue(of({ status: 204 }));
            showView(viewOf([acceptedItem(activeOf(180))]));

            buttonWith('Remove')!.click();
            expect(service.confirmRemove).toHaveBeenCalled();
            expect(service.removeAutomation).not.toHaveBeenCalled();

            service.confirmRemove.and.returnValue(of(true));
            buttonWith('Remove')!.click();
            expect(service.removeAutomation).toHaveBeenCalledWith('mod-1');
        });

        it('shows no Dismissed section without dismissed suggestions', () => {
            showView(viewOf([]));
            expect(fixture.nativeElement.textContent).not.toContain('Dismissed');
        });

        it('shows dismissed suggestions collapsed and restores one', () => {
            service.restore.and.returnValue(of({ status: 204 }));
            const dismissed = resolvedWith(null);
            showView(viewOf([], [dismissed]));

            expect(fixture.nativeElement.textContent).toContain('Dismissed (1)');
            expect(fixture.nativeElement.textContent).not.toContain('Restore');

            buttonWith('Dismissed')!.click();
            fixture.detectChanges();
            expect(fixture.nativeElement.textContent).toContain('Restore');

            buttonWith('Restore')!.click();
            expect(service.restore).toHaveBeenCalledWith('sug-1');
        });
    });
});
