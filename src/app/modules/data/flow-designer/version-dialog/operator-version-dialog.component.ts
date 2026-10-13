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
 *  limitations under the License.
 */

import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {IOModel, OperatorModel} from '../../operator-repo/shared/operator.model';
import {NodeInfo, NodeLinkInfo} from '../../diagram-editor/shared/diagram.model';
import {
    linksToRemove,
    NEWEST_VERSION,
    portNames,
    resolveVersionData,
    VersionData,
    versionOptions,
    VersionOption,
} from '../../operator-repo/shared/operator-version';

export interface OperatorVersionDialogData {
    node: NodeInfo;
    operator: OperatorModel;
}

export interface OperatorVersionDialogResult {
    operatorVersion: string | undefined;
    image: string;
    inPorts: string[];
    outPorts: string[];
    config: IOModel[];
    removeLinkIds: string[];
}

interface Column {
    image: string;
    inPorts: string;
    outPorts: string;
    config: string;
}

@Component({
    selector: 'senergy-operator-version-dialog',
    templateUrl: './operator-version-dialog.component.html',
    styleUrls: ['./operator-version-dialog.component.css'],
})
export class OperatorVersionDialogComponent {
    readonly newestValue = NEWEST_VERSION;
    options: VersionOption[];
    selected: string;
    choice: VersionData;
    removedLinks: NodeLinkInfo[] = [];
    current: Column;
    chosen: Column;

    constructor(
        public dialogRef: MatDialogRef<OperatorVersionDialogComponent, OperatorVersionDialogResult>,
        @Inject(MAT_DIALOG_DATA) public data: OperatorVersionDialogData) {
        this.options = versionOptions(data.operator);
        const pin = data.node.operatorVersion;
        // A pin the operator no longer lists has no entry to preselect.
        this.selected = pin !== undefined && this.options.some(option => option.value === pin) ? pin : NEWEST_VERSION;
        this.current = this.column(data.node.image, data.node.inPorts, data.node.outPorts, data.node.config ?? []);
        this.choice = this.resolve(this.selected);
        this.chosen = this.column(this.choice.image, portNames(this.choice.inputs), portNames(this.choice.outputs), this.choice.config_values);
        this.updateRemovedLinks();
    }

    select(value: string): void {
        this.selected = value;
        this.choice = this.resolve(value);
        this.chosen = this.column(this.choice.image, portNames(this.choice.inputs), portNames(this.choice.outputs), this.choice.config_values);
        this.updateRemovedLinks();
    }

    differs(key: keyof Column): boolean {
        return this.current[key] !== this.chosen[key];
    }

    onApply(): void {
        this.dialogRef.close({
            operatorVersion: this.selected === NEWEST_VERSION ? undefined : this.selected,
            image: this.choice.image,
            inPorts: portNames(this.choice.inputs),
            outPorts: portNames(this.choice.outputs),
            config: this.choice.config_values,
            removeLinkIds: this.removedLinks.map(link => link.id),
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    private resolve(value: string): VersionData {
        return resolveVersionData(this.data.operator, value) as VersionData;
    }

    private updateRemovedLinks(): void {
        this.removedLinks = linksToRemove(this.data.node.links, portNames(this.choice.inputs), portNames(this.choice.outputs));
    }

    private column(image: string, inPorts: string[], outPorts: string[], config: IOModel[]): Column {
        return {
            image,
            inPorts: inPorts.join(', '),
            outPorts: outPorts.join(', '),
            config: config.map(value => `${value.name} (${(value.type ?? '').replace('https://schema.org/', '')})`).join(', '),
        };
    }
}
