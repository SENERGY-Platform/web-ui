/*
 * Copyright 2025 InfAI (CC SES)
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

import {
    DeviceTypeAspectNodeModel,
    DeviceTypeCharacteristicsModel,
    DeviceTypeModel,
} from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceGroupCriteriaModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';
import {
    aspectDistance,
    characteristicStep,
    characteristicTypeBoolean,
    characteristicTypeFloat,
    characteristicTypeInteger,
    characteristicTypeList,
    characteristicTypeStructure,
    characteristicTypeText,
    controlState,
    declarationsOf,
    deviceClassDistance,
    draw,
    findStateSource,
    FloorplanControlInput,
    FloorplanControlModel,
    FloorplanWidgetCapabilityModel,
    FloorplanWidgetPropertiesModel,
    fpCriteriaConnectionStatus,
    impliedControllingCriteria,
    isPlaced,
    mergeVoidToggles,
    needsServiceGroups,
    readCommands,
    resolveControlInput,
    serviceGroupFunctions,
    sharesServiceGroup,
    sharesValuePath,
    StateSourceContextModel,
    VoidTogglePair,
} from './floorplan.model';

const placement = (overwrite: Partial<FloorplanWidgetCapabilityModel>): FloorplanWidgetCapabilityModel => ({
    alias: 'alias',
    deviceGroupId: 'deviceGroupId',
    criteria: { function_id: 'function', aspect_id: '', device_class_id: '', interaction: '' },
    position: { x: 0.5, y: 0.5 },
    coloring: [{ value: 0, icon: 'circle', color: '#000000', showValue: false, showValueWhenZoomed: false }],
    valueLow: null,
    valueHigh: null,
    colorLow: null,
    colorHigh: null,
    ...overwrite,
});

const characteristic = (overwrite: Partial<DeviceTypeCharacteristicsModel>): DeviceTypeCharacteristicsModel => ({
    name: 'characteristic',
    display_unit: '',
    type: characteristicTypeText,
    ...overwrite,
});

const setOn = 'urn:infai:ses:controlling-function:set-on';
const setOff = 'urn:infai:ses:controlling-function:set-off';
const setColor = 'urn:infai:ses:controlling-function:set-color';
const getOnOff = 'urn:infai:ses:measuring-function:get-on-off';

const control = (functionId: string, aspectId = ''): FloorplanControlModel => ({
    criteria: { function_id: functionId, aspect_id: aspectId, device_class_id: '', interaction: '' },
    label: functionId,
    icon: 'circle',
    input: FloorplanControlInput.Action,
});

const onOffPair: VoidTogglePair[] = [{ state: getOnOff, on: setOn, off: setOff }];

const setPosition = 'urn:infai:ses:controlling-function:set-position';
const getPosition = 'urn:infai:ses:measuring-function:get-position';
const setTargetTemperature = 'urn:infai:ses:controlling-function:set-target-temperature';
const getTargetTemperature = 'urn:infai:ses:measuring-function:get-target-temperature';
const getTemperature = 'urn:infai:ses:measuring-function:get-temperature';

/** aspect tree: Building > Room > Window */
const aspects: DeviceTypeAspectNodeModel[] = [
    { id: 'building', name: 'Building', root_id: 'building', parent_id: '', child_ids: ['room'], ancestor_ids: [], descendent_ids: ['room', 'window'] },
    { id: 'room', name: 'Room', root_id: 'building', parent_id: 'building', child_ids: ['window'], ancestor_ids: ['building'], descendent_ids: ['window'] },
    { id: 'window', name: 'Window', root_id: 'building', parent_id: 'room', child_ids: [], ancestor_ids: ['building', 'room'], descendent_ids: [] },
];

const crit = (functionId: string, aspectId = 'room', deviceClassId = 'curtain'): DeviceGroupCriteriaModel =>
    ({ function_id: functionId, aspect_id: aspectId, device_class_id: deviceClassId, interaction: '' });

/** concepts: position functions share one, temperature functions share another */
const conceptOf = (functionId: string): string | undefined => {
    if (functionId === setPosition || functionId === getPosition) {
        return 'position';
    }
    if (functionId === setTargetTemperature || functionId === getTargetTemperature || functionId === getTemperature) {
        return 'temperature';
    }
    return '';
};

const context = (overwrite: Partial<StateSourceContextModel>): StateSourceContextModel => ({
    criteria: [],
    configured: [],
    aspects,
    conceptOf,
    serviceGroups: [],
    // an ambiguity is only reported once the device types were looked up, and only when there is
    // somewhere to remember that it was reported
    serviceGroupsLoaded: true,
    reportedAmbiguities: new Set<string>(),
    ...overwrite,
});

const deviceType = (services: { serviceGroupKey: string; isInput: boolean; functionId: string; aspectId?: string; path?: string }[]): DeviceTypeModel => ({
    id: 'deviceType',
    name: 'deviceType',
    description: '',
    device_class_id: 'curtain',
    services: services.map((s, i) => ({
        id: 'service' + i,
        local_id: 'service' + i,
        service_group_key: s.serviceGroupKey,
        name: 'service' + i,
        description: '',
        protocol_id: '',
        interaction: null,
        inputs: s.isInput ? [contentOf(s.functionId, s.aspectId, s.path)] : [],
        outputs: s.isInput ? [] : [contentOf(s.functionId, s.aspectId, s.path)],
    })),
});

const contentOf = (functionId: string, aspectId = 'room', path = 'value') => ({
    id: 'content',
    content_variable: {
        name: path,
        type: characteristicTypeInteger,
        function_id: functionId,
        aspect_id: aspectId,
        serialization_options: [],
        is_void: false,
    },
    content_variable_raw: '',
    serialization: 'json',
    protocol_segment_id: '',
});

describe('FloorplanModel', () => {
    describe('isPlaced', () => {
        it('is true once a position is set', () => {
            expect(isPlaced(placement({ position: { x: 0.5, y: 0.5 } }))).toBeTrue();
        });

        it('is true for a position at the origin', () => {
            // 0 is a valid coordinate and must not be confused with a missing position
            expect(isPlaced(placement({ position: { x: 0, y: 0 } }))).toBeTrue();
        });

        it('is false while any coordinate is missing', () => {
            expect(isPlaced(placement({ position: { x: null, y: null } }))).toBeFalse();
            expect(isPlaced(placement({ position: { x: 0.5, y: null } }))).toBeFalse();
            expect(isPlaced(placement({ position: { x: null, y: 0.5 } }))).toBeFalse();
        });
    });

    describe('resolveControlInput', () => {
        it('asks for nothing when the function has no concept to describe an input', () => {
            expect(resolveControlInput(undefined)).toBe(FloorplanControlInput.Action);
        });

        it('offers a switch for a boolean', () => {
            expect(resolveControlInput(characteristic({ type: characteristicTypeBoolean }))).toBe(FloorplanControlInput.Switch);
        });

        it('offers a slider for a clamped number', () => {
            expect(resolveControlInput(characteristic({ type: characteristicTypeFloat, min_value: 15, max_value: 30 })))
                .toBe(FloorplanControlInput.Slider);
        });

        it('offers a number field when the range is open', () => {
            expect(resolveControlInput(characteristic({ type: characteristicTypeFloat }))).toBe(FloorplanControlInput.Number);
        });

        it('offers a number field when only one bound is known', () => {
            expect(resolveControlInput(characteristic({ type: characteristicTypeInteger, min_value: 0 })))
                .toBe(FloorplanControlInput.Number);
        });

        it('offers a number field for an empty range', () => {
            // a slider between 5 and 5 has nothing to drag
            expect(resolveControlInput(characteristic({ type: characteristicTypeInteger, min_value: 5, max_value: 5 })))
                .toBe(FloorplanControlInput.Number);
        });

        it('offers buttons for a few allowed values', () => {
            expect(resolveControlInput(characteristic({ type: characteristicTypeText, allowed_values: ['AUTO', 'LOW', 'HIGH'] })))
                .toBe(FloorplanControlInput.Buttons);
        });

        it('offers a dropdown for more allowed values than fit into a row of buttons', () => {
            expect(resolveControlInput(characteristic({ type: characteristicTypeText, allowed_values: ['A', 'B', 'C', 'D', 'E'] })))
                .toBe(FloorplanControlInput.Select);
        });

        it('prefers the allowed values of a number over its range', () => {
            expect(resolveControlInput(characteristic({ type: characteristicTypeInteger, min_value: 0, max_value: 3, allowed_values: [0, 1, 2, 3] })))
                .toBe(FloorplanControlInput.Buttons);
        });

        it('offers a text field for free text', () => {
            expect(resolveControlInput(characteristic({ type: characteristicTypeText }))).toBe(FloorplanControlInput.Text);
        });

        it('offers a form for a structure', () => {
            expect(resolveControlInput(characteristic({ type: characteristicTypeStructure }))).toBe(FloorplanControlInput.Form);
        });

        it('offers a form for a list', () => {
            expect(resolveControlInput(characteristic({ type: characteristicTypeList }))).toBe(FloorplanControlInput.Form);
        });

        it('falls back to a text field for a type it does not know', () => {
            expect(resolveControlInput(characteristic({ type: 'https://schema.org/Thing' }))).toBe(FloorplanControlInput.Text);
        });
    });

    describe('characteristicStep', () => {
        it('steps integers by one', () => {
            expect(characteristicStep(characteristic({ type: characteristicTypeInteger, min_value: 0, max_value: 3 }))).toBe(1);
        });

        it('steps a narrow float range finely', () => {
            expect(characteristicStep(characteristic({ type: characteristicTypeFloat, min_value: 0, max_value: 5 }))).toBe(0.1);
        });

        it('steps a temperature range by half degrees', () => {
            expect(characteristicStep(characteristic({ type: characteristicTypeFloat, min_value: 15, max_value: 30 }))).toBe(0.5);
        });

        it('steps a wide float range by one', () => {
            expect(characteristicStep(characteristic({ type: characteristicTypeFloat, min_value: 0, max_value: 1000 }))).toBe(1);
        });
    });

    describe('mergeVoidToggles', () => {
        it('turns a selected set on and set off pair into a single switch', () => {
            const merged = mergeVoidToggles([control(setOn), control(setOff)], onOffPair);

            expect(merged.length).toBe(1);
            expect(merged[0].input).toBe(FloorplanControlInput.Toggle);
            expect(merged[0].criteria.function_id).toBe(setOn);
            expect(merged[0].offCriteria?.function_id).toBe(setOff);
        });

        it('leaves set on as its own button while set off is not selected', () => {
            const merged = mergeVoidToggles([control(setOn)], onOffPair);

            expect(merged.length).toBe(1);
            expect(merged[0].input).toBe(FloorplanControlInput.Action);
            expect(merged[0].offCriteria).toBeUndefined();
        });

        it('keeps the pair apart while it switches different aspects', () => {
            const merged = mergeVoidToggles([control(setOn, 'kitchen'), control(setOff, 'bathroom')], onOffPair);

            expect(merged.length).toBe(2);
            expect(merged.every(m => m.input === FloorplanControlInput.Action)).toBeTrue();
        });

        it('keeps unrelated controls in the order they were selected', () => {
            const merged = mergeVoidToggles([control(setColor), control(setOn), control(setOff)], onOffPair);

            expect(merged.map(m => m.criteria.function_id)).toEqual([setColor, setOn]);
        });
    });

    describe('controlState', () => {
        it('takes the value a single device reported', () => {
            expect(controlState(21.5, FloorplanControlInput.Slider)).toBe(21.5);
        });

        it('reports a group as switched on only while every device is on', () => {
            expect(controlState([true, true], FloorplanControlInput.Toggle)).toBeTrue();
            expect(controlState([true, false], FloorplanControlInput.Toggle)).toBeFalse();
        });

        it('takes the first value of a group for inputs that show one value', () => {
            expect(controlState([21.5, 19], FloorplanControlInput.Slider)).toBe(21.5);
        });

        it('has no state for a group that reported nothing', () => {
            expect(controlState([], FloorplanControlInput.Toggle)).toBeUndefined();
        });
    });

    describe('aspectDistance', () => {
        it('is zero for the same aspect', () => {
            expect(aspectDistance('room', 'room', aspects)).toBe(0);
        });

        it('is one for an aspect reached through the tree', () => {
            expect(aspectDistance('window', 'room', aspects)).toBe(1);
            expect(aspectDistance('room', 'window', aspects)).toBe(1);
            expect(aspectDistance('window', 'building', aspects)).toBe(1);
        });

        it('has no distance between unrelated aspects', () => {
            expect(aspectDistance('room', 'elsewhere', aspects)).toBeUndefined();
        });

        it('treats an unset aspect as unspecified, which matches but ranks last', () => {
            // a generic device group keeps the aspect on one criteria and the device class on the other
            expect(aspectDistance('', '', aspects)).toBe(0);
            expect(aspectDistance('', 'room', aspects)).toBe(2);
            expect(aspectDistance('room', '', aspects)).toBe(2);
        });
    });

    describe('deviceClassDistance', () => {
        it('is zero for the same device class', () => {
            expect(deviceClassDistance('curtain', 'curtain')).toBe(0);
        });

        it('ranks an unset device class behind an exact match', () => {
            expect(deviceClassDistance('', 'curtain')).toBe(2);
            expect(deviceClassDistance('curtain', '')).toBe(2);
        });

        it('ranks two different device classes last, they describe different devices', () => {
            expect(deviceClassDistance('curtain', 'blind')).toBe(3);
        });
    });

    describe('serviceGroupFunctions', () => {
        it('collects the functions of every service under its service group', () => {
            const functions = serviceGroupFunctions(deviceType([
                { serviceGroupKey: 'left', isInput: false, functionId: getPosition },
                { serviceGroupKey: 'left', isInput: true, functionId: setPosition },
                { serviceGroupKey: 'right', isInput: false, functionId: getPosition },
            ]));

            // one entry per service, in the order the device type declares them
            expect(functions.map(f => ({ key: f.serviceGroupKey, fn: f.functionId, service: f.serviceId, input: f.isInput }))).toEqual([
                { key: 'left', fn: getPosition, service: 'service0', input: false },
                { key: 'left', fn: setPosition, service: 'service1', input: true },
                { key: 'right', fn: getPosition, service: 'service2', input: false },
            ]);
        });

        it('reports an empty key for a device type without service groups', () => {
            const functions = serviceGroupFunctions(deviceType([{ serviceGroupKey: '', isInput: false, functionId: getPosition }]));

            expect(functions.map(f => f.serviceGroupKey)).toEqual(['']);
        });

        it('names the device type, the service and the path to the value, to make a warning actionable', () => {
            const functions = serviceGroupFunctions(deviceType([{ serviceGroupKey: 'left', isInput: false, functionId: getPosition }]));

            expect(functions[0]).toEqual({
                deviceTypeId: 'deviceType',
                deviceTypeName: 'deviceType',
                serviceGroupKey: 'left',
                serviceId: 'service0',
                serviceName: 'service0',
                path: 'value',
                isInput: false,
                functionId: getPosition,
                aspectId: 'room',
            });
        });

        it('spells out the path of a nested value', () => {
            const nested = deviceType([{ serviceGroupKey: '', isInput: false, functionId: getPosition }]);
            nested.services[0].outputs[0].content_variable = {
                name: 'status', type: characteristicTypeStructure, serialization_options: [], is_void: false,
                sub_content_variables: [{
                    name: 'position', type: characteristicTypeInteger, function_id: getPosition, aspect_id: 'room',
                    serialization_options: [], is_void: false,
                }],
            };

            const functions = serviceGroupFunctions(nested);

            expect(functions.map(f => f.path)).toEqual(['status.position']);
        });
    });

    describe('declarationsOf', () => {
        it('gathers every place the device types declare a function', () => {
            const one = serviceGroupFunctions(deviceType([{ serviceGroupKey: 'left', isInput: false, functionId: getPosition }]));
            const other = serviceGroupFunctions(deviceType([
                { serviceGroupKey: 'right', isInput: false, functionId: getPosition },
                { serviceGroupKey: 'right', isInput: true, functionId: setPosition },
            ]));

            expect(declarationsOf(getPosition, [one, other]).map(d => d.serviceGroupKey)).toEqual(['left', 'right']);
        });

        it('gathers nothing while no device type was loaded', () => {
            expect(declarationsOf(getPosition, [])).toEqual([]);
        });
    });

    describe('sharesServiceGroup', () => {
        it('is true when one device type groups both functions together', () => {
            const functions = serviceGroupFunctions(deviceType([
                { serviceGroupKey: 'left', isInput: false, functionId: getPosition },
                { serviceGroupKey: 'left', isInput: true, functionId: setPosition },
            ]));

            expect(sharesServiceGroup([functions], setPosition, getPosition)).toBeTrue();
        });

        it('is false while the functions sit in different service groups', () => {
            const functions = serviceGroupFunctions(deviceType([
                { serviceGroupKey: 'left', isInput: true, functionId: setPosition },
                { serviceGroupKey: 'right', isInput: false, functionId: getPosition },
            ]));

            expect(sharesServiceGroup([functions], setPosition, getPosition)).toBeFalse();
        });

        it('is false without service groups, which say nothing about belonging together', () => {
            const functions = serviceGroupFunctions(deviceType([
                { serviceGroupKey: '', isInput: true, functionId: setPosition },
                { serviceGroupKey: '', isInput: false, functionId: getPosition },
            ]));

            expect(sharesServiceGroup([functions], setPosition, getPosition)).toBeFalse();
        });

        it('does not let two device types share a key by accident', () => {
            const one = serviceGroupFunctions(deviceType([{ serviceGroupKey: 'left', isInput: true, functionId: setPosition }]));
            const other = serviceGroupFunctions(deviceType([{ serviceGroupKey: 'left', isInput: false, functionId: getPosition }]));

            expect(sharesServiceGroup([one, other], setPosition, getPosition)).toBeFalse();
        });
    });

    describe('sharesValuePath', () => {
        it('is true when one device type reads and sets the same content variable', () => {
            const functions = serviceGroupFunctions(deviceType([
                { serviceGroupKey: '', isInput: false, functionId: getTargetTemperature, path: 'occupied_heating_setpoint' },
                { serviceGroupKey: '', isInput: true, functionId: setTargetTemperature, path: 'occupied_heating_setpoint' },
            ]));

            expect(sharesValuePath([functions], setTargetTemperature, getTargetTemperature)).toBeTrue();
        });

        it('is false for two different content variables', () => {
            const functions = serviceGroupFunctions(deviceType([
                { serviceGroupKey: '', isInput: false, functionId: getTargetTemperature, path: 'occupied_heating_setpoint' },
                { serviceGroupKey: '', isInput: true, functionId: setTargetTemperature, path: 'external_temperature_input' },
            ]));

            expect(sharesValuePath([functions], setTargetTemperature, getTargetTemperature)).toBeFalse();
        });

        it('does not let two device types share a path by accident', () => {
            const one = serviceGroupFunctions(deviceType([{ serviceGroupKey: '', isInput: false, functionId: getTargetTemperature, path: 'setpoint' }]));
            const other = serviceGroupFunctions(deviceType([{ serviceGroupKey: '', isInput: true, functionId: setTargetTemperature, path: 'setpoint' }]));

            expect(sharesValuePath([one, other], setTargetTemperature, getTargetTemperature)).toBeFalse();
        });
    });

    describe('findStateSource', () => {
        it('pairs a controlling function with the measuring one of the same concept and aspect', () => {
            // a motorized curtain reporting 22% is read by the function its controlling one sets
            const source = findStateSource(crit(setPosition), context({ criteria: [crit(getPosition), crit(getTemperature)] }));

            expect(source?.function_id).toBe(getPosition);
        });

        it('has no source while the group cannot read the concept', () => {
            const source = findStateSource(crit(setPosition), context({ criteria: [crit(getTemperature)] }));

            expect(source).toBeUndefined();
        });

        it('has no source for a function without a concept', () => {
            const source = findStateSource(crit(setOn), context({ criteria: [crit(getOnOff)] }));

            expect(source).toBeUndefined();
        });

        it('ignores a measuring function of an unrelated aspect', () => {
            const source = findStateSource(crit(setPosition, 'room'), context({ criteria: [crit(getPosition, 'elsewhere')] }));

            expect(source).toBeUndefined();
        });

        it('prefers the exact aspect over one reached through the tree', () => {
            const source = findStateSource(crit(setPosition, 'room'), context({
                criteria: [crit(getPosition, 'window'), crit(getPosition, 'room')],
            }));

            expect(source?.aspect_id).toBe('room');
        });

        it('accepts an aspect reached through the tree when nothing matches exactly', () => {
            const source = findStateSource(crit(setPosition, 'room'), context({ criteria: [crit(getPosition, 'window')] }));

            expect(source?.aspect_id).toBe('window');
        });

        it('prefers the measuring function of the same device class', () => {
            const source = findStateSource(crit(setPosition, 'room', 'curtain'), context({
                criteria: [crit(getPosition, 'room', 'blind'), crit(getPosition, 'room', 'curtain')],
            }));

            expect(source?.device_class_id).toBe('curtain');
        });

        it('takes the service group to tell two measuring functions of one concept apart', () => {
            // a thermostat measures the room temperature as well as the target it is set to
            const functions = serviceGroupFunctions(deviceType([
                { serviceGroupKey: 'target', isInput: true, functionId: setTargetTemperature },
                { serviceGroupKey: 'target', isInput: false, functionId: getTargetTemperature },
                { serviceGroupKey: 'room', isInput: false, functionId: getTemperature },
            ]));

            const source = findStateSource(crit(setTargetTemperature), context({
                criteria: [crit(getTemperature), crit(getTargetTemperature)],
                serviceGroups: [functions],
            }));

            expect(source?.function_id).toBe(getTargetTemperature);
        });

        it('takes the content variable to tell apart what a device type without service groups sets', () => {
            // an Aqara thermostat: same concept, same aspect, same device class, no service groups. Only the
            // content variable says that the target temperature is set through the setpoint, not through the
            // external temperature input sitting next to it.
            const setpoint = 'occupied_heating_setpoint';
            const functions = serviceGroupFunctions(deviceType([
                { serviceGroupKey: '', isInput: false, functionId: getTargetTemperature, path: setpoint },
                { serviceGroupKey: '', isInput: true, functionId: setTargetTemperature, path: setpoint },
                { serviceGroupKey: '', isInput: true, functionId: setColor, path: 'external_temperature_input' },
            ]));
            const measuring = { function_id: getTargetTemperature, aspect_id: 'room', device_class_id: '', interaction: '' };
            const setTarget = { function_id: setTargetTemperature, aspect_id: '', device_class_id: 'curtain', interaction: 'request' };
            const setExternal = { function_id: setColor, aspect_id: '', device_class_id: 'curtain', interaction: 'request' };

            const implied = impliedControllingCriteria(measuring, context({
                criteria: [measuring, setTarget, setExternal],
                serviceGroups: [functions],
                conceptOf: () => 'temperature',
            }), onOffPair);

            expect(implied).toEqual([setTarget]);
        });

        it('prefers a criteria the placement reads anyway when nothing else separates two declared next to it', () => {
            const functions = serviceGroupFunctions(deviceType([
                { serviceGroupKey: 'thermostat', isInput: true, functionId: setTargetTemperature },
                { serviceGroupKey: 'thermostat', isInput: false, functionId: getTargetTemperature },
                { serviceGroupKey: 'thermostat', isInput: false, functionId: getTemperature },
            ]));

            const source = findStateSource(crit(setTargetTemperature), context({
                criteria: [crit(getTemperature), crit(getTargetTemperature)],
                configured: [crit(getTargetTemperature)],
                serviceGroups: [functions],
            }));

            expect(source?.function_id).toBe(getTargetTemperature);
        });

        it('leaves it unpaired when the device type declares none of the candidates next to it', () => {
            // a room temperature reading shares its concept with every temperature that can be set, so
            // pairing it up would offer a control writing something else
            const warn = spyOn(console, 'warn');

            const source = findStateSource(crit(setTargetTemperature), context({
                criteria: [crit(getTemperature), crit(getTargetTemperature)],
            }));

            expect(source).toBeUndefined();
            const [message, details] = warn.calls.mostRecent().args as [string, any];
            expect(message).toContain('declares none of them next to it');
            expect(message).toContain('Leaving it without a control');
            expect(details.candidates.every((c: any) => c.declaredNextToIt === false)).toBeTrue();
        });

        it('needs no evidence while only one function of the concept exists', () => {
            // a shutter reads its level from root.v and sets it through level, without service groups:
            // there is no evidence to be had, and none is needed
            const source = findStateSource(crit(setPosition), context({ criteria: [crit(getPosition)] }));

            expect(source?.function_id).toBe(getPosition);
        });

        it('needs no evidence while the aspect already singles one out', () => {
            const source = findStateSource(crit(setPosition, 'room'), context({
                criteria: [crit(getPosition, 'window'), crit(getPosition, 'room')],
            }));

            expect(source?.aspect_id).toBe('room');
        });

        it('names the device type, service and path of every function that tied', () => {
            const warn = spyOn(console, 'warn');
            const functions = serviceGroupFunctions(deviceType([
                { serviceGroupKey: 'thermostat', isInput: true, functionId: setTargetTemperature },
                { serviceGroupKey: 'thermostat', isInput: false, functionId: getTargetTemperature },
                { serviceGroupKey: 'thermostat', isInput: false, functionId: getTemperature },
            ]));

            findStateSource(crit(setTargetTemperature), context({
                criteria: [crit(getTemperature), crit(getTargetTemperature)],
                serviceGroups: [functions],
                describe: c => 'named ' + c.function_id,
            }));

            const [message, details] = warn.calls.mostRecent().args as [string, any];
            expect(message).toContain('2 equally fitting measuring functions');
            expect(message).toContain('named ' + setTargetTemperature);
            expect(message).toContain('check the device type');
            expect(details.for.declaredBy[0].serviceId).toBe('service0');
            expect(details.candidates.map((c: any) => c.description))
                .toEqual(['named ' + getTemperature, 'named ' + getTargetTemperature]);
            expect(details.candidates.every((c: any) => c.tied)).toBeTrue();
            expect(details.candidates[0].declaredBy).toEqual([{
                deviceTypeId: 'deviceType',
                deviceTypeName: 'deviceType',
                serviceGroupKey: 'thermostat',
                serviceId: 'service2',
                serviceName: 'service2',
                path: 'value',
                isInput: false,
                functionId: getTemperature,
                aspectId: 'room',
            }]);
            expect(details.candidates[0].distance).toEqual({ aspect: 0, deviceClass: 0, serviceGroup: 0, valuePath: 0, displayedByPlacement: 1 });
            expect(details.deviceTypesInspected).toBe(1);
        });

        it('reports the same ambiguity only once, however often the controls are resolved', () => {
            // resolving happens on every redraw of the widget, which must not fill the console
            const warn = spyOn(console, 'warn');
            const shared = context({ criteria: [crit(getTemperature), crit(getTargetTemperature)] });

            findStateSource(crit(setTargetTemperature), shared);
            findStateSource(crit(setTargetTemperature), shared);
            findStateSource(crit(setTargetTemperature), shared);

            expect(warn.calls.count()).toBe(1);
        });

        it('reports another ambiguity again, it is a situation of its own', () => {
            const warn = spyOn(console, 'warn');
            const shared = context({ criteria: [crit(getTemperature), crit(getTargetTemperature)] });

            findStateSource(crit(setTargetTemperature, 'room'), shared);
            // the same candidates, but reached from another aspect
            findStateSource(crit(setTargetTemperature, 'window'), shared);

            expect(warn.calls.count()).toBe(2);
        });

        it('reports nothing while there is nowhere to remember it', () => {
            const warn = spyOn(console, 'warn');

            findStateSource(crit(setTargetTemperature), {
                ...context({ criteria: [crit(getTemperature), crit(getTargetTemperature)] }),
                reportedAmbiguities: undefined,
            });

            expect(warn).not.toHaveBeenCalled();
        });

        it('reports nothing before the device types were looked up', () => {
            // controls are resolved on the first redraw too, and blaming the device type from that state
            // would name the wrong reason and then hide the real one
            const warn = spyOn(console, 'warn');

            const source = findStateSource(crit(setTargetTemperature), context({
                criteria: [crit(getTemperature), crit(getTargetTemperature)],
                serviceGroupsLoaded: false,
            }));

            expect(source).toBeUndefined();
            expect(warn).not.toHaveBeenCalled();
        });

        it('says so when the device types held nothing to check against', () => {
            const warn = spyOn(console, 'warn');

            findStateSource(crit(setTargetTemperature), context({
                criteria: [crit(getTemperature), crit(getTargetTemperature)],
            }));

            const [message, details] = warn.calls.mostRecent().args as [string, any];
            expect(message).toContain('No device type could be inspected');
            expect(details.deviceTypesInspected).toBe(0);
            expect(details.candidates[0].declaredBy).toEqual([]);
        });
    });

    describe('needsServiceGroups', () => {
        it('is true while more than one measuring function could be the source', () => {
            expect(needsServiceGroups(crit(setTargetTemperature), context({
                criteria: [crit(getTemperature), crit(getTargetTemperature)],
            }), false)).toBeTrue();
        });

        it('is false for a single candidate, so no device type has to be loaded', () => {
            expect(needsServiceGroups(crit(setPosition), context({ criteria: [crit(getPosition)] }), false)).toBeFalse();
        });

        it('is false for a function without a concept', () => {
            expect(needsServiceGroups(crit(setOn), context({ criteria: [crit(getOnOff)] }), false)).toBeFalse();
        });
    });

    describe('impliedControllingCriteria', () => {
        it('gives the controlling counterpart a measurement can be operated through', () => {
            const implied = impliedControllingCriteria(crit(getPosition), context({
                criteria: [crit(getPosition), crit(setPosition)],
            }), onOffPair);

            expect(implied.map((c: DeviceGroupCriteriaModel) => c.function_id)).toEqual([setPosition]);
        });

        it('gives both functions of an on off pair, which become a single toggle', () => {
            const implied = impliedControllingCriteria(crit(getOnOff), context({
                criteria: [crit(getOnOff), crit(setOn), crit(setOff)],
            }), onOffPair);

            expect(implied.map((c: DeviceGroupCriteriaModel) => c.function_id)).toEqual([setOn, setOff]);
        });

        it('gives nothing for a measurement the group cannot set', () => {
            const implied = impliedControllingCriteria(crit(getTemperature), context({
                criteria: [crit(getTemperature)],
            }), onOffPair);

            expect(implied).toEqual([]);
        });

        it('gives nothing for the connection status, which is no function of the group', () => {
            const implied = impliedControllingCriteria(
                { function_id: fpCriteriaConnectionStatus, aspect_id: '', device_class_id: '', interaction: '' },
                context({ criteria: [crit(setPosition)] }),
                onOffPair,
            );

            expect(implied).toEqual([]);
        });

        it('pairs a rolling shutter, whose criteria carry the aspect and the device class separately', () => {
            // the shape a device group answers with: filter_generic_duplicate_criteria keeps one form each
            const getRelativePosition = { function_id: getPosition, aspect_id: 'room', device_class_id: '', interaction: 'event' };
            const setRelativePosition = { function_id: setPosition, aspect_id: '', device_class_id: 'curtain', interaction: 'request' };

            const implied = impliedControllingCriteria(getRelativePosition, context({
                criteria: [getRelativePosition, setRelativePosition],
            }), onOffPair);

            expect(implied).toEqual([setRelativePosition]);
        });

        it('ignores a controlling function of an unrelated aspect', () => {
            const implied = impliedControllingCriteria(crit(getPosition, 'room'), context({
                criteria: [crit(setPosition, 'elsewhere')],
            }), onOffPair);

            expect(implied).toEqual([]);
        });
    });

    describe('readCommands', () => {
        it('reads the criteria of the placement and the ones shown in its tooltip', () => {
            const { commands } = readCommands([placement({
                criteria: { function_id: 'get-temperature', aspect_id: 'air', device_class_id: 'sensor', interaction: '' },
                tooltipCriteria: [{ function_id: getOnOff, aspect_id: 'air', device_class_id: '', interaction: '' }],
            })]);

            expect(commands).toEqual([
                { group_id: 'deviceGroupId', function_id: getOnOff, aspect_id: 'air', device_class_id: '' },
                { group_id: 'deviceGroupId', function_id: 'get-temperature', aspect_id: 'air', device_class_id: 'sensor' },
            ]);
        });

        it('never reads a controlling criteria, because that would execute it', () => {
            const { commands } = readCommands([placement({
                tooltipCriteria: [
                    { function_id: getOnOff, aspect_id: '', device_class_id: '', interaction: '' },
                    { function_id: setOn, aspect_id: '', device_class_id: '', interaction: '' },
                    { function_id: setOff, aspect_id: '', device_class_id: '', interaction: '' },
                ],
            })]);

            expect(commands.map(c => c.function_id)).toEqual([getOnOff, 'function']);
        });

        it('asks for the connection status separately instead of running a command', () => {
            const { commands, onlineDeviceGroupIds } = readCommands([placement({
                criteria: { function_id: fpCriteriaConnectionStatus, aspect_id: '', device_class_id: '', interaction: '' },
            })]);

            expect(commands).toEqual([]);
            expect(onlineDeviceGroupIds).toEqual(['deviceGroupId']);
        });

        it('reads the measuring criteria a control takes its current value from', () => {
            // the control shows 22% only when the function reporting it is read as well
            const { commands } = readCommands(
                [placement({ tooltipCriteria: [crit(setPosition)] })],
                [[crit(getPosition)]],
            );

            expect(commands.map(c => c.function_id)).toEqual(['function', getPosition]);
        });

        it('reads a criteria once even when it is both displayed and the state of a control', () => {
            const { commands } = readCommands(
                [placement({ criteria: crit(getPosition), tooltipCriteria: [crit(setPosition)] })],
                [[crit(getPosition)]],
            );

            expect(commands.map(c => c.function_id)).toEqual([getPosition]);
        });
    });

    describe('draw', () => {
        let canvas: HTMLCanvasElement;
        let wrapper: HTMLDivElement;

        beforeEach(() => {
            wrapper = document.createElement('div');
            wrapper.style.width = '200px';
            wrapper.style.height = '100px';
            canvas = document.createElement('canvas');
            wrapper.appendChild(canvas);
            document.body.appendChild(wrapper);
        });

        afterEach(() => document.body.removeChild(wrapper));

        it('draws a dot for placed placements only', () => {
            const arc = spyOn(CanvasRenderingContext2D.prototype, 'arc').and.callThrough();
            const properties: FloorplanWidgetPropertiesModel = {
                floorplan: {
                    image: null,
                    dotSize: 10,
                    placements: [
                        placement({ alias: 'placed' }),
                        placement({ alias: 'unplaced', position: { x: null, y: null } }),
                        placement({ alias: 'also placed' }),
                    ],
                },
            };

            draw(canvas, properties);

            expect(arc.calls.count()).toBe(2);
        });
    });
});
