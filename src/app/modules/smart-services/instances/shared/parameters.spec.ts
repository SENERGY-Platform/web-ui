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

import { SmartServiceExtendedParameterModel, SmartServiceParameterOptionModel } from '../../releases/shared/release.model';
import {
    ParameterInput,
    initParameterValues,
    initialValue,
    isFreeInputList,
    parameterInput,
    parameterSatisfied,
    parameterTypeBoolean,
    parameterTypeFloat,
    parameterTypeInteger,
    parameterTypeText,
    parametersSatisfied,
    pruneInvalidValues,
    toSmartServiceParameter,
    valueLabel,
    visibleOptions,
} from './parameters';

const param = (overwrite: Partial<SmartServiceExtendedParameterModel>): SmartServiceExtendedParameterModel => ({
    id: 'p1',
    label: 'Parameter',
    value: null,
    description: '',
    default_value: null,
    type: parameterTypeText,
    options: null,
    multiple: false,
    order: 0,
    optional: false,
    has_no_valid_option: false,
    ...overwrite,
});

const option = (overwrite: Partial<SmartServiceParameterOptionModel>): SmartServiceParameterOptionModel => ({
    value: 'v',
    label: 'Option',
    kind: '',
    entity_id: '',
    ...overwrite,
});

describe('parameterInput', () => {
    it('picks a select for a parameter with resolved options', () => {
        expect(parameterInput(param({ options: [option({})] }))).toBe(ParameterInput.Select);
    });

    it('picks a multi select when the parameter takes several of its options', () => {
        expect(parameterInput(param({ options: [option({})], multiple: true }))).toBe(ParameterInput.MultiSelect);
    });

    it('keeps the options of an iot parameter that also names a characteristic, so the device selection is not lost', () => {
        const p = param({ options: [option({})], characteristic: { name: 'c', display_unit: '', type: parameterTypeText } });
        expect(parameterInput(p)).toBe(ParameterInput.Select);
    });

    it('collects a parameter in the shape of its characteristic when it has no options', () => {
        const p = param({ characteristic: { name: 'c', display_unit: '', type: parameterTypeText } });
        expect(parameterInput(p)).toBe(ParameterInput.Characteristic);
    });

    it('toggles a boolean rather than offering a dropdown over the two states a design named', () => {
        const p = param({ type: parameterTypeBoolean, options: [option({ value: true, label: 'enabled' }), option({ value: false, label: 'disabled' })] });
        expect(parameterInput(p)).toBe(ParameterInput.Boolean);
    });

    it('keeps the named states as the value_label even though they are not shown as options', () => {
        const p = param({ type: parameterTypeBoolean, value: true, options: [option({ value: true, label: 'enabled' }), option({ value: false, label: 'disabled' })] });
        expect(valueLabel(p)).toBe('enabled');
    });

    it('toggles each row of a boolean list', () => {
        const p = param({ type: parameterTypeBoolean, multiple: true });
        expect(parameterInput(p)).toBe(ParameterInput.Boolean);
        expect(isFreeInputList(p)).toBe(true);
    });

    it('maps the schema.org types onto their inputs', () => {
        expect(parameterInput(param({ type: parameterTypeBoolean }))).toBe(ParameterInput.Boolean);
        expect(parameterInput(param({ type: parameterTypeInteger }))).toBe(ParameterInput.Number);
        expect(parameterInput(param({ type: parameterTypeFloat }))).toBe(ParameterInput.Number);
        expect(parameterInput(param({ type: parameterTypeText }))).toBe(ParameterInput.Text);
    });

    it('falls back to text for a type the repository passed through unmapped', () => {
        expect(parameterInput(param({ type: 'urn:something:else' }))).toBe(ParameterInput.Text);
    });
});

describe('initialValue', () => {
    it('keeps a value that is already set', () => {
        expect(initialValue(param({ value: 'set', default_value: 'default' }))).toBe('set');
    });

    it('falls back to the default value', () => {
        expect(initialValue(param({ default_value: 'default' }))).toBe('default');
    });

    it('keeps false as a value rather than treating it as missing', () => {
        expect(initialValue(param({ type: parameterTypeBoolean, value: false, default_value: true }))).toBe(false);
    });

    it('takes the only option of a mandatory parameter, because that is not a choice', () => {
        expect(initialValue(param({ options: [option({ value: 'only' })] }))).toBe('only');
    });

    it('leaves the only option of an optional parameter unselected', () => {
        expect(initialValue(param({ options: [option({ value: 'only' })], optional: true }))).toBeNull();
    });

    it('leaves a mandatory parameter with two options unselected', () => {
        const p = param({ options: [option({ value: 'a' }), option({ value: 'b' })] });
        expect(initialValue(p)).toBeNull();
    });

    it('starts a free input list empty, so the user adds the rows they need', () => {
        expect(initialValue(param({ multiple: true, type: parameterTypeText }))).toEqual([]);
    });

    // a toggle has no unset position, so leaving null would read as off while blocking the submit
    it('starts a boolean at the off a toggle already shows, not at null', () => {
        expect(initialValue(param({ type: parameterTypeBoolean }))).toBe(false);
        expect(parameterSatisfied(param({ type: parameterTypeBoolean, value: initialValue(param({ type: parameterTypeBoolean })) }))).toBe(true);
    });

    // the dialog used to hand over strings, because a bound [type] never selects NumberValueAccessor;
    // an instance written back then would otherwise show its value and refuse to be saved
    it('turns a numeric string on a number parameter back into a number', () => {
        expect(initialValue(param({ type: parameterTypeInteger, value: '42' }))).toBe(42);
        expect(initialValue(param({ type: parameterTypeFloat, value: '1.5' }))).toBe(1.5);
    });

    it('takes a numeric default the same way', () => {
        expect(initialValue(param({ type: parameterTypeInteger, default_value: '7' }))).toBe(7);
    });

    it('leaves a value that is not a number alone, there is nothing better to put there', () => {
        expect(initialValue(param({ type: parameterTypeInteger, value: 'seven' }))).toBe('seven');
    });

    it('leaves a text parameter alone even when it happens to hold digits', () => {
        expect(initialValue(param({ type: parameterTypeText, value: '42' }))).toBe('42');
    });

    it('leaves an option value alone, it is opaque and may well look numeric', () => {
        const p = param({ type: parameterTypeInteger, value: '42', options: [option({ value: '42', label: 'Forty two' })] });
        expect(initialValue(p)).toBe('42');
    });

    it('starts a boolean list empty all the same', () => {
        expect(initialValue(param({ type: parameterTypeBoolean, multiple: true }))).toEqual([]);
    });
});

describe('initParameterValues', () => {
    const params = [param({ id: 'a', label: 'A' }), param({ id: 'b', label: 'B' })];

    it('reports nothing unfilled when no instance is being edited', () => {
        expect(initParameterValues(params).unfilled).toEqual([]);
    });

    it('carries the values of the instance over', () => {
        const result = initParameterValues(params, [{ id: 'a', value: 'kept', label: 'A', value_label: 'Kept' }]);
        expect(result.parameters[0].value).toBe('kept');
        expect(result.parameters[0].value_label).toBe('Kept');
    });

    it('names the parameters the instance has no value for, so an upgrade knows it has to ask', () => {
        const result = initParameterValues(params, [{ id: 'a', value: 'kept', label: 'A' }]);
        expect(result.unfilled).toEqual(['b']);
    });

    it('leaves the parameters it was given untouched', () => {
        const source = param({ id: 'a', label: 'A' });
        initParameterValues([source], [{ id: 'a', value: 'kept', label: 'A' }]);
        expect(source.value).toBeNull();
    });

    it('applies the default value of a parameter the instance does not carry', () => {
        const result = initParameterValues([param({ id: 'a', default_value: 7, type: parameterTypeInteger })], []);
        expect(result.parameters[0].value).toBe(7);
        expect(result.unfilled).toEqual(['a']);
    });
});

describe('visibleOptions', () => {
    const device = param({
        id: 'device',
        options: [option({ value: 'd1', label: 'Device 1', entity_id: 'd1' }), option({ value: 'd2', label: 'Device 2', entity_id: 'd2' })],
    });
    const service = param({
        id: 'service',
        options: [
            option({ value: 's1', label: 'Service of 1', entity_id: 'd1', needs_same_entity_id_in_parameter: 'device' }),
            option({ value: 's2', label: 'Service of 2', entity_id: 'd2', needs_same_entity_id_in_parameter: 'device' }),
        ],
    });

    it('shows every option that depends on nothing', () => {
        expect(visibleOptions(device, [device, service]).length).toBe(2);
    });

    it('hides the dependent options while the referenced parameter is unset', () => {
        expect(visibleOptions(service, [{ ...device, value: null }, service])).toEqual([]);
    });

    it('shows only the options of the entity picked in the referenced parameter', () => {
        const visible = visibleOptions(service, [{ ...device, value: 'd1' }, service]);
        expect(visible.map((o) => o.value)).toEqual(['s1']);
    });

    it('shows the options of every entity picked in a multi select', () => {
        const multi = { ...device, multiple: true, value: ['d1', 'd2'] };
        expect(visibleOptions(service, [multi, service]).map((o) => o.value)).toEqual(['s1', 's2']);
    });

    it('hides an option referencing a parameter the release does not have', () => {
        const orphan = param({ id: 'x', options: [option({ needs_same_entity_id_in_parameter: 'gone', entity_id: 'e' })] });
        expect(visibleOptions(orphan, [orphan])).toEqual([]);
    });
});

describe('pruneInvalidValues', () => {
    it('clears a single value that the changed reference made invisible', () => {
        const device = param({ id: 'device', value: 'd2', options: [option({ value: 'd1', entity_id: 'd1' }), option({ value: 'd2', entity_id: 'd2' })] });
        const service = param({
            id: 'service',
            value: 's1',
            options: [option({ value: 's1', entity_id: 'd1', needs_same_entity_id_in_parameter: 'device' })],
        });
        pruneInvalidValues([device, service]);
        expect(service.value).toBeNull();
    });

    it('drops only the invisible entries of a multi select', () => {
        const device = param({ id: 'device', value: 'd1', options: [option({ value: 'd1', entity_id: 'd1' })] });
        const services = param({
            id: 'services',
            multiple: true,
            value: ['s1', 's2'],
            options: [
                option({ value: 's1', entity_id: 'd1', needs_same_entity_id_in_parameter: 'device' }),
                option({ value: 's2', entity_id: 'd2', needs_same_entity_id_in_parameter: 'device' }),
            ],
        });
        pruneInvalidValues([device, services]);
        expect(services.value).toEqual(['s1']);
    });

    it('follows a chain, even when the dependent parameter is ordered first', () => {
        // service depends on device, subservice depends on service; clearing device has to reach subservice
        const subservice = param({
            id: 'subservice',
            value: 'x1',
            options: [option({ value: 'x1', entity_id: 's1', needs_same_entity_id_in_parameter: 'service' })],
        });
        const service = param({
            id: 'service',
            value: 's1',
            options: [option({ value: 's1', entity_id: 'd1', needs_same_entity_id_in_parameter: 'device' })],
        });
        const device = param({ id: 'device', value: 'd2', options: [option({ value: 'd1', entity_id: 'd1' }), option({ value: 'd2', entity_id: 'd2' })] });
        pruneInvalidValues([subservice, service, device]);
        expect(service.value).toBeNull();
        expect(subservice.value).toBeNull();
    });

    it('clears a value whose option the release no longer offers, e.g. a deleted device', () => {
        const gone = param({ id: 'device', value: '{"device_selection":{"device_id":"deleted"}}', options: [option({ value: 'd1', entity_id: 'd1' })] });
        pruneInvalidValues([gone]);
        expect(gone.value).toBeNull();
    });

    it('leaves a free input alone, it has no options to check against', () => {
        const free = param({ id: 'free', value: 'typed' });
        pruneInvalidValues([free]);
        expect(free.value).toBe('typed');
    });
});

describe('parameterSatisfied', () => {
    it('refuses a mandatory parameter without a value', () => {
        expect(parameterSatisfied(param({}))).toBe(false);
    });

    it('accepts an optional parameter without a value', () => {
        expect(parameterSatisfied(param({ optional: true }))).toBe(true);
    });

    it('accepts false as the value of a boolean', () => {
        expect(parameterSatisfied(param({ type: parameterTypeBoolean, value: false }))).toBe(true);
    });

    it('accepts zero as the value of a number', () => {
        expect(parameterSatisfied(param({ type: parameterTypeInteger, value: 0 }))).toBe(true);
    });

    it('refuses an empty text', () => {
        expect(parameterSatisfied(param({ value: '' }))).toBe(false);
    });

    it('refuses a mandatory list with no entries', () => {
        expect(parameterSatisfied(param({ multiple: true, value: [] }))).toBe(false);
    });

    it('accepts an optional list with no entries', () => {
        expect(parameterSatisfied(param({ multiple: true, optional: true, value: [] }))).toBe(true);
    });

    it('refuses a blank row in an optional list, it would be sent along', () => {
        expect(parameterSatisfied(param({ multiple: true, optional: true, value: [null] }))).toBe(false);
    });

    it('accepts a whole number in an integer parameter, which is the ordinary case', () => {
        expect(parameterSatisfied(param({ type: parameterTypeInteger, value: 42 }))).toBe(true);
        expect(parameterSatisfied(param({ type: parameterTypeInteger, value: -3 }))).toBe(true);
    });

    it('refuses a decimal typed into an integer parameter', () => {
        expect(parameterSatisfied(param({ type: parameterTypeInteger, value: 1.5 }))).toBe(false);
        expect(parameterSatisfied(param({ type: parameterTypeInteger, value: 2 }))).toBe(true);
    });

    it('accepts a decimal in a float parameter', () => {
        expect(parameterSatisfied(param({ type: parameterTypeFloat, value: 1.5 }))).toBe(true);
    });

    it('does not apply the integer check to an option value, which is opaque', () => {
        const p = param({ type: parameterTypeInteger, value: '{"device_selection":{}}', options: [option({ value: '{"device_selection":{}}' })] });
        expect(parameterSatisfied(p)).toBe(true);
    });

    it('refuses a list with an entry the user has not filled in yet', () => {
        expect(parameterSatisfied(param({ multiple: true, value: ['a', null] }))).toBe(false);
    });

    it('accepts a filled list', () => {
        expect(parameterSatisfied(param({ multiple: true, value: ['a', 'b'] }))).toBe(true);
    });

    it('refuses a parameter the release found nothing selectable for, even with a value', () => {
        expect(parameterSatisfied(param({ has_no_valid_option: true, value: 'x' }))).toBe(false);
    });

    it('refuses an optional parameter the release found nothing selectable for', () => {
        expect(parameterSatisfied(param({ has_no_valid_option: true, optional: true }))).toBe(false);
    });
});

describe('parametersSatisfied', () => {
    it('holds only when every parameter holds', () => {
        expect(parametersSatisfied([param({ value: 'a' }), param({ id: 'p2', value: null })])).toBe(false);
        expect(parametersSatisfied([param({ value: 'a' }), param({ id: 'p2', optional: true })])).toBe(true);
    });

    it('holds for a release without parameters', () => {
        expect(parametersSatisfied([])).toBe(true);
    });
});

describe('valueLabel', () => {
    it('reports nothing for a value the user typed in', () => {
        expect(valueLabel(param({ value: 'typed' }))).toBeUndefined();
    });

    it('reports the label of the picked option', () => {
        const p = param({ value: 'd1', options: [option({ value: 'd1', label: 'Device 1' })] });
        expect(valueLabel(p)).toBe('Device 1');
    });

    it('joins the labels of a multi select', () => {
        const p = param({
            multiple: true,
            value: ['d1', 'd2'],
            options: [option({ value: 'd1', label: 'Device 1' }), option({ value: 'd2', label: 'Device 2' })],
        });
        expect(valueLabel(p)).toBe('Device 1, Device 2');
    });

    it('matches an option whose value is an object rather than the same reference', () => {
        const p = param({ value: { id: 'x' }, options: [option({ value: { id: 'x' }, label: 'Object option' })] });
        expect(valueLabel(p)).toBe('Object option');
    });

    it('reports nothing when the value matches no option', () => {
        expect(valueLabel(param({ value: 'gone', options: [option({ value: 'd1' })] }))).toBeUndefined();
    });
});

describe('toSmartServiceParameter', () => {
    it('reduces the parameter to what the instance stores', () => {
        const p = param({ id: 'p1', label: 'Device', value: 'd1', options: [option({ value: 'd1', label: 'Device 1' })] });
        expect(toSmartServiceParameter(p)).toEqual({ id: 'p1', value: 'd1', label: 'Device', value_label: 'Device 1' });
    });

    it('leaves the value_label out for a free input, so the api drops it', () => {
        expect(toSmartServiceParameter(param({ id: 'p1', label: 'Name', value: 'typed' }))).toEqual({ id: 'p1', value: 'typed', label: 'Name' });
    });
});

describe('isFreeInputList', () => {
    it('holds for a free input asking for several values', () => {
        expect(isFreeInputList(param({ multiple: true, type: parameterTypeInteger }))).toBe(true);
    });

    it('does not hold for a multi select, which collects its values in one input', () => {
        expect(isFreeInputList(param({ multiple: true, options: [option({})] }))).toBe(false);
    });

    it('does not hold for a single free input', () => {
        expect(isFreeInputList(param({ multiple: false }))).toBe(false);
    });
});
