/*
 * Copyright 2026 InfAI (CC SES)
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

import { ExportModel } from 'src/app/modules/exports/shared/export.model';
import { ImportInstancesModel } from 'src/app/modules/imports/import-instances/shared/import-instances.model';

export interface SmartServiceModuleModel {
    id: string;
    user_id: string;
    design_id: string;
    release_id: string;
    instance_id: string;
    module_type: string;
    module_data: {
        pipeline_id?: string;
        pipeline?: {
            id: string;
            name: string;
        };
        process_deployment_name?: string;
        process_deployment_id?: string;
        fog_hub?: string;
        is_fog_deployment?: boolean;
        business_key?: string;
        device_group_id?: string;
        import?: ImportInstancesModel;
        export?: ExportModel;
    };
}
