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

import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FilterDialogComponent } from '../../../../core/components/filter-dialog/filter-dialog.component';
import { FilterDialogConfigModel, FilterDialogResultModel } from '../../../../core/components/filter-dialog/shared/filter-dialog.model';

/** The criteria of the policy list: the selected subject names and the endpoint prefix, each empty when unset. */
export interface PermissionsFilterSelection {
    user: string;
    role: string;
    client: string;
    endpoint: string;
}

/** The current selection and the options each field offers. */
export interface PermissionsFilterDialogData {
    selection: PermissionsFilterSelection;
    users: string[];
    roles: string[];
    clients: string[];
    endpoints: string[];
}

@Component({
    selector: 'senergy-permissions-filter-dialog',
    templateUrl: './permissions-filter-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FilterDialogComponent],
})
export class PermissionsFilterDialogComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<PermissionsFilterDialogComponent, PermissionsFilterSelection>>(MatDialogRef);
    private data = inject<PermissionsFilterDialogData>(MAT_DIALOG_DATA);

    config: FilterDialogConfigModel = { fields: [] };

    ngOnInit(): void {
        const { selection, users, roles, clients, endpoints } = this.data;
        this.config = {
            fields: [
                { key: 'user', label: 'User', type: 'select', icon: 'account_circle', items: users, value: selection.user || undefined },
                { key: 'role', label: 'Role', type: 'select', icon: 'group', items: roles, value: selection.role || undefined },
                { key: 'client', label: 'Client', type: 'select', icon: 'computer', items: clients, value: selection.client || undefined },
                {
                    key: 'endpoint', label: 'Endpoint', type: 'select', icon: 'link', items: endpoints, allowNewValues: true,
                    hint: 'Policies whose resource starts with this text', value: selection.endpoint || undefined,
                },
            ],
        };
    }

    filter(result: FilterDialogResultModel): void {
        this.dialogRef.close({
            user: result.values['user'] || '',
            role: result.values['role'] || '',
            client: result.values['client'] || '',
            endpoint: result.values['endpoint'] || '',
        });
    }

    close(): void {
        this.dialogRef.close();
    }
}
