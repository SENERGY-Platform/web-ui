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

import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { dialogSize } from '../../../../../core/dialog-size';
import { ChartsExportVAxesModel, ChartsExportDeviceGroupMergingStrategy, ChartsExportConversion } from '../../shared/charts-export-properties.model';
import { GroupOption, groupTimeLevels, isAxisGroupInterval, splitGroupTime } from '../../../shared/data-source-selector/group-options';
import { ListRulesComponent } from '../list-rules/list-rules.component';
import { NestedTreeControl } from '@angular/cdk/tree';
import { CdkDragDrop, CdkDrag, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { ChartsExportEditDialogComponent } from '../charts-export-edit-dialog.component';
import { hashCode } from 'src/app/core/services/util.service';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card';
import { NgClass } from '@angular/common';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatErrorMessagesDirective } from '../../../../../core/directives/matError.directive';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { MatCheckbox } from '@angular/material/checkbox';

@Component({
    selector: 'senergy-axis-config',
    templateUrl: './axis-config.component.html',
    styleUrls: ['./axis-config.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [CdkDrag, MatIconButton, CdkDragHandle, MatIcon, MatCard, MatCardHeader, MatCardTitle, NgClass, MatCardContent, MatFormField, MatLabel, MatInput, FormsModule, MatError, MatErrorMessagesDirective, MtxSelect, MtxOption, MatCheckbox, CdkDropList]
})
export class AxisConfigComponent {
    private dialog = inject(MatDialog);

    @Input() groupTypeIsDifference = false;
    @Input() userHasUpdatePropertiesAuthorization = false;
    @Input() exportTags: Map<string, Map<string, { value: string; parent: string }[]>> = new Map();
    @Input() groupType?: string | null;
    /** Whether the chart type takes a grouping per axis (line charts); the field is hidden otherwise. */
    @Input() axisGroupAllowed = false;
    @Input() groupTypes: GroupOption[] = [];
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
    groupTimeLevels = groupTimeLevels;
    readonly likeWidget = 'widget';

    listRules(element: ChartsExportVAxesModel) {
        const dialog = this.dialog.open(ListRulesComponent, {
            data: element.conversions || [],
            ...dialogSize('m')
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

    getTags(element: ChartsExportVAxesModel): {group: string; value: string; parent: string }[] {
        const res: {group: string; value: string; parent: string }[] = [];
        this.exportTags.get(element.instanceId || '')?.forEach((v, k) => {
            v.forEach(v2 => {
                const v3 = v2 as {group: string; value: string; parent: string };
                v3.group = k;
                res.push(v3);
            });
        });
        return res;
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

    /** The grouping this axis is read with: its own on a line chart, else the widget's. */
    get effectiveGroupType(): string | null | undefined {
        return this.axisGroupAllowed && this.element.ownGroup !== undefined ? this.element.ownGroup.type : this.groupType;
    }

    get effectiveGroupIsDifference(): boolean {
        return this.axisGroupAllowed && this.element.ownGroup !== undefined ? this.element.ownGroup.type.startsWith('difference') : this.groupTypeIsDifference;
    }

    get groupChoice(): string {
        return this.element.ownGroup === undefined ? this.likeWidget : this.element.ownGroup.type;
    }

    set groupChoice(choice: string) {
        if (choice === this.likeWidget || choice === null || choice === undefined) {
            delete this.element.ownGroup;
        } else {
            this.element.ownGroup = { type: choice, time: this.element.ownGroup?.time ?? '' };
            if (choice.startsWith('difference')) {
                this.element.math = '';
            }
        }
        // Sum adds values with the same timestamp, which only buckets guarantee; its option is hidden without a group type
        if (!this.effectiveGroupType && this.element.deviceGroupMergingStrategy === ChartsExportDeviceGroupMergingStrategy.Sum) {
            this.element.deviceGroupMergingStrategy = ChartsExportDeviceGroupMergingStrategy.Separate;
        }
    }

    /** Number and unit are kept apart: a half typed `1.` or an unset number would otherwise lose the chosen unit. */
    private timeParts = { composed: undefined as string | undefined, value: '', level: '' };

    private syncTimeParts(): void {
        const time = this.element.ownGroup?.time ?? '';
        if (time !== this.timeParts.composed) {
            const split = splitGroupTime(time);
            this.timeParts = { composed: time, value: split.value, level: split.level };
        }
    }

    get groupTimeValue(): string {
        this.syncTimeParts();
        return this.timeParts.value;
    }

    set groupTimeValue(value: string) {
        this.syncTimeParts();
        this.setGroupTime(value, this.timeParts.level);
    }

    get groupTimeLevel(): string {
        this.syncTimeParts();
        return this.timeParts.level;
    }

    set groupTimeLevel(level: string) {
        this.syncTimeParts();
        this.setGroupTime(this.timeParts.value, level);
    }

    get groupTimeInvalid(): boolean {
        return this.element.ownGroup !== undefined && this.element.ownGroup.type !== '' && !isAxisGroupInterval(this.element.ownGroup.time);
    }

    private setGroupTime(value: string | number | null, level: string | null): void {
        const composed = (value ?? '') + (level ?? '');
        this.timeParts = { composed, value: String(value ?? ''), level: level ?? '' };
        if (this.element.ownGroup !== undefined) {
            this.element.ownGroup.time = composed;
        }
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
