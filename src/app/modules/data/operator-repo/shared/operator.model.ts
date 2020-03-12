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

export interface OperatorModel {
    _id: string | undefined;
    name: string | undefined;
    image: string | undefined;
    description: string | undefined;
    pub: boolean | undefined;
    deploymentType: string | undefined;
    userId: string | undefined;
    inputs: IOModel [] | undefined;
    outputs: IOModel [] | undefined;
    config_values: IOModel [] | undefined;
    editable: boolean | undefined;
}

export interface IOModel {
    name: string;
    type: string;
}

