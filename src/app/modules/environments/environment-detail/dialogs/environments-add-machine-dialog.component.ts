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

import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { EnvironmentsService } from '../../shared/environments.service';
import { CatalogDeviceType } from '../../shared/environments.model';

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
})
export class EnvironmentsAddMachineDialogComponent implements OnInit {
    name = '';
    deviceType: CatalogDeviceType | null = null;
    deviceTypes: CatalogDeviceType[] = [];
    dataReady = false;

    constructor(
        private dialogRef: MatDialogRef<EnvironmentsAddMachineDialogComponent>,
        private environmentsService: EnvironmentsService,
    ) {}

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
