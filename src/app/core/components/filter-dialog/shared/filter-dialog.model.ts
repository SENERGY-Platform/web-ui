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

import { Observable } from 'rxjs';

export type FilterDialogFieldType = 'select' | 'multiselect' | 'checkbox';

export interface FilterDialogFieldModel {
    /** identifies the field in FilterDialogResultModel */
    key: string;
    label: string;
    type: FilterDialogFieldType;
    icon?: string;
    hint?: string;
    /** fields sharing a section are grouped below a heading; fields without a section are not grouped */
    section?: string;
    /** static options, use items$ if the options have to be loaded */
    items?: any[];
    /** options are loaded when the dialog opens, a spinner is shown until all fields are loaded */
    items$?: Observable<any[]>;
    /** property of an option holding its label, not needed for plain string options */
    bindLabel?: string;
    /** property of an option holding its value, not needed for plain string options */
    bindValue?: string;
    /** allows selecting values that are not part of the options */
    allowNewValues?: boolean;
    /** preselected value */
    value?: any;
    /** value of the unset field, defaults to [] for multiselect, false for checkbox and undefined otherwise */
    emptyValue?: any;
}

export interface FilterDialogConfigModel {
    fields: FilterDialogFieldModel[];
    title?: string;
}

export interface FilterDialogResultModel {
    /** selected value per field key */
    values: { [key: string]: any };
    /** labels of the selected options per field key, e.g. to be shown as chips */
    labels: { [key: string]: string[] };
}
