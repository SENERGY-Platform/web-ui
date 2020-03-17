/*
 *
 *   Copyright 2020 InfAI (CC SES)
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */

import {AbstractControl, ValidatorFn} from '@angular/forms';
import {DeviceTypeContentVariableModel} from '../shared/device-type.model';

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
                return 'invalid Type! Use `https://schema.org/Text` or `Integer, Float, Boolean, StructuredValue`';
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

    function validateId(id: string | undefined): string | null {
        if (id === undefined) {
            return null;
        } else {
            console.log(id);
            if (id.startsWith('urn:infai:ses:content-variable:')) {
                return null;
            }
            return 'id is wrong';
        }
    }

    function checkSubContentVariables(contentVariable: DeviceTypeContentVariableModel[] | undefined, error: null | string): string | null {
        if (error !== null) {
            return error;
        }
        if (contentVariable) {
            contentVariable.forEach((subContentVariable: DeviceTypeContentVariableModel) => {
                if (error === null) {
                    error = validateName(subContentVariable.name);
                }
                if (error === null) {
                    error = checkType(subContentVariable.type);
                }
                if (error === null) {
                    error = validateId(subContentVariable.id);
                }
                if (error === null) {
                    if (subContentVariable.sub_content_variables) {
                        error = checkSubContentVariables(subContentVariable.sub_content_variables, error);
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
                errorMsg = validateId(contentVariable.id);
            }
            if (errorMsg === null) {
                errorMsg = checkSubContentVariables(contentVariable.sub_content_variables, null);
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



