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

//{name: "test-task", topic: "test-topic", inputs:[{name: "test-input", type: "text", value: "42"}, {name: "test-script", type: "script", value: '[13]'}]};
import {AbstractSmartServiceInput} from '../dialog/edit-smart-service-input-dialog/edit-smart-service-input-dialog.component';

export interface SmartServiceTaskDescription {
    name: string;
    topic: string;
    inputs: SmartServiceTaskInputDescription[];
    outputs: SmartServiceTaskInputDescription[];
    smartServiceInputs: SmartServiceInputsDescription;
}

export interface SmartServiceTaskInputDescription {
    name: string;
    type: string; //"text" || "script"
    value: string;
}

export interface SmartServiceInputsDescription {
    inputs: SmartServiceInput[];
}

export interface SmartServiceInput {
    id: string;
    label: string;
    type: string;
    default_value: any;
    properties: SmartServiceInputProperty[];
}

export interface SmartServiceInputProperty {
    id: string;
    value: string;
}

export interface ServingRequest {
    FilterType: string
    Filter: string
    Name: string
    EntityName: string
    ServiceName: string
    Description?: string
    Topic: string
    TimePath: string
    TimePrecision: string
    generated: boolean
    Offset: string
    ForceUpdate: boolean
    Values: ServingRequestValue[]
    ExportDatabaseID: string
    TimestampFormat: string
}

export interface ServingRequestValue {
    Name: string;
    Path: string;
    Type: string;
    Tag?: boolean;
}

export interface SmartServiceTaskInputOutputDescription {
    name: string;
    inputs: SmartServiceTaskInputDescription[];
    outputs: SmartServiceTaskInputDescription[];
}