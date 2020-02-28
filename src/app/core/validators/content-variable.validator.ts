/*
 *
 *  Copyright 2019 InfAI (CC SES)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {AbstractControl, ValidatorFn} from '@angular/forms';
import {DeviceTypeContentVariableModel} from '../../modules/devices/device-types-overview/shared/device-type.model';

export function contentVariableValidator(): ValidatorFn {

    let errorMsg: null | string = null;

    function checkType(type: string | undefined): string | null {
        if (type === undefined) {
            return 'Type is missing';
        } else {
            if (type === 'https://schema.org/Text' ||
                type === 'https://schema.org/Integer' ||
                type === 'https://schema.org/Float' ||
                type === 'https://schema.org/Boolean' ||
                type === 'https://schema.org/StructuredValue') {
                return null;
            } else {
                return 'invalid Type: ' + type;
            }
        }
    }


    function validateName(name: string | undefined): string | null {
        if (name === undefined) {
            return 'name is missing';
        } else {
            if (name === '') {
                return 'name is empty';
            }
            return null;
        }
    }

    function checkSubContentVariables(contentVariable: DeviceTypeContentVariableModel[] | undefined): string | null {
        let error: null | string = null;
        if (contentVariable) {
            contentVariable.forEach((subContentVariable: DeviceTypeContentVariableModel) => {
                if (error === null) {
                    error = checkType(subContentVariable.type);
                }
                if (error === null) {
                    error = validateName(subContentVariable.name);
                }
                if (error === null) {
                    if (subContentVariable.sub_content_variables) {
                        checkSubContentVariables(subContentVariable.sub_content_variables);
                    }
                }
            });
        }
        return error;
    }

    return (control: AbstractControl): { [key: string]: any } | null => {
        if (control.value === null || control.value === '') {
            return null;
        }
        try {
            const contentVariable: DeviceTypeContentVariableModel = JSON.parse(control.value);
            errorMsg = validateName(contentVariable.name);
            if (errorMsg === null) {
                errorMsg = checkType(contentVariable.type);
            }
            if (errorMsg === null) {
                errorMsg = checkSubContentVariables(contentVariable.sub_content_variables);
            }

            if (errorMsg) {
                return {'errorMsg': errorMsg};
            } else {
                return null;
            }


        } catch (e) {
            return {'errorMsg': 'invalid json'};
        }
        return null;
    };


}



