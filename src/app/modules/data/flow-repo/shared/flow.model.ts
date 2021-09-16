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

import { DiagramModel } from '../../../../core/components/diagram-editor/shared/diagram.model';
import { SafeHtml } from '@angular/platform-browser';

export interface FlowModel {
    _id?: string;
    name: string;
    description: string;
    model: DiagramModel;
    image: string | SafeHtml;
    share: FlowShareModel;
    userId: string;
    dateCreated: number;
    dateUpdated: number;
}

export interface FlowShareModel {
    list: boolean | undefined;
    read: boolean | undefined;
    write: boolean | undefined;
}
