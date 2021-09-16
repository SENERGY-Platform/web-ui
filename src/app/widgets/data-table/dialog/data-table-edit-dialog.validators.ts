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

import { AbstractControl, FormControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { DataTableElementTypesEnum } from '../shared/data-table.model';

export function boundaryValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const lower = control.get('lowerBoundary') as FormControl;
        const upper = control.get('upperBoundary') as FormControl;

        // Check if warning are enabled
        if ((control.get('enabled') as FormControl).value === false) {
            lower.setErrors(null);
            upper.setErrors(null);
            return null;
        }

        // Check if at least one boundary is set
        const lowerHasValue = hasValue(lower);
        const upperHasValue = hasValue(upper);
        if (!lowerHasValue && !upperHasValue) {
            lower.setErrors({ nothingSelected: true });
            upper.setErrors({ nothingSelected: true });
            return { nothingSelected: true };
        }

        // Check if only one value is set
        if ((lowerHasValue && !upperHasValue) || (!lowerHasValue && upperHasValue)) {
            lower.setErrors(null);
            upper.setErrors(null);
            return null;
        }

        // Check if lower is bigger than upper
        const lowerValue = Number(lower.value);
        const upperValue = Number(upper.value);

        if (lowerValue > upperValue) {
            lower.setErrors({ lowerBiggerThanUpper: true });
            upper.setErrors({ lowerBiggerThanUpper: true });
            return { lowerBiggerThanUpper: true };
        }

        // Both lower and upper are set and lower is smaller than upper
        lower.setErrors(null);
        upper.setErrors(null);
        return null;
    };
}

export function hasValue(control: AbstractControl | null) {
    return control !== null && control.value !== null && control.value !== '';
}

export function exportValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const exportCreatedByWidget = control.get('exportCreatedByWidget');
        const exportId = control.get('exportId');
        const exportValueName = control.get('exportValueName');
        const exportValuePath = control.get('exportValuePath');

        if (exportCreatedByWidget === null) {
            return { 'unknown formControl': 'exportCreatedByWidget' };
        }
        if (exportId === null) {
            return { 'unknown formControl': 'exportId' };
        }
        if (exportValueName === null) {
            return { 'unknown formControl': 'exportValueName' };
        }
        if (exportValuePath === null) {
            return { 'unknown formControl': 'exportValuePath' };
        }

        if (exportCreatedByWidget.value === true) {
            exportId.setErrors(null);
            exportValueName.setErrors(null);
            exportValuePath.setErrors(null);
            return null; // values will be filled automatically
        }
        if (!hasValue(exportId)) {
            exportId.setErrors({ 'missing value': true });
            return { 'missing value': 'exportId' };
        } else {
            exportId.setErrors(null);
        }
        if (!hasValue(exportValueName)) {
            exportValueName.setErrors({ 'missing value': true });
            return { 'missing value': 'exportValueName' };
        } else {
            exportValueName.setErrors(null);
        }
        if (!hasValue(exportValuePath)) {
            exportValuePath.setErrors({ 'missing value': true });
            return { 'missing value': 'exportValuePath' };
        } else {
            exportValuePath.setErrors(null);
        }
        return null;
    };
}

export function elementDetailsValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const elementType = control.get('elementType');

        if (elementType === null) {
            control.setErrors({ 'unknown formControl': 'elementType' });
            return { 'unknown formControl': 'elementType' };
        }
        switch (elementType.value) {
        case DataTableElementTypesEnum.PIPELINE:
            return getAndCheckValues(control, [
                ['pipeline', 'pipelineId'],
                ['pipeline', 'operatorId'],
            ]);

        case DataTableElementTypesEnum.DEVICE:
            return getAndCheckValues(control, [
                ['device', 'aspectId'],
                ['device', 'functionId'],
                ['device', 'deviceId'],
                ['device', 'serviceId'],
                // ['device', 'deploymentId'], will be filled automatically
                // ['device', 'requestDevice'], will be filled automatically
                // ['device', 'scheduleId'], will be filled automatically
            ]);

        case DataTableElementTypesEnum.IMPORT:
            return getAndCheckValues(control, [
                ['import', 'typeId'],
                ['import', 'instanceId'],
            ]);
        default:
            control.setErrors({ 'unknown elementType': elementType.value });
            return { 'unknown elementType': elementType.value };
        }
    };
}

export function getAndCheckValue(control: AbstractControl, pathElements: string[]): ValidationErrors | undefined {
    let element: AbstractControl | null | undefined = control;
    pathElements.forEach((pathElement) => (element = element?.get(pathElement)));
    if (element === undefined) {
        control.setErrors({ 'unknown formControl': pathElements.join('.') });
        return { 'unknown formControl': pathElements.join('.') };
    }
    if (!hasValue(element)) {
        control.setErrors({ 'missing value': pathElements.join('.') });
        return { 'missing value': pathElements.join('.') };
    }
    return undefined;
}

export function getAndCheckValues(control: AbstractControl, paths: string[][]): ValidationErrors | null {
    for (const pathElements of paths) {
        const errors = getAndCheckValue(control, pathElements);
        if (errors !== undefined) {
            return errors;
        }
    }
    control.setErrors(null);
    return null;
}
