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

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { Environment } from '../../shared/environments.model';
import { EnvironmentsLiveStateTilesComponent } from './environments-live-state-tiles.component';
import { EnvironmentsLiveState, LiveStateEntry } from './environments-live-state.service';

/**
 * Content of the environment editor's Live state tab. The state lives in EnvironmentsLiveState, provided
 * on the editor, so the editor can feed it without the OnPush child being marked dirty from outside.
 */
@Component({
    selector: 'senergy-environments-live-state-tab',
    templateUrl: './environments-live-state-tab.component.html',
    styleUrls: ['./environments-live-state-tab.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButton, MatIcon, MatTooltip, DatePipe, EnvironmentsLiveStateTilesComponent],
})
export class EnvironmentsLiveStateTabComponent {
    /** The loaded document, used to reseed the drafts on "Reload current values". */
    readonly environment = input.required<Environment>();

    protected readonly liveState = inject(EnvironmentsLiveState);

    onContextChange(record: Record<string, unknown>): void {
        this.liveState.changeContext(record);
    }

    onZoneStateChange(entry: LiveStateEntry, record: Record<string, unknown>): void {
        this.liveState.changeEntry(entry, record);
    }

    onAssetStateChange(entry: LiveStateEntry, record: Record<string, unknown>): void {
        this.liveState.changeEntry(entry, record);
    }

    zoneKeyHint(entry: LiveStateEntry): (key: string) => string | undefined {
        return (key: string) =>
            entry.target.timeConstantKeys.includes(key)
                ? 'This value follows its set point gradually over this zone\'s time constant instead of jumping to it immediately.'
                : undefined;
    }

    /** Re-derives the drafts from the loaded definition, discarding unsent edits; bound to "Reload current values". */
    reloadLiveStateDefaults(): void {
        this.liveState.reset(this.environment());
    }

    applyLiveState(): void {
        this.liveState.apply();
    }
}
