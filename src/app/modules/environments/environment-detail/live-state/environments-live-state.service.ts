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

import { computed, inject, Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { EnvironmentsService } from '../../shared/environments.service';
import { Environment, EnvironmentState, isApiError, isValidationError } from '../../shared/environments.model';
import {
    buildStateChange,
    diffTouchedKeys,
    flattenAssetTargets,
    flattenZoneTargets,
    NamedStateTarget,
    pickTouched,
    pickUntouched,
} from '../../shared/environments-live-state';
import { snackError, snackSuccess } from 'src/app/core/services/snack-bar-messages';

/** One zone or asset row in the Live state tab: the suggested defaults, the working draft and which keys the user actually touched. */
export interface LiveStateEntry {
    target: NamedStateTarget;
    draft: WritableSignal<Record<string, unknown>>;
    touched: WritableSignal<ReadonlySet<string>>;
}

function newEntry(target: NamedStateTarget): LiveStateEntry {
    return { target, draft: signal({ ...target.initialStates }), touched: signal<ReadonlySet<string>>(new Set()) };
}

/**
 * Draft values, polled runtime state and the PATCH of the Live state tab. They live here rather than
 * in the OnPush tab component so the editor can reseed and read them without reaching into the child.
 * Entries keep their identity across edits and polls; only a reset replaces them.
 */
@Injectable()
export class EnvironmentsLiveState implements OnDestroy {
    private environmentsService = inject(EnvironmentsService);
    private snackBar = inject(MatSnackBar);

    private readonly environmentIdState = signal<string | undefined>(undefined);
    /** Id of the environment the drafts were seeded from. */
    readonly environmentId = this.environmentIdState.asReadonly();

    /** What the context tiles show as "was X": the environment's context, which the Editor tab replaces wholesale, so the editor sets it on every edit. */
    readonly contextBaseline = signal<Record<string, unknown> | undefined>(undefined);
    readonly contextDraft = signal<Record<string, unknown>>({});
    readonly contextTouched = signal<ReadonlySet<string>>(new Set());
    readonly zoneStates = signal<LiveStateEntry[]>([]);
    readonly assetStates = signal<LiveStateEntry[]>([]);
    readonly applying = signal(false);
    /** When the drafts were last (re)seeded from the loaded definition; the fallback status line's timestamp while the simulation is not running. */
    readonly lastRefreshed = signal<Date | undefined>(undefined);
    /** Whether the simulation is running per the last poll; undefined until the first poll answers. */
    readonly running = signal<boolean | undefined>(undefined);
    /** The server's as_of from the last poll while running. */
    readonly asOf = signal<Date | undefined>(undefined);
    /** Context keys the timeline governs: PATCH .../state rejects a change to one of them, so they never enter the pending change. */
    readonly lockedContextKeys = signal<ReadonlySet<string>>(new Set());

    /** Undefined while nothing is touched, which keeps the Apply button disabled. */
    readonly pendingChange = computed(() => {
        const zonesById: Record<string, Record<string, unknown>> = {};
        this.zoneStates().forEach((entry) => (zonesById[entry.target.id] = pickTouched(entry.draft(), entry.touched())));
        const assetsById: Record<string, Record<string, unknown>> = {};
        this.assetStates().forEach((entry) => (assetsById[entry.target.id] = pickTouched(entry.draft(), entry.touched())));
        const context = pickTouched(this.contextDraft(), this.contextTouched());
        this.lockedContextKeys().forEach((key) => delete context[key]);
        return buildStateChange(context, zonesById, assetsById);
    });

    /** Whether there is anything on the tab to show at all: an unsaved environment has nothing running, and a saved one might have no context, zones or assets. */
    readonly isEmpty = computed(
        () => !this.environmentIdState() || (Object.keys(this.contextDraft()).length === 0 && this.zoneStates().length === 0 && this.assetStates().length === 0),
    );

    private pollSub: Subscription | undefined;

    ngOnDestroy(): void {
        this.stopPolling();
    }

    /** (Re)seeds the drafts from the definition's initial_states, discarding any unsent edits. */
    reset(env: Environment): void {
        this.environmentIdState.set(env.id);
        this.contextBaseline.set(env.context);
        this.contextDraft.set({ ...(env.context || {}) });
        this.contextTouched.set(new Set());
        this.zoneStates.set(flattenZoneTargets(env.zones).map(newEntry));
        this.assetStates.set(flattenAssetTargets(env.zones).map(newEntry));
        this.lastRefreshed.set(new Date());
    }

    changeContext(record: Record<string, unknown>): void {
        this.contextTouched.set(diffTouchedKeys(this.contextDraft(), record, this.contextTouched()));
        this.contextDraft.set(record);
    }

    changeEntry(entry: LiveStateEntry, record: Record<string, unknown>): void {
        entry.touched.set(diffTouchedKeys(entry.draft(), record, entry.touched()));
        entry.draft.set(record);
    }

    apply(): void {
        const change = this.pendingChange();
        const id = this.environmentIdState();
        if (!change || !id || this.applying()) {
            return;
        }
        this.applying.set(true);
        this.environmentsService.setStateChecked(id, change).subscribe((result) => {
            this.applying.set(false);
            if (isValidationError(result)) {
                // e.g. "context.energy_price: driven by the timeline, cannot be changed here" --
                // the reason the server rejected it, not a bare "Http failure response ... 400".
                const message =
                    (result.problems || []).map((p) => (p.path ? p.path + ': ' : '') + (p.message || '')).join(' · ') ||
                    'The change was rejected.';
                snackError(this.snackBar, message);
                return;
            }
            if (isApiError(result)) {
                snackError(this.snackBar, result.message);
                return;
            }
            snackSuccess(this.snackBar, 'Applied - takes effect on the next tick.');
            this.contextTouched.set(new Set());
            this.zoneStates().forEach((entry) => entry.touched.set(new Set()));
            this.assetStates().forEach((entry) => entry.touched.set(new Set()));
        });
    }

    /**
     * Polls GET .../state every 10s, so the tab shows the simulation's actual current values
     * instead of only the definition's reference ones. Fires immediately (timer's 0 due time).
     * A failed poll just leaves the tab showing whatever it showed before -- see getEnvironmentState.
     */
    startPolling(): void {
        this.stopPolling();
        const id = this.environmentIdState();
        if (!id) {
            return;
        }
        this.pollSub = timer(0, 10000)
            .pipe(switchMap(() => this.environmentsService.getEnvironmentState(id)))
            .subscribe((state) => this.applyPoll(state));
    }

    stopPolling(): void {
        this.pollSub?.unsubscribe();
        this.pollSub = undefined;
    }

    /**
     * Merges one poll's answer into the drafts, only into untouched keys, so a value the user is
     * mid-edit on keeps their local value. No merge while not running: the drafts keep showing
     * the definition's reference values.
     */
    private applyPoll(state: EnvironmentState | null): void {
        if (!state) {
            return;
        }
        this.running.set(state.running);
        if (!state.running) {
            return;
        }
        this.asOf.set(new Date(state.as_of));
        this.contextDraft.update((draft) => ({ ...draft, ...pickUntouched(state.context || {}, this.contextTouched()) }));
        this.zoneStates().forEach((entry) => {
            const values = (state.zones || {})[entry.target.id];
            if (values) {
                entry.draft.update((draft) => ({ ...draft, ...pickUntouched(values, entry.touched()) }));
            }
        });
        this.assetStates().forEach((entry) => {
            const values = (state.assets || {})[entry.target.id];
            if (values) {
                entry.draft.update((draft) => ({ ...draft, ...pickUntouched(values, entry.touched()) }));
            }
        });
    }
}
