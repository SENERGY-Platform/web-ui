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

export interface NetworksModel {
    id: string;
    name: string;
    device_local_ids: string[] | null;
    annotations?: HubAnnotations;
}

export interface HubAnnotations {
    connected?: boolean;
}

export interface ApiAggregatorNetworksModel extends NetworksModel {
    log_state: boolean;
}

export interface HubModel {
    id: string;
    name: string;
    hash: string;
    device_local_ids: string[] | null;
}

