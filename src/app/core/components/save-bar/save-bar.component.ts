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
import { MatButton } from '@angular/material/button';

/**
 * Sticky bar at the bottom of a page form: a status text, an optional extra control (`[saveBarExtra]`) before the
 * buttons, Discard and Save. The page decides when it is shown, normally while there are unsaved changes.
 */
@Component({
    selector: 'senergy-save-bar',
    templateUrl: './save-bar.component.html',
    styleUrls: ['./save-bar.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatButton],
    host: { role: 'region', 'aria-label': 'Save changes' },
})
export class SaveBarComponent {
    @Input() status = 'Unsaved changes';
    @Input() saveDisabled = false;
    @Input() discardDisabled = false;
    @Input() saveLabel = 'Save';
    @Input() discardLabel = 'Discard';
    @Output() save = new EventEmitter<void>();
    @Output() discard = new EventEmitter<void>();
}
