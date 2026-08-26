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

import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

interface Tile {
    key: string;
    value: string;
    /** Only meaningful when not readOnly; mirrors the number/text toggle of the plain key-value editor. */
    isText: boolean;
    /** A value this editor cannot represent as number/text (boolean, object, array, null) -- shown read-only, passed through unchanged. */
    readOnly: boolean;
    rawValue?: unknown;
}

/**
 * Live state tab presentation for one record (the site's context, or one zone's/asset's
 * state): a readout card per value with the edit field as a secondary, click-to-reveal
 * action, instead of every value sitting permanently in a form field. Same Input/Output
 * contract as EnvironmentsKeyValueEditorComponent ([record]/(recordChange) with the full
 * updated record), so it drops straight into the existing draft-seeding/touched-tracking/
 * send logic in environment-detail.component.ts without changing any of it -- only the
 * presentation of that one record differs from the plain editor used on the Editor tab.
 *
 * `baseline`, when given, is the value this record started from (initial_states/context
 * as loaded) -- shown as a small "was X" caption so an edited-but-not-yet-applied value is
 * visibly different from one still at its starting point. It is not the simulation's actual
 * current value: the API has no read-back for that (see the tab's own hint text).
 */
@Component({
    selector: 'senergy-environments-live-state-tiles',
    templateUrl: './environments-live-state-tiles.component.html',
    styleUrls: ['./environments-live-state-tiles.component.css'],
})
export class EnvironmentsLiveStateTilesComponent implements OnChanges {
    @Input() record: Record<string, unknown> | undefined;
    @Input() baseline: Record<string, unknown> | undefined;
    @Input() keyHint: ((key: string) => string | undefined) | undefined;
    @Input() emptyHint = 'No values yet.';
    @Output() recordChange = new EventEmitter<Record<string, unknown>>();

    tiles: Tile[] = [];

    /** The one tile currently showing its edit field, if any -- only one at a time, so editing stays a deliberate secondary action. */
    editingKey: string | undefined;
    draftValue = '';
    draftIsText = false;

    addingNew = false;
    newKey = '';
    newValue = '';
    newIsText = false;

    /** Set right after emit(); consumed (and cleared) by the very next ngOnChanges, matched or not -- same echo guard as the plain key-value editor. */
    private lastEmittedRef: Record<string, unknown> | undefined;

    ngOnChanges(changes: SimpleChanges): void {
        const change = changes['record'];
        if (!change) {
            return;
        }
        const isOwnEcho = change.currentValue === this.lastEmittedRef;
        this.lastEmittedRef = undefined;
        if (!isOwnEcho) {
            this.tiles = this.toTiles(this.record);
            this.editingKey = undefined;
        }
    }

    hintFor(key: string): string | undefined {
        return this.keyHint ? this.keyHint(key) : undefined;
    }

    /** Whether the tile's baseline (its starting value) exists and differs from the current draft -- drives the "was X" caption. */
    isChangedFromBaseline(tile: Tile): boolean {
        if (!this.baseline || !(tile.key in this.baseline)) {
            return false;
        }
        return this.formatValue(this.baseline[tile.key]) !== tile.value;
    }

    baselineFor(tile: Tile): string | undefined {
        return this.baseline && tile.key in this.baseline ? this.formatValue(this.baseline[tile.key]) : undefined;
    }

    startEdit(tile: Tile): void {
        this.editingKey = tile.key;
        this.draftValue = tile.value;
        this.draftIsText = tile.isText;
    }

    cancelEdit(): void {
        this.editingKey = undefined;
    }

    commitEdit(): void {
        const key = this.editingKey;
        if (key === undefined) {
            return;
        }
        this.tiles = this.tiles.map((tile) => (tile.key === key ? { ...tile, value: this.draftValue, isText: this.draftIsText } : tile));
        this.editingKey = undefined;
        this.emit();
    }

    removeTile(tile: Tile): void {
        this.tiles = this.tiles.filter((t) => t !== tile);
        if (this.editingKey === tile.key) {
            this.editingKey = undefined;
        }
        this.emit();
    }

    startAdd(): void {
        this.addingNew = true;
        this.newKey = '';
        this.newValue = '';
        this.newIsText = false;
    }

    cancelAdd(): void {
        this.addingNew = false;
    }

    commitAdd(): void {
        if (!this.newKey || this.tiles.some((t) => t.key === this.newKey)) {
            return;
        }
        this.tiles = [...this.tiles, { key: this.newKey, value: this.newValue, isText: this.newIsText, readOnly: false }];
        this.addingNew = false;
        this.emit();
    }

    trackByKey(_index: number, tile: Tile): string {
        return tile.key;
    }

    private emit(): void {
        const record: Record<string, unknown> = {};
        for (const tile of this.tiles) {
            if (!tile.key) {
                continue;
            }
            if (tile.readOnly) {
                record[tile.key] = tile.rawValue;
            } else if (!tile.isText) {
                const parsed = Number(tile.value);
                record[tile.key] = tile.value === '' || Number.isNaN(parsed) ? 0 : parsed;
            } else {
                record[tile.key] = tile.value;
            }
        }
        this.lastEmittedRef = record;
        this.recordChange.emit(record);
    }

    private toTiles(record: Record<string, unknown> | undefined): Tile[] {
        return Object.entries(record || {}).map(([key, value]) => {
            if (typeof value === 'number') {
                return { key, value: String(value), isText: false, readOnly: false };
            }
            if (typeof value === 'string') {
                return { key, value, isText: true, readOnly: false };
            }
            return { key, value: JSON.stringify(value), isText: false, readOnly: true, rawValue: value };
        });
    }

    private formatValue(value: unknown): string {
        if (typeof value === 'number' || typeof value === 'string') {
            return String(value);
        }
        return JSON.stringify(value);
    }
}
