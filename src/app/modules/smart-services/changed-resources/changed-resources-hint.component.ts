/*
 * Copyright 2022 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { formatDate } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { SmartServiceChangedResource } from '../releases/shared/release.model';

const kindLabels: { [kind: string]: string } = {
    process_model: 'Process model',
    flow: 'Flow',
    import_type: 'Import type',
};

/**
 * Warning icon for a release whose process model, flow or import type changed or disappeared after
 * the release was created. The repository only hints at it, so the text says so.
 */
@Component({
    selector: 'senergy-changed-resources-hint',
    template: `@if (resources && resources.length > 0) {<mat-icon class="changed-resources-hint" color="warn"
        matTooltipClass="multiline-tooltip" [matTooltip]="tooltip">warning</mat-icon>}`,
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatIcon, MatTooltip],
})
export class ChangedResourcesHintComponent {
    @Input() resources?: SmartServiceChangedResource[];

    get tooltip(): string {
        const lines = (this.resources || []).map((r) =>
            (kindLabels[r.kind] || r.kind) + ' ' + r.id + ': ' + (r.reason === 'gone' ? 'gone' : 'changed')
            + ' on ' + formatDate(r.at * 1000, 'dd.MM.yy, HH:mm', 'en-US'));
        return 'Resources used by this release changed or are gone since it was created:\n' + lines.join('\n');
    }
}
