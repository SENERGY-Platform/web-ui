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

import { ChangeDetectorRef, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Attribute, DeviceInstanceModel } from '../shared/device-instances.model';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { DeviceTypeService } from '../../../metadata/device-types-overview/shared/device-type.service';
import { senergyConnectorLocalIdConstraint } from '../../../metadata/device-types-overview/shared/device-type.model';
import { AddTagFn } from '@ng-matero/extensions/select';

@Component({
    templateUrl: './device-instances-edit-dialog.component.html',
    styleUrls: ['./device-instances-edit-dialog.component.css'],
})
export class DeviceInstancesEditDialogComponent {
    device: DeviceInstanceModel;
    displayname = '';
    nicknameAttributeKey = 'shared/nickname';
    nicknameAttributeOrigin = 'shared';
    action = 'Edit';
    localIdIsEditable = false;
    knownAttributes = ['anomaly-detector', 'timezone', 'inactive', 'last_message_max_age', 'monitor_connection_state', 'platform/mute-format-error', 'senergy/snowflake-canary-device', 'senergy/canary-device'];

    protocolConstraints: string[] = [];
    userHasUpdateDisplayNameAuthorization = false;
    userHasUpdateAttributesAuthorization = false;

    constructor(
        private dialogRef: MatDialogRef<DeviceInstancesEditDialogComponent>,
        private deviceTypeService: DeviceTypeService,
        private cd: ChangeDetectorRef,

        @Inject(MAT_DIALOG_DATA) private data: {
            device: DeviceInstanceModel;
            userHasUpdateDisplayNameAuthorization: boolean;
            userHasUpdateAttributesAuthorization: boolean;
            action?: string;
            localIdIsEditable?: boolean;
        },
    ) {
        this.userHasUpdateDisplayNameAuthorization = data.userHasUpdateDisplayNameAuthorization;
        this.userHasUpdateAttributesAuthorization = data.userHasUpdateAttributesAuthorization;
        this.device = data.device;
        this.device.attributes?.forEach(value => {
            if (value.key === this.nicknameAttributeKey) {
                this.displayname = value.value;
            } else if (this.knownAttributes.indexOf(value.key) === -1) {
                this.addAttribute()(value.key);
            }
        });

        const protocolsToConstraints: Map<string, string[]> = new Map<string, string[]>();
        this.deviceTypeService.getProtocols(9999, 0, 'name', 'asc').subscribe(protocols => {
            if (protocols) {
                protocols.forEach(p => {
                    protocolsToConstraints.set(p.id, p.constraints);
                });
            }
            this.deviceTypeService.getDeviceType(this.device.device_type_id).subscribe(dt => {
                if (dt) {
                    dt.services.forEach(s => {
                        this.protocolConstraints = this.protocolConstraints.concat(protocolsToConstraints.get(s.protocol_id) || []);
                    });
                }
            });
        });

        if (data.action != null) {
            this.action = data.action;
        }

        if (data.localIdIsEditable != null) {
            this.localIdIsEditable = data.localIdIsEditable;
        }

    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.setDisplayNameAttribute();
        this.dialogRef.close(this.device);
    }

    removeAttr(i: number) {
        if (!this.device.attributes) {
            this.device.attributes = [];
        }
        this.device.attributes.splice(i, 1);
    }

    addAttr() {
        if (!this.device.attributes) {
            this.device.attributes = [];
        }
        this.device.attributes.push({ key: '', value: '', origin: 'web-ui' });
    }

    editableAttribute(attr: Attribute) {
        return !attr.origin || attr.origin === '' || attr.origin === 'web-ui';
    }

    private setDisplayNameAttribute() {
        if (!this.device.attributes) {
            this.device.attributes = [];
        }
        this.device.attributes = this.device.attributes?.filter((value) => value.key !== this.nicknameAttributeKey);
        if (this.displayname !== '') {
            this.device.attributes?.push({
                key: this.nicknameAttributeKey,
                origin: this.nicknameAttributeOrigin,
                value: this.displayname
            } as Attribute);
            this.device.display_name = this.displayname;
        }
    }

    isValid(): boolean {
        if (!this.localIdFieldIsValid()) {
            return false;
        }
        return true;
    }

    localIdFieldIsValid(): boolean {
        return !this.protocolConstraints?.includes(senergyConnectorLocalIdConstraint) || isValidLocalId(this.device.local_id);
    }

    isValidLocalIdValidator(c: AbstractControl): ValidationErrors | null {
        if (!this.protocolConstraints?.includes(senergyConnectorLocalIdConstraint) || isValidLocalId(c.value)) {
            return null;
        } else {
            return {
                validateLocalId: {
                    valid: false
                }
            };
        }
    }

    addAttribute(): AddTagFn {
        const that = this;
        return (text: string) => {
            that.knownAttributes.push(text);
            const tmp = [...that.knownAttributes];
            tmp.sort((a, b)  =>  a.toLowerCase().localeCompare(b.toLowerCase()));
            that.knownAttributes = [];
            that.knownAttributes = tmp;
            that.cd.detectChanges();
        };
    }
}

function isValidLocalId(value: string): boolean {
    if (!value) {
        return true;
    }
    return !(value.includes && (value.includes('#') || value.includes('+') || value.includes('/')));
}
