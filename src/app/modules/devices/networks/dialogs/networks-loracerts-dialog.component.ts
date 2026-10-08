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

import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { HubModel, LoraCertsModel } from '../shared/networks.model';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { NgClass, DatePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';

@Component({
    templateUrl: './networks-loracerts-dialog.component.html',
    styleUrls: ['./networks-loracerts-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, MatFormField, MatLabel, MatInput, MatIconButton, MatPrefix, MatTooltip, NgClass, MatIcon, CdkTextareaAutosize, MatDialogActions, MatButton, DatePipe]
})
export class NetworksLoraCertsDialogComponent {
    private dialogRef = inject<MatDialogRef<NetworksLoraCertsDialogComponent>>(MatDialogRef);

    network: HubModel;
    certs: LoraCertsModel;
    clipboardTooltipTimeout: unknown[] = [];
    clipboardTooltip = 'Copy to Clipboard';

    constructor() {
        const data = inject<{
            network: HubModel;
            certs: LoraCertsModel;
        }>(MAT_DIALOG_DATA);

        this.network = data.network;
        this.certs = data.certs;
    }

    close(): void {
        this.dialogRef.close();
    }

    copyToClipboard(id: number, text: string) {
        navigator.clipboard.writeText(text);
        this.clipboardTooltipTimeout[id] = setTimeout(() => this.clipboardTooltipTimeout[id] = undefined, 2000);
    }
}
