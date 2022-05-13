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

export interface PipelineRequestModel {
    id: string | null; // id of pipeline for updating
    name: string;
    description: string;
    windowTime: number;
    metrics: boolean;
    consumeAllMessages: boolean;
    nodes: NodeModel[];
    flowId: string;
}

export interface NodeModel {
    nodeId: string;
    deploymentType: string;
    config: NodeConfig[] | undefined;
    inputs: NodeInput[] | undefined;
    inputSelections?: PipelineInputSelectionModel[];
    persistData: boolean;
}

export interface NodeInput {
    filterType: string; // 'deviceId' or 'operatorId'
    filterIds: string;
    topicName: string;
    values: NodeValue[];
}

export interface NodeValue {
    name: string;
    path: string;
}

export interface NodeConfig {
    name: string;
    value: string;
}

export interface PipelineInputSelectionModel {
    inputName: string;
    aspectId: string;
    functionId: string;
    characteristicIds: string[];
    selectableId: string;
}
