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
    /** the gateway the deployment runs on; empty is the cloud */
    network_id?: string;
    created_at?: string;
}

/** model.Page, the answer of the list calls */
export interface EnginePage<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
}

/**
 * Value of network_id for the deployments and instances of the cloud. Without network_id the lists
 * hold those of the cloud and of every gateway.
 */
export const ENGINE_CLOUD_NETWORK = 'cloud';

/** query of GET /namespaces/{ns}/deployments */
export interface EngineDeploymentListOptions {
    limit?: number;
    offset?: number;
    search?: string;
    /** name, created_at or updated_at, with .asc or .desc */
    sort?: string;
    ids?: string[];
    /** sepl leaves out the deployments of widgets (generated) */
    source?: string;
    /** ENGINE_CLOUD_NETWORK or the id of a gateway; empty lists all */
    network_id?: string;
}

/** query of GET /namespaces/{ns}/instances */
export interface EngineInstanceListOptions {
    limit?: number;
    offset?: number;
    /** running, finished, completed, terminated or incident */
    state?: string;
    deployment_id?: string;
    deployment_name?: string;
    ids?: string[];
    /** started_at, ended_at, created_at, deployment_name or state, with .asc or .desc */
    sort?: string;
    /** ENGINE_CLOUD_NETWORK or the id of a gateway; empty lists all */
    network_id?: string;
}

/** model.NetworkResource: desired and applied state of a resource of a gateway */
export interface EngineNetworkResource {
    /** deployment or instance */
    kind: string;
    id: string;
    deleted?: boolean;
    /** pending, applied or failed */
    state: string;
    error?: string;
}

/** model.Network, only the fields the web-ui reads; resources only when one network is read */
export interface EngineNetwork {
    id: string;
    name?: string;
    online: boolean;
    last_contact?: string;
    resources?: EngineNetworkResource[];
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

/** body of an error answer (model.Error) */
export interface EngineError {
    kind: string;
    message: string;
}

/** model.Instance, only the fields the web-ui reads */
export interface EngineInstance {
    id: string;
    name?: string;
    namespace: string;
    owner: string;
    deployment_id: string;
    deployment_name: string;
    deployment_version: number;
    run: number;
    /** running, completed, terminated, incident or pending */
    state: string;
    end_reason?: string;
    start_variables?: { [name: string]: any };
    started_at: string;
    ended_at?: string;
    last_activity_at?: string;
    restart_at?: string;
    /** the gateway that runs the instance; empty is the cloud */
    network_id?: string;
    status?: string;
    status_message?: string;
}

/** model.Run */
export interface EngineRun {
    instance_id: string;
    run: number;
    deployment_version: number;
    cause: string;
    state: string;
    end_reason?: string;
    started_at: string;
    ended_at?: string;
}

/** model.DeploymentVersion, only the fields the web-ui reads */
export interface EngineDeploymentVersion {
    deployment_id: string;
    version: number;
    xml: string;
    svg: string;
}

/** model.DebugVariable: values above the transfer limit are cut and marked, see getVariable */
export interface EngineDebugVariable {
    value: any;
    type: string;
    updated_at: string;
    element_id?: string;
    truncated?: boolean;
    size?: number;
}

export interface EngineDebugVariables {
    [name: string]: EngineDebugVariable;
}

/** model.ActiveElement */
export interface EngineActiveElement {
    element_id: string;
    element_type: string;
    name?: string;
    since: string;
    tokens: number;
    locals?: EngineDebugVariables;
}

/** model.EventEvaluation, current (evaluate_events) or reconstructed from the time series */
export interface EngineEventEvaluation {
    time?: string;
    raw?: any;
    value?: any;
    triggered: boolean;
    error?: string;
    logs?: string[];
}

/** model.EventSource */
export interface EngineEventSource {
    event_description_id: string;
    device_id?: string;
    service_id?: string;
    device_group_id?: string;
    import_id?: string;
    script: string;
    value_variable: string;
    variables?: { [name: string]: string };
    current?: EngineEventEvaluation;
}

/** model.SubtaskState, one device of a device command */
export interface EngineSubtaskState {
    id: string;
    device_id?: string;
    service_id?: string;
    done: boolean;
    tries: number;
    last_try?: string;
}

/** model.Wait: why an element waits */
export interface EngineWait {
    element_id: string;
    /** message, timer, task or join */
    kind: string;
    since: string;
    gateway_id?: string;
    message?: { name: string; events?: EngineEventSource[] };
    timer?: { definition: string; kind?: string; due_at?: string };
    task?: {
        job_id: string;
        task_type: string;
        state?: string;
        attempt: number;
        retries: number;
        timeout?: string;
        due_at?: string;
        last_error?: string;
        subtasks?: EngineSubtaskState[];
    };
    join?: { arrived: number; required: number };
}

/** model.Incident, only the fields the web-ui reads */
export interface EngineIncident {
    id: string;
    instance_id: string;
    run: number;
    deployment_version: number;
    element_id?: string;
    element_name?: string;
    message: string;
    time: string;
    variables?: { [name: string]: any };
}

/** model.ElementStats: passes of an element or of a sequence flow in a run */
export interface EngineElementStats {
    element_id: string;
    run: number;
    count: number;
    last_at: string;
    last_error?: string;
    error_at?: string;
}

/** model.Activity, an entry of the activity log */
export interface EngineActivity {
    instance_id: string;
    run: number;
    seq: number;
    time: string;
    kind: string;
    element_id?: string;
    element_type?: string;
    data?: { [key: string]: any };
}

/** model.ActivityPage */
export interface EngineActivityPage {
    items: EngineActivity[];
    truncated: boolean;
}

/** filters of the activity list; variable and value search the history (DBG-16) */
export interface EngineActivityFilter {
    kind?: string;
    element_id?: string;
    /** entries that set or delete this variable */
    variable?: string;
    /** entries that set a variable to a value containing this text, ignoring case */
    value?: string;
}

/** model.DebugState, live (GET .../debug, live stream) and at a step of the history (GET .../history) */
export interface EngineDebugState {
    instance: EngineInstance;
    /** the gateway did not answer; the state is the copy the cloud has */
    offline?: boolean;
    runs?: EngineRun[];
    /** last activity entry the state includes */
    seq: number;
    time: string;
    active: EngineActiveElement[];
    waits: EngineWait[];
    variables: EngineDebugVariables;
    incidents: EngineIncident[];
    elements: EngineElementStats[];
    /** set by the history: reconstructed from a snapshot; first_seq is the earliest step still available */
    reconstructed?: boolean;
    first_seq?: number;
    /** older activity entries were evicted */
    truncated?: boolean;
}

/** model.DebugMessage, a message of the live stream; see applyDebugMessage for how a delta is merged */
export interface EngineDebugMessage {
    /** snapshot, delta, end or error */
    type: string;
    seq: number;
    state?: EngineDebugState;
    activities?: EngineActivity[];
    instance?: EngineInstance;
    active?: EngineActiveElement[];
    waits?: EngineWait[];
    variables?: EngineDebugVariables;
    removed_variables?: string[];
    incidents?: EngineIncident[];
    elements?: EngineElementStats[];
    active_changed?: boolean;
    waits_changed?: boolean;
    incidents_changed?: boolean;
    error?: string;
    error_kind?: string;
}

/** model.Variable, the complete current value of a variable */
export interface EngineVariable {
    name: string;
    value: any;
    type: string;
    updated_at: string;
    element_id?: string;
}

/** model.HistoryVariable: complete only at snapshots, available is false otherwise */
export interface EngineHistoryVariable {
    seq: number;
    name: string;
    element_id?: string;
    value?: any;
    available: boolean;
}

/** model.WaitPeriod */
export interface EngineWaitPeriod {
    from: string;
    to?: string;
    correlated: boolean;
}

/** model.SourceEvaluation */
export interface EngineSourceEvaluation extends EngineEventEvaluation {
    event_description_id: string;
}

/** model.EventReconstruction: evaluations of an event reconstructed from the time series, next to its correlations */
export interface EngineEventReconstruction {
    element_id: string;
    message_name?: string;
    run: number;
    deployment_version: number;
    waiting: EngineWaitPeriod[];
    sources: EngineEventSource[];
    evaluations: EngineSourceEvaluation[];
    correlations: EngineActivity[];
    hints?: string[];
    limitations?: string[];
    /** more evaluations follow; pass it as after for the next page */
    next?: string;
}
