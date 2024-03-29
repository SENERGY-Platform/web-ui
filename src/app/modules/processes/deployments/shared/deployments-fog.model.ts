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

import { SyncModel } from '../../sync/shared/process-sync.model';
import { CamundaVariable } from './deployments-definition.model';
import { V2DeploymentsPreparedModel } from './deployments-prepared-v2.model';
import { DeploymentsModel } from './deployments.model';

export interface DeploymentsFogMetadataModel extends SyncModel {
    camunda_deployment_id: string;
    process_parameter: Map<string, CamundaVariable>;
    deployment_model: V2DeploymentsPreparedModel;
}

export interface DeploymentsFogModel extends DeploymentsModel, SyncModel {}
