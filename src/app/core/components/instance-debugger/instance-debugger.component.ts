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

import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable, Subscription } from 'rxjs';
import _NavigatedViewer from 'bpmn-js/dist/bpmn-navigated-viewer.production.min.js';
import {
    EngineActivity,
    EngineActivityFilter,
    EngineActiveElement,
    EngineDebugState,
    EngineDebugVariable,
    EngineElementStats,
    EngineEventReconstruction,
    EngineEventSource,
    EngineIncident,
    EngineWait,
} from '../../model/automation-engine.model';
import { AutomationEngineService, EngineHistoryStep, PROCESSES_NAMESPACE, engineErrorMessage } from '../../services/automation-engine.service';
import { UrlStateService } from '../../services/url-state.service';
import { DebugStreamStatus, InstanceDebugStreamService } from './debug-stream.service';
import { ACTIVITY_KINDS, describeActivity, diagramMarks, instanceIsRunning, parseJsonInput } from './debug-state';

/** how many entries of the live stream the activity list keeps */
const LIVE_ACTIVITY_LIMIT = 200;
/** entries the history shows before and after the current step */
const HISTORY_ACTIVITY_WINDOW = 10;
/** entries a search in the history loads at once */
const SEARCH_PAGE = 50;

export interface DebugVariableRow {
    name: string;
    /** set for local variables of an active element */
    elementId?: string;
    variable: EngineDebugVariable;
}

/**
 * Debugger of an instance of the automation-engine, for process instances (route data namespace
 * 'processes') and smart service instances ('smart-services'). Without the query parameter step it
 * follows the instance live; with step it shows that step of the history, reconstructed by the engine.
 * The diagram is the BPMN of the deployment version the instance runs, marked in the client.
 */
@Component({
    selector: 'senergy-instance-debugger',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        MatTabsModule,
        MatSlideToggleModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
    ],
    templateUrl: './instance-debugger.component.html',
    styleUrls: ['./instance-debugger.component.css'],
})
export class InstanceDebuggerComponent implements OnInit, OnDestroy {
    @ViewChild('diagram', { static: true }) diagramRef!: ElementRef<HTMLDivElement>;

    namespace = PROCESSES_NAMESPACE;
    instanceId = '';
    state: EngineDebugState | null = null;
    /** live follows the instance, history shows a step */
    mode: 'live' | 'history' = 'live';
    streamStatus: DebugStreamStatus = 'connecting';
    streamError?: string;
    loading = false;
    error: string | null = null;
    evaluateEvents = false;
    tabIndex = 0;
    /** live: entries received, newest first; history: entries around the step, in order */
    activities: EngineActivity[] = [];
    /** highest step seen; the history cannot go beyond it */
    latestSeq = 0;
    /** latestSeq came from the engine, not only from the steps shown */
    private latestKnown = false;
    jumpTime = '';
    selectedElementId: string | null = null;
    diagramError: string | null = null;
    /** complete values of truncated variables, by variableKey */
    fullValues = new Map<string, { value?: any; unavailable?: boolean; error?: string }>();
    loadingValues = new Set<string>();
    reconstruction: EngineEventReconstruction | null = null;
    reconstructionError: string | null = null;
    loadingReconstruction = false;
    /** elements of the diagram, for the search */
    diagramElements: { id: string; name: string }[] = [];
    readonly activityKinds = ACTIVITY_KINDS;
    /** search in the history (DBG-16) */
    search: EngineActivityFilter = {};
    /** entries found, in order; null while no search is shown */
    searchResults: EngineActivity[] | null = null;
    searchHasMore = false;
    searching = false;
    searchError: string | null = null;
    /** interventions (DBG-17): the variable being set, the waiting element being triggered */
    editing: { name: string; text: string; error?: string } | null = null;
    triggering: { elementId: string; text: string; error?: string } | null = null;
    acting = false;
    actionError: string | null = null;
    actionDone: string | null = null;

    private backUrl = '/';
    /** the page was opened from another page of the app, not through a link; the URL writes below are navigations too */
    private openedInApp: boolean;
    private viewer: any;
    private diagramKey = '';
    private diagramLoading: Subscription | null = null;
    private appliedMarkers: { id: string; marker: string }[] = [];
    private streamSub: Subscription | null = null;
    private requestSub: Subscription | null = null;
    private activitiesSub: Subscription | null = null;
    private searchSub: Subscription | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private location: Location,
        private urlState: UrlStateService,
        private automationEngineService: AutomationEngineService,
        private streamService: InstanceDebugStreamService,
    ) {
        this.openedInApp = !!this.router.getCurrentNavigation()?.previousNavigation;
    }

    ngOnInit(): void {
        this.namespace = this.route.snapshot.data['namespace'] || PROCESSES_NAMESPACE;
        this.backUrl = this.route.snapshot.data['back'] || '/';
        this.instanceId = this.route.snapshot.paramMap.get('id') || '';
        this.evaluateEvents = this.urlState.getBoolean('evaluate', false);
        this.tabIndex = this.urlState.getInt('tab', 0);
        // the diagram container is a static view child, so the viewer can be created before the first check
        this.viewer = new _NavigatedViewer({ container: this.diagramRef.nativeElement });
        this.viewer.get('eventBus').on('element.click', (event: any) => this.selectElement(event.element?.id || null));
        const step = this.urlState.getInt('step', 0);
        if (step > 0) {
            this.loadStep({ seq: step });
        } else {
            this.startLive();
        }
    }

    ngOnDestroy(): void {
        this.streamSub?.unsubscribe();
        this.requestSub?.unsubscribe();
        this.activitiesSub?.unsubscribe();
        this.searchSub?.unsubscribe();
        this.diagramLoading?.unsubscribe();
        this.viewer?.destroy();
    }

    back(): void {
        if (this.openedInApp) {
            this.location.back();
        } else {
            this.router.navigateByUrl(this.backUrl);
        }
    }

    // --- live and history ---------------------------------------------------------------------------

    startLive(): void {
        this.mode = 'live';
        this.error = null;
        this.activities = [];
        this.requestSub?.unsubscribe();
        this.activitiesSub?.unsubscribe();
        this.streamSub?.unsubscribe();
        if (this.urlState.get('step') !== null) {
            this.urlState.set({ step: null });
        }
        this.streamSub = this.streamService.watch(this.namespace, this.instanceId, this.evaluateEvents).subscribe((update) => {
            this.streamStatus = update.status;
            this.streamError = update.error;
            if (update.activities.length > 0) {
                this.activities = [...update.activities].reverse().concat(this.activities).slice(0, LIVE_ACTIVITY_LIMIT);
            }
            if (update.state) {
                // the live state is the end of the history
                this.latestKnown = true;
                this.show(update.state);
            } else if (update.status === 'ended' && update.error) {
                this.error = update.error;
            }
        });
    }

    toggleEvaluateEvents(on: boolean): void {
        this.evaluateEvents = on;
        this.urlState.set({ evaluate: on ? true : null });
        if (this.mode === 'live') {
            this.startLive();
        }
    }

    loadStep(step: EngineHistoryStep): void {
        this.mode = 'history';
        this.streamSub?.unsubscribe();
        this.streamSub = null;
        this.requestSub?.unsubscribe();
        this.loading = true;
        this.error = null;
        this.requestSub = this.automationEngineService.getHistoryState(this.namespace, this.instanceId, step).subscribe({
            next: (state) => {
                this.loading = false;
                if (!step.seq && !step.time) {
                    // the latest step, known exactly only from an answer without seq
                    this.latestSeq = state.seq;
                    this.latestKnown = true;
                }
                this.show(state);
                this.urlState.set({ step: state.seq });
                this.loadActivitiesAround(state);
                if (!this.latestKnown) {
                    this.loadLatestSeq();
                }
            },
            error: (err) => {
                this.loading = false;
                this.error = engineErrorMessage(err);
            },
        });
    }

    first(): void {
        this.loadStep({ seq: this.state?.first_seq || 1 });
    }

    previous(): void {
        if (this.state && this.state.seq > this.firstSeq()) {
            this.loadStep({ seq: this.state.seq - 1 });
        }
    }

    next(): void {
        if (this.state && this.state.seq < this.latestSeq) {
            this.loadStep({ seq: this.state.seq + 1 });
        }
    }

    last(): void {
        this.loadStep({});
    }

    jumpToTime(): void {
        if (!this.jumpTime) {
            return;
        }
        const time = new Date(this.jumpTime);
        if (isNaN(time.getTime())) {
            return;
        }
        this.loadStep({ time: time.toISOString() });
    }

    jumpToActivity(activity: EngineActivity): void {
        this.loadStep({ seq: activity.seq });
    }

    firstSeq(): number {
        return this.state?.first_seq || 1;
    }

    private loadLatestSeq(): void {
        this.automationEngineService.getHistoryState(this.namespace, this.instanceId).subscribe({
            next: (latest) => {
                this.latestSeq = Math.max(this.latestSeq, latest.seq);
                this.latestKnown = true;
            },
            error: () => undefined,
        });
    }

    private loadActivitiesAround(state: EngineDebugState): void {
        this.activitiesSub?.unsubscribe();
        const after = Math.max(this.firstSeq() - 1, state.seq - HISTORY_ACTIVITY_WINDOW - 1);
        this.activitiesSub = this.automationEngineService
            .getActivities(this.namespace, this.instanceId, after, 2 * HISTORY_ACTIVITY_WINDOW + 1)
            .subscribe({
                next: (page) => (this.activities = page.items || []),
                error: () => (this.activities = []),
            });
    }

    private show(state: EngineDebugState): void {
        this.state = state;
        this.latestSeq = Math.max(this.latestSeq, state.seq);
        this.loadDiagram(state);
        this.applyMarks();
    }

    // --- diagram ------------------------------------------------------------------------------------

    private loadDiagram(state: EngineDebugState): void {
        const version = this.diagramVersion(state);
        const key = state.instance.deployment_id + ':' + version;
        if (key === this.diagramKey) {
            return;
        }
        this.diagramKey = key;
        this.diagramLoading?.unsubscribe();
        this.diagramLoading = this.automationEngineService.getDeploymentVersion(this.namespace, state.instance.deployment_id, version).subscribe({
            next: (v) => {
                this.viewer.importXML(v.xml, (err: any) => {
                    if (err) {
                        this.diagramError = 'the diagram could not be shown: ' + (err.message || err);
                        return;
                    }
                    this.diagramError = null;
                    this.appliedMarkers = [];
                    this.diagramElements = this.listDiagramElements();
                    this.viewer.get('canvas').zoom('fit-viewport');
                    this.applyMarks();
                });
            },
            error: (err) => (this.diagramError = 'the diagram could not be loaded: ' + engineErrorMessage(err)),
        });
    }

    /** the deployment version of the run the counters belong to; a step of the history can be in an earlier run */
    private diagramVersion(state: EngineDebugState): number {
        const run = this.stateRun(state);
        return (state.runs || []).find((r) => r.run === run)?.deployment_version || state.instance.deployment_version;
    }

    private listDiagramElements(): { id: string; name: string }[] {
        const skipped = ['label', 'bpmn:Process', 'bpmn:Collaboration', 'bpmn:Participant', 'bpmn:Lane'];
        return this.viewer
            .get('elementRegistry')
            .getAll()
            .filter((e: any) => !e.waypoints && !skipped.includes(e.type))
            .map((e: any) => ({ id: e.id, name: e.businessObject?.name || e.id }))
            .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
    }

    private stateRun(state: EngineDebugState): number {
        const elements = state.elements || [];
        return elements.length > 0 ? elements.reduce((max, e) => Math.max(max, e.run), 0) : state.instance.run;
    }

    private applyMarks(): void {
        if (!this.viewer || !this.state) {
            return;
        }
        const registry = this.viewer.get('elementRegistry');
        const canvas = this.viewer.get('canvas');
        const overlays = this.viewer.get('overlays');
        if (registry.getAll().length === 0) {
            return;
        }
        this.appliedMarkers.forEach((m) => registry.get(m.id) && canvas.removeMarker(m.id, m.marker));
        this.appliedMarkers = [];
        overlays.remove({ type: 'debug-count' });
        const marks = diagramMarks(this.state);
        marks.markers.forEach((markers, id) => {
            if (!registry.get(id)) {
                return;
            }
            markers.forEach((marker) => {
                canvas.addMarker(id, marker);
                this.appliedMarkers.push({ id, marker });
            });
        });
        marks.counts.forEach((count, id) => {
            const element = registry.get(id);
            if (!element || element.waypoints) {
                // sequence flows are marked by colour, a number on each would cover the diagram
                return;
            }
            const badge = document.createElement('div');
            badge.className = 'debug-count';
            badge.textContent = String(count);
            badge.title = count + (count === 1 ? ' pass' : ' passes');
            overlays.add(id, 'debug-count', { position: { bottom: 8, right: 8 }, html: badge });
        });
        if (this.selectedElementId && registry.get(this.selectedElementId)) {
            canvas.addMarker(this.selectedElementId, 'debug-selected');
            this.appliedMarkers.push({ id: this.selectedElementId, marker: 'debug-selected' });
        }
    }

    selectElement(id: string | null): void {
        const element = id ? this.viewer?.get('elementRegistry').get(id) : null;
        // a click on the empty canvas hits the process element
        this.selectedElementId = element && element.type !== 'bpmn:Process' && element.type !== 'bpmn:Collaboration' ? id : null;
        this.applyMarks();
    }

    elementName(id: string | undefined): string {
        if (!id) {
            return '';
        }
        const element = this.viewer?.get('elementRegistry').get(id);
        return element?.businessObject?.name || id;
    }

    // --- what the panels show -----------------------------------------------------------------------

    get running(): boolean {
        return instanceIsRunning(this.state?.instance.state);
    }

    get variableRows(): DebugVariableRow[] {
        if (!this.state) {
            return [];
        }
        const rows: DebugVariableRow[] = Object.keys(this.state.variables || {})
            .sort()
            .map((name) => ({ name, variable: this.state!.variables[name] }));
        (this.state.active || []).forEach((a) =>
            Object.keys(a.locals || {})
                .sort()
                .forEach((name) => rows.push({ name, elementId: a.element_id, variable: a.locals![name] })),
        );
        return rows;
    }

    get selectedActive(): EngineActiveElement[] {
        return (this.state?.active || []).filter((a) => a.element_id === this.selectedElementId);
    }

    get selectedWaits(): EngineWait[] {
        return (this.state?.waits || []).filter((w) => w.element_id === this.selectedElementId);
    }

    get selectedIncidents(): EngineIncident[] {
        return (this.state?.incidents || []).filter((i) => i.element_id === this.selectedElementId);
    }

    get selectedStats(): EngineElementStats | undefined {
        if (!this.state) {
            return undefined;
        }
        const run = this.stateRun(this.state);
        return (this.state.elements || []).find((e) => e.element_id === this.selectedElementId && e.run === run);
    }

    describe(activity: EngineActivity): string {
        return describeActivity(activity);
    }

    preview(value: any): string {
        const text = typeof value === 'string' ? value : JSON.stringify(value);
        if (text === undefined) {
            return '';
        }
        return text.length > 120 ? text.substring(0, 120) + '...' : text;
    }

    pretty(value: any): string {
        return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    }

    sourceLabel(source: EngineEventSource): string {
        if (source.import_id) {
            return 'import ' + source.import_id;
        }
        if (source.device_group_id) {
            return 'device group ' + source.device_group_id;
        }
        return 'device ' + (source.device_id || '') + (source.service_id ? ', service ' + source.service_id : '');
    }

    // --- complete values and event reconstruction --------------------------------------------------

    variableKey(row: DebugVariableRow): string {
        return (row.elementId || '') + '/' + row.name;
    }

    /**
     * variableRows builds new rows on every check; without tracking, the rows and the editor in them would be
     * created anew each time, and the ngModel of a new editor asks for the next check: the page hangs.
     */
    trackVariable = (_: number, row: DebugVariableRow): string => this.variableKey(row);

    /** a delta of the live stream replaces the waits; an open trigger form keeps its element and focus */
    trackWait = (_: number, wait: EngineWait): string => wait.element_id + '/' + wait.kind;

    loadFullValue(row: DebugVariableRow): void {
        const key = this.variableKey(row);
        this.loadingValues.add(key);
        const done = (result: { value?: any; unavailable?: boolean; error?: string }) => {
            this.loadingValues.delete(key);
            this.fullValues.set(key, result);
        };
        if (this.mode === 'history' && this.state) {
            this.automationEngineService.getHistoryVariable(this.namespace, this.instanceId, row.name, { seq: this.state.seq }, row.elementId).subscribe({
                next: (v) => done(v.available ? { value: v.value } : { unavailable: true }),
                error: (err) => done({ error: engineErrorMessage(err) }),
            });
        } else {
            this.automationEngineService.getVariable(this.namespace, this.instanceId, row.name, row.elementId).subscribe({
                next: (v) => done({ value: v.value }),
                error: (err) => done({ error: engineErrorMessage(err) }),
            });
        }
    }

    reconstructEvaluations(wait: EngineWait, more = false): void {
        if (!this.state) {
            return;
        }
        const after = more ? this.reconstruction?.next : undefined;
        this.loadingReconstruction = true;
        this.reconstructionError = null;
        this.automationEngineService
            .getEventEvaluations(this.namespace, this.instanceId, wait.element_id, this.stateRun(this.state), after)
            .subscribe({
                next: (r) => {
                    this.loadingReconstruction = false;
                    if (more && this.reconstruction && this.reconstruction.element_id === r.element_id) {
                        r = { ...r, evaluations: [...this.reconstruction.evaluations, ...(r.evaluations || [])] };
                    }
                    this.reconstruction = r;
                },
                error: (err) => {
                    this.loadingReconstruction = false;
                    this.reconstructionError = engineErrorMessage(err);
                },
            });
    }

    // --- search in the history (DBG-16) --------------------------------------------------------------

    kindLabel(kind: string): string {
        return kind.replace(/_/g, ' ');
    }

    /** searches all runs; more continues after the last entry found */
    runSearch(more = false): void {
        const filter: EngineActivityFilter = {};
        (['kind', 'element_id', 'variable', 'value'] as const).forEach((key) => {
            const value = this.search[key]?.trim();
            if (value) {
                filter[key] = value;
            }
        });
        if (Object.keys(filter).length === 0) {
            this.clearSearch();
            return;
        }
        const found = more ? this.searchResults || [] : [];
        const after = found.length > 0 ? found[found.length - 1].seq : 0;
        this.searching = true;
        this.searchError = null;
        this.searchSub?.unsubscribe();
        this.searchSub = this.automationEngineService.getActivities(this.namespace, this.instanceId, after, SEARCH_PAGE, filter).subscribe({
            next: (page) => {
                const items = page.items || [];
                this.searching = false;
                this.searchResults = found.concat(items);
                this.searchHasMore = items.length === SEARCH_PAGE;
            },
            error: (err) => {
                this.searching = false;
                this.searchError = engineErrorMessage(err);
            },
        });
    }

    clearSearch(): void {
        this.searchSub?.unsubscribe();
        this.search = {};
        this.searchResults = null;
        this.searchHasMore = false;
        this.searching = false;
        this.searchError = null;
    }

    /** the search results while a search is shown, otherwise the entries of the stream or around the step */
    get shownActivities(): EngineActivity[] {
        return this.searchResults ?? this.activities;
    }

    // --- interventions (DBG-17) ---------------------------------------------------------------------

    /**
     * Interventions change the instance, so they are offered only live and while it runs. Instances on a
     * gateway are refused by the engine. Whether the user has the write right only the engine knows; its
     * answer is shown.
     */
    get canIntervene(): boolean {
        return this.mode === 'live' && this.running && !!this.state && !this.state.instance.network_id && !this.state.offline;
    }

    canTrigger(wait: EngineWait): boolean {
        return this.canIntervene && (wait.kind === 'message' || wait.kind === 'timer');
    }

    isEditing(row: DebugVariableRow): boolean {
        return this.canIntervene && !row.elementId && this.editing?.name === row.name;
    }

    /** opens the editor with the complete value, loaded first if the state holds it cut */
    editVariable(row: DebugVariableRow): void {
        this.triggering = null;
        this.actionError = null;
        this.actionDone = null;
        const full = this.fullValues.get(this.variableKey(row));
        if (!row.variable.truncated) {
            this.editing = { name: row.name, text: JSON.stringify(row.variable.value, null, 2) };
            return;
        }
        if (full && !full.error && !full.unavailable) {
            this.editing = { name: row.name, text: JSON.stringify(full.value, null, 2) };
            return;
        }
        this.acting = true;
        this.automationEngineService.getVariable(this.namespace, this.instanceId, row.name).subscribe({
            next: (v) => {
                this.acting = false;
                this.editing = { name: row.name, text: JSON.stringify(v.value, null, 2) };
            },
            error: (err) => {
                this.acting = false;
                this.actionError = engineErrorMessage(err);
            },
        });
    }

    saveVariable(): void {
        const editing = this.editing;
        if (!editing) {
            return;
        }
        const parsed = parseJsonInput(editing.text);
        if (parsed.error) {
            editing.error = parsed.error;
            return;
        }
        this.act(this.automationEngineService.setVariable(this.namespace, this.instanceId, editing.name, parsed.value), 'Variable ' + editing.name + ' set.', () => {
            this.editing = null;
            this.fullValues.delete('/' + editing.name);
        });
    }

    startTrigger(wait: EngineWait): void {
        this.editing = null;
        this.actionError = null;
        this.actionDone = null;
        this.triggering = { elementId: wait.element_id, text: '' };
    }

    trigger(): void {
        const triggering = this.triggering;
        if (!triggering) {
            return;
        }
        const parsed = parseJsonInput(triggering.text, true);
        if (parsed.error) {
            triggering.error = parsed.error;
            return;
        }
        this.act(
            this.automationEngineService.triggerWait(this.namespace, this.instanceId, triggering.elementId, parsed.value),
            this.elementName(triggering.elementId) + ' triggered.',
            () => (this.triggering = null),
        );
    }

    /** the live stream or the polling shows what the intervention changed */
    private act(request: Observable<void>, done: string, after: () => void): void {
        this.acting = true;
        this.actionError = null;
        this.actionDone = null;
        request.subscribe({
            next: () => {
                this.acting = false;
                this.actionDone = done;
                after();
            },
            error: (err) => {
                this.acting = false;
                this.actionError = engineErrorMessage(err);
            },
        });
    }

    setTab(index: number): void {
        this.tabIndex = index;
        this.urlState.set({ tab: index > 0 ? index : null });
    }
}
