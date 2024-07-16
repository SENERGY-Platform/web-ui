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

export interface ProcessIncidentsModel {
    msg_version: number;
    external_task_id: string;
    process_instance_id: string;
    process_definition_id: string;
    worker_id: string;
    error_message: string;
    time: string;
    tenant_id: string;
    deployment_name: string;
}

export interface ProcessIncidentsConfig {
    message: string;
}