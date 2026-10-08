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

import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { EnvironmentsService } from '../../shared/environments.service';
import { CatalogDeviceType } from '../../shared/environments.model';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatFormField, MatLabel, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { MatButton } from '@angular/material/button';

export interface AddMachineDialogResult {
    name: string;
    deviceType: CatalogDeviceType;
}

/**
 * Collects what "add a machine" needs from the user: a name and which device type to build
 * it from. It does not create anything itself -- the caller does the POST /devices and
 * builds the asset+channels, exactly like EnvironmentsCreateDialogComponent only returns
 * the data for its caller to send.
 */
@Component({
    selector: 'senergy-environments-add-machine-dialog',
    templateUrl: './environments-add-machine-dialog.component.html',
    styleUrls: ['./environments-add-machine-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, MatFormField, MatLabel, MatInput, FormsModule, MtxSelect, MtxOption, MatHint, MatDialogActions, MatButton]
})
export class EnvironmentsAddMachineDialogComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<EnvironmentsAddMachineDialogComponent>>(MatDialogRef);
    private environmentsService = inject(EnvironmentsService);

    name = '';
    deviceType: CatalogDeviceType | null = null;
    deviceTypes: CatalogDeviceType[] = [];
    dataReady = false;

    ngOnInit(): void {
        this.environmentsService.listDeviceTypes().subscribe((types) => {
            this.deviceTypes = types;
            this.dataReady = true;
        });
    }

    compareDeviceTypes(a: CatalogDeviceType | null, b: CatalogDeviceType | null): boolean {
        return a?.id === b?.id;
    }

    cancel(): void {
        this.dialogRef.close();
    }

    create(): void {
        if (!this.name || !this.deviceType) {
            return;
        }
        const result: AddMachineDialogResult = { name: this.name, deviceType: this.deviceType };
        this.dialogRef.close(result);
    }
}
