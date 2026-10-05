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
 * Flows as analytics-flow-repo-v2 returns them: only the fields of its lib.Cell survive storage.
 * The first three are the parser_testdata flows of analytics-parser, reduced to those fields and with public image names.
 */

export const adderFlow = {
    _id: '5ee0a2831b576d2534f04099',
    name: 'Testerererer',
    model: {
        cells: [
            {
                type: 'senergy.NodeElement',
                inPorts: [
                    'value',
                    'timestamp'
                ],
                outPorts: [
                    'sum',
                    ' lastTimestamp'
                ],
                name: 'adder',
                image: 'image',
                operatorId: '5d2da1c0de2c3100015801f3',
                position: {
                    x: 220,
                    y: 180
                },
                id: '37eb2c6a-3879-4145-86c1-7d38fdd8b814',
                deploymentType: 'cloud'
            },
            {
                type: 'senergy.NodeElement',
                inPorts: [
                    'value',
                    'timestamp'
                ],
                outPorts: [
                    'sum',
                    ' lastTimestamp'
                ],
                name: 'adder',
                image: 'image',
                operatorId: '5d2da1c0de2c3100015801f3',
                position: {
                    x: 660,
                    y: 280
                },
                id: '22a28f5b-54d8-4e46-9ba9-c36dc6bd3da8',
                deploymentType: 'cloud'
            },
            {
                type: 'link',
                source: {
                    id: '37eb2c6a-3879-4145-86c1-7d38fdd8b814',
                    magnet: 'portBody',
                    port: 'out-sum'
                },
                target: {
                    id: '22a28f5b-54d8-4e46-9ba9-c36dc6bd3da8',
                    magnet: 'portBody',
                    port: 'in-value'
                },
                id: '1c177af8-dabd-4f09-a2ae-4ac7482d1938'
            },
            {
                type: 'link',
                source: {
                    id: '37eb2c6a-3879-4145-86c1-7d38fdd8b814',
                    magnet: 'portBody',
                    port: 'out- lastTimestamp'
                },
                target: {
                    id: '22a28f5b-54d8-4e46-9ba9-c36dc6bd3da8',
                    magnet: 'portBody',
                    port: 'in-timestamp'
                },
                id: '0c4c39dd-6d87-4226-9bfe-8520f10cfc67'
            }
        ]
    }
};

export const estimatorFlow = {
    _id: '5f0c57326244d82bf2f555dc',
    name: 'kombinierte Prognose',
    model: {
        cells: [
            {
                type: 'senergy.NodeElement',
                inPorts: [
                    'value',
                    'timestamp'
                ],
                outPorts: [
                    'sum',
                    'lastTimestamp'
                ],
                name: 'adder',
                image: 'ghcr.io/senergy-platform/analytics-operator-adder:dev',
                operatorId: '5d91a1a253a227ee830c737a',
                position: {
                    x: 150,
                    y: 50
                },
                id: '59b0db84-5482-421b-8a34-db0aeacaaab2',
                deploymentType: 'cloud'
            },
            {
                type: 'senergy.NodeElement',
                inPorts: [
                    'value',
                    'timestamp'
                ],
                outPorts: [
                    'sum',
                    'lastTimestamp'
                ],
                name: 'adder',
                image: 'ghcr.io/senergy-platform/analytics-operator-adder:dev',
                operatorId: '5d91a1a253a227ee830c737a',
                position: {
                    x: 160,
                    y: 240
                },
                id: 'cece1553-282b-4160-93f2-8853bc4fd32b',
                deploymentType: 'cloud'
            },
            {
                type: 'senergy.NodeElement',
                inPorts: [
                    'value1',
                    'timestamp1',
                    'value2',
                    'timestamp2'
                ],
                outPorts: [
                    'value',
                    'timestamp'
                ],
                name: 'merge-adder',
                image: 'ghcr.io/senergy-platform/analytics-operator-merge-adder:prod',
                operatorId: '5f0c5469c0ee610214d3b041',
                position: {
                    x: 560,
                    y: 140
                },
                id: 'c3873ed3-e188-4941-ad68-e25480e2cf44',
                deploymentType: 'cloud'
            },
            {
                type: 'link',
                source: {
                    id: 'cece1553-282b-4160-93f2-8853bc4fd32b',
                    magnet: 'portBody',
                    port: 'out-lastTimestamp'
                },
                target: {
                    id: 'c3873ed3-e188-4941-ad68-e25480e2cf44',
                    magnet: 'portBody',
                    port: 'in-timestamp2'
                },
                id: '143a3c01-95c0-4f46-8250-1da8e12f47bd'
            },
            {
                type: 'link',
                source: {
                    id: 'cece1553-282b-4160-93f2-8853bc4fd32b',
                    magnet: 'portBody',
                    port: 'out-sum'
                },
                target: {
                    id: 'c3873ed3-e188-4941-ad68-e25480e2cf44',
                    magnet: 'portBody',
                    port: 'in-value2'
                },
                id: '11b13198-0586-44bc-ba66-8a77f2c5cb6a'
            },
            {
                type: 'link',
                source: {
                    id: '59b0db84-5482-421b-8a34-db0aeacaaab2',
                    magnet: 'portBody',
                    port: 'out-lastTimestamp'
                },
                target: {
                    id: 'c3873ed3-e188-4941-ad68-e25480e2cf44',
                    magnet: 'portBody',
                    port: 'in-timestamp1'
                },
                id: 'd3efc694-6fd0-44b1-baaf-45d26e7f5404'
            },
            {
                type: 'link',
                source: {
                    id: '59b0db84-5482-421b-8a34-db0aeacaaab2',
                    magnet: 'portBody',
                    port: 'out-sum'
                },
                target: {
                    id: 'c3873ed3-e188-4941-ad68-e25480e2cf44',
                    magnet: 'portBody',
                    port: 'in-value1'
                },
                id: '85c441a4-592a-4a70-b822-5c931a376845'
            },
            {
                type: 'senergy.NodeElement',
                inPorts: [
                    'timestamp',
                    'value'
                ],
                outPorts: [
                    'DayTimestamp',
                    'MonthTimestamp',
                    'YearTimestamp',
                    'DayPrediction',
                    'MonthPrediction',
                    'YearPrediction',
                    'DayPredictionTotal',
                    'MonthPredictionTotal',
                    'YearPredictionTotal'
                ],
                name: 'estimator',
                image: 'ghcr.io/senergy-platform/analytics-operator-estimator:dev',
                operatorId: '5d91a35553a227ee830c737e',
                position: {
                    x: 1060,
                    y: 300
                },
                id: '55461c35-5f6f-44c5-ac5a-ae7a4e22be9e',
                config: [
                    {
                        name: 'Algorithm',
                        type: 'string'
                    },
                    {
                        name: 'Timezone',
                        type: 'string'
                    },
                    {
                        name: 'ignoreValuesOlderThanMs',
                        type: 'string'
                    }
                ],
                deploymentType: 'cloud'
            },
            {
                type: 'senergy.NodeElement',
                inPorts: [
                    'value',
                    'timestamp'
                ],
                outPorts: [
                    'sum',
                    'lastTimestamp'
                ],
                name: 'adder',
                image: 'ghcr.io/senergy-platform/analytics-operator-adder:dev',
                operatorId: '5d91a1a253a227ee830c737a',
                position: {
                    x: 160,
                    y: 420
                },
                id: 'eeb25535-a361-4904-b5c5-79f7cda50ef0',
                deploymentType: 'cloud'
            },
            {
                type: 'senergy.NodeElement',
                inPorts: [
                    'value',
                    'timestamp'
                ],
                outPorts: [
                    'sum',
                    'lastTimestamp'
                ],
                name: 'adder',
                image: 'ghcr.io/senergy-platform/analytics-operator-adder:dev',
                operatorId: '5d91a1a253a227ee830c737a',
                position: {
                    x: 180,
                    y: 580
                },
                id: 'b4ae4739-2137-4697-942a-244b65654072',
                deploymentType: 'cloud'
            },
            {
                type: 'senergy.NodeElement',
                inPorts: [
                    'value1',
                    'timestamp1',
                    'value2',
                    'timestamp2'
                ],
                outPorts: [
                    'value',
                    'timestamp'
                ],
                name: 'merge-adder',
                image: 'ghcr.io/senergy-platform/analytics-operator-merge-adder:prod',
                operatorId: '5f0c5469c0ee610214d3b041',
                position: {
                    x: 520,
                    y: 500
                },
                id: '27d37f89-eba0-4717-b653-40a84c15dd46',
                deploymentType: 'cloud'
            },
            {
                type: 'link',
                source: {
                    id: 'eeb25535-a361-4904-b5c5-79f7cda50ef0',
                    magnet: 'portBody',
                    port: 'out-sum'
                },
                target: {
                    id: '27d37f89-eba0-4717-b653-40a84c15dd46',
                    magnet: 'portBody',
                    port: 'in-value1'
                },
                id: '331db4be-be52-4f36-97f7-9183e98b4cfe'
            },
            {
                type: 'link',
                source: {
                    id: 'eeb25535-a361-4904-b5c5-79f7cda50ef0',
                    magnet: 'portBody',
                    port: 'out-lastTimestamp'
                },
                target: {
                    id: '27d37f89-eba0-4717-b653-40a84c15dd46',
                    magnet: 'portBody',
                    port: 'in-timestamp1'
                },
                id: 'faee2810-a19a-42f3-8c99-c89922e337ce'
            },
            {
                type: 'link',
                source: {
                    id: 'b4ae4739-2137-4697-942a-244b65654072',
                    magnet: 'portBody',
                    port: 'out-sum'
                },
                target: {
                    id: '27d37f89-eba0-4717-b653-40a84c15dd46',
                    magnet: 'portBody',
                    port: 'in-value2'
                },
                id: '1b0c19dd-5dfe-4320-954a-d8cb843803cf'
            },
            {
                type: 'link',
                source: {
                    id: 'b4ae4739-2137-4697-942a-244b65654072',
                    magnet: 'portBody',
                    port: 'out-lastTimestamp'
                },
                target: {
                    id: '27d37f89-eba0-4717-b653-40a84c15dd46',
                    magnet: 'portBody',
                    port: 'in-timestamp2'
                },
                id: '9b629314-6cc3-478f-96a6-9bea7aa446c9'
            },
            {
                type: 'senergy.NodeElement',
                inPorts: [
                    'value1',
                    'timestamp1',
                    'value2',
                    'timestamp2'
                ],
                outPorts: [
                    'value',
                    'timestamp'
                ],
                name: 'merge-adder',
                image: 'ghcr.io/senergy-platform/analytics-operator-merge-adder:prod',
                operatorId: '5f0c5469c0ee610214d3b041',
                position: {
                    x: 740,
                    y: 300
                },
                id: '452b9b7d-6142-4926-9c95-34b3952e0fd1',
                deploymentType: 'cloud'
            },
            {
                type: 'link',
                source: {
                    id: '27d37f89-eba0-4717-b653-40a84c15dd46',
                    magnet: 'portBody',
                    port: 'out-value'
                },
                target: {
                    id: '452b9b7d-6142-4926-9c95-34b3952e0fd1',
                    magnet: 'portBody',
                    port: 'in-value2'
                },
                id: '138dcf22-84d6-4ab9-b6ec-fcd77154ffd4'
            },
            {
                type: 'link',
                source: {
                    id: '27d37f89-eba0-4717-b653-40a84c15dd46',
                    magnet: 'portBody',
                    port: 'out-timestamp'
                },
                target: {
                    id: '452b9b7d-6142-4926-9c95-34b3952e0fd1',
                    magnet: 'portBody',
                    port: 'in-timestamp2'
                },
                id: 'c36d203b-21a1-4c69-b5bc-dff25c2c4dd7'
            },
            {
                type: 'link',
                source: {
                    id: 'c3873ed3-e188-4941-ad68-e25480e2cf44',
                    magnet: 'portBody',
                    port: 'out-timestamp'
                },
                target: {
                    id: '452b9b7d-6142-4926-9c95-34b3952e0fd1',
                    magnet: 'portBody',
                    port: 'in-timestamp1'
                },
                id: 'e99f9d8e-7a9d-41b4-a9b6-5498e89ca108'
            },
            {
                type: 'link',
                source: {
                    id: 'c3873ed3-e188-4941-ad68-e25480e2cf44',
                    magnet: 'portBody',
                    port: 'out-value'
                },
                target: {
                    id: '452b9b7d-6142-4926-9c95-34b3952e0fd1',
                    magnet: 'portBody',
                    port: 'in-value1'
                },
                id: '31403d14-721f-45b1-9512-8a89b7984f09'
            },
            {
                type: 'link',
                source: {
                    id: '452b9b7d-6142-4926-9c95-34b3952e0fd1',
                    magnet: 'portBody',
                    port: 'out-value'
                },
                target: {
                    id: '55461c35-5f6f-44c5-ac5a-ae7a4e22be9e',
                    magnet: 'portBody',
                    port: 'in-value'
                },
                id: '73c3f1fa-9bca-42e6-968c-dbcdd45e2eb0'
            },
            {
                type: 'link',
                source: {
                    id: '452b9b7d-6142-4926-9c95-34b3952e0fd1',
                    magnet: 'portBody',
                    port: 'out-timestamp'
                },
                target: {
                    id: '55461c35-5f6f-44c5-ac5a-ae7a4e22be9e',
                    magnet: 'portBody',
                    port: 'in-timestamp'
                },
                id: '2ff60eb2-eece-4526-b676-8561370cd4fb'
            }
        ]
    }
};

export const localFlow = {
    _id: '69ef49e64451cd9dd9241965',
    name: 'aaaaaa',
    model: {
        cells: [
            {
                type: 'senergy.NodeElement',
                inPorts: [
                    'value1',
                    'value2'
                ],
                outPorts: [
                    'sum'
                ],
                name: 'local-adder',
                image: 'ghcr.io/senergy-platform/analytics-operator-local-adder',
                operatorId: '664db084dd99c172e6e981cd',
                position: {
                    x: 100,
                    y: 200
                },
                id: '14fc43eb-4072-4411-9f15-ebe9ac2cddab',
                config: [
                    {
                        name: 'filter',
                        type: 'bool'
                    }
                ],
                deploymentType: 'local'
            },
            {
                type: 'senergy.NodeElement',
                inPorts: [
                    'value',
                    'original_input_ids'
                ],
                outPorts: [
                    'output_value',
                    'timestamp',
                    'original_input_ids'
                ],
                name: 'addTimestamp',
                image: 'ghcr.io/senergy-platform/analytics-operator-add-timestamp:prod',
                operatorId: '65e0777675de4dc34028ea1e',
                position: {
                    x: 580,
                    y: 200
                },
                id: '1d8316b7-8806-40df-befd-7b071474b2c4',
                config: [
                    {
                        name: 'inputType',
                        type: 'string'
                    },
                    {
                        name: 'timezone',
                        type: 'string'
                    }
                ],
                deploymentType: ''
            },
            {
                type: 'link',
                source: {
                    id: '14fc43eb-4072-4411-9f15-ebe9ac2cddab',
                    magnet: 'portBody',
                    port: 'out-sum'
                },
                target: {
                    id: '1d8316b7-8806-40df-befd-7b071474b2c4',
                    magnet: 'portBody',
                    port: 'in-value'
                },
                id: '07eeaaa8-716c-4723-b4ef-c95564f1728b'
            }
        ]
    }
};

/** Edge cases the stored flows above do not cover: repeated and odd port names, markup characters, fractional positions, versions. */
export const edgeCaseFlow = {
    _id: '6a00000000000000000000e1',
    name: 'edge cases',
    model: {
        cells: [
            {
                type: 'senergy.NodeElement',
                outPorts: [
                    'value',
                    'value',
                    'name with spaces/and.dots'
                ],
                name: 'Temp & <Humidity>',
                image: 'ghcr.io/senergy-platform/analytics-operator-source',
                operatorId: '6a00000000000000000000a1',
                position: {
                    x: 100.5,
                    y: 33.25
                },
                id: 'a1a1a1a1-0000-4000-8000-000000000001',
                config: [],
                deploymentType: 'local',
                version: 3
            },
            {
                type: 'senergy.NodeElement',
                inPorts: [
                    'value',
                    'name with spaces/and.dots'
                ],
                outPorts: [
                    'out'
                ],
                name: 'sink',
                image: 'ghcr.io/senergy-platform/analytics-operator-sink',
                operatorId: '6a00000000000000000000a2',
                position: {
                    x: 520,
                    y: 260
                },
                id: 'a1a1a1a1-0000-4000-8000-000000000002',
                version: 2
            },
            {
                type: 'link',
                source: {
                    id: 'a1a1a1a1-0000-4000-8000-000000000001',
                    magnet: '',
                    port: 'out-name with spaces/and.dots'
                },
                target: {
                    id: 'a1a1a1a1-0000-4000-8000-000000000002',
                    magnet: '',
                    port: 'in-name with spaces/and.dots'
                },
                id: 'a1a1a1a1-0000-4000-8000-0000000000l1'
            }
        ]
    }
};
