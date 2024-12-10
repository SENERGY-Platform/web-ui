/*
 * Copyright 2024 InfAI (CC SES)
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

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ChartsExportVAxesModel, ChartsExportDeviceGroupMergingStrategy, ChartsExportConversion } from '../../shared/charts-export-properties.model';
import { ListRulesComponent } from '../list-rules/list-rules.component';
import { NestedTreeControl } from '@angular/cdk/tree';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ChartsExportEditDialogComponent } from '../charts-export-edit-dialog.component';
import { hashCode } from 'src/app/core/services/util.service';

@Component({
    selector: 'senergy-axis-config',
    templateUrl: './axis-config.component.html',
    styleUrls: ['./axis-config.component.css']
})
export class AxisConfigComponent {
    @Input() groupTypeIsDifference = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() exportTags: Map<string, Map<string, { value: string; parent: string }[]>> = new Map();
    @Input() groupType?: string;
    @Input() element: ChartsExportVAxesModel = {} as ChartsExportVAxesModel;
    @Input() treeControl: NestedTreeControl<ChartsExportVAxesModel> = new NestedTreeControl<ChartsExportVAxesModel>((node) => node.subAxes);
    @Input() enableDragDrop = false;
    @Input() subElement = false;
    @Input() connectedNodes: (not?: ChartsExportVAxesModel) => string[] = (_) => [];
    @Input() dragging = false;

    @Output() copyClicked = new EventEmitter<null>();
    @Output() deleteClicked = new EventEmitter<null>();
    @Output() dragStart = new EventEmitter<null>();
    @Output() dragEnd = new EventEmitter<null>();
    @Output() dropped = new EventEmitter<{ $event: CdkDragDrop<ChartsExportVAxesModel>; target: ChartsExportVAxesModel }>();

    chartsExportDeviceGroupMergingStrategy = ChartsExportDeviceGroupMergingStrategy;
    super = ChartsExportEditDialogComponent;

    constructor(
        private dialog: MatDialog,
    ) { }

    listRules(element: ChartsExportVAxesModel) {
        const dialog = this.dialog.open(ListRulesComponent, {
            data: element.conversions || []
        });

        dialog.afterClosed().subscribe({
            next: (rules: ChartsExportConversion[]) => {
                if (rules != null) {
                    element.conversions = rules;
                }
            },
            error: (_) => {

            }
        });
    }

    compareFilterTypes(a: string, b: string): boolean {
        return a === b;
    }


    filerTypeSelected(element: ChartsExportVAxesModel) {
        if (element.filterType === undefined) {
            element.filterValue = undefined;
        }
    }

    getTags(element: ChartsExportVAxesModel): Map<string, { value: string; parent: string }[]> {
        return this.exportTags.get(element.instanceId || '') || new Map();
    }

    getTagOptionDisabledFunction(tab: ChartsExportVAxesModel): (option: { value: string; parent: string }) => boolean {
        return (option: { value: string; parent: string }) => {
            const selection = tab.tagSelection;
            if (selection === null || selection === undefined || Object.keys(selection).length === 0) {
                return false;
            }
            const existing = selection.find((s) => s.startsWith(option.parent) && this.getTagValue(option) !== s);
            return existing !== undefined;
        };
    }

    getTagValue(a: { value: string; parent: string }): string {
        return a.parent + '!' + a.value;
    }

    get expanded(): boolean {
        if (this.element === undefined) {
            return false;
        }
        return this.treeControl?.isExpanded(this.element) || false;
    }

    getId(): string {
        return '' + hashCode(JSON.stringify(this.element));
    }
}
