/*
 * Copyright 2022 InfAI (CC SES)
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
import { ProcessIoDesignerInfo, ProcessIoDesignerInfoGet, ProcessIoDesignerInfoSet } from '../../../process-io/shared/process-io.model';

@Component({
    templateUrl: './process-io-designer-dialog.component.html',
    styleUrls: ['./process-io-designer-dialog.component.css'],
})
export class ProcessIoDesignerDialogComponent {
    info: ProcessIoDesignerInfoWithBinding;

    constructor(
        private dialogRef: MatDialogRef<ProcessIoDesignerDialogComponent>,
        @Inject(MAT_DIALOG_DATA) private dialogParams: { info: ProcessIoDesignerInfo},
    ) {
        this.info = addBinding(dialogParams.info);
    }

    close(): void {
        this.dialogRef.close();
    }

    ok(): void {
        this.dialogRef.close(this.getResult());
    }

    isInvalid(): boolean {
        const invalidGet = this.info.get.find(value => {
            if (!value.key) {
                return true;
            }
            if (!value.outputVariableName){
                return true;
            }
            return false;
        });
        if(invalidGet){
            return true;
        }
        const invalidSet = this.info.set.find(value => {
            if (!value.key) {
                return true;
            }
            return false;
        });
        if(invalidSet){
            return true;
        }
        return false;
    }

    removeSet(index: number){
        if (!this.info.set) {
            this.info.set= [];
        }
        this.info.set.splice(index, 1);
    }

    addSet(){
        if (!this.info.set) {
            this.info.set= [];
        }
        this.info.set.push({
            key: '',
            value: '',
            definitionBound: false,
            instanceBound: true,
            binding: 'instance'
        });
    }

    removeGet(index: number){
        if (!this.info.get) {
            this.info.get= [];
        }
        this.info.get.splice(index, 1);
    }

    addGet(){
        if (!this.info.get) {
            this.info.get= [];
        }
        this.info.get.push({
            key: '',
            outputVariableName: '',
            definitionBound: false,
            instanceBound: true,
            binding: 'instance',
            defaultValue: 'null'
        });
    }

    private getResult(): ProcessIoDesignerInfo {
        return handleBinding(this.info);
    }

}


function addBinding(info: ProcessIoDesignerInfo): ProcessIoDesignerInfoWithBinding {
    const result: ProcessIoDesignerInfoWithBinding = {
        set: [],
        get: []
    };
    info.set.forEach(value => {
        const element: ProcessIoDesignerInfoSetWithBinding = {
            key: value.key,
            value: value.value,
            instanceBound: value.instanceBound,
            definitionBound: value.definitionBound,
            binding: ''
        };
        if(value.instanceBound){
            element.binding = 'instance';
        } else if (value.definitionBound) {
            element.binding = 'definition';
        } else {
            element.binding = 'global';
        }
        result.set.push(element);
    });

    info.get.forEach(value => {
        const element: ProcessIoDesignerInfoGetWithBinding = {
            key: value.key,
            outputVariableName: value.outputVariableName,
            instanceBound: value.instanceBound,
            definitionBound: value.definitionBound,
            binding: '',
            defaultValue: value.defaultValue
        };
        if(value.instanceBound){
            element.binding = 'instance';
        } else if (value.definitionBound) {
            element.binding = 'definition';
        } else {
            element.binding = 'global';
        }
        result.get.push(element);
    });

    return result;
}


function handleBinding(info: ProcessIoDesignerInfoWithBinding): ProcessIoDesignerInfo {
    const result: ProcessIoDesignerInfo = {
        set: [],
        get: []
    };
    info.set.forEach(value => {
        const element: ProcessIoDesignerInfoSet = {
            key: value.key,
            value: value.value,
            instanceBound: value.instanceBound,
            definitionBound: value.definitionBound,
        };
        switch (value.binding) {
        case 'instance':
            element.instanceBound = true;
            element.definitionBound = false;
            break;
        case 'definition':
            element.instanceBound = false;
            element.definitionBound = true;
            break;
        case 'global':
            element.instanceBound = false;
            element.definitionBound = false;
            break;
        default:
            element.instanceBound = true;
            element.definitionBound = false;
        }
        result.set.push(element);
    });

    info.get.forEach(value => {
        const element: ProcessIoDesignerInfoGet = {
            key: value.key,
            defaultValue:value.defaultValue,
            outputVariableName: value.outputVariableName,
            instanceBound: value.instanceBound,
            definitionBound: value.definitionBound,
        };
        switch (value.binding) {
        case 'instance':
            element.instanceBound = true;
            element.definitionBound = false;
            break;
        case 'definition':
            element.instanceBound = false;
            element.definitionBound = true;
            break;
        case 'global':
            element.instanceBound = false;
            element.definitionBound = false;
            break;
        default:
            element.instanceBound = true;
            element.definitionBound = false;
        }
        result.get.push(element);
    });

    return result;
}



interface ProcessIoDesignerInfoWithBinding {
    set: ProcessIoDesignerInfoSetWithBinding[];
    get: ProcessIoDesignerInfoGetWithBinding[];
}

interface ProcessIoDesignerInfoSetWithBinding extends ProcessIoDesignerInfoSet {
    binding: string;
}

interface ProcessIoDesignerInfoGetWithBinding extends ProcessIoDesignerInfoGet{
    binding: string;
}
