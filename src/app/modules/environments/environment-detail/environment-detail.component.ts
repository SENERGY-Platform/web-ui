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

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { EnvironmentsService } from '../shared/environments.service';
import { DialogsService } from '../../../core/services/dialogs.service';
import {
    ANCHOR_MODES,
    anchorModeLabel,
    Asset,
    ASSET_KINDS,
    assetKindLabel,
    Channel,
    DatasetColumn,
    DatasetMeta,
    DATASET_ORIGINS,
    datasetOriginLabel,
    DIRECTIONS,
    directionLabel,
    Environment,
    ENVIRONMENT_TYPES,
    environmentTypeLabel,
    isApiError,
    isValidationError,
    Problem,
    ProfileSource,
    RESAMPLE_MODES,
    resampleModeHint,
    resampleModeLabel,
    Source,
    SourceKind,
    SOURCE_KINDS,
    sourceKindLabel,
    StateChange,
    Zone,
    ZONE_TYPES,
    zoneTypeLabel,
} from '../shared/environments.model';
import { EnvTreeNode, buildEnvironmentTree, findNodeByKey, locationKey, pathToKey } from '../shared/environments-tree';
import { locationContains, problemPath, sameLocation } from '../shared/environments-path';
import { applySourceKind, withFactorSet } from '../shared/environments-source';
import { findNonIntegerFields } from '../shared/environments-integrity';
import {
    buildStateChange,
    diffTouchedKeys,
    flattenAssetTargets,
    flattenZoneTargets,
    NamedStateTarget,
    pickTouched,
} from '../shared/environments-live-state';

interface SelectedNodeProblem {
    message: string;
    suffix?: string;
}

/** One zone or asset row in the Live state tab: the suggested defaults, the working draft and which keys the user actually touched. */
interface LiveStateEntry {
    target: NamedStateTarget;
    draft: Record<string, unknown>;
    touched: Set<string>;
}

/**
 * Editor for a single environment: a tree of its zones/assets/channels on the left,
 * the form for whichever node is selected on the right. The whole document is edited
 * in place client-side and written back in one PUT; there is no per-node save.
 */
@Component({
    selector: 'senergy-environment-detail',
    templateUrl: './environment-detail.component.html',
    styleUrls: ['./environment-detail.component.css'],
})
export class EnvironmentDetailComponent implements OnInit {
    id = '';
    environment: Environment | undefined;
    dataReady = false;
    isSaving = false;
    /**
     * Set by every mutation (ngModelChange on a field, a key-value editor emit, a tree
     * structural change) and cleared by load()/a successful save. Deliberately not derived
     * from JSON.stringify-ing the whole document on every read: that comparison used to
     * live in a template binding, so it ran on every change-detection pass rather than
     * once per actual edit.
     */
    isDirty = false;
    problems: Problem[] = [];
    datasets: DatasetMeta[] = [];

    treeControl = new NestedTreeControl<EnvTreeNode, string>((node) => node.children, { trackBy: (node) => node.key });
    dataSource = new MatTreeNestedDataSource<EnvTreeNode>();
    root: EnvTreeNode | undefined;
    selectedKey: string | undefined;
    selectedNode: EnvTreeNode | undefined;

    /** Node keys with a problem at or below them, for the tree badge. Recomputed once per problems/tree change, not per template check. */
    problemNodeKeys = new Set<string>();
    /** Problems located exactly at the selected node, for display above its editor. */
    selectedNodeProblems: SelectedNodeProblem[] = [];
    /** Formula source's inputs as a stable array for *ngFor; recomputed on selection or structural change, not on every keystroke. */
    formulaEntries: { name: string; ref: string }[] = [];

    // template lookups: the model file's UI helper arrays/label functions, exposed on the instance
    ENVIRONMENT_TYPES = ENVIRONMENT_TYPES;
    environmentTypeLabel = environmentTypeLabel;
    ZONE_TYPES = ZONE_TYPES;
    zoneTypeLabel = zoneTypeLabel;
    ASSET_KINDS = ASSET_KINDS;
    assetKindLabel = assetKindLabel;
    DIRECTIONS = DIRECTIONS;
    directionLabel = directionLabel;
    SOURCE_KINDS = SOURCE_KINDS;
    sourceKindLabel = sourceKindLabel;
    DATASET_ORIGINS = DATASET_ORIGINS;
    datasetOriginLabel = datasetOriginLabel;
    RESAMPLE_MODES = RESAMPLE_MODES;
    resampleModeLabel = resampleModeLabel;
    resampleModeHint = resampleModeHint;
    ANCHOR_MODES = ANCHOR_MODES;
    anchorModeLabel = anchorModeLabel;

    hourIndexes = Array.from({ length: 24 }, (_, i) => i);
    weekdayIndexes = Array.from({ length: 7 }, (_, i) => i);
    weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Live state tab: draft values to PATCH onto the running simulation. Prefilled from
    // the definition's initial_states as a starting suggestion, not as the current live
    // value -- the API has no read path for that, see the hint text in the template.
    contextDraft: Record<string, unknown> = {};
    contextTouched = new Set<string>();
    zoneStates: LiveStateEntry[] = [];
    assetStates: LiveStateEntry[] = [];
    liveStateApplying = false;
    /** Undefined (nothing touched) drives the Apply button's disabled state; recomputed on every touch, not read as a method from the template. */
    pendingChange: StateChange | undefined;

    private selectedNodeProblemsByKey = new Map<string, SelectedNodeProblem[]>();

    constructor(
        private route: ActivatedRoute,
        private environmentsService: EnvironmentsService,
        private dialogsService: DialogsService,
        private snackBar: MatSnackBar,
    ) {}

    ngOnInit(): void {
        this.id = this.route.snapshot.paramMap.get('id') || '';
        this.environmentsService.listDatasets().subscribe((datasets) => (this.datasets = datasets));
        this.load();
    }

    /** @param preserveSelection Keep the current selectedKey instead of resetting to the root -- used after a successful save, so the user is not bounced out of what they were editing. */
    load(preserveSelection = false): void {
        this.dataReady = false;
        if (!preserveSelection) {
            this.selectedKey = undefined;
        }
        this.environmentsService.getEnvironment(this.id).subscribe((env) => {
            if (!env) {
                this.snackBar.open('Error while loading the environment!', 'close', { panelClass: 'snack-bar-error' });
                this.dataReady = true;
                return;
            }
            this.normalizeEnvironment(env);
            this.environment = env;
            this.isDirty = false;
            this.problems = [];
            this.rebuildTree();
            this.indexProblems();
            this.resetLiveState();
            this.dataReady = true;
        });
    }

    markDirty(): void {
        this.isDirty = true;
    }

    discard(): void {
        this.load();
    }

    save(): void {
        if (!this.environment?.id || this.isSaving) {
            return;
        }
        const nonIntegerFields = findNonIntegerFields(this.environment);
        if (nonIntegerFields.length > 0) {
            this.snackBar.open('These fields must be whole numbers: ' + nonIntegerFields.join(', '), 'close', { panelClass: 'snack-bar-error' });
            return;
        }
        this.isSaving = true;
        this.environmentsService.updateEnvironmentChecked(this.environment.id, this.environment).subscribe((result) => {
            this.isSaving = false;
            if (isValidationError(result)) {
                this.problems = result.problems || [];
                this.indexProblems();
                this.snackBar.open('The environment could not be saved: see the problems below.', 'close', { panelClass: 'snack-bar-error' });
                return;
            }
            if (isApiError(result)) {
                // Anything from a 500 to a plaintext 400 (e.g. a Go json.Unmarshal message)
                // lands here -- it must never be mistaken for success, and the edit stays
                // exactly as the user left it (no load(), nothing to re-confirm or redo).
                this.snackBar.open(result.message, 'close', { panelClass: 'snack-bar-error' });
                return;
            }
            // result is the saved Environment: a genuine success.
            this.isDirty = false;
            this.problems = [];
            this.indexProblems();
            this.snackBar.open('Environment saved successfully.', undefined, { duration: 2000 });
            this.load(true); // the server may have assigned ids to new nodes; keep the current selection
        });
    }

    onContextChange(record: Record<string, unknown>): void {
        this.contextTouched = diffTouchedKeys(this.contextDraft, record, this.contextTouched);
        this.contextDraft = record;
        this.recomputePendingChange();
    }

    onZoneStateChange(entry: LiveStateEntry, record: Record<string, unknown>): void {
        entry.touched = diffTouchedKeys(entry.draft, record, entry.touched);
        entry.draft = record;
        this.recomputePendingChange();
    }

    onAssetStateChange(entry: LiveStateEntry, record: Record<string, unknown>): void {
        entry.touched = diffTouchedKeys(entry.draft, record, entry.touched);
        entry.draft = record;
        this.recomputePendingChange();
    }

    zoneKeyHint(entry: LiveStateEntry): (key: string) => string | undefined {
        return (key: string) =>
            entry.target.timeConstantKeys.includes(key)
                ? 'This value follows its set point gradually over this zone\'s time constant instead of jumping to it immediately.'
                : undefined;
    }

    applyLiveState(): void {
        const change = this.pendingChange;
        if (!change || !this.environment?.id || this.liveStateApplying) {
            return;
        }
        this.liveStateApplying = true;
        this.environmentsService.setStateChecked(this.environment.id, change).subscribe((result) => {
            this.liveStateApplying = false;
            if (isApiError(result)) {
                this.snackBar.open(result.message, 'close', { panelClass: 'snack-bar-error' });
                return;
            }
            this.snackBar.open('Applied - takes effect on the next tick.', undefined, { duration: 2000 });
            this.contextTouched = new Set();
            this.zoneStates.forEach((entry) => (entry.touched = new Set()));
            this.assetStates.forEach((entry) => (entry.touched = new Set()));
            this.recomputePendingChange();
        });
    }

    select(node: EnvTreeNode): void {
        this.selectedKey = node.key;
        this.selectedNode = node;
        this.refreshSelectedNodeProblems();
        this.refreshFormulaEntries();
    }

    get selectedEnvironment(): Environment | undefined {
        return this.selectedNode?.kind === 'environment' ? (this.selectedNode.data as Environment) : undefined;
    }

    get selectedZone(): Zone | undefined {
        return this.selectedNode?.kind === 'zone' ? (this.selectedNode.data as Zone) : undefined;
    }

    get selectedAsset(): Asset | undefined {
        return this.selectedNode?.kind === 'asset' ? (this.selectedNode.data as Asset) : undefined;
    }

    get selectedChannel(): Channel | undefined {
        return this.selectedNode?.kind === 'channel' ? (this.selectedNode.data as Channel) : undefined;
    }

    addZone(node: EnvTreeNode): void {
        const zones = this.zonesOf(node);
        zones.push({ name: 'New Zone', type: 'room' });
        this.selectedKey = locationKey('zone', { zoneIndexes: [...node.location.zoneIndexes, zones.length - 1] });
        this.afterStructuralChange();
    }

    addAsset(node: EnvTreeNode): void {
        const assets = this.assetsOf(node);
        assets.push({ name: 'New Asset', kind: 'sensor' });
        this.selectedKey = locationKey('asset', { zoneIndexes: node.location.zoneIndexes, assetIndex: assets.length - 1 });
        this.afterStructuralChange();
    }

    addChannel(node: EnvTreeNode): void {
        const channels = this.channelsOf(node);
        channels.push({ name: 'New Channel', direction: 'sensor', source: { kind: 'script', script: {} } });
        this.selectedKey = locationKey('channel', {
            zoneIndexes: node.location.zoneIndexes,
            assetIndex: node.location.assetIndex,
            channelIndex: channels.length - 1,
        });
        this.afterStructuralChange();
    }

    deleteNode(node: EnvTreeNode): void {
        const name = (node.data as { name?: string }).name || node.name;
        this.dialogsService
            .openDeleteDialog(node.kind + ' "' + name + '"')
            .afterClosed()
            .subscribe((confirmed: boolean) => {
                if (!confirmed) {
                    return;
                }
                // Always land on the deleted node's parent: relying on "keep selectedKey,
                // fall back to root if it no longer resolves" silently moves the selection
                // to whatever now occupies the old key when a *different*, earlier sibling
                // was deleted (its removal shifts every later sibling's index/key).
                this.selectedKey = this.parentKeyOf(node);
                this.removeNode(node);
                this.afterStructuralChange();
            });
    }

    onSourceKindChange(channel: Channel, kind: SourceKind): void {
        channel.source = applySourceKind(channel.source || {}, kind);
        this.refreshFormulaEntries();
        this.markDirty();
    }

    setEnvironmentContext(env: Environment, record: Record<string, unknown>): void {
        env.context = record;
        this.markDirty();
    }

    setZoneInitialStates(zone: Zone, record: Record<string, unknown>): void {
        zone.initial_states = record;
        this.markDirty();
    }

    setAssetInitialStates(asset: Asset, record: Record<string, unknown>): void {
        asset.initial_states = record;
        this.markDirty();
    }

    /** time_constants is number-only; the key-value editor emits Record<string, unknown> for both of its modes. */
    setTimeConstants(zone: Zone, record: Record<string, unknown>): void {
        zone.time_constants = record as Record<string, number>;
        this.markDirty();
    }

    setChannelDirection(channel: Channel, direction: Channel['direction']): void {
        channel.direction = direction;
        this.markDirty();
    }

    setHourFactor(profile: ProfileSource, index: number, value: number): void {
        profile.hour_factors = withFactorSet(profile.hour_factors, 24, index, Number(value));
        this.markDirty();
    }

    setWeekdayFactor(profile: ProfileSource, index: number, value: number): void {
        profile.weekday_factors = withFactorSet(profile.weekday_factors, 7, index, Number(value));
        this.markDirty();
    }

    columnsForDataset(datasetId: string | undefined): DatasetColumn[] {
        return this.datasets.find((d) => d.id === datasetId)?.columns || [];
    }

    addFormulaInput(): void {
        const formula = this.selectedChannel?.source?.formula;
        if (!formula) {
            return;
        }
        if (!formula.inputs) {
            formula.inputs = {};
        }
        let name = 'input';
        let i = 1;
        while (formula.inputs[name] !== undefined) {
            name = 'input' + ++i;
        }
        formula.inputs[name] = '';
        this.refreshFormulaEntries();
        this.markDirty();
    }

    /** Called on every keystroke in the Reference field; also keeps the cached entry in sync so a later unrelated refresh cannot show a stale value. */
    setFormulaInput(name: string, ref: string): void {
        const inputs = this.selectedChannel?.source?.formula?.inputs;
        if (inputs) {
            inputs[name] = ref;
        }
        const entry = this.formulaEntries.find((e) => e.name === name);
        if (entry) {
            entry.ref = ref;
        }
        this.markDirty();
    }

    /** Called on blur, not on every keystroke: renaming a map key while the user is still typing would rebuild the *ngFor entries (and so the DOM node) on every character. */
    renameFormulaInput(oldName: string, newName: string): void {
        const inputs = this.selectedChannel?.source?.formula?.inputs;
        if (!inputs || !newName || oldName === newName || inputs[oldName] === undefined) {
            return;
        }
        const value = inputs[oldName];
        delete inputs[oldName];
        inputs[newName] = value;
        this.refreshFormulaEntries();
        this.markDirty();
    }

    removeFormulaInput(name: string): void {
        const inputs = this.selectedChannel?.source?.formula?.inputs;
        if (inputs) {
            delete inputs[name];
        }
        this.refreshFormulaEntries();
        this.markDirty();
    }

    trackByFormulaName(_index: number, entry: { name: string }): string {
        return entry.name;
    }

    private zonesOf(node: EnvTreeNode): Zone[] {
        const holder = node.data as { zones?: Zone[] };
        if (!holder.zones) {
            holder.zones = [];
        }
        return holder.zones;
    }

    private assetsOf(node: EnvTreeNode): Asset[] {
        const zone = node.data as Zone;
        if (!zone.assets) {
            zone.assets = [];
        }
        return zone.assets;
    }

    private channelsOf(node: EnvTreeNode): Channel[] {
        const asset = node.data as Asset;
        if (!asset.channels) {
            asset.channels = [];
        }
        return asset.channels;
    }

    /** Walks the environment's zone chain to the Zone at the given index chain (must be non-empty). */
    private zoneAt(zoneIndexes: number[]): Zone {
        let zones = this.environment!.zones || [];
        let zone: Zone | undefined;
        for (const index of zoneIndexes) {
            zone = zones[index];
            zones = zone?.zones || [];
        }
        return zone!;
    }

    /** The zones array that directly holds the zone at `parentZoneIndexes` -- the environment's own for the empty chain. */
    private zonesContainerFor(parentZoneIndexes: number[]): Zone[] {
        const holder: { zones?: Zone[] } = parentZoneIndexes.length === 0 ? this.environment! : this.zoneAt(parentZoneIndexes);
        if (!holder.zones) {
            holder.zones = [];
        }
        return holder.zones;
    }

    /** The key of the node that will remain selected once `node` is removed. */
    private parentKeyOf(node: EnvTreeNode): string {
        const { zoneIndexes, assetIndex } = node.location;
        if (node.kind === 'zone') {
            const parentChain = zoneIndexes.slice(0, -1);
            return parentChain.length === 0 ? locationKey('environment', { zoneIndexes: [] }) : locationKey('zone', { zoneIndexes: parentChain });
        }
        if (node.kind === 'asset') {
            return locationKey('zone', { zoneIndexes });
        }
        return locationKey('asset', { zoneIndexes, assetIndex });
    }

    private removeNode(node: EnvTreeNode): void {
        const { zoneIndexes, assetIndex, channelIndex } = node.location;
        if (node.kind === 'zone') {
            const container = this.zonesContainerFor(zoneIndexes.slice(0, -1));
            container.splice(zoneIndexes[zoneIndexes.length - 1], 1);
        } else if (node.kind === 'asset' && assetIndex !== undefined) {
            const zone = this.zoneAt(zoneIndexes);
            (zone.assets || []).splice(assetIndex, 1);
        } else if (node.kind === 'channel' && assetIndex !== undefined && channelIndex !== undefined) {
            const asset = (this.zoneAt(zoneIndexes).assets || [])[assetIndex];
            (asset.channels || []).splice(channelIndex, 1);
        }
    }

    /** Common tail of every structural edit: stale problems no longer point at the right nodes once indexes shift, so they are dropped rather than mis-displayed. */
    private afterStructuralChange(): void {
        this.problems = [];
        this.markDirty();
        this.rebuildTree();
        this.indexProblems();
    }

    /** (Re)seeds the Live state tab's drafts from the definition's initial_states, discarding any unsent edits. */
    private resetLiveState(): void {
        if (!this.environment) {
            return;
        }
        this.contextDraft = { ...(this.environment.context || {}) };
        this.contextTouched = new Set();
        this.zoneStates = flattenZoneTargets(this.environment.zones).map((target) => ({
            target,
            draft: { ...target.initialStates },
            touched: new Set<string>(),
        }));
        this.assetStates = flattenAssetTargets(this.environment.zones).map((target) => ({
            target,
            draft: { ...target.initialStates },
            touched: new Set<string>(),
        }));
        this.recomputePendingChange();
    }

    private recomputePendingChange(): void {
        const zonesById: Record<string, Record<string, unknown>> = {};
        this.zoneStates.forEach((entry) => (zonesById[entry.target.id] = pickTouched(entry.draft, entry.touched)));
        const assetsById: Record<string, Record<string, unknown>> = {};
        this.assetStates.forEach((entry) => (assetsById[entry.target.id] = pickTouched(entry.draft, entry.touched)));
        this.pendingChange = buildStateChange(pickTouched(this.contextDraft, this.contextTouched), zonesById, assetsById);
    }

    private refreshFormulaEntries(): void {
        const inputs = this.selectedChannel?.source?.formula?.inputs || {};
        this.formulaEntries = Object.entries(inputs).map(([name, ref]) => ({ name, ref }));
    }

    private rebuildTree(): void {
        if (!this.environment) {
            return;
        }
        this.root = buildEnvironmentTree(this.environment);
        this.dataSource.data = [this.root];
        this.revealSelection();
    }

    private revealSelection(): void {
        if (!this.root) {
            return;
        }
        const found = this.selectedKey ? findNodeByKey(this.root, this.selectedKey) : undefined;
        this.selectedNode = found || this.root;
        this.selectedKey = this.selectedNode.key;
        pathToKey(this.root, this.selectedKey).forEach((n) => this.treeControl.expand(n));
        this.refreshSelectedNodeProblems();
        this.refreshFormulaEntries();
    }

    /**
     * Translates `this.problems` (server paths) into a per-node index exactly once, instead
     * of re-parsing every problem's path with a regex on every node on every change-detection
     * cycle (which is what a `hasProblem(node)` method called from the template did before).
     */
    private indexProblems(): void {
        this.problemNodeKeys = new Set();
        this.selectedNodeProblemsByKey = new Map();
        if (!this.root) {
            this.refreshSelectedNodeProblems();
            return;
        }
        const parsed = this.problems.map((p) => ({ problem: p, location: problemPath(p.path || '') }));
        const walk = (node: EnvTreeNode): void => {
            if (parsed.some(({ location }) => locationContains(node.location, location))) {
                this.problemNodeKeys.add(node.key);
            }
            const exact: SelectedNodeProblem[] = parsed
                .filter(({ location }) => sameLocation(location, node.location))
                .map(({ problem, location }) => ({ message: problem.message || '', suffix: location.suffix }));
            if (exact.length > 0) {
                this.selectedNodeProblemsByKey.set(node.key, exact);
            }
            node.children.forEach(walk);
        };
        walk(this.root);
        this.refreshSelectedNodeProblems();
    }

    private refreshSelectedNodeProblems(): void {
        this.selectedNodeProblems = this.selectedNode ? this.selectedNodeProblemsByKey.get(this.selectedNode.key) || [] : [];
    }

    /**
     * Fills in what the server may have omitted as an empty value (source.kind without its
     * variant object) so templates can bind straight into e.g. source.script!.code. Runs
     * once right after loading, before isDirty is reset, so it never shows up as an unsaved
     * change on its own.
     */
    private normalizeEnvironment(env: Environment): void {
        const walkZones = (zones: Zone[] | undefined): void => {
            (zones || []).forEach((zone) => {
                (zone.assets || []).forEach((asset) => {
                    (asset.channels || []).forEach((channel) => {
                        channel.source = this.normalizeSource(channel.source);
                    });
                });
                walkZones(zone.zones);
            });
        };
        walkZones(env.zones);
    }

    private normalizeSource(source: Source | undefined): Source {
        const s = source || { kind: 'script' as const };
        if (!s.kind) {
            s.kind = 'script';
        }
        if (s.kind === 'script' && !s.script) {
            s.script = {};
        }
        if (s.kind === 'profile' && !s.profile) {
            s.profile = {};
        }
        if (s.kind === 'dataset' && !s.dataset) {
            s.dataset = {};
        }
        if (s.kind === 'formula' && !s.formula) {
            s.formula = {};
        }
        return s;
    }
}
