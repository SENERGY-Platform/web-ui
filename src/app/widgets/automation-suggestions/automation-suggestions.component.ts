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

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatChipOption, MatChipSet, MatChipAvatar } from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTooltip } from '@angular/material/tooltip';
import { EMPTY, Subscription, catchError, exhaustMap, interval, take } from 'rxjs';
import { WidgetModel } from 'src/app/modules/dashboard/shared/dashboard-widget.model';
import { DashboardService } from 'src/app/modules/dashboard/shared/dashboard.service';
import { ResolvedSuggestion } from './shared/automation-suggestion.resolver';
import {
    AutoOffChoice,
    AutomationSuggestion,
    CONFIRM_POLL_MS,
    CONFIRM_TIMEOUT_MS,
    parseAutoOffSeconds,
    suggestionInstanceId
} from './shared/automation-suggestion.model';
import { describeError, formatActiveState, formatSuggestionSubtitle, formatWindow } from './shared/automation-suggestion.format';
import {
    ActiveAutomation,
    AutomationSuggestionsService,
    AutomationSuggestionsView,
    ViewItem
} from './shared/automation-suggestions.service';
import { WidgetHeaderComponent } from '../components/widget-header/widget-header.component';
import { WidgetSpinnerComponent } from '../components/widget-spinner/widget-spinner.component';
import { WidgetFooterComponent } from '../components/widget-footer/widget-footer.component';

@Component({
    selector: 'senergy-automation-suggestions',
    templateUrl: './automation-suggestions.component.html',
    styleUrls: ['./automation-suggestions.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [NgTemplateOutlet, MatCard, MatCardContent, MatButton, MatIconButton, MatChipSet, MatChipOption, MatChipAvatar, MatIcon, MatProgressSpinner, MatTooltip, WidgetHeaderComponent, WidgetSpinnerComponent, WidgetFooterComponent]
})
export class AutomationSuggestionsComponent implements OnInit, OnDestroy {
    @Input() dashboardId = '';
    @Input() widget: WidgetModel = {} as WidgetModel;
    @Input() zoom = false;
    @Input() userHasDeleteAuthorization = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() userHasUpdateNameAuthorization = false;

    configured = false;
    ready = false;
    refreshing = false;
    loadError: string | null = null;
    actionError: string | null = null;
    view: AutomationSuggestionsView = { exportMissing: false, items: [], dismissed: [] };
    dismissedOpen = false;
    /** ids of suggestions and modules with an action in flight; a suggestion stays busy until the module shows it */
    busy = new Set<string>();
    /** switch and delay of a suggestion as the user set them; until then the suggestion's own values apply */
    private autoOffChoices = new Map<string, AutoOffChoice>();
    /** reloads that wait for a module change after an acceptance or an edit, by suggestion id */
    private waits = new Map<string, Subscription>();

    private initSubscription = new Subscription();
    private loadSubscription = new Subscription();

    private dashboardService = inject(DashboardService);
    private service = inject(AutomationSuggestionsService);

    ngOnInit(): void {
        this.initSubscription = this.dashboardService.initWidgetObservable.subscribe((event: string) => {
            if (event === 'reloadAll' || event === this.widget.id) {
                this.load();
            }
        });
    }

    ngOnDestroy(): void {
        this.initSubscription.unsubscribe();
        this.loadSubscription.unsubscribe();
        this.waits.forEach((wait) => wait.unsubscribe());
        this.waits.clear();
    }

    private get instanceId(): string | undefined {
        return suggestionInstanceId(this.widget.properties);
    }

    load(): void {
        const instanceId = this.instanceId;
        this.configured = !!instanceId;
        if (!instanceId) {
            this.ready = true;
            return;
        }
        this.refreshing = true;
        this.loadSubscription.unsubscribe();
        this.loadSubscription = this.service.loadView(instanceId).subscribe({
            next: (view) => {
                this.view = view;
                this.loadError = null;
                this.finishLoad();
            },
            error: (error: unknown) => {
                this.loadError = describeError(error, 'Automation suggestions could not be loaded.');
                this.finishLoad();
            },
        });
    }

    private finishLoad(): void {
        this.ready = true;
        this.refreshing = false;
    }

    accept(suggestion: ResolvedSuggestion): void {
        const instanceId = this.instanceId;
        if (!instanceId || this.busy.has(suggestion.suggestion.id) || this.autoOffInvalid(suggestion)) {
            return;
        }
        const id = suggestion.suggestion.id;
        this.submit(instanceId, suggestion, this.autoOffToSend(suggestion), (view) => acceptedItemOf(view, id) !== undefined,
            'The suggestion could not be accepted.');
    }

    dismiss(suggestion: AutomationSuggestion): void {
        const id = suggestion.id;
        const instanceId = this.instanceId;
        if (this.busy.has(id) || !instanceId) {
            return;
        }
        this.busy.add(id);
        this.actionError = null;
        this.service.dismiss(id, instanceId).subscribe({
            next: () => {
                this.busy.delete(id);
                this.load();
            },
            error: () => {
                this.busy.delete(id);
                this.actionError = 'The suggestion could not be hidden.';
            },
        });
    }

    restore(resolved: ResolvedSuggestion): void {
        const id = resolved.suggestion.id;
        if (this.busy.has(id)) {
            return;
        }
        this.busy.add(id);
        this.actionError = null;
        this.service.restore(id).subscribe({
            next: () => {
                this.busy.delete(id);
                this.load();
            },
            error: () => {
                this.busy.delete(id);
                this.actionError = 'The suggestion could not be restored.';
            },
        });
    }

    toggleDismissed(): void {
        this.dismissedOpen = !this.dismissedOpen;
    }

    /** Asks for confirmation first; the automation is removed only when the user confirms. */
    remove(automation: ActiveAutomation): void {
        if (this.busy.has(automation.moduleId)) {
            return;
        }
        this.service.confirmRemove().subscribe((confirmed) => {
            if (confirmed) {
                this.removeConfirmed(automation);
            }
        });
    }

    private removeConfirmed(automation: ActiveAutomation): void {
        if (this.busy.has(automation.moduleId)) {
            return;
        }
        this.busy.add(automation.moduleId);
        this.actionError = null;
        this.service.removeAutomation(automation.moduleId).subscribe({
            next: () => {
                this.busy.delete(automation.moduleId);
                this.load();
            },
            error: (error: unknown) => {
                this.busy.delete(automation.moduleId);
                this.actionError = describeError(error, 'The automation could not be removed.');
            },
        });
    }

    openItem(item: ViewItem): ResolvedSuggestion | null {
        return item.kind === 'open' ? item.resolved : null;
    }

    acceptedItem(item: ViewItem): ActiveAutomation | null {
        return item.kind === 'accepted' ? item.automation : null;
    }

    windowText(suggestion: AutomationSuggestion): string {
        return formatWindow(suggestion.window);
    }

    /** Subtitle of an open suggestion: its window and how often the trigger is followed. */
    subtitleText(suggestion: AutomationSuggestion): string {
        return formatSuggestionSubtitle(suggestion);
    }

    /** Subtitle of an accepted automation; one that the export no longer lists says so. */
    automationSubtitle(automation: ActiveAutomation): string {
        return automation.suggestion ? formatSuggestionSubtitle(automation.suggestion.suggestion) : 'No longer suggested';
    }

    /** State line of an accepted automation: Updating while an edit is pending. */
    stateText(automation: ActiveAutomation): string {
        return this.busy.has(automation.suggestionId) ? 'Updating' : formatActiveState(automation.autoOffS);
    }

    removing(automation: ActiveAutomation): boolean {
        return this.busy.has(automation.moduleId);
    }

    updating(automation: ActiveAutomation): boolean {
        return this.busy.has(automation.suggestionId);
    }

    /** Whether the switch-off is on for the suggestion; it starts on. */
    autoOffEnabled(suggestion: ResolvedSuggestion): boolean {
        return this.autoOffChoices.get(suggestion.suggestion.id)?.enabled ?? true;
    }

    /** The delay shown in the chip: the user's text, or the delay the suggestion proposes. */
    autoOffSeconds(suggestion: ResolvedSuggestion): string {
        return this.autoOffChoices.get(suggestion.suggestion.id)?.seconds ?? String(suggestion.suggestion.auto_off_s);
    }

    setAutoOffEnabled(suggestion: ResolvedSuggestion, enabled: boolean): void {
        this.autoOffChoices.set(suggestion.suggestion.id, { enabled, seconds: this.autoOffSeconds(suggestion) });
    }

    setAutoOffSeconds(suggestion: ResolvedSuggestion, seconds: string): void {
        this.autoOffChoices.set(suggestion.suggestion.id, { enabled: this.autoOffEnabled(suggestion), seconds });
    }

    /** Asks for the delay in a dialog; a confirmed delay also turns the switch-off on. */
    changeDuration(suggestion: ResolvedSuggestion): void {
        const id = suggestion.suggestion.id;
        if (this.busy.has(id)) {
            return;
        }
        this.service.askAutoOffSeconds(this.autoOffSeconds(suggestion)).subscribe((seconds) => {
            if (seconds !== undefined) {
                this.autoOffChoices.set(id, { enabled: true, seconds });
            }
        });
    }

    /** True while the switch-off is on and the typed delay is not a whole number of seconds from 5 to 3600. */
    autoOffInvalid(suggestion: ResolvedSuggestion): boolean {
        return suggestion.autoOffAvailable && this.autoOffEnabled(suggestion) && parseAutoOffSeconds(this.autoOffSeconds(suggestion)) === null;
    }

    /** The delay sent with the acceptance: null without switch-off, the typed delay otherwise. */
    private autoOffToSend(suggestion: ResolvedSuggestion): number | null {
        if (!suggestion.autoOffAvailable || !this.autoOffEnabled(suggestion)) {
            return null;
        }
        return parseAutoOffSeconds(this.autoOffSeconds(suggestion));
    }

    /** Edit is offered while the suggestion resolves and offers a switch-off. */
    canEdit(automation: ActiveAutomation): boolean {
        return automation.suggestion?.autoOffAvailable === true;
    }

    /** Opens the editor with the module's delay; an unknown delay starts with the suggestion's, a null one with the switch off. */
    editAutomation(automation: ActiveAutomation): void {
        const resolved = automation.suggestion;
        if (!resolved || !resolved.autoOffAvailable || this.busy.has(automation.suggestionId)) {
            return;
        }
        const seconds = typeof automation.autoOffS === 'number' ? automation.autoOffS : resolved.suggestion.auto_off_s;
        this.service.editAccepted({ enabled: automation.autoOffS !== null, seconds: String(seconds ?? '') }).subscribe((choice) => {
            if (choice !== undefined) {
                this.saveEdit(automation, choice);
            }
        });
    }

    /** Starts accept_suggestion again with the chosen delay; the row shows Updating until the module carries it. */
    private saveEdit(automation: ActiveAutomation, choice: AutoOffChoice): void {
        const instanceId = this.instanceId;
        const resolved = automation.suggestion;
        const id = automation.suggestionId;
        if (!instanceId || !resolved || this.busy.has(id)) {
            return;
        }
        const autoOffS = choice.enabled ? parseAutoOffSeconds(choice.seconds) : null;
        if (choice.enabled && autoOffS === null) {
            return;
        }
        this.submit(instanceId, resolved, autoOffS, (view) => acceptedItemOf(view, id)?.autoOffS === autoOffS,
            'The automation could not be changed.');
    }

    /**
     * Starts accept_suggestion and keeps the suggestion busy until the view confirms it. The view is reloaded
     * every CONFIRM_POLL_MS, at most CONFIRM_TIMEOUT_MS.
     */
    private submit(
        instanceId: string,
        resolved: ResolvedSuggestion,
        autoOffS: number | null,
        confirmed: (view: AutomationSuggestionsView) => boolean,
        failure: string,
    ): void {
        const id = resolved.suggestion.id;
        this.busy.add(id);
        this.actionError = null;
        this.service.accept(instanceId, resolved, autoOffS).subscribe({
            next: () => {
                this.load();
                this.awaitChange(id, instanceId, confirmed);
            },
            error: (error: unknown) => {
                this.busy.delete(id);
                this.actionError = describeError(error, failure);
            },
        });
    }

    private awaitChange(id: string, instanceId: string, confirmed: (view: AutomationSuggestionsView) => boolean): void {
        this.waits.get(id)?.unsubscribe();
        const wait = interval(CONFIRM_POLL_MS).pipe(
            take(CONFIRM_TIMEOUT_MS / CONFIRM_POLL_MS),
            exhaustMap(() => this.service.loadView(instanceId).pipe(catchError(() => EMPTY))),
        ).subscribe({
            next: (view) => {
                this.view = view;
                if (confirmed(view)) {
                    this.endWait(id);
                }
            },
            complete: () => this.endWait(id),
        });
        this.waits.set(id, wait);
    }

    private endWait(id: string): void {
        this.waits.get(id)?.unsubscribe();
        this.waits.delete(id);
        this.busy.delete(id);
    }

    edit(): void {
        this.service.openEditDialog(this.dashboardId, this.widget.id, this.userHasUpdateNameAuthorization, this.userHasUpdatePropertiesAuthorization);
    }
}

/** The accepted automation of a suggestion in the view, if the module is there. */
function acceptedItemOf(view: AutomationSuggestionsView, suggestionId: string): ActiveAutomation | undefined {
    for (const item of view.items) {
        if (item.kind === 'accepted' && item.automation.suggestionId === suggestionId) {
            return item.automation;
        }
    }
    return undefined;
}
