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
import { BpmnElement, BpmnParameter } from '../../shared/designer.model';
import { DesignerHelperService } from '../../shared/designer-helper.service';
import { AddTagFn } from '@ng-matero/extensions/select';

@Component({
    templateUrl: './edit-input-dialog.component.html',
    styleUrls: ['./edit-input-dialog.component.css'],
})
export class EditInputDialogComponent {
    inputs: BpmnParameter[];
    outputs: BpmnParameter[];
    customOptions: string[] = [];

    constructor(
        private dialogRef: MatDialogRef<EditInputDialogComponent>,
        private designerService: DesignerHelperService,
        @Inject(MAT_DIALOG_DATA) private dialogParams: { inputElement: BpmnElement },
    ) {
        this.outputs = this.designerService.getIncomingOutputs(dialogParams.inputElement);
        const extensionValues = dialogParams.inputElement.businessObject.extensionElements.values;
        if (extensionValues) {
            this.inputs = extensionValues[0].inputParameters || [];
        } else {
            this.inputs = [];
        }
    }

    close(): void {
        this.dialogRef.close();
    }

    addTag(): AddTagFn {
        const that = this;
        return (text: string) => {
            that.customOptions.push(text);
            const tmp = this.customOptions;
            this.customOptions = [];
            this.customOptions = tmp;
        };
    }
}
