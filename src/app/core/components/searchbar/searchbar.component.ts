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

import {Component, Input, OnChanges, OnDestroy, OnInit, SimpleChange, SimpleChanges, ChangeDetectionStrategy} from '@angular/core';
import { UntypedFormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {SearchbarService} from './shared/searchbar.service';
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
    @Input() searchTextIn = '';
    @Input() disable = false;
    @Input() supportRefresh = true;
    formControl = new UntypedFormControl(this.searchTextIn);

    constructor(private searchbarService: SearchbarService) {}

    ngOnInit(): void {
        if (this.disable) {
            this.formControl.disable();
        } else {
            this.formControl.enable();
        }
        if (this.formControl.value !== '') {
            this.changeSearchtext();
        }
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
        this.searchbarService.changeMessage('');
    }
}
