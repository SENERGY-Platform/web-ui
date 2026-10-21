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

/*
 * Types of the automation-engine API (docs/swagger.json of the automation-engine), only the parts the
 * web-ui uses. Field names are those of the API.
 */

/** device selection of one BPMN element (model.Selection) */
export interface EngineSelection {
    device_id?: string;
    service_id?: string;
    device_group_id?: string;
    import_id?: string;
    prefer_event?: boolean;
}

/** body of POST and PUT /namespaces/{ns}/deployments (model.DeploymentInput) */
export interface EngineDeploymentInput {
    name: string;
    description?: string;
    xml?: string;
    svg?: string;
    model_id?: string;
    model_version?: number;
    source?: string;
    selections?: { [elementId: string]: EngineSelection };
}

/** model.Deployment, only the fields the web-ui reads */
export interface EngineDeployment {
    id: string;
    namespace: string;
    name: string;
    source?: string;
    disabled?: boolean;
    version?: number;
}

/** body of POST and PUT /namespaces/{ns}/schedules (model.ScheduleInput) */
export interface EngineScheduleInput {
    deployment_id: string;
    /** 5 fields, 6 with seconds first, or a descriptor such as @daily */
    cron: string;
    alias?: string;
    /** free reference of the client, e.g. the id of a dashboard widget */
    created_by?: string;
    disabled?: boolean;
}

/** model.Schedule */
export interface EngineSchedule extends EngineScheduleInput {
    id: string;
    namespace: string;
    owner?: string;
    next_due?: string;
}
