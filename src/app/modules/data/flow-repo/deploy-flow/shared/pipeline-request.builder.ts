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

import { compareAspectIds, deprecatedAspectAlias } from '../../../../metadata/device-types-overview/shared/device-type.model';
import { NodeConfig, NodeModel, NodeValue, PipelineRequestModel } from './pipeline-request.model';

export const IMPORT_PREFIX = 'urn:infai:ses:import:';

/** The values of the deploy form the request is built from, read control by control. */
export interface PipelineFormValue {
    name: string;
    description: string;
    consumeAllMessages: boolean;
    metrics: boolean;
    /** a number or its JSON text, as the control holds it */
    windowTime: number | string | null;
    mergeStrategy: string;
    nodes: NodeFormValue[];
}

export interface NodeFormValue {
    id: string;
    deploymentType: string;
    persistData: boolean;
    configs: { name: string; value: string }[];
    inputs: InputFormValue[];
}

export interface InputFormValue {
    name: string;
    aspectIds: string[] | null | undefined;
    characteristics: string[];
    functionId: string;
    selectableId: string;
    /** device or import id to the services and paths selected for it */
    filter: Map<string, { serviceId: string; path: string }[]>;
    pipelines: { pipelineId: string; operatorId: string; topic: string; path: string }[];
}

export interface DeviceServicePath {
    devicesOrImports: string[];
    values: NodeValue[];
    topic: string;
}

interface PipelineOperatorFilter {
    topic: string;
    filters: { pipelineId: string; operatorId: string }[];
    values: NodeValue[];
}

export function sortedAspectIds(aspectIds: string[] | null | undefined): string[] {
    return [...new Set(aspectIds || [])].sort(compareAspectIds);
}

export function buildPipelineRequest(form: PipelineFormValue, flowId: string, pipelineId: string | null): PipelineRequestModel {
    const pipeReq: PipelineRequestModel = {
        flowId,
    } as PipelineRequestModel;
    pipeReq.id = pipelineId;
    pipeReq.name = form.name;
    pipeReq.description = form.description;
    pipeReq.consumeAllMessages = form.consumeAllMessages;
    pipeReq.metrics = form.metrics;
    pipeReq.windowTime = JSON.parse(form.windowTime as string);
    pipeReq.mergeStrategy = form.mergeStrategy;
    pipeReq.nodes = form.nodes.map(buildNode);
    return pipeReq;
}

function buildNode(node: NodeFormValue): NodeModel {
    const nodeModel: NodeModel = {
        inputSelections: [],
        inputs: [],
        config: [],
        deploymentType: node.deploymentType,
        nodeId: node.id,
        persistData: node.persistData,
    };
    node.configs.forEach((config) => {
        const nodeConfig: NodeConfig = {
            name: config.name,
            value: config.value,
        };
        nodeModel.config?.push(nodeConfig);
    });
    nodeModel.inputSelections = [];
    const flatFilters: DeviceServicePath[] = [];
    const flatPipelineFilters: PipelineOperatorFilter[] = [];
    // Create a filter for each device/topic/value
    node.inputs.forEach((input) => {
        input.filter.forEach((subfilters, deviceOrImportId) => {
            subfilters.forEach((filter) => {
                flatFilters.push({
                    devicesOrImports: [deviceOrImportId],
                    topic: filter.serviceId.replace(/:/g, '_'),
                    values: [
                        {
                            name: input.name,
                            path: filter.path,
                        },
                    ],
                });
            });
        });

        const aspectIds = sortedAspectIds(input.aspectIds);
        nodeModel.inputSelections?.push({
            inputName: input.name,
            // an input without aspect keeps the null it was saved with before the list existed
            aspectId: deprecatedAspectAlias(aspectIds) ?? null,
            ...(aspectIds.length > 0 ? { aspectIds } : {}),
            characteristicIds: input.characteristics,
            functionId: input.functionId,
            selectableId: input.selectableId,
        });

        input.pipelines.forEach((pipelineGroup) => {
            flatPipelineFilters.push({
                topic: pipelineGroup.topic,
                values: [
                    {
                        name: input.name,
                        path: pipelineGroup.path,
                    },
                ],
                filters: [
                    {
                        pipelineId: pipelineGroup.pipelineId,
                        operatorId: pipelineGroup.operatorId,
                    },
                ],
            });
        });
    });
    // Create a filter for each pipeline input
    // Join all filters with same topic/value combination
    const joinedOperatorFilters: PipelineOperatorFilter[] = [];
    flatPipelineFilters.forEach((filter) => {
        const idx = joinedOperatorFilters.findIndex((joined) => {
            if (joined.topic !== filter.topic || joined.values.length !== filter.values.length) {
                return false;
            }

            let valuesEqual = true;
            joined.values.forEach((joinedVal) => {
                if (
                    filter.values.findIndex(
                        (filterVal) => filterVal.name === joinedVal.name && filterVal.path === joinedVal.path,
                    ) === -1
                ) {
                    valuesEqual = false;
                }
            });
            return valuesEqual;
        });

        if (idx === -1) {
            joinedOperatorFilters.push(filter);
        } else {
            const missingFilters = filter.filters.filter(
                (filterFilter) =>
                    joinedOperatorFilters[idx].filters.findIndex(
                        (joinedFilter) =>
                            filterFilter.pipelineId === joinedFilter.pipelineId &&
                            filterFilter.operatorId === joinedFilter.operatorId,
                    ) === -1,
            );
            joinedOperatorFilters[idx].filters.push(...missingFilters);
        }
    });

    // Join all filters with same topic/pipe/operator combination
    const joinedPipelineFilters: PipelineOperatorFilter[] = [];
    joinedOperatorFilters.forEach((filter) => {
        const idx = joinedPipelineFilters.findIndex((joined) => {
            if (joined.topic !== filter.topic || joined.filters.length !== filter.filters.length) {
                return false;
            }

            let filtersEqual = true;
            joined.filters.forEach((joinedFilter) => {
                if (
                    filter.filters.findIndex(
                        (filterFilter) =>
                            filterFilter.pipelineId === joinedFilter.pipelineId &&
                            filterFilter.operatorId === joinedFilter.operatorId,
                    ) === -1
                ) {
                    filtersEqual = false;
                }
            });
            return filtersEqual;
        });
        if (idx === -1) {
            joinedPipelineFilters.push(filter);
        } else {
            const missingValues = filter.values.filter(
                (filterVal) =>
                    joinedPipelineFilters[idx].values.findIndex(
                        (joinedVal) => filterVal.name === joinedVal.name && filterVal.path === joinedVal.path,
                    ) === -1,
            );
            joinedPipelineFilters[idx].values.push(...missingValues);
        }
    });

    joinedPipelineFilters.forEach((filter) =>
        nodeModel.inputs?.push({
            filterType: 'operatorId',
            filterIds: filter.filters.map((f) => f.operatorId + ':' + f.pipelineId).join(','),
            topicName: filter.topic,
            values: filter.values,
        }),
    );

    // Join all filters with same topic/value combination
    const joinedDeviceFilters: DeviceServicePath[] = [];
    flatFilters.forEach((filter) => {
        const idx = joinedDeviceFilters.findIndex((joined) => {
            if (joined.topic !== filter.topic || joined.values.length !== filter.values.length) {
                return false;
            }

            let valuesEqual = true;
            joined.values.forEach((joinedVal) => {
                if (
                    filter.values.findIndex(
                        (filterVal) => filterVal.name === joinedVal.name && filterVal.path === joinedVal.path,
                    ) === -1
                ) {
                    valuesEqual = false;
                }
            });
            return valuesEqual;
        });

        if (idx === -1) {
            joinedDeviceFilters.push(filter);
        } else {
            const missingDevices = filter.devicesOrImports.filter(
                (filterDevice) =>
                    joinedDeviceFilters[idx].devicesOrImports.findIndex((joinedDevice) => filterDevice === joinedDevice) === -1,
            );
            joinedDeviceFilters[idx].devicesOrImports.push(...missingDevices);
        }
    });
    // Join all filters with same topic/device combination
    const joinedValueFilters: DeviceServicePath[] = [];
    joinedDeviceFilters.forEach((filter) => {
        const idx = joinedValueFilters.findIndex((joined) => {
            if (joined.topic !== filter.topic || joined.devicesOrImports.length !== filter.devicesOrImports.length) {
                return false;
            }

            let devicesEqual = true;
            joined.devicesOrImports.forEach((joinedDevice) => {
                if (filter.devicesOrImports.findIndex((filterDevice) => filterDevice === joinedDevice) === -1) {
                    devicesEqual = false;
                }
            });
            return devicesEqual;
        });
        if (idx === -1) {
            joinedValueFilters.push(filter);
        } else {
            const missingValues = filter.values.filter(
                (filterVal) =>
                    joinedValueFilters[idx].values.findIndex(
                        (joinedVal) => filterVal.name === joinedVal.name && filterVal.path === joinedVal.path,
                    ) === -1,
            );
            joinedValueFilters[idx].values.push(...missingValues);
        }
    });

    joinedValueFilters.forEach((filter) =>
        nodeModel.inputs?.push({
            filterType: filter.devicesOrImports[0].startsWith(IMPORT_PREFIX) ? 'ImportId' : 'deviceId',
            filterIds: filter.devicesOrImports.map(value => value.split('$')[0]).join(','), // trim id modifiers and join with ','
            topicName: filter.topic,
            values: filter.values,
        }),
    );

    return nodeModel;
}
