/*
 * Copyright 2022 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export const DefaultProcessIoReadPrefix = "io.read.";
export const DefaultProcessIoWritePrefix = "io.write.";
export const DefaultProcessIoInstancePlaceholder = "{{InstanceId}}";
export const DefaultProcessIoDefinitionPlaceholder = "{{DefinitionId}}";
export const DefaultProcessIoWorkerTopic = "process_io";

export interface ProcessIoDesignerConfig {
    processIoReadPrefix: string
    processIoWritePrefix: string
    processIoInstancePlaceholder: string
    processIoDefinitionPlaceholder: string
    processIoWorkerTopic: string
}

export const DefaultProcessIoDesignerConfig: ProcessIoDesignerConfig  = {
    processIoReadPrefix: DefaultProcessIoReadPrefix,
    processIoWritePrefix: DefaultProcessIoWritePrefix,
    processIoInstancePlaceholder: DefaultProcessIoInstancePlaceholder,
    processIoDefinitionPlaceholder: DefaultProcessIoDefinitionPlaceholder,
    processIoWorkerTopic: DefaultProcessIoWorkerTopic
}

export interface ProcessIoDesignerInfo {
    set: ProcessIoDesignerInfoSet[]
    get: ProcessIoDesignerInfoGet[]
}

export interface ProcessIoDesignerInfoSet {
    key: string
    instanceBound: boolean
    definitionBound: boolean
    value: string
}

export interface ProcessIoDesignerInfoGet {
    outputVariableName: string
    key: string
    instanceBound: boolean
    definitionBound: boolean
}

export interface ProcessIoVariable {
    key: string
    value: any
    process_definition_id: string
    process_instance_id: string
    unix_timestamp_in_s: number
}