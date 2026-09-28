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

import { deploymentElementCriteria, pipelineInputCriteria } from './device-instances-replace-dialog.component';
import { PipelineInputSelectionModel } from 'src/app/modules/data/flow-repo/deploy-flow/shared/pipeline-request.model';
import { V2DeploymentsPreparedFilterCriteriaModel } from 'src/app/modules/processes/deployments/shared/deployments-prepared-v2.model';

const air = 'urn:infai:ses:aspect:air';
const water = 'urn:infai:ses:aspect:water';
const fn = 'urn:infai:ses:measuring-function:temperature';

describe('device replacement criteria', () => {
    const selection = (fields: Partial<PipelineInputSelectionModel>): PipelineInputSelectionModel =>
        ({ inputName: 'value', aspectId: null, functionId: fn, characteristicIds: [], selectableId: 'g', ...fields });
    const filter = (fields: Partial<V2DeploymentsPreparedFilterCriteriaModel>): V2DeploymentsPreparedFilterCriteriaModel =>
        ({ characteristic_id: null, function_id: fn, device_class_id: null, aspect_id: null, ...fields });

    it('asks for no aspect for a pipeline input without one', () => {
        expect(pipelineInputCriteria(selection({ aspectId: '' }))).toEqual({ function_id: fn });
        expect(pipelineInputCriteria(selection({ aspectId: null, aspectIds: null }))).toEqual({ function_id: fn });
    });

    it('asks for the single aspect of a pipeline input saved before the list, in both spellings', () => {
        expect(pipelineInputCriteria(selection({ aspectId: air }))).toEqual({ aspect_id: air, aspect_ids: [air], function_id: fn });
    });

    it('asks for the union of both pipeline fields, sorted, with the first as the alias', () => {
        expect(pipelineInputCriteria(selection({ aspectId: water, aspectIds: [air] }))).toEqual({
            aspect_id: air,
            aspect_ids: [air, water],
            function_id: fn,
        });
    });

    it('asks for no aspect for a deployment element without one', () => {
        expect(deploymentElementCriteria(filter({}), 'event')).toEqual({
            interaction: 'event',
            function_id: fn,
            device_class_id: undefined,
        });
    });

    it('asks for the union of both deployment fields, sorted, with the first as the alias', () => {
        expect(deploymentElementCriteria(filter({ aspect_id: water, aspect_ids: [water, air] }), '')).toEqual({
            interaction: '',
            function_id: fn,
            aspect_id: air,
            aspect_ids: [air, water],
            device_class_id: undefined,
        });
    });
});
