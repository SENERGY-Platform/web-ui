/*
 * Copyright 2020 InfAI (CC SES)
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

import { Component, DestroyRef, EventEmitter, Input, Output, OnChanges, OnDestroy, OnInit, SimpleChange, SimpleChanges, ChangeDetectionStrategy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import {SearchbarService} from './shared/searchbar.service';
import { UrlStateService } from '../../services/url-state.service';
import { MatFormField, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
    selector: 'senergy-searchbar',
    templateUrl: './searchbar.component.html',
    styleUrls: ['./searchbar.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatFormField, MatLabel, MatIcon, MatPrefix, MatInput, FormsModule, ReactiveFormsModule, MatIconButton, MatSuffix, MatTooltip]
})
export class SearchbarComponent implements OnDestroy, OnChanges, OnInit {
    private searchbarService = inject(SearchbarService);
    private urlState = inject(UrlStateService);
    private destroyRef = inject(DestroyRef);

    @Input() searchTextIn = '';
    @Input() disable = false;
    @Input() supportRefresh = true;
    /** Compact variant of the list toolbar: placeholder instead of floating label, 40px, no subscript line. */
    @Input() compact = false;
    /** Emitted by the refresh button; in compact mode it is the only effect, the search text is not re-sent. */
    @Output() refresh = new EventEmitter<void>();
    formControl = new FormControl<string | null>(this.searchTextIn);

    ngOnInit(): void {
        if (this.disable) {
            this.formControl.disable();
        } else {
            this.formControl.enable();
        }
        // the search of a reloaded or shared link wins over the initial text a page passes in
        const urlSearch = this.urlState.get('search');
        if (urlSearch !== null) {
            this.formControl.setValue(urlSearch);
        }
        if (this.formControl.value !== '') {
            this.changeSearchtext();
        }
        this.formControl.valueChanges.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
            if ((this.urlState.get('search') || '') !== (value ?? '')) {
                this.urlState.set({ search: value });
            }
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.searchTextIn) {
            const input: SimpleChange = changes.searchTextIn;
            this.formControl.setValue(input.currentValue);
        }
        if (changes.disable) {
            const input: SimpleChange = changes.disable;
            if (input.currentValue) {
                this.formControl.disable();
            } else {
                this.formControl.enable();
            }
        }
    }

    onRefresh(): void {
        if (!this.compact) {
            this.changeSearchtext();
        }
        this.refresh.emit();
    }

    changeSearchtext(): void {
        this.searchbarService.changeMessage(this.formControl.value as string);
    }

    resetSearchtext(): void {
        this.formControl.setValue('');
        this.searchbarService.changeMessage(this.formControl.value as string);
    }

    ngOnDestroy() {
        this.searchbarService.changeMessage('');
    }
}
