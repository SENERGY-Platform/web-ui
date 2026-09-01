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

import { MatDialogRef } from '@angular/material/dialog';
import { Observable, Subject, of } from 'rxjs';
import { SmartServiceExtendedParameterModel, SmartServiceParameterOptionModel } from '../../../releases/shared/release.model';
import { ParameterInput, parameterTypeBoolean, parameterTypeInteger, parameterTypeText } from '../../shared/parameters';
import {
    SmartServiceParameterDialogComponent,
    SmartServiceParameterDialogData,
    SmartServiceParameterDialogResult,
} from './smart-service-parameter-dialog.component';

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

describe('SmartServiceParameterDialogComponent', () => {
    let dialogRef: jasmine.SpyObj<MatDialogRef<SmartServiceParameterDialogComponent>>;

    beforeEach(() => {
        dialogRef = jasmine.createSpyObj<MatDialogRef<SmartServiceParameterDialogComponent>>('MatDialogRef', ['close']);
    });

    /** the parameters as a test writes them: a plain list, wrapped into the observable the dialog takes */
    type DialogSetup = Omit<Partial<SmartServiceParameterDialogData>, 'parameters'> & {
        parameters?: SmartServiceExtendedParameterModel[];
    };

    const data = (setup: DialogSetup): SmartServiceParameterDialogData => ({
        title: 'Launch Smart Service',
        submitLabel: 'Launch',
        releaseName: 'PV Forecast',
        releaseDescription: '',
        collectInfo: true,
        name: 'PV Forecast',
        description: '',
        ...setup,
        parameters: of(setup.parameters || []),
    });

    /** The parameters arrive after the dialog is open, so a built dialog is only filled in by ngOnInit */
    const build = (setup: DialogSetup) => {
        const component = new SmartServiceParameterDialogComponent(dialogRef, data(setup));
        component.ngOnInit();
        return component;
    };

    /** a dialog whose parameters are still on their way */
    const buildPending = (arriving: Observable<SmartServiceExtendedParameterModel[] | null>) => {
        const component = new SmartServiceParameterDialogComponent(dialogRef, { ...data({}), parameters: arriving });
        component.ngOnInit();
        return component;
    };

    const closedWith = (): SmartServiceParameterDialogResult => dialogRef.close.calls.mostRecent().args[0];

    it('works on a copy, so cancelling leaves the parameters of the caller untouched', () => {
        const source = param({ default_value: 'from the release' });
        const component = build({ parameters: [source] });
        component.parameters[0].value = 'typed by the user';
        expect(source.value).toBeNull();
    });

    it('fills in the values a parameter starts on', () => {
        const component = build({ parameters: [param({ default_value: 'default' })] });
        expect(component.parameters[0].value).toBe('default');
    });

    it('refuses to submit while a mandatory parameter is unset', () => {
        const component = build({ parameters: [param({})] });
        expect(component.valid).toBe(false);
        component.submit();
        expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('refuses to submit without a name while it collects one', () => {
        const component = build({ name: '   ' });
        expect(component.valid).toBe(false);
    });

    it('does not ask for a name when it is not collecting one, as on an upgrade', () => {
        const component = build({ collectInfo: false, name: '' });
        expect(component.valid).toBe(true);
    });

    it('closes with the trimmed name and the parameters reduced to what the api stores', () => {
        const component = build({
            name: '  PV Forecast  ',
            description: 'the roof',
            parameters: [param({ id: 'device', label: 'Device', options: [option({ value: 'd1', label: 'Device 1' })] })],
        });
        component.submit();
        expect(closedWith()).toEqual({
            name: 'PV Forecast',
            description: 'the roof',
            parameters: [{ id: 'device', value: 'd1', label: 'Device', value_label: 'Device 1' }],
        });
    });

    describe('while the parameters are still loading', () => {
        it('is not ready and holds the submit shut, an empty list would otherwise satisfy itself', () => {
            const component = buildPending(new Subject<SmartServiceExtendedParameterModel[] | null>());
            expect(component.ready).toBe(false);
            expect(component.valid).toBe(false);
            expect(component.views).toEqual([]);
        });

        it('fills itself in and opens the submit once they arrive', () => {
            const arriving = new Subject<SmartServiceExtendedParameterModel[] | null>();
            const component = buildPending(arriving);
            arriving.next([param({ id: 'p1', default_value: 'default' })]);
            expect(component.ready).toBe(true);
            expect(component.views.length).toBe(1);
            expect(component.parameters[0].value).toBe('default');
            expect(component.valid).toBe(true);
        });

        it('closes itself when they cannot be loaded, there is nothing to fill in', () => {
            buildPending(of(null));
            expect(dialogRef.close).toHaveBeenCalledWith();
        });

        it('can still be cancelled', () => {
            buildPending(new Subject<SmartServiceExtendedParameterModel[] | null>()).cancel();
            expect(dialogRef.close).toHaveBeenCalledWith();
        });

        it('drops its subscription when it is destroyed', () => {
            const arriving = new Subject<SmartServiceExtendedParameterModel[] | null>();
            const component = buildPending(arriving);
            component.ngOnDestroy();
            arriving.next([param({})]);
            expect(component.ready).toBe(false);
        });
    });

    it('closes with nothing when cancelled', () => {
        build({}).cancel();
        expect(dialogRef.close).toHaveBeenCalledWith();
    });

    describe('options', () => {
        const device = param({
            id: 'device',
            options: [option({ value: 'd1', label: 'Device 1', entity_id: 'd1', kind: 'Devices' }), option({ value: 'd2', label: 'Device 2', entity_id: 'd2', kind: 'Devices' })],
        });
        const service = param({
            id: 'service',
            options: [
                option({ value: 's1', label: 'Service of 1', entity_id: 'd1', needs_same_entity_id_in_parameter: 'device' }),
                option({ value: 's2', label: 'Service of 2', entity_id: 'd2', needs_same_entity_id_in_parameter: 'device' }),
            ],
        });

        it('offers only the options belonging to the entity picked further up', () => {
            const component = build({ parameters: [device, service] });
            component.parameters[0].value = 'd1';
            component.valueChanged();
            expect(component.views[1].options.map((o) => o.value)).toEqual(['s1']);
        });

        // handing a select a new array makes it rebuild its whole option list, which is what made the
        // dialog sluggish once a parameter resolved to a few hundred devices
        it('keeps the same options array for a parameter nothing else decides', () => {
            const component = build({ parameters: [device, service] });
            const before = component.views[0].options;
            component.parameters[0].value = 'd1';
            component.valueChanged();
            component.valueChanged();
            expect(component.views[0].options).toBe(before);
        });

        it('keeps the same array for a dependent parameter while its option set is unchanged', () => {
            const component = build({ parameters: [device, service] });
            component.parameters[0].value = 'd1';
            component.valueChanged();
            const before = component.views[1].options;
            component.valueChanged();
            expect(component.views[1].options).toBe(before);
        });

        it('replaces the array once the option set really changes', () => {
            const component = build({ parameters: [device, service] });
            component.parameters[0].value = 'd1';
            component.valueChanged();
            const before = component.views[1].options;
            component.parameters[0].value = 'd2';
            component.valueChanged();
            expect(component.views[1].options).not.toBe(before);
            expect(component.views[1].options.map((o) => o.value)).toEqual(['s2']);
        });

        it('drops a value that the changed pick further up made invalid', () => {
            const component = build({ parameters: [device, service] });
            component.parameters[0].value = 'd1';
            component.parameters[1].value = 's1';
            component.parameters[0].value = 'd2';
            component.valueChanged();
            expect(component.parameters[1].value).toBeNull();
        });

        it('groups the options only while they say what group they are in', () => {
            const component = build({ parameters: [device, param({ id: 'plain', options: [option({ value: 'a' })] })] });
            expect(component.views[0].groupBy).toBe('kind');
            expect(component.views[1].groupBy).toBe('');
        });

        it('scrolls a long list virtually and a short one not', () => {
            const many = param({ id: 'many', options: Array.from({ length: 60 }, (_, i) => option({ value: 'd' + i })) });
            const component = build({ parameters: [many, device] });
            expect(component.views[0].virtualScroll).toBe(true);
            expect(component.views[1].virtualScroll).toBe(false);
        });
    });

    describe('a free input asking for several values', () => {
        const list = param({ id: 'names', multiple: true, type: parameterTypeText });

        it('starts with no rows', () => {
            const component = build({ parameters: [list] });
            expect(component.views[0].isList).toBe(true);
            expect(component.entriesOf(component.parameters[0])).toEqual([]);
        });

        it('adds, fills and removes rows', () => {
            const component = build({ parameters: [list] });
            const p = component.parameters[0];
            component.addEntry(p);
            component.addEntry(p);
            component.setEntry(p, 0, 'first');
            component.setEntry(p, 1, 'second');
            expect(p.value).toEqual(['first', 'second']);
            component.removeEntry(p, 0);
            expect(p.value).toEqual(['second']);
        });

        it('stays invalid while a row is still blank', () => {
            const component = build({ parameters: [list] });
            component.addEntry(component.parameters[0]);
            expect(component.valid).toBe(false);
            component.setEntry(component.parameters[0], 0, 'filled');
            expect(component.valid).toBe(true);
        });

        it('is not a list when the values are picked from options', () => {
            const component = build({ parameters: [param({ multiple: true, options: [option({})] })] });
            expect(component.views[0].isList).toBe(false);
            expect(component.views[0].input).toBe(ParameterInput.MultiSelect);
        });
    });

    describe('inputs', () => {
        it('steps an integer by one and a float by any', () => {
            const component = build({ parameters: [param({ id: 'i', type: parameterTypeInteger }), param({ id: 't' })] });
            expect(component.views[0].step).toBe('1');
            expect(component.views[1].step).toBe('any');
        });

        it('knows which parameters take a number field', () => {
            const component = build({ parameters: [param({ id: 'i', type: parameterTypeInteger }), param({ id: 'b', type: parameterTypeBoolean })] });
            expect(component.views[0].isNumber).toBe(true);
            expect(component.views[1].isNumber).toBe(false);
        });

        it('accepts a whole number in an integer parameter', () => {
            const component = build({ parameters: [param({ id: 'i', type: parameterTypeInteger })] });
            component.parameters[0].value = 42;
            expect(component.valid).toBe(true);
            expect(component.problemOf(component.views[0])).toBe('');
        });

        it('says why a decimal in an integer parameter is refused, rather than only greying out the submit', () => {
            const component = build({ parameters: [param({ id: 'i', type: parameterTypeInteger })] });
            component.parameters[0].value = 4.5;
            expect(component.valid).toBe(false);
            expect(component.problemOf(component.views[0])).toBe('Whole numbers only.');
        });

        it('stays quiet about a parameter the user has not filled in yet', () => {
            const component = build({ parameters: [param({ id: 'i', type: parameterTypeInteger })] });
            expect(component.parameters[0].value).toBeNull();
            expect(component.problemOf(component.views[0])).toBe('');
        });

        it('says which entry of a list is missing a value', () => {
            const component = build({ parameters: [param({ id: 'l', multiple: true, type: parameterTypeText })] });
            component.addEntry(component.parameters[0]);
            component.setEntry(component.parameters[0], 0, 'filled');
            component.addEntry(component.parameters[0]);
            expect(component.problemOf(component.views[0])).toBe('Every entry needs a value.');
        });

        it('says nothing about a parameter the release found nothing selectable for, the warning covers it', () => {
            const component = build({ parameters: [param({ has_no_valid_option: true, options: [] })] });
            expect(component.problemOf(component.views[0])).toBe('');
        });

        it('toggles a boolean the design gave two named states, and starts it off', () => {
            const named = param({ type: parameterTypeBoolean, options: [option({ value: true, label: 'enabled' }), option({ value: false, label: 'disabled' })] });
            const component = build({ parameters: [named] });
            expect(component.views[0].input).toBe(ParameterInput.Boolean);
            expect(component.parameters[0].value).toBe(false);
            expect(component.valid).toBe(true);
        });
    });

    it('stays invalid while the release found nothing selectable for a parameter', () => {
        const component = build({ parameters: [param({ has_no_valid_option: true, options: [] })] });
        expect(component.valid).toBe(false);
    });
});
