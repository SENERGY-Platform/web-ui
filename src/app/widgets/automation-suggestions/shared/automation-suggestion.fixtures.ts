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

/* Fixtures for the specs of this widget. Not used by the application. */

import {
    DeviceTypeContentModel,
    DeviceTypeContentVariableModel,
    DeviceTypeFunctionModel,
    DeviceTypeModel,
    DeviceTypeServiceModel
} from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import {
    CONTROLLING_FUNCTION_RDF_TYPE,
    AutomationSuggestion,
    SET_DEVICE_OFF_FUNCTION_ID,
    SET_DEVICE_ON_FUNCTION_ID,
    SuggestionTrigger
} from './automation-suggestion.model';
import { AutomationCatalog, measuredFunctionKey } from './automation-suggestion.resolver';

export const plugDeviceId = 'urn:infai:ses:device:plug';
export const lampDeviceId = 'urn:infai:ses:device:lamp';
export const levelDeviceId = 'urn:infai:ses:device:level';
export const measureServiceId = 'svc-measure';
export const controlServiceId = 'svc-control';
export const getLevelFunctionId = 'urn:infai:ses:measuring-function:get-level';
export const setLevelFunctionId = 'urn:infai:ses:controlling-function:set-level';
export const levelConceptId = 'urn:infai:ses:concept:level';
export const boolCharacteristicId = 'urn:infai:ses:characteristic:bool';
export const levelCharacteristicId = 'urn:infai:ses:characteristic:percent';
export const getStateFunctionId = 'urn:infai:ses:measuring-function:get-state';
export const rootDeviceId = 'urn:infai:ses:device:root';
export const stateDeviceId = 'urn:infai:ses:device:state';
export const stripDeviceId = 'urn:infai:ses:device:strip';
/** the four channel services of a multi-channel strip */
export const channelServiceIds = ['sw-1', 'sw-2', 'sw-3', 'sw-4'];

export function variable(partial: Partial<DeviceTypeContentVariableModel>): DeviceTypeContentVariableModel {
    return { is_void: false, serialization_options: [], ...partial };
}

export function content(contentVariable: DeviceTypeContentVariableModel): DeviceTypeContentModel {
    return {
        id: 'content-' + (contentVariable.name ?? 'x'),
        content_variable: contentVariable,
        content_variable_raw: '',
        serialization: 'json',
        protocol_segment_id: 'seg',
    };
}

export function service(id: string, inputs: DeviceTypeContentModel[], outputs: DeviceTypeContentModel[]): DeviceTypeServiceModel {
    return {
        id,
        local_id: id,
        name: id,
        description: '',
        protocol_id: 'proto',
        interaction: null,
        inputs,
        outputs,
    };
}

/** A plug with a state service (Set On/Off as commands) and a lamp-like level service. */
export function plugType(): DeviceTypeModel {
    return {
        id: 'type-plug',
        name: 'Plug',
        description: '',
        device_class_id: 'class',
        services: [
            service(controlServiceId, [
                content(variable({ name: 'on', function_id: SET_DEVICE_ON_FUNCTION_ID, characteristic_id: boolCharacteristicId })),
                content(variable({ name: 'off', function_id: SET_DEVICE_OFF_FUNCTION_ID, characteristic_id: boolCharacteristicId })),
            ], []),
            service(measureServiceId, [], [
                content(variable({ name: 'value', type: 'https://schema.org/StructuredValue', sub_content_variables: [
                    variable({ name: 'state', type: 'https://schema.org/Boolean', function_id: 'urn:infai:ses:measuring-function:get-state' }),
                ] })),
            ]),
        ],
    };
}

/**
 * A device type whose measured root is `root` and whose level is the child `v`. The analytics path is
 * `value.root.v`, the device-type path `root.v`.
 */
export function rootType(): DeviceTypeModel {
    return {
        id: 'type-root',
        name: 'Root',
        description: '',
        device_class_id: 'class',
        services: [
            service(controlServiceId, [
                content(variable({ name: 'level', function_id: setLevelFunctionId, characteristic_id: levelCharacteristicId })),
            ], []),
            service(measureServiceId, [], [
                content(variable({ name: 'root', type: 'https://schema.org/StructuredValue', sub_content_variables: [
                    variable({ name: 'v', type: 'https://schema.org/Number', function_id: getLevelFunctionId }),
                ] })),
            ]),
        ],
    };
}

/** A device type whose measured value is a scalar root `state`, device-type path `state`. */
export function scalarStateType(): DeviceTypeModel {
    return {
        id: 'type-scalar-state',
        name: 'Scalar state',
        description: '',
        device_class_id: 'class',
        services: [
            service(controlServiceId, [
                content(variable({ name: 'level', function_id: setLevelFunctionId, characteristic_id: levelCharacteristicId })),
            ], []),
            service(measureServiceId, [], [
                content(variable({ name: 'state', type: 'https://schema.org/Number', function_id: getLevelFunctionId })),
            ]),
        ],
    };
}

/** A multi-channel strip: one service per channel, each with On and Off. */
export function stripType(): DeviceTypeModel {
    return {
        id: 'type-strip',
        name: 'Strip',
        description: '',
        device_class_id: 'class',
        services: channelServiceIds.map((id) => service(id, [
            content(variable({ name: 'on', function_id: SET_DEVICE_ON_FUNCTION_ID, characteristic_id: boolCharacteristicId })),
            content(variable({ name: 'off', function_id: SET_DEVICE_OFF_FUNCTION_ID, characteristic_id: boolCharacteristicId })),
        ], [])),
    };
}

/**
 * A device type with On and Off on separate services, as on devices that split the commands.
 * The measuring service and the On service share a group, the Off service sits in another one.
 */
export const svcOn = 'svc-on';
export const svcOff = 'svc-off';
export const groupMeasure = 'group-measure';
export const groupCommands = 'group-commands';

export function splitPlugType(): DeviceTypeModel {
    return {
        id: 'type-split-plug',
        name: 'Split plug',
        description: '',
        device_class_id: 'class',
        services: [
            { ...service(svcOn, [
                content(variable({ name: 'on', function_id: SET_DEVICE_ON_FUNCTION_ID, characteristic_id: boolCharacteristicId })),
            ], []), service_group_key: groupMeasure },
            { ...service(svcOff, [
                content(variable({ name: 'off', function_id: SET_DEVICE_OFF_FUNCTION_ID, characteristic_id: 'urn:infai:ses:characteristic:off-flag' })),
            ], []), service_group_key: groupCommands },
            { ...service(measureServiceId, [], [
                content(variable({ name: 'value', type: 'https://schema.org/StructuredValue', sub_content_variables: [
                    variable({ name: 'state', type: 'https://schema.org/Boolean', function_id: 'urn:infai:ses:measuring-function:get-state' }),
                ] })),
            ]), service_group_key: groupMeasure },
        ],
    };
}

/** A device whose service shows a level (Get Level) and takes Set Level as command. */
export function levelType(): DeviceTypeModel {
    return {
        id: 'type-level',
        name: 'Level',
        description: '',
        device_class_id: 'class',
        services: [
            service(controlServiceId, [
                content(variable({ name: 'level', function_id: setLevelFunctionId, characteristic_id: levelCharacteristicId })),
            ], []),
            service(measureServiceId, [], [
                content(variable({ name: 'value', type: 'https://schema.org/StructuredValue', sub_content_variables: [
                    variable({ name: 'level', type: 'https://schema.org/Number', function_id: getLevelFunctionId }),
                ] })),
            ]),
        ],
    };
}

export function controllingFunction(id: string, concept: string): DeviceTypeFunctionModel {
    return { id, name: id, display_name: id, description: '', rdf_type: CONTROLLING_FUNCTION_RDF_TYPE, concept_id: concept };
}

export function catalogFixture(overrides: Partial<AutomationCatalog> = {}): AutomationCatalog {
    const setOn = controllingFunction(SET_DEVICE_ON_FUNCTION_ID, 'concept-binary');
    const setOff = controllingFunction(SET_DEVICE_OFF_FUNCTION_ID, 'concept-binary');
    const setLevel = controllingFunction(setLevelFunctionId, levelConceptId);
    return {
        deviceNames: new Map([
            [plugDeviceId, 'Plug Stehlampe'],
            [lampDeviceId, 'Licht EG'],
            [levelDeviceId, 'Dimmer'],
            [rootDeviceId, 'Root device'],
            [stateDeviceId, 'State device'],
            [stripDeviceId, 'Strip channel 3'],
        ]),
        deviceTypes: new Map([
            [plugDeviceId, plugType()],
            [lampDeviceId, plugType()],
            [levelDeviceId, levelType()],
            [rootDeviceId, rootType()],
            [stateDeviceId, scalarStateType()],
            [stripDeviceId, stripType()],
        ]),
        measuredFunctionIds: new Map([
            [measuredFunctionKey(levelDeviceId, measureServiceId, 'value.level'), getLevelFunctionId],
            [measuredFunctionKey(rootDeviceId, measureServiceId, 'root.v'), getLevelFunctionId],
            [measuredFunctionKey(stateDeviceId, measureServiceId, 'state'), getLevelFunctionId],
            [measuredFunctionKey(lampDeviceId, measureServiceId, 'state'), getStateFunctionId],
        ]),
        functionsById: new Map([
            [getLevelFunctionId, { id: getLevelFunctionId, name: 'Get Level', display_name: 'Get Level', description: '', rdf_type: 'https://senergy.infai.org/ontology/MeasuringFunction', concept_id: levelConceptId }],
            [getStateFunctionId, { id: getStateFunctionId, name: 'Get State', display_name: 'Get State', description: '', rdf_type: 'https://senergy.infai.org/ontology/MeasuringFunction', concept_id: 'concept-binary' }],
        ]),
        controllingFunctionsByConcept: new Map([
            ['concept-binary', [setOn, setOff]],
            [levelConceptId, [setLevel]],
        ]),
        ...overrides,
    };
}

export function suggestionFixture(overrides: Partial<AutomationSuggestion> = {}): AutomationSuggestion {
    return {
        id: 'sug-1',
        trigger: { device_id: plugDeviceId, service_id: measureServiceId, path: 'value.state', kind: 'binary', from: null, to: 'off' },
        window: { from: '19:00', to: '02:00', weekdays: [0, 1, 2, 3, 4, 5, 6], tz: 'Europe/Berlin' },
        targets: [{ device_id: lampDeviceId, service_id: measureServiceId, path: 'value.state', function_id: null, value: true }],
        auto_off_s: null,
        stats: { occurrences: 100, hits: 31, confidence: 0.31, baseline: 0.05, lift: 6.2, median_delay_s: 25 },
        ...overrides,
    };
}

/** A power trigger of a smart plug: on above 20 W, off below 10 W, the new state must hold 60 s. */
export function powerTriggerFixture(overrides: Partial<SuggestionTrigger> = {}): SuggestionTrigger {
    return {
        device_id: plugDeviceId,
        service_id: measureServiceId,
        path: 'value.sensor.ENERGY.Power',
        kind: 'power',
        from: 'off',
        to: 'on',
        on_above_w: 20,
        off_below_w: 10,
        hold_s: 60,
        ...overrides,
    };
}
