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

import { booleanAttribute, ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

/**
 * Head of a page: optional back link above the title, title, optional one-line description, and the page
 * actions (`[pageActions]`) on the right.
 */
@Component({
    selector: 'senergy-page-header',
    templateUrl: './page-header.component.html',
    styleUrls: ['./page-header.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [RouterLink, MatIcon],
    host: { '[class.compact]': 'compact' },
})
export class PageHeaderComponent {
    @Input({ required: true }) title = '';
    @Input() description = '';
    /** Text and router link of the back link; shown only when both are set. */
    @Input() backLabel = '';
    @Input() backLink: string | unknown[] = '';
    /** One line for editors that give the height to a canvas: back link, title and status side by side, no description. */
    @Input({ transform: booleanAttribute }) compact = false;
}
