/*
 * Copyright 2025 InfAI (CC SES)
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
import { AddTagFn } from '@ng-matero/extensions/select';
import { Attribute } from '../shared/device-instances.model';
import { DeviceInstancesService } from '../shared/device-instances.service';
import { catchError } from 'rxjs';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';

@Component({
    templateUrl: './device-instances-default-attributes-dialog.component.html',
    styleUrls: ['./device-instances-default-attributes-dialog.component.css'],
})
export class DeviceInstancesDefaultAttributesDialogComponent implements OnInit {
    knownAttributes = ['anomaly-detector', 'timezone', 'inactive', 'last_message_max_age', 'monitor_connection_state', 'platform/mute-format-error', 'senergy/snowflake-canary-device', 'senergy/canary-device'];
    attributes: Attribute[] = [];
    ready = false;

    constructor(
        private dialogRef: MatDialogRef<DeviceInstancesDefaultAttributesDialogComponent>,
        private deviceInstancesService: DeviceInstancesService,
        private errorHandlerService: ErrorHandlerService,
    ) {

    }

    ngOnInit(): void {
        this.deviceInstancesService.getDefaultAttributes().subscribe(a => {
            this.attributes = a;
            this.ready = true;
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.deviceInstancesService.setDefaultAttributes(this.attributes)
            .pipe(catchError(this.errorHandlerService.handleErrorWithSnackBar(DeviceInstancesDefaultAttributesDialogComponent.name, 'save', 'Error saving default attributes')))
            .subscribe(_ => {
                this.dialogRef.close(true);

            });
    }

    removeAttr(i: number) {
        if (!this.attributes) {
            this.attributes = [];
        }
        this.attributes.splice(i, 1);
    }

    addAttr() {
        this.attributes.push({ key: '', value: '', origin: this.deviceInstancesService.defaultOrigin });
    }

    addAttribute(): AddTagFn {
        const that = this;
        return (text: string) => {
            that.knownAttributes.push(text);
            const tmp = [...that.knownAttributes];
            tmp.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
            that.knownAttributes = [];
            that.knownAttributes = tmp;
        };
    }
}
