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

import {Component, EventEmitter, Input, OnChanges, Output, SimpleChange, SimpleChanges} from '@angular/core';
import {SortModel} from './shared/sort.model';

@Component({
    selector: 'senergy-sort',
    templateUrl: './sort.component.html',
    styleUrls: ['./sort.component.css']
})
export class SortComponent implements OnChanges {

    @Input() sortAttributes: SortModel[] = [];
    @Output() messageEvent: EventEmitter<SortModel> = new EventEmitter();

    selected = 0;

    constructor() {
    }

    sendMessage(item: SortModel, index: number) {
        if (this.selected === index) {
            switch (item.order) {
                case 'asc': {
                    item.order = 'desc';
                    break;
                }
                case 'desc': {
                    item.order = 'asc';
                    break;
                }
                default: {
                    throw new Error('Unknown order value:' + item.order);
                }
            }
        }

        this.selected = index;

        this.messageEvent.emit(item);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.sortAttributes) {
            const input: SimpleChange = changes.sortAttributes;
            this.selected = 0;
            this.sortAttributes = input.currentValue;
        }
    }

}
