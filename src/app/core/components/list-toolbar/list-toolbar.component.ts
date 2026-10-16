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

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { SearchbarComponent } from '../searchbar/searchbar.component';

/**
 * Row under the page header of a list: the search (through the global SearchbarService) and the filters
 * (`[toolbarFilters]`). With `selectedCount` above zero a selection bar with `[bulkActions]` replaces it.
 */
@Component({
    selector: 'senergy-list-toolbar',
    templateUrl: './list-toolbar.component.html',
    styleUrls: ['./list-toolbar.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [SearchbarComponent, MatIconButton, MatIcon],
})
export class ListToolbarComponent {
    @Input() selectedCount = 0;
    /** Text the search starts with, for pages that restore the last search. */
    @Input() searchTextIn = '';
    /** The search field's refresh button; pages that reload on it listen to `(refresh)`. */
    @Output() refresh = new EventEmitter<void>();
    @Output() clearSelection = new EventEmitter<void>();
}
