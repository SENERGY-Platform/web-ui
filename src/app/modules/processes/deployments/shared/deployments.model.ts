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

import {SafeUrl} from '@angular/platform-browser';

export interface DeploymentsModel {
    definition_id: string;
    deploymentTime: Date;
    diagram: string;
    id: string;
    name: string;
    offline_reasons: DeploymentsOfflineReasonsModel[];
    online: boolean;
    image: SafeUrl;
    selected: boolean;
}

export interface DeploymentsOfflineReasonsModel {
    type: string;
    id: string;
    additional_info: {
        name: string;
    };
    description: string;
}



