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

import { SafeHtml } from '@angular/platform-browser';
import { PipelineInputSelectionModel } from '../../flow-repo/deploy-flow/shared/pipeline-request.model';

export interface PipelineModel {
    id: string;
    name: string;
    description: string;
    flowId: string;
    image: string | SafeHtml;
    createdAt: Date;
    updatedAt: Date;
    operators: PipelineOperatorModel[];
    consumeAllMessages?: boolean;
    windowTime?: number;
    metrics?: boolean;
}

export interface PipelineOperatorModel {
    id: string;
    imageId: string;
    operatorId: string;
    name: string;
    deploymentType: string;
    inputTopics: OperatorInputTopic[];
    inputSelections?: PipelineInputSelectionModel[];
    config?: Map<string, string>;
}

export interface OperatorInputTopic {
    name: string;
    filterType: string;
    filterValue: string;
    devices: string[];
    mappings: InputTopicsMapping[];
}

export interface InputTopicsMapping {
    dest: string;
    source: string;
}
