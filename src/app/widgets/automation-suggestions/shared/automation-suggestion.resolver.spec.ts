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

import { SET_DEVICE_OFF_FUNCTION_ID, SET_DEVICE_ON_FUNCTION_ID } from './automation-suggestion.model';
import {
    acceptVariables,
    devicePath,
    measuredFunctionKey,
    resolveSuggestion,
    resolveTarget
} from './automation-suggestion.resolver';
import {
    boolCharacteristicId,
    catalogFixture,
    channelServiceIds,
    getLevelFunctionId,
    rootDeviceId,
    stateDeviceId,
    stripDeviceId,
    groupCommands,
    groupMeasure,
    content,
    controlServiceId,
    lampDeviceId,
    levelCharacteristicId,
    levelType,
    levelDeviceId,
    measureServiceId,
    plugDeviceId,
    plugType,
    powerTriggerFixture,
    service,
    setLevelFunctionId,
    splitPlugType,
    suggestionFixture,
    svcOff,
    svcOn,
    variable
} from './automation-suggestion.fixtures';

describe('automation suggestion resolver', () => {
    describe('binary targets', () => {
        it('resolves a true target to Set Device On with the input characteristic of the control service', () => {
            const resolved = resolveTarget(
                { device_id: lampDeviceId, service_id: measureServiceId, path: 'value.state', function_id: null, value: true },
                catalogFixture(),
            );
            expect(resolved).toEqual({
                deviceId: lampDeviceId,
                deviceName: 'Licht EG',
                value: true,
                binary: true,
                serviceId: controlServiceId,
                functionId: SET_DEVICE_ON_FUNCTION_ID,
                characteristicId: boolCharacteristicId,
                offFunctionId: SET_DEVICE_OFF_FUNCTION_ID,
                offServiceId: controlServiceId,
                offCharacteristicId: boolCharacteristicId,
                offValue: false,
            });
        });

        it('resolves a false target to Set Device Off', () => {
            const resolved = resolveTarget(
                { device_id: lampDeviceId, service_id: measureServiceId, path: 'value.state', function_id: null, value: false },
                catalogFixture(),
            );
            expect(resolved?.functionId).toBe(SET_DEVICE_OFF_FUNCTION_ID);
            expect(resolved?.offFunctionId).toBeUndefined();
        });

        it('resolves the Set Device Off command of an on-target on the same service', () => {
            const resolved = resolveTarget(
                { device_id: lampDeviceId, service_id: measureServiceId, path: 'value.state', function_id: null, value: true },
                catalogFixture(),
            );
            expect(resolved?.functionId).toBe(SET_DEVICE_ON_FUNCTION_ID);
            expect(resolved?.offFunctionId).toBe(SET_DEVICE_OFF_FUNCTION_ID);
            expect(resolved?.offServiceId).toBe(controlServiceId);
            expect(resolved?.offCharacteristicId).toBe(boolCharacteristicId);
            expect(resolved?.offValue).toBe(false);
        });

        it('resolves On and Off on separate services and takes the Off command from its own service', () => {
            const catalog = catalogFixture();
            catalog.deviceTypes.set(lampDeviceId, splitPlugType());
            const resolved = resolveTarget(
                { device_id: lampDeviceId, service_id: measureServiceId, path: 'value.state', function_id: null, value: true },
                catalog,
            );
            expect(resolved?.serviceId).toBe(svcOn);
            expect(resolved?.functionId).toBe(SET_DEVICE_ON_FUNCTION_ID);
            expect(resolved?.offServiceId).toBe(svcOff);
            expect(resolved?.offCharacteristicId).toBe('urn:infai:ses:characteristic:off-flag');
            expect(resolved?.offFunctionId).toBe(SET_DEVICE_OFF_FUNCTION_ID);
        });

        it('prefers the Off command of the measured service, then of its service group, then the rest', () => {
            const offOnMeasured = service(measureServiceId, [
                content(variable({ name: 'off', function_id: SET_DEVICE_OFF_FUNCTION_ID, characteristic_id: 'char-measured' })),
            ], []);
            const offInGroup = { ...service('svc-group-off', [
                content(variable({ name: 'off', function_id: SET_DEVICE_OFF_FUNCTION_ID, characteristic_id: 'char-group' })),
            ], []), service_group_key: groupMeasure };
            const offElsewhere = { ...service(svcOff, [
                content(variable({ name: 'off', function_id: SET_DEVICE_OFF_FUNCTION_ID, characteristic_id: 'char-other' })),
            ], []), service_group_key: groupCommands };
            const measuredWithGroup = { ...service(measureServiceId, [], []), service_group_key: groupMeasure };
            const on = { ...service(svcOn, [
                content(variable({ name: 'on', function_id: SET_DEVICE_ON_FUNCTION_ID, characteristic_id: boolCharacteristicId })),
            ], []), service_group_key: groupMeasure };
            const target = { device_id: lampDeviceId, service_id: measureServiceId, path: 'value.state', function_id: null, value: true };
            const catalog = catalogFixture();

            // all three carry Off: the measured service wins
            catalog.deviceTypes.set(lampDeviceId, { ...plugType(), services: [offElsewhere, offInGroup, offOnMeasured, on] });
            expect(resolveTarget(target, catalog)?.offServiceId).toBe(measureServiceId);

            // no Off on the measured service: the group wins over the rest
            catalog.deviceTypes.set(lampDeviceId, { ...plugType(), services: [offElsewhere, offInGroup, measuredWithGroup, on] });
            expect(resolveTarget(target, catalog)?.offServiceId).toBe('svc-group-off');
            expect(resolveTarget(target, catalog)?.offCharacteristicId).toBe('char-group');

            // only the service of another group carries Off
            catalog.deviceTypes.set(lampDeviceId, { ...plugType(), services: [offElsewhere, measuredWithGroup, on] });
            expect(resolveTarget(target, catalog)?.offServiceId).toBe(svcOff);
        });

        it('keeps a binary target whose device type has no Set Device Off, without a switch-off for it', () => {
            const catalog = catalogFixture();
            // a device type that can only switch on
            catalog.deviceTypes.set(lampDeviceId, {
                ...plugType(),
                services: [service(controlServiceId, [
                    content(variable({ name: 'on', function_id: SET_DEVICE_ON_FUNCTION_ID, characteristic_id: boolCharacteristicId })),
                ], [])],
            });
            const target = { device_id: lampDeviceId, service_id: measureServiceId, path: 'value.state', function_id: null, value: true };
            const resolved = resolveTarget(target, catalog);
            expect(resolved?.functionId).toBe(SET_DEVICE_ON_FUNCTION_ID);
            expect(resolved?.offFunctionId).toBeUndefined();
            expect(resolveSuggestion(suggestionFixture({ auto_off_s: 120, targets: [target] }), catalog)?.autoOffAvailable).toBeFalse();
        });

        it('hides a binary target whose device type has no On/Off command at all', () => {
            const catalog = catalogFixture();
            catalog.deviceTypes.set(lampDeviceId, { ...plugType(), services: [] });
            const target = { device_id: lampDeviceId, service_id: measureServiceId, path: 'value.state', function_id: null, value: true };
            expect(resolveTarget(target, catalog)).toBeNull();
        });

        it('resolves On and Off inputs without a characteristic, as Shelly Wave and IKEA TRETAKT declare them', () => {
            const catalog = catalogFixture();
            const type = plugType();
            catalog.deviceTypes.set(lampDeviceId, {
                ...type,
                services: [
                    service(controlServiceId, [
                        content(variable({ name: 'on', function_id: SET_DEVICE_ON_FUNCTION_ID, characteristic_id: '' })),
                        content(variable({ name: 'off', function_id: SET_DEVICE_OFF_FUNCTION_ID, characteristic_id: '' })),
                    ], []),
                    ...type.services.filter((s) => s.id !== controlServiceId),
                ],
            });
            const target = { device_id: lampDeviceId, service_id: measureServiceId, path: 'value.state', function_id: null, value: true };
            const resolved = resolveTarget(target, catalog);
            expect(resolved?.functionId).toBe(SET_DEVICE_ON_FUNCTION_ID);
            expect(resolved?.characteristicId).toBe('');
            expect(resolved?.offFunctionId).toBe(SET_DEVICE_OFF_FUNCTION_ID);
            expect(resolved?.offCharacteristicId).toBe('');
        });
    });

    describe('concept-based targets', () => {
        it('resolves the controlling function of the concept of the measured function', () => {
            const resolved = resolveTarget(
                { device_id: levelDeviceId, service_id: measureServiceId, path: 'value.value.level', function_id: null, value: 40 },
                catalogFixture(),
            );
            expect(resolved).toEqual({
                deviceId: levelDeviceId,
                deviceName: 'Dimmer',
                value: 40,
                binary: false,
                serviceId: controlServiceId,
                functionId: setLevelFunctionId,
                characteristicId: levelCharacteristicId,
            });
        });

        it('never adds off keys to a non-binary target', () => {
            const resolved = resolveTarget(
                { device_id: levelDeviceId, service_id: measureServiceId, path: 'value.value.level', function_id: null, value: 40 },
                catalogFixture(),
            );
            expect(resolved?.offFunctionId).toBeUndefined();
        });

        it('hides a target whose measured path is not in the device type', () => {
            const resolved = resolveTarget(
                { device_id: levelDeviceId, service_id: measureServiceId, path: 'value.value.unknown', function_id: null, value: 40 },
                catalogFixture(),
            );
            expect(resolved).toBeNull();
        });

        it('hides a target whose concept has no controlling function on the device', () => {
            const catalog = catalogFixture({ controllingFunctionsByConcept: new Map() });
            const resolved = resolveTarget(
                { device_id: levelDeviceId, service_id: measureServiceId, path: 'value.value.level', function_id: null, value: 40 },
                catalog,
            );
            expect(resolved).toBeNull();
        });

        it('hides a target whose device type has no input for the controlling function', () => {
            const catalog = catalogFixture();
            catalog.deviceTypes.set(levelDeviceId, { ...plugType(), services: [service(measureServiceId, [], [])] });
            const resolved = resolveTarget(
                { device_id: levelDeviceId, service_id: measureServiceId, path: 'value.value.level', function_id: null, value: 40 },
                catalog,
            );
            expect(resolved).toBeNull();
        });

        it('hides a target whose device is not in the catalog', () => {
            const resolved = resolveTarget(
                { device_id: 'urn:infai:ses:device:gone', service_id: measureServiceId, path: 'value.value.level', function_id: null, value: 40 },
                catalogFixture(),
            );
            expect(resolved).toBeNull();
        });
    });

    describe('suggestions', () => {
        it('keeps the resolved targets and drops the others', () => {
            const suggestion = suggestionFixture({
                targets: [
                    { device_id: lampDeviceId, service_id: measureServiceId, path: 'value.state', function_id: null, value: true },
                    { device_id: levelDeviceId, service_id: measureServiceId, path: 'value.value.unknown', function_id: null, value: 40 },
                ],
            });
            const resolved = resolveSuggestion(suggestion, catalogFixture());
            expect(resolved?.targets.map((t) => t.deviceId)).toEqual([lampDeviceId]);
        });

        it('returns null when no target remains', () => {
            const suggestion = suggestionFixture({
                targets: [{ device_id: 'urn:infai:ses:device:gone', service_id: measureServiceId, path: 'value.state', function_id: null, value: true }],
            });
            expect(resolveSuggestion(suggestion, catalogFixture())).toBeNull();
        });

        it('offers the switch-off only for auto_off_s with a resolvable Set Device Off on an on-target', () => {
            const lampOn = { device_id: lampDeviceId, service_id: measureServiceId, path: 'value.state', function_id: null, value: true };
            expect(resolveSuggestion(suggestionFixture({ auto_off_s: 140, targets: [lampOn] }), catalogFixture())?.autoOffAvailable).toBeTrue();
            expect(resolveSuggestion(suggestionFixture({ auto_off_s: null, targets: [lampOn] }), catalogFixture())?.autoOffAvailable).toBeFalse();
            expect(resolveSuggestion(suggestionFixture({ auto_off_s: 140, targets: [{ ...lampOn, value: false }] }), catalogFixture())?.autoOffAvailable).toBeFalse();
        });

        it('builds the label from the trigger and the resolved targets', () => {
            const resolved = resolveSuggestion(suggestionFixture({
                targets: [
                    { device_id: lampDeviceId, service_id: measureServiceId, path: 'value.state', function_id: null, value: true },
                    { device_id: levelDeviceId, service_id: measureServiceId, path: 'value.value.level', function_id: null, value: 40 },
                ],
            }), catalogFixture());
            expect(resolved?.label).toBe('Plug Stehlampe off → Licht EG on, Dimmer = 40');
        });

        it('builds the label of a power trigger from its thresholds', () => {
            const lampOn = { device_id: lampDeviceId, service_id: measureServiceId, path: 'value.state', function_id: null, value: true };
            const onLabel = resolveSuggestion(suggestionFixture({ trigger: powerTriggerFixture(), targets: [lampOn] }), catalogFixture());
            expect(onLabel?.label).toBe('Plug Stehlampe power on (> 20 W) → Licht EG on');
            const offLabel = resolveSuggestion(suggestionFixture({
                trigger: powerTriggerFixture({ from: 'on', to: 'off' }),
                targets: [lampOn],
            }), catalogFixture());
            expect(offLabel?.label).toBe('Plug Stehlampe power off (< 10 W) → Licht EG on');
        });
    });

    describe('accept payload', () => {
        it('sends every variable as a string with the trigger, window and resolved targets as JSON', () => {
            const resolved = resolveSuggestion(suggestionFixture({ auto_off_s: 120 }), catalogFixture());
            const variables = acceptVariables(resolved!, 120);

            expect(Object.values(variables).every((v) => typeof v === 'string')).toBeTrue();
            expect(variables['suggestion_id']).toBe('sug-1');
            expect(variables['label']).toBe('Plug Stehlampe off → Licht EG on');
            expect(variables['auto_off_s']).toBe('120');
            expect(JSON.parse(variables['trigger'])).toEqual({
                device_id: plugDeviceId,
                service_id: measureServiceId,
                path: 'value.state',
                kind: 'binary',
                from: null,
                to: 'off',
            });
            expect(JSON.parse(variables['window'])).toEqual({ from: '19:00', to: '02:00', weekdays: [0, 1, 2, 3, 4, 5, 6], tz: 'Europe/Berlin' });
            expect(JSON.parse(variables['targets'])).toEqual([{
                device_id: lampDeviceId,
                service_id: controlServiceId,
                function_id: SET_DEVICE_ON_FUNCTION_ID,
                characteristic_id: boolCharacteristicId,
                value: true,
                off_function_id: SET_DEVICE_OFF_FUNCTION_ID,
                off_service_id: controlServiceId,
                off_characteristic_id: boolCharacteristicId,
                off_value: false,
            }]);
        });

        it('passes the thresholds and hold time of a power trigger on in the trigger JSON', () => {
            const resolved = resolveSuggestion(suggestionFixture({ trigger: powerTriggerFixture() }), catalogFixture());
            expect(JSON.parse(acceptVariables(resolved!, null)['trigger'])).toEqual({
                device_id: plugDeviceId,
                service_id: measureServiceId,
                path: 'value.sensor.ENERGY.Power',
                kind: 'power',
                from: 'off',
                to: 'on',
                on_above_w: 20,
                off_below_w: 10,
                hold_s: 60,
            });
        });

        it('leaves auto_off_s empty and omits the off keys when they do not apply', () => {
            const resolved = resolveSuggestion(suggestionFixture({
                targets: [
                    { device_id: lampDeviceId, service_id: measureServiceId, path: 'value.state', function_id: null, value: true },
                    { device_id: levelDeviceId, service_id: measureServiceId, path: 'value.value.level', function_id: null, value: 40 },
                ],
            }), catalogFixture());
            const variables = acceptVariables(resolved!, null);

            expect(variables['auto_off_s']).toBe('');
            const targets = JSON.parse(variables['targets']);
            expect(targets[0].off_function_id).toBeUndefined();
            expect(targets[1]).toEqual({
                device_id: levelDeviceId,
                service_id: controlServiceId,
                function_id: setLevelFunctionId,
                characteristic_id: levelCharacteristicId,
                value: 40,
            });
        });

        it('sends the delay the user chose with the off keys', () => {
            const lampOn = { device_id: lampDeviceId, service_id: measureServiceId, path: 'value.state', function_id: null, value: true };
            const resolved = resolveSuggestion(suggestionFixture({ auto_off_s: 140, targets: [lampOn] }), catalogFixture());
            const variables = acceptVariables(resolved!, 180);
            expect(variables['auto_off_s']).toBe('180');
            expect(JSON.parse(variables['targets'])[0].off_function_id).toBe(SET_DEVICE_OFF_FUNCTION_ID);
        });

        it('leaves auto_off_s empty and omits the off keys when the user turns the switch-off off', () => {
            const resolved = resolveSuggestion(suggestionFixture({ auto_off_s: 120 }), catalogFixture());
            const variables = acceptVariables(resolved!, null);
            expect(variables['auto_off_s']).toBe('');
            expect(JSON.parse(variables['targets'])[0].off_function_id).toBeUndefined();
        });

        it('sends no delay when no Set Device Off resolves, even if one is chosen', () => {
            const catalog = catalogFixture();
            catalog.deviceTypes.set(lampDeviceId, { ...plugType(), services: [service(controlServiceId, [
                content(variable({ name: 'on', function_id: SET_DEVICE_ON_FUNCTION_ID, characteristic_id: boolCharacteristicId })),
            ], [])] });
            const lampOn = { device_id: lampDeviceId, service_id: measureServiceId, path: 'value.state', function_id: null, value: true };
            const resolved = resolveSuggestion(suggestionFixture({ auto_off_s: 120, targets: [lampOn] }), catalog);
            const variables = acceptVariables(resolved!, 120);
            expect(variables['auto_off_s']).toBe('');
            expect(JSON.parse(variables['targets'])[0].off_function_id).toBeUndefined();
        });

        it('sends only the resolved targets', () => {
            const resolved = resolveSuggestion(suggestionFixture({
                targets: [
                    { device_id: lampDeviceId, service_id: measureServiceId, path: 'value.state', function_id: null, value: true },
                    { device_id: levelDeviceId, service_id: measureServiceId, path: 'value.value.unknown', function_id: null, value: 40 },
                ],
            }), catalogFixture());
            expect(JSON.parse(acceptVariables(resolved!, null)['targets']).length).toBe(1);
        });
    });

    describe('review fixes', () => {
        const target = (deviceId: string, serviceId: string, path: string, value: boolean | number | string) =>
            ({ device_id: deviceId, service_id: serviceId, path, function_id: null, value });

        it('strips exactly one leading value. from the analytics path', () => {
            expect(devicePath('value.root.v')).toBe('root.v');
            expect(devicePath('value.value.level')).toBe('value.level');
            expect(devicePath('state')).toBe('state');
            expect(devicePath('root.v')).toBe('root.v');
        });

        it('resolves a concept target on a root other than value', () => {
            const resolved = resolveTarget(target(rootDeviceId, measureServiceId, 'value.root.v', 40), catalogFixture());
            expect(resolved?.functionId).toBe(setLevelFunctionId);
            expect(resolved?.serviceId).toBe(controlServiceId);
            expect(resolved?.value).toBe(40);
        });

        it('resolves a concept target on a scalar root', () => {
            const resolved = resolveTarget(target(stateDeviceId, measureServiceId, 'value.state', 40), catalogFixture());
            expect(resolved?.functionId).toBe(setLevelFunctionId);
        });

        it('takes the On command of the measured channel of a multi-channel strip', () => {
            const catalog = catalogFixture();
            const resolved = resolveTarget(target(stripDeviceId, 'sw-3', 'value.state', true), catalog);
            expect(resolved?.serviceId).toBe('sw-3');
            expect(resolved?.functionId).toBe(SET_DEVICE_ON_FUNCTION_ID);
        });

        it('takes the Off command and the auto-off of the measured channel of a multi-channel strip', () => {
            const resolved = resolveTarget(target(stripDeviceId, 'sw-3', 'value.state', true), catalogFixture());
            expect(resolved?.serviceId).toBe('sw-3');
            expect(resolved?.offServiceId).toBe('sw-3');
            expect(resolved?.offFunctionId).toBe(SET_DEVICE_OFF_FUNCTION_ID);
            const off = resolveTarget(target(stripDeviceId, 'sw-4', 'value.state', false), catalogFixture());
            expect(off?.serviceId).toBe('sw-4');
            expect(off?.functionId).toBe(SET_DEVICE_OFF_FUNCTION_ID);
        });

        it('keeps the service order for concept targets: the measured channel first', () => {
            const catalog = catalogFixture();
            catalog.measuredFunctionIds.set(measuredFunctionKey(levelDeviceId, 'sw-2', 'value.level'), getLevelFunctionId);
            catalog.deviceTypes.set(levelDeviceId, {
                ...levelType(),
                services: channelServiceIds.map((id) => service(id, [
                    content(variable({ name: 'level', function_id: setLevelFunctionId, characteristic_id: levelCharacteristicId })),
                ], [])),
            });
            const resolved = resolveTarget(target(levelDeviceId, 'sw-2', 'value.value.level', 40), catalog);
            expect(resolved?.serviceId).toBe('sw-2');
        });

        it('hides a text or number value on a binary concept and never sends it to Set Device On/Off', () => {
            const catalog = catalogFixture();
            expect(resolveTarget(target(lampDeviceId, measureServiceId, 'value.state', 'ON'), catalog)).toBeNull();
            expect(resolveTarget(target(lampDeviceId, measureServiceId, 'value.state', 1), catalog)).toBeNull();
            expect(resolveTarget(target(lampDeviceId, measureServiceId, 'value.state', true), catalog)?.functionId)
                .toBe(SET_DEVICE_ON_FUNCTION_ID);
        });
    });
});
