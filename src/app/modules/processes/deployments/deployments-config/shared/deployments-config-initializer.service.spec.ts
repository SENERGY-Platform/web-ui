/*
 * Copyright 2020 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {TestBed, inject} from '@angular/core/testing';

import {HttpClientModule} from '@angular/common/http';
import {DeploymentsConfigInitializerService} from './deployments-config-initializer.service';
import {FormBuilder, FormControl} from '@angular/forms';
import {V2DeploymentsPreparedModel} from '../../shared/deployments-prepared-v2.model';

describe('DeploymentsConfigInitializerService', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientModule],
            providers: [DeploymentsConfigInitializerService, FormBuilder]
        });
    });

    it('should be created', inject([DeploymentsConfigInitializerService], (service: DeploymentsConfigInitializerService) => {
        expect(service).toBeTruthy();
    }));

    it('init FormControl with Lane Deployment, disable device and service selection for 2 out of 3 tasks', inject([DeploymentsConfigInitializerService], (service: DeploymentsConfigInitializerService) => {
        const deployment: V2DeploymentsPreparedModel = {
            id: '',
            name: 'Lamp_in_Lane',
            description: 'test_description',
            diagram: {
                svg: 'svg',
                xml_deployed: '',
                xml_raw: 'xml_raw'
            },
            elements: [
                {
                    'bpmn_id': 'Task_1954wep',
                    'group': 'pool:Lane_Lamp',
                    'name': 'Lamp setOnStateFunction',
                    'order': 0,
                    'time_event': null,
                    'notification': null,
                    'message_event': null,
                    'task': {
                        'retries': 0,
                        'parameter': {},
                        'configurables': null,
                        'selection': {
                            'filter_criteria': {
                                'characteristic_id': '',
                                'function_id': 'urn:infai:ses:controlling-function:79e7914b-f303-4a7d-90af-dee70db05fd9',
                                'device_class_id': 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                'aspect_id': null
                            },
                            'selection_options': [
                                {
                                    'device': {
                                        'id': 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        'name': 'LIFX Color Bulb 1'
                                    },
                                    'services': [
                                        {
                                            'id': 'urn:infai:ses:service:9ce22b54-3538-475b-bbfd-09056449f8f9',
                                            'name': 'setOnService'
                                        }
                                    ],
                                    'device_group': null
                                },
                                {
                                    'device': {
                                        'id': 'urn:infai:ses:device:5d9ffa2d-c3fc-4f56-80aa-2809c6dea757',
                                        'name': 'Hue color lamp 1'
                                    },
                                    'services': [
                                        {
                                            'id': 'urn:infai:ses:service:4535f01d-051f-4644-a747-e01c86aa3943',
                                            'name': 'setOnService'
                                        }
                                    ],
                                    'device_group': null
                                },
                                {
                                    'device': {
                                        'id': 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                                        'name': 'Hue color lamp 2'
                                    },
                                    'services': [
                                        {
                                            'id': 'urn:infai:ses:service:4535f01d-051f-4644-a747-e01c86aa3943',
                                            'name': 'setOnService'
                                        }
                                    ],
                                    'device_group': null
                                }
                            ],
                            'selected_device_id': '',
                            'selected_service_id': '',
                            'selected_device_group_id': null,
                        }
                    }
                },
                {
                    'bpmn_id': 'IntermediateThrowEvent_0pciieh',
                    'group': 'pool:Lane_Lamp',
                    'name': '',
                    'order': 0,
                    'time_event': {
                        'type': 'timeDuration',
                        'time': 'PT5S'
                    },
                    'notification': null,
                    'message_event': null,
                    'task': null
                },
                {
                    'bpmn_id': 'Task_1qz61o8',
                    'group': 'pool:Lane_Lamp',
                    'name': 'Lamp setColorFunction',
                    'order': 0,
                    'time_event': null,
                    'notification': null,
                    'message_event': null,
                    'task': {
                        'retries': 0,
                        'parameter': {
                            'inputs.b': '0',
                            'inputs.g': '0',
                            'inputs.r': '0'
                        },
                        'configurables': null,
                        'selection': {
                            'filter_criteria': {
                                'characteristic_id': 'urn:infai:ses:characteristic:5b4eea52-e8e5-4e80-9455-0382f81a1b43',
                                'function_id': 'urn:infai:ses:controlling-function:c54e2a89-1fb8-4ecb-8993-a7b40b355599',
                                'device_class_id': 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                'aspect_id': null
                            },
                            'selection_options': [
                                {
                                    'device': {
                                        'id': 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        'name': 'LIFX Color Bulb 1'
                                    },
                                    'services': [
                                        {
                                            'id': 'urn:infai:ses:service:98e7baf9-a0ba-4b43-acdf-2d2b915ac69d',
                                            'name': 'setColorService'
                                        }
                                    ],
                                    'device_group': null
                                },
                                {
                                    'device': {
                                        'id': 'urn:infai:ses:device:5d9ffa2d-c3fc-4f56-80aa-2809c6dea757',
                                        'name': 'Hue color lamp 1'
                                    },
                                    'services': [
                                        {
                                            'id': 'urn:infai:ses:service:1b0ef253-16f7-4b65-8a15-fe79fccf7e70',
                                            'name': 'setColorService'
                                        }
                                    ],
                                    'device_group': null
                                },
                                {
                                    'device': {
                                        'id': 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                                        'name': 'Hue color lamp 2'
                                    },
                                    'services': [
                                        {
                                            'id': 'urn:infai:ses:service:1b0ef253-16f7-4b65-8a15-fe79fccf7e70',
                                            'name': 'setColorService'
                                        }
                                    ],
                                    'device_group': null
                                }
                            ],
                            'selected_device_id': '',
                            'selected_service_id': '',
                            'selected_device_group_id': null,
                        }
                    }
                },
                {
                    'bpmn_id': 'IntermediateThrowEvent_0yhxn55',
                    'group': 'pool:Lane_Lamp',
                    'name': '',
                    'order': 0,
                    'time_event': {
                        'type': 'timeDuration',
                        'time': 'PT10S'
                    },
                    'notification': null,
                    'message_event': null,
                    'task': null
                },
                {
                    'bpmn_id': 'Task_0m8q0z5',
                    'group': 'pool:Lane_Lamp',
                    'name': 'Lamp setOffStateFunction',
                    'order': 0,
                    'time_event': null,
                    'notification': null,
                    'message_event': null,
                    'task': {
                        'retries': 0,
                        'parameter': {},
                        'configurables': null,
                        'selection': {
                            'filter_criteria': {
                                'characteristic_id': '',
                                'function_id': 'urn:infai:ses:controlling-function:2f35150b-9df7-4cad-95bc-165fa00219fd',
                                'device_class_id': 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                'aspect_id': null
                            },
                            'selection_options': [
                                {
                                    'device': {
                                        'id': 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        'name': 'LIFX Color Bulb 1'
                                    },
                                    'services': [
                                        {
                                            'id': 'urn:infai:ses:service:be1461ee-903d-46a2-9a28-1d7cb03b1c63',
                                            'name': 'setOffService'
                                        }
                                    ],
                                    'device_group': null
                                },
                                {
                                    'device': {
                                        'id': 'urn:infai:ses:device:5d9ffa2d-c3fc-4f56-80aa-2809c6dea757',
                                        'name': 'Hue color lamp 1'
                                    },
                                    'services': [
                                        {
                                            'id': 'urn:infai:ses:service:562c2a95-5edd-4d11-8ce4-dde9a788001e',
                                            'name': 'setOffService'
                                        }
                                    ],
                                    'device_group': null
                                },
                                {
                                    'device': {
                                        'id': 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                                        'name': 'Hue color lamp 2'
                                    },
                                    'services': [
                                        {
                                            'id': 'urn:infai:ses:service:562c2a95-5edd-4d11-8ce4-dde9a788001e',
                                            'name': 'setOffService'
                                        }
                                    ],
                                    'device_group': null
                                }
                            ],
                            'selected_device_id': '',
                            'selected_service_id': '',
                            'selected_device_group_id': null,
                        }
                    }
                }
            ],
            executable: true,
        };
        const initValues: V2DeploymentsPreparedModel = {
            id: '',
            name: 'Lamp_in_Lane',
            description: 'test_description',
            diagram: {
                svg: 'svg',
                xml_deployed: '',
                xml_raw: 'xml_raw'
            },
            elements: [
                {
                    'bpmn_id': 'Task_1954wep',
                    'group': 'pool:Lane_Lamp',
                    'name': 'Lamp setOnStateFunction',
                    'order': 0,
                    'time_event': null,
                    'notification': null,
                    'message_event': null,
                    'task': {
                        'retries': 0,
                        'parameter': {},
                        'configurables': [],
                        'selection': {
                            'filter_criteria': {
                                'characteristic_id': '',
                                'function_id': 'urn:infai:ses:controlling-function:79e7914b-f303-4a7d-90af-dee70db05fd9',
                                'device_class_id': 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                'aspect_id': null
                            },
                            'selection_options': [
                                {
                                    'device': {
                                        'id': 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        'name': 'LIFX Color Bulb 1'
                                    },
                                    'services': [
                                        {
                                            'id': 'urn:infai:ses:service:9ce22b54-3538-475b-bbfd-09056449f8f9',
                                            'name': 'setOnService'
                                        }
                                    ],
                                    'device_group': null
                                },
                                {
                                    'device': {
                                        'id': 'urn:infai:ses:device:5d9ffa2d-c3fc-4f56-80aa-2809c6dea757',
                                        'name': 'Hue color lamp 1'
                                    },
                                    'services': [
                                        {
                                            'id': 'urn:infai:ses:service:4535f01d-051f-4644-a747-e01c86aa3943',
                                            'name': 'setOnService'
                                        }
                                    ],
                                    'device_group': null
                                },
                                {
                                    'device': {
                                        'id': 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                                        'name': 'Hue color lamp 2'
                                    },
                                    'services': [
                                        {
                                            'id': 'urn:infai:ses:service:4535f01d-051f-4644-a747-e01c86aa3943',
                                            'name': 'setOnService'
                                        }
                                    ],
                                    'device_group': null
                                }
                            ],
                            'selection_options_index': -1,
                            'selected_device_id': '',
                            'selected_service_id': '',
                            'selected_device_group_id': null,
                            'show': false,
                        }
                    }
                },
                {
                    'bpmn_id': 'IntermediateThrowEvent_0pciieh',
                    'group': 'pool:Lane_Lamp',
                    'name': '',
                    'order': 0,
                    'time_event': {
                        'type': 'timeDuration',
                        'time': 'PT5S',
                        'timeUnits': {years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 5},
                    },
                    'notification': null,
                    'message_event': null,
                    'task': null
                },
                {
                    'bpmn_id': 'Task_1qz61o8',
                    'group': 'pool:Lane_Lamp',
                    'name': 'Lamp setColorFunction',
                    'order': 0,
                    'time_event': null,
                    'notification': null,
                    'message_event': null,
                    'task': {
                        'retries': 0,
                        'parameter': {
                            'inputs.b': '0',
                            'inputs.g': '0',
                            'inputs.r': '0'
                        },
                        'configurables': [],
                        'selection': {
                            'filter_criteria': {
                                'characteristic_id': 'urn:infai:ses:characteristic:5b4eea52-e8e5-4e80-9455-0382f81a1b43',
                                'function_id': 'urn:infai:ses:controlling-function:c54e2a89-1fb8-4ecb-8993-a7b40b355599',
                                'device_class_id': 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                'aspect_id': null
                            },
                            'selection_options': [
                                {
                                    'device': {
                                        'id': 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        'name': 'LIFX Color Bulb 1'
                                    },
                                    'services': [
                                        {
                                            'id': 'urn:infai:ses:service:98e7baf9-a0ba-4b43-acdf-2d2b915ac69d',
                                            'name': 'setColorService'
                                        }
                                    ],
                                    'device_group': null
                                },
                                {
                                    'device': {
                                        'id': 'urn:infai:ses:device:5d9ffa2d-c3fc-4f56-80aa-2809c6dea757',
                                        'name': 'Hue color lamp 1'
                                    },
                                    'services': [
                                        {
                                            'id': 'urn:infai:ses:service:1b0ef253-16f7-4b65-8a15-fe79fccf7e70',
                                            'name': 'setColorService'
                                        }
                                    ],
                                    'device_group': null
                                },
                                {
                                    'device': {
                                        'id': 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                                        'name': 'Hue color lamp 2'
                                    },
                                    'services': [
                                        {
                                            'id': 'urn:infai:ses:service:1b0ef253-16f7-4b65-8a15-fe79fccf7e70',
                                            'name': 'setColorService'
                                        }
                                    ],
                                    'device_group': null
                                }
                            ],
                            'selection_options_index': -1,
                            'selected_device_id': '',
                            'selected_service_id': '',
                            'selected_device_group_id': null,
                            'show': false,
                        }
                    }
                },
                {
                    'bpmn_id': 'IntermediateThrowEvent_0yhxn55',
                    'group': 'pool:Lane_Lamp',
                    'name': '',
                    'order': 0,
                    'time_event': {
                        'type': 'timeDuration',
                        'time': 'PT10S',
                        'timeUnits': {years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 10},
                    },
                    'notification': null,
                    'message_event': null,
                    'task': null
                },
                {
                    'bpmn_id': 'Task_0m8q0z5',
                    'group': 'pool:Lane_Lamp',
                    'name': 'Lamp setOffStateFunction',
                    'order': 0,
                    'time_event': null,
                    'notification': null,
                    'message_event': null,
                    'task': {
                        'retries': 0,
                        'parameter': {},
                        'configurables': [],
                        'selection': {
                            'filter_criteria': {
                                'characteristic_id': '',
                                'function_id': 'urn:infai:ses:controlling-function:2f35150b-9df7-4cad-95bc-165fa00219fd',
                                'device_class_id': 'urn:infai:ses:device-class:14e56881-16f9-4120-bb41-270a43070c86',
                                'aspect_id': null
                            },
                            'selection_options': [
                                {
                                    'device': {
                                        'id': 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        'name': 'LIFX Color Bulb 1'
                                    },
                                    'services': [
                                        {
                                            'id': 'urn:infai:ses:service:be1461ee-903d-46a2-9a28-1d7cb03b1c63',
                                            'name': 'setOffService'
                                        }
                                    ],
                                    'device_group': null
                                },
                                {
                                    'device': {
                                        'id': 'urn:infai:ses:device:5d9ffa2d-c3fc-4f56-80aa-2809c6dea757',
                                        'name': 'Hue color lamp 1'
                                    },
                                    'services': [
                                        {
                                            'id': 'urn:infai:ses:service:562c2a95-5edd-4d11-8ce4-dde9a788001e',
                                            'name': 'setOffService'
                                        }
                                    ],
                                    'device_group': null
                                },
                                {
                                    'device': {
                                        'id': 'urn:infai:ses:device:25491149-c826-44a7-a22b-4f1e2d5a78a2',
                                        'name': 'Hue color lamp 2'
                                    },
                                    'services': [
                                        {
                                            'id': 'urn:infai:ses:service:562c2a95-5edd-4d11-8ce4-dde9a788001e',
                                            'name': 'setOffService'
                                        }
                                    ],
                                    'device_group': null
                                }
                            ],
                            'selection_options_index': -1,
                            'selected_device_id': '',
                            'selected_service_id': '',
                            'selected_device_group_id': null,
                            'show': false,
                        }
                    }
                }
            ],
            executable: true,
        };
        const formGroup = service.initFormGroup(deployment);
        expect(formGroup.getRawValue()).toEqual(initValues);
        expect((<FormControl>formGroup.get('description')).disabled).toBe(true);
        expect((<FormControl>formGroup.get(['elements', 0, 'task', 'selection', 'selected_device_id'])).disabled).toBe(false);
        expect((<FormControl>formGroup.get(['elements', 0, 'task', 'selection', 'selected_service_id'])).disabled).toBe(false);
        expect((<FormControl>formGroup.get(['elements', 2, 'task', 'selection', 'selected_device_id'])).disabled).toBe(true);
        expect((<FormControl>formGroup.get(['elements', 2, 'task', 'selection', 'selected_service_id'])).disabled).toBe(true);
        expect((<FormControl>formGroup.get(['elements', 4, 'task', 'selection', 'selected_device_id'])).disabled).toBe(true);
        expect((<FormControl>formGroup.get(['elements', 4, 'task', 'selection', 'selected_service_id'])).disabled).toBe(true);
    }));

    it('init FormControl with MessageEvent', inject([DeploymentsConfigInitializerService], (service: DeploymentsConfigInitializerService) => {
        const deployment: V2DeploymentsPreparedModel = {
            id: '',
            name: 'message_event',
            description: 'test_description',
            diagram: {
                svg: 'svg',
                xml_deployed: '',
                xml_raw: 'xml_raw'
            },
            elements: [
                {
                    bpmn_id: 'StartEvent_1',
                    group: null,
                    name: 'getOnOffStateFunction on_off',
                    order: 0,
                    time_event: null,
                    notification: null,
                    message_event: {
                        event_id: '',
                        flow_id: '',
                        value: '',
                        selection: {
                            filter_criteria: {
                                aspect_id: 'urn:infai:ses:aspect:a7470d73-dde3-41fc-92bd-f16bb28f2da6',
                                characteristic_id: 'urn:infai:ses:characteristic:7621686a-56bc-402d-b4cc-5b266d39736f',
                                device_class_id: null,
                                function_id: 'urn:infai:ses:measuring-function:20d3c1d3-77d7-4181-a9f3-b487add58cd0'
                            },
                            selected_device_id: '',
                            selected_service_id: '',
                            selected_device_group_id: null,
                            selection_options: [
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        name: 'LIFX Color Bulb 1'
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:9ce22b54-3538-475b-bbfd-09056449f8f9',
                                            name: 'setOnService'
                                        }],
                                    device_group: null
                                }]
                        }
                    },
                    task: null
                }
            ],
            executable: true,
        };
        const initValues: V2DeploymentsPreparedModel = {
            id: '',
            name: 'message_event',
            description: 'test_description',
            diagram: {
                svg: 'svg',
                xml_deployed: '',
                xml_raw: 'xml_raw'
            },
            elements: [
                {
                    bpmn_id: 'StartEvent_1',
                    group: null,
                    name: 'getOnOffStateFunction on_off',
                    order: 0,
                    time_event: null,
                    notification: null,
                    message_event: {
                        event_id: '',
                        flow_id: '',
                        value: '',
                        selection: {
                            selection_options_index: -1,
                            show: false,
                            filter_criteria: {
                                aspect_id: 'urn:infai:ses:aspect:a7470d73-dde3-41fc-92bd-f16bb28f2da6',
                                characteristic_id: 'urn:infai:ses:characteristic:7621686a-56bc-402d-b4cc-5b266d39736f',
                                device_class_id: null,
                                function_id: 'urn:infai:ses:measuring-function:20d3c1d3-77d7-4181-a9f3-b487add58cd0'
                            },
                            selected_device_id: '',
                            selected_service_id: '',
                            selected_device_group_id: null,
                            selection_options: [
                                {
                                    device: {
                                        id: 'urn:infai:ses:device:7fbd37f6-ff3b-46ae-8805-3ca89766893b',
                                        name: 'LIFX Color Bulb 1'
                                    },
                                    services: [
                                        {
                                            id: 'urn:infai:ses:service:9ce22b54-3538-475b-bbfd-09056449f8f9',
                                            name: 'setOnService'
                                        }],
                                    device_group: null
                                }]
                        }
                    },
                    task: null
                }
            ],
            executable: true,
        };
        const formGroup = service.initFormGroup(deployment);
        expect(formGroup.getRawValue()).toEqual(initValues);
        expect((<FormControl>formGroup.get('description')).disabled).toBe(true);
    }));
});
