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

import {Component, Input, OnChanges, OnDestroy, OnInit, SimpleChange, SimpleChanges} from '@angular/core';
import {UntypedFormControl} from '@angular/forms';
import {Subscription} from 'rxjs';
import {debounceTime} from 'rxjs/operators';
import {SearchbarService} from './shared/searchbar.service';
import {UrlStateService} from '../../services/url-state.service';

@Component({
    selector: 'senergy-searchbar',
    templateUrl: './searchbar.component.html',
    styleUrls: ['./searchbar.component.css'],
})
export class SearchbarComponent implements OnDestroy, OnChanges, OnInit {
    @Input() searchTextIn = '';
    @Input() disable = false;
    @Input() supportRefresh = true;
    formControl = new UntypedFormControl(this.searchTextIn);
    private urlSub = new Subscription();

    constructor(private searchbarService: SearchbarService, private urlState: UrlStateService) {}

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
        this.urlSub = this.formControl.valueChanges.pipe(debounceTime(300)).subscribe((value: string) => {
            if ((this.urlState.get('search') || '') !== value) {
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

    changeSearchtext(): void {
        this.searchbarService.changeMessage(this.formControl.value);
    }

    resetSearchtext(): void {
        this.formControl.setValue('');
        this.searchbarService.changeMessage(this.formControl.value);
    }

    ngOnDestroy() {
        this.urlSub.unsubscribe();
        this.searchbarService.changeMessage('');
    }
}
