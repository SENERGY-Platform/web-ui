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

import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HubModel } from '../shared/networks.model';
import { Attribute } from '../../device-instances/shared/device-instances.model';
import { AddTagFn } from '@ng-matero/extensions/select';

@Component({
    templateUrl: './networks-edit-dialog.component.html',
    styleUrls: ['./networks-edit-dialog.component.css'],
})
export class NetworksEditDialogComponent {
    network: HubModel;
    knownAttributes = ['last_message_max_age', 'senergy/lora/eui'];

    constructor(private dialogRef: MatDialogRef<NetworksEditDialogComponent>, @Inject(MAT_DIALOG_DATA) network?: HubModel) {
        this.network = network || {
            id: '',
            name: '',
            hash: '',
            owner_id: '',
            device_local_ids: null,
            device_ids: null,
        };
        this.network.attributes?.forEach(value => {
            if (this.knownAttributes.indexOf(value.key) === -1) {
                this.addAttribute()(value.key);
            }
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close(this.network);
    }

    removeAttr(i: number) {
        if (!this.network.attributes) {
            this.network.attributes = [];
        }
        this.network.attributes.splice(i, 1);
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

    addAttr() {
        if (!this.network.attributes) {
            this.network.attributes = [];
        }
        this.network.attributes.push({ key: '', value: '', origin: 'web-ui' });
    }

    editableAttribute(attr: Attribute) {
        return !attr.origin || attr.origin === '' || attr.origin === 'web-ui';
    }
}
