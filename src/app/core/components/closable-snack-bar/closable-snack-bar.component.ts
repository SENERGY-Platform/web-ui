/*
 * Copyright 2021 InfAI (CC SES)
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

import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
    selector: 'senergy-closable-snack-bar',
    templateUrl: './closable-snack-bar.component.html',
    styleUrls: ['./closable-snack-bar.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatButton, MatIconButton, MatIcon]
})
export class ClosableSnackBarComponent {
    snackBarRef = inject<MatSnackBarRef<ClosableSnackBarComponent>>(MatSnackBarRef);
    data = inject(MAT_SNACK_BAR_DATA);
}
