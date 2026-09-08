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

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, timer } from 'rxjs';
import { exhaustMap, map } from 'rxjs/operators';
import { DialogsService } from '../../../../core/services/dialogs.service';
import { EnvironmentsService } from '../../shared/environments.service';
import { HistoryPollResult, HistoryStartRefusal, HistoryStatus, isHistoryStartRefusal } from '../../shared/environments.model';

const POLL_INTERVAL_MS = 5000;
const MAX_WINDOW_DAYS = 366;
// Safety margin above the server's own 1-minute minHistorySpan floor, so a pick at the current
// minute isn't refused by the server's clock instead of ours.
const MIN_PAST_MARGIN_MS = 2 * 60 * 1000;

/**
 * Start, follow and abort a history run of this environment. Polls GET .../history every 5s
 * while active (see start/stop); the parent starts/stops that polling as the History tab is
 * entered/left, mirroring the Live state tab, and ngOnDestroy stops it too as a fallback.
 */
@Component({
    selector: 'senergy-environments-history',
    templateUrl: './environments-history.component.html',
    styleUrls: ['./environments-history.component.css'],
})
export class EnvironmentsHistoryComponent implements OnInit, OnDestroy {
    @Input() environmentId = '';

    readonly channelColumns = ['name', 'publishable', 'published', 'silent', 'failed', 'last_error'];
    readonly maxWindowDays = MAX_WINDOW_DAYS;

    /** undefined = not polled yet, null = no run known (show the start form). */
    status: HistoryStatus | null | undefined;
    loading = true;
    /** Set on a failed poll, cleared on the next one that succeeds -- status is left as it was, see applyPoll. */
    pollError: string | undefined;

    fromValue = toDatetimeLocal(daysAgo(30));
    formError: string | undefined;
    isStarting = false;
    isAborting = false;
    refusal: HistoryStartRefusal | undefined;

    /**
     * Bumped whenever a start is issued, so a GET already in flight from the regular poll (or
     * from a previous refreshNow) cannot land after it and overwrite what the start just did --
     * its callback checks the generation it was dispatched under against this one and drops a
     * stale answer instead of applying it.
     */
    private generation = 0;

    /**
     * True once "Start another run" is clicked after a done/failed/cancelled run, so the form
     * shows again although the next poll keeps returning that same finished status until a new
     * run actually starts. Cleared as soon as a poll reports a running run.
     */
    private showingFormAfterFinishedRun = false;

    private pollSub: Subscription | undefined;
    private refreshSub: Subscription | undefined;

    constructor(
        private environmentsService: EnvironmentsService,
        private dialogsService: DialogsService,
        private snackBar: MatSnackBar,
    ) {}

    ngOnInit(): void {
        this.start();
    }

    ngOnDestroy(): void {
        this.stop();
    }

    /**
     * Begins polling GET .../history every 5s, immediately and then on the interval. Uses
     * exhaustMap rather than switchMap: a tick due while the previous request is still in
     * flight is skipped instead of cancelling it, so a GET slower than the 5s interval is never
     * abandoned forever.
     */
    start(): void {
        this.stop();
        this.pollSub = timer(0, POLL_INTERVAL_MS)
            .pipe(
                exhaustMap(() => {
                    // Captured per dispatch, not once for the whole subscription, so a start
                    // issued while this loop keeps running is picked up by its very next tick.
                    const generation = this.generation;
                    return this.environmentsService.getHistory(this.environmentId).pipe(map((result) => ({ generation, result })));
                }),
            )
            .subscribe(({ generation, result }) => this.applyIfCurrent(generation, result));
    }

    stop(): void {
        this.pollSub?.unsubscribe();
        this.pollSub = undefined;
        this.refreshSub?.unsubscribe();
        this.refreshSub = undefined;
    }

    /** Bound to "Try again" on a poll error with nothing known yet. */
    retryPoll(): void {
        this.loading = true;
        this.refreshNow();
    }

    get showForm(): boolean {
        return this.status === null || this.showingFormAfterFinishedRun;
    }

    /** Whether the chosen start time passes the form's own checks, without calling the API. */
    private validateFrom(): string | undefined {
        if (!this.fromValue) {
            return 'Choose a start date and time.';
        }
        const from = new Date(this.fromValue);
        if (Number.isNaN(from.getTime())) {
            return 'Choose a valid date and time.';
        }
        const now = Date.now();
        if (from.getTime() >= now) {
            return 'Must be in the past.';
        }
        if (now - from.getTime() < MIN_PAST_MARGIN_MS) {
            return 'Must be at least 2 minutes in the past.';
        }
        // An hour below the server's 366 days, since its clock reads a little later than ours.
        const maxAgeMs = MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000 - 60 * 60 * 1000;
        if (now - from.getTime() > maxAgeMs) {
            return 'Must not be more than ' + MAX_WINDOW_DAYS + ' days ago.';
        }
        return undefined;
    }

    /**
     * Bound to the Start button and to the force retries offered after a refusal (same
     * fromValue, already validated by the initial plain Start that led to the refusal) --
     * the checks below always run, force only tells the server to skip its own window check.
     */
    startRun(force: boolean): void {
        if (this.isStarting) {
            return;
        }
        const error = this.validateFrom();
        if (error) {
            this.formError = error;
            return;
        }
        this.formError = undefined;
        this.refusal = undefined;
        this.isStarting = true;
        // Invalidates any poll (regular or refreshNow) already in flight from before this start,
        // so its answer cannot land after this one and overwrite it -- see the generation field.
        this.generation++;
        const from = new Date(this.fromValue).toISOString();
        this.environmentsService.startHistory(this.environmentId, from, force).subscribe((result) => {
            this.isStarting = false;
            if (isHistoryStartRefusal(result)) {
                this.refusal = result;
                if (result.kind === 'running') {
                    // Something else (another tab, another user, or a backfill that GET
                    // .../history cannot see at all) already has a run going -- refresh the
                    // status; the snackbar survives the view change that refresh may bring.
                    this.snackBar.open(result.message, undefined, { duration: 6000 });
                    this.refreshNow();
                }
                return;
            }
            this.showingFormAfterFinishedRun = false;
            this.status = result;
            this.snackBar.open('History run started.', undefined, { duration: 2000 });
            // Restarts polling under the new generation so a GET still in flight from the old
            // one cannot answer after this and overwrite the run just started.
            this.stop();
            this.start();
        });
    }

    /** Bound to "Start another run" after a done/failed/cancelled run -- see showingFormAfterFinishedRun. */
    startAnotherRun(): void {
        this.showingFormAfterFinishedRun = true;
        this.refusal = undefined;
        this.formError = undefined;
        this.fromValue = toDatetimeLocal(daysAgo(30));
    }

    /** Guarded against a double click by isAborting itself: set before the dialog even opens, cleared again if it closes without confirming. */
    confirmAbort(): void {
        if (this.isAborting) {
            return;
        }
        this.isAborting = true;
        this.dialogsService
            .openConfirmDialog(
                'Abort history run',
                'The run stops at its next step and hands the environment back to the live simulation, which continues from the partial state reached so far. This cannot be undone.',
            )
            .afterClosed()
            .subscribe((confirmed: boolean | undefined) => {
                if (confirmed) {
                    this.abort();
                } else {
                    this.isAborting = false;
                }
            });
    }

    private abort(): void {
        // A poll dispatched before the abort must not land after it and revive the running view.
        this.generation++;
        this.environmentsService.cancelHistory(this.environmentId).subscribe((result) => {
            this.isAborting = false;
            if (result.kind === 'error') {
                this.pollError = 'Abort failed: ' + result.message;
                this.snackBar.open('Abort failed: ' + result.message, undefined, { duration: 6000 });
                return;
            }
            this.pollError = undefined;
            if (result.kind === 'none') {
                this.status = null;
                this.snackBar.open('Nothing is known about a run any more.', undefined, { duration: 2000 });
                return;
            }
            this.status = result.status;
            // moses answers cancelled when it closed a stored run itself: that is an accepted abort too.
            if (result.status.state === 'running' || result.status.state === 'cancelled') {
                this.snackBar.open('Abort accepted.', undefined, { duration: 2000 });
            } else {
                this.snackBar.open('The run had already ended.', undefined, { duration: 2000 });
            }
        });
    }

    /** Share of the window already simulated, clamped to [0, 100] -- drives the progress bar. */
    progressPercent(status: HistoryStatus): number {
        if (!status.from || !status.to || !status.position) {
            return 0;
        }
        const from = new Date(status.from).getTime();
        const to = new Date(status.to).getTime();
        const position = new Date(status.position).getTime();
        if (to <= from) {
            return 0;
        }
        const percent = ((position - from) / (to - from)) * 100;
        return Math.min(100, Math.max(0, percent));
    }

    /** "2h 15m" since started_at, for the running view -- recomputed on every check (the template re-evaluates it while polling refreshes the view). */
    elapsedSince(startedAt: string | undefined): string {
        if (!startedAt) {
            return '';
        }
        const ms = Date.now() - new Date(startedAt).getTime();
        if (ms <= 0) {
            return '0m';
        }
        const totalMinutes = Math.floor(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return hours > 0 ? hours + 'h ' + minutes + 'm' : minutes + 'm';
    }

    private refreshNow(): void {
        const generation = this.generation;
        this.refreshSub?.unsubscribe();
        this.refreshSub = this.environmentsService.getHistory(this.environmentId).subscribe((result) => this.applyIfCurrent(generation, result));
    }

    /** Drops a poll answer dispatched under an older generation -- see the generation field. */
    private applyIfCurrent(generation: number, result: HistoryPollResult): void {
        if (generation === this.generation) {
            this.applyPoll(result);
        }
    }

    /**
     * 'none' is the only outcome that shows the start form (see showForm). 'error' keeps
     * whatever status/refusal was last known and only surfaces a non-blocking message, the same
     * way a failed live-state poll leaves the tab showing what it showed before. 'status'
     * clears the running=false conditions and, when it reports an actual run, drops any pending
     * start refusal -- see startRun's 'running' refresh.
     */
    private applyPoll(result: HistoryPollResult): void {
        this.loading = false;
        if (result.kind === 'error') {
            this.pollError = 'Status could not be read: ' + result.message;
            return;
        }
        this.pollError = undefined;
        if (result.kind === 'none') {
            this.status = null;
            return;
        }
        this.status = result.status;
        if (result.status.state === 'running') {
            this.showingFormAfterFinishedRun = false;
            this.refusal = undefined;
            return;
        }
        // A finished run does not change any more; Start begins polling again.
        this.stop();
    }
}

/** Local-time value for an <input type="datetime-local">, e.g. "2026-08-09T10:00". */
function toDatetimeLocal(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
