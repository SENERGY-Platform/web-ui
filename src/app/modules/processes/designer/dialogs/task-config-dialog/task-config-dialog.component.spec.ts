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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { By } from '@angular/platform-browser';
import { Observable, of, Subject } from 'rxjs';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { TaskConfigDialogComponent } from './task-config-dialog.component';
import { CoreModule } from '../../../../../core/core.module';
import { AspectSelectComponent } from '../../../../../core/components/aspect-select/aspect-select.component';
import { DeviceTypeService } from '../../../../metadata/device-types-overview/shared/device-type.service';
import { ConceptsService } from '../../../../metadata/concepts/shared/concepts.service';
import { DeviceTypeAspectNodeModel, DeviceTypeDeviceClassModel, DeviceTypeFunctionModel } from '../../../../metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeSelectionRefModel } from '../../../../metadata/device-types-overview/shared/device-type-selection.model';

const MEASURING = 'https://senergy.infai.org/ontology/MeasuringFunction';
const CONTROLLING = 'https://senergy.infai.org/ontology/ControllingFunction';

const node = (id: string, name: string, parentId = ''): DeviceTypeAspectNodeModel => ({
    id,
    name,
    root_id: parentId || id,
    parent_id: parentId,
    child_ids: [],
    ancestor_ids: parentId ? [parentId] : [],
    descendent_ids: [],
});

const air = node('urn:infai:ses:aspect:air', 'Air');
const water = node('urn:infai:ses:aspect:water', 'Water');
const environmentClass = 'urn:infai:ses:aspect-class:environment';
const classifiedAir = { ...air, aspect_class_id: environmentClass };
const classifiedWater = { ...water, aspect_class_id: environmentClass };
const fn = (id: string, name: string): DeviceTypeFunctionModel => ({ id, name, rdf_type: MEASURING, concept_id: '' }) as DeviceTypeFunctionModel;
const temperature = fn('urn:infai:ses:measuring-function:temperature', 'Get Temperature');
const humidity = fn('urn:infai:ses:measuring-function:humidity', 'Get Humidity');
const pressure = fn('urn:infai:ses:measuring-function:pressure', 'Get Pressure');

describe('TaskConfigDialogComponent', () => {
    let fixture: ComponentFixture<TaskConfigDialogComponent>;
    let component: TaskConfigDialogComponent;
    let dialogRef: Spy<MatDialogRef<TaskConfigDialogComponent>>;
    let deviceTypeService: Spy<DeviceTypeService>;

    function init(
        selection: DeviceTypeSelectionRefModel | null,
        functionsByAspect: { [id: string]: DeviceTypeFunctionModel[] | Observable<DeviceTypeFunctionModel[]> },
        listing: DeviceTypeAspectNodeModel[] | Observable<DeviceTypeAspectNodeModel[]> = [air, water],
        deviceClasses: DeviceTypeDeviceClassModel[] = [],
        controllingFunctions: DeviceTypeFunctionModel[] = [],
        controllingListing: DeviceTypeAspectNodeModel[] = [],
        controllingFunctionsByAspect: { [id: string]: DeviceTypeFunctionModel[] } = {},
    ) {
        dialogRef = createSpyFromClass<MatDialogRef<TaskConfigDialogComponent>>(MatDialogRef);
        deviceTypeService = createSpyFromClass(DeviceTypeService);
        deviceTypeService.getDeviceClassesWithControllingFunction.and.returnValue(of(deviceClasses));
        deviceTypeService.getDeviceClassesControllingFunctions.and.returnValue(of(controllingFunctions));
        deviceTypeService.getAspectNodesWithMeasuringFunctionOfDevicesOnly.and.returnValue(Array.isArray(listing) ? of(listing) : listing);
        deviceTypeService.getAspectsMeasuringFunctions.and.callFake((id: string) => {
            const functions = functionsByAspect[id] || [];
            return Array.isArray(functions) ? of(functions) : functions;
        });
        deviceTypeService.getAspectNodesWithControllingFunction.and.returnValue(of(controllingListing));
        deviceTypeService.getAspectsControllingFunctions.and.callFake((id: string) => of(controllingFunctionsByAspect[id] || []));
        const conceptsService = createSpyFromClass(ConceptsService);
        conceptsService.getConceptWithCharacteristics.and.returnValue(of(null));

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, MatDialogModule, MatRadioModule, ReactiveFormsModule, MatInputModule, MatCheckboxModule, MtxSelectModule, NoopAnimationsModule],
            declarations: [TaskConfigDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { selection } },
                { provide: DeviceTypeService, useValue: deviceTypeService },
                { provide: ConceptsService, useValue: conceptsService },
                provideHttpClient(withInterceptorsFromDi()),
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(TaskConfigDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    const measuringSelection = (overrides: Partial<DeviceTypeSelectionRefModel>): DeviceTypeSelectionRefModel =>
        ({
            function: temperature,
            device_class: null,
            aspect: null,
            completionStrategy: 'pessimistic',
            retries: 0,
            prefer_events: false,
            ...overrides,
        }) as unknown as DeviceTypeSelectionRefModel;

    const functionIds = () => component.functions.map((f) => f.id);
    const savedResult = () => {
        component.save();
        return dialogRef.close.calls.mostRecent().args[0];
    };

    function selectMeasuring(aspectIds: string[]) {
        component.optionsFormControl.setValue('Measuring');
        fixture.detectChanges();
        component.aspectFormControl.setValue(aspectIds);
        fixture.detectChanges();
    }

    it('uses the shared aspect select for the measuring branch, offering aspects with sub-aspects too', () => {
        init(null, {});
        selectMeasuring([]);
        const select: AspectSelectComponent = fixture.debugElement.query(By.directive(AspectSelectComponent)).componentInstance;
        expect(select.leafOnly).toBe(false);
        expect(select.aspectOptions.map((o) => o.id)).toEqual([air.id, water.id]);
    });

    it('offers only the functions every selected aspect offers', () => {
        init(null, { [air.id]: [temperature, humidity, pressure], [water.id]: [pressure, temperature] });
        selectMeasuring([air.id, water.id]);
        expect(deviceTypeService.getAspectsMeasuringFunctions).toHaveBeenCalledWith(air.id);
        expect(deviceTypeService.getAspectsMeasuringFunctions).toHaveBeenCalledWith(water.id);
        expect(functionIds()).toEqual([temperature.id, pressure.id]);
    });

    it('offers the functions of a single aspect unchanged', () => {
        init(null, { [air.id]: [temperature, humidity] });
        selectMeasuring([air.id]);
        expect(functionIds()).toEqual([temperature.id, humidity.id]);
    });

    it('offers no function and keeps the function field disabled without an aspect', () => {
        init(null, { [air.id]: [temperature] });
        selectMeasuring([air.id]);
        component.aspectFormControl.setValue([]);
        expect(functionIds()).toEqual([]);
        expect(component.functionFormControl.disabled).toBe(true);
    });

    it('ignores the answer for a selection that has since been replaced', () => {
        const slowAir = new Subject<DeviceTypeFunctionModel[]>();
        init(null, { [air.id]: slowAir, [water.id]: [pressure] });
        selectMeasuring([air.id]);
        component.aspectFormControl.setValue([water.id]);
        slowAir.next([temperature]);
        slowAir.complete();
        expect(functionIds()).toEqual([pressure.id]);
    });

    it('returns the selected aspect nodes sorted by id and the first of them as the deprecated aspect', () => {
        init(null, { [air.id]: [temperature], [water.id]: [temperature] });
        selectMeasuring([water.id, air.id]);
        component.functionFormControl.setValue(temperature);
        const result = savedResult();
        expect(result.aspects).toEqual([air, water]);
        expect(result.aspect).toEqual(air);
        expect(result.function).toEqual(temperature);
    });

    it('returns a single aspect in both fields', () => {
        init(null, { [water.id]: [temperature] });
        selectMeasuring([water.id]);
        component.functionFormControl.setValue(temperature);
        const result = savedResult();
        expect(result.aspects).toEqual([water]);
        expect(result.aspect).toEqual(water);
    });

    it('returns no aspect for a controlling task without aspects', () => {
        init(null, {});
        const result = savedResult();
        expect(result.aspect).toBeNull();
        expect(result.aspects).toEqual([]);
    });

    it('opens a selection written before the list with its single aspect selected', () => {
        init(measuringSelection({ aspect: air }), { [air.id]: [temperature, humidity] });
        expect(component.optionsFormControl.value).toBe('Measuring');
        expect(component.aspectFormControl.value).toEqual([air.id]);
        expect(functionIds()).toEqual([temperature.id, humidity.id]);
        expect(component.functionFormControl.value).toEqual(temperature);
        const result = savedResult();
        expect(result.aspects).toEqual([air]);
        expect(result.aspect).toEqual(air);
    });

    it('opens a selection with every aspect of its list selected and their common functions offered', () => {
        init(measuringSelection({ aspect: air, aspects: [air, water] }), { [air.id]: [temperature, humidity], [water.id]: [temperature] });
        expect(component.aspectFormControl.value).toEqual([air.id, water.id]);
        expect(functionIds()).toEqual([temperature.id]);
    });

    it('keeps the stored function of several aspects when the aspect listing answers after the dialog opened', () => {
        const listing = new Subject<DeviceTypeAspectNodeModel[]>();
        init(measuringSelection({ aspect: air, aspects: [air, water] }), { [air.id]: [temperature, humidity], [water.id]: [temperature] }, listing);
        listing.next([air, water]);
        fixture.detectChanges();
        expect(component.aspectFormControl.value).toEqual([air.id, water.id]);
        expect(component.functionFormControl.value).toEqual(temperature);
        expect(savedResult().function).toEqual(temperature);
    });

    it('keeps a selected aspect that the listing no longer offers', () => {
        const gone = node('urn:infai:ses:aspect:gone', 'Gone');
        init(measuringSelection({ aspect: gone, aspects: [gone] }), { [gone.id]: [temperature] });
        const select: AspectSelectComponent = fixture.debugElement.query(By.directive(AspectSelectComponent)).componentInstance;
        expect(select.aspectOptions.map((o) => o.name)).toContain('Gone');
        expect(savedResult().aspects).toEqual([gone]);
    });

    it('offers an aspect whose ancestors the listing leaves out', () => {
        const inside = node('urn:infai:ses:aspect:inside', 'Inside');
        const insideAir = node('urn:infai:ses:aspect:inside-air', 'Inside Air', inside.id);
        init(null, {}, [insideAir]);
        selectMeasuring([]);
        const select: AspectSelectComponent = fixture.debugElement.query(By.directive(AspectSelectComponent)).componentInstance;
        expect(select.aspectOptions.map((o) => o.id)).toEqual([insideAir.id]);
    });

    describe('controlling task combined with aspects', () => {
        const heater = { id: 'urn:infai:ses:device-class:heater', name: 'Heater' } as DeviceTypeDeviceClassModel;
        const insideAir = node('urn:infai:ses:aspect:inside-air', 'Inside Air', air.id);
        const setTemperature = { ...fn('urn:infai:ses:controlling-function:set-temperature', 'Set-Temperature'), rdf_type: CONTROLLING };
        const setOn = { ...fn('urn:infai:ses:controlling-function:set-on', 'Set-On'), rdf_type: CONTROLLING };

        function initControlling(selection: DeviceTypeSelectionRefModel | null = null) {
            init(selection, {}, [water], [heater], [setTemperature, setOn], [air, insideAir], {
                [air.id]: [setTemperature],
                [insideAir.id]: [setTemperature, setOn],
            });
        }

        it('offers the aspects used with controlling functions, not those used with measuring functions', () => {
            initControlling();
            fixture.detectChanges();
            const select: AspectSelectComponent = fixture.debugElement.query(By.directive(AspectSelectComponent)).componentInstance;
            expect(select.aspectOptions.map((o) => o.id)).toEqual([air.id]);
            component.optionsFormControl.setValue('Measuring');
            fixture.detectChanges();
            expect(select.aspectOptions.map((o) => o.id)).toEqual([water.id]);
        });

        it('offers the controlling functions of the aspects without a device class', () => {
            initControlling();
            component.aspectFormControl.setValue([insideAir.id]);
            expect(deviceTypeService.getAspectsControllingFunctions).toHaveBeenCalledWith(insideAir.id);
            expect(deviceTypeService.getAspectsMeasuringFunctions).not.toHaveBeenCalled();
            expect(functionIds()).toEqual([setTemperature.id, setOn.id]);
            component.functionFormControl.setValue(setOn);
            const result = savedResult();
            expect(result.aspects).toEqual([insideAir]);
            expect(result.device_class).toBeNull();
            expect(result.function).toEqual(setOn);
        });

        it('offers only the functions both the device class and the aspects offer', () => {
            initControlling();
            component.deviceClassFormControl.setValue(heater);
            component.aspectFormControl.setValue([air.id]);
            expect(functionIds()).toEqual([setTemperature.id]);
            component.functionFormControl.setValue(setTemperature);
            const result = savedResult();
            expect(result.device_class).toBe(heater);
            expect(result.aspects).toEqual([air]);
        });

        it('offers no function without device class and aspect', () => {
            initControlling();
            component.deviceClassFormControl.setValue(heater);
            component.deviceClassFormControl.setValue(null);
            expect(functionIds()).toEqual([]);
            expect(component.functionFormControl.disabled).toBe(true);
        });

        it('opens a stored controlling selection with its aspects and their common functions', () => {
            initControlling(
                measuringSelection({ function: setTemperature, device_class: heater, aspect: air, aspects: [air], completionStrategy: 'optimistic' }),
            );
            expect(component.optionsFormControl.value).toBe('Controlling');
            expect(component.aspectFormControl.value).toEqual([air.id]);
            expect(functionIds()).toEqual([setTemperature.id]);
            expect(component.unlistedFor).toBe('device class and aspect');
            expect(savedResult().aspects).toEqual([air]);
        });
    });

    describe('selection stored before functions and device classes were renamed', () => {
        const selectLabel = (index: number): string | undefined =>
            fixture.nativeElement.querySelectorAll('mtx-select')[index]?.querySelector('.ng-value-label')?.textContent?.trim();

        it('opens with the function selected by id and saves the current one', async () => {
            const stored = { ...temperature, name: 'Old Name' };
            init(measuringSelection({ function: stored, aspect: air }), { [air.id]: [temperature, humidity] });
            fixture.detectChanges();
            await fixture.whenStable();
            fixture.detectChanges();
            expect(component.compare(stored, temperature)).toBeTrue();
            expect(selectLabel(1)).toBe(temperature.name);
            expect(savedResult().function).toBe(temperature);
        });

        it('opens with the device class selected by id and saves the current one', async () => {
            const heater = { id: 'urn:infai:ses:device-class:heater', name: 'Heater' } as DeviceTypeDeviceClassModel;
            const setTemperature = { ...fn('urn:infai:ses:controlling-function:set-temperature', 'Set-Temperature'), rdf_type: CONTROLLING };
            const stored = { ...heater, name: 'Old Heater' };
            init(
                measuringSelection({ function: { ...setTemperature, name: 'Old Set' }, device_class: stored }),
                {},
                [air, water],
                [heater],
                [setTemperature],
            );
            fixture.detectChanges();
            await fixture.whenStable();
            fixture.detectChanges();
            expect(selectLabel(0)).toBe('Heater');
            expect(savedResult().device_class).toBe(heater);
        });
    });

    describe('stored function or device class the listing no longer offers', () => {
        const luminescence = fn('urn:infai:ses:measuring-function:luminescence', 'Get Luminiscence');
        const heater = { id: 'urn:infai:ses:device-class:heater', name: 'Heater' } as DeviceTypeDeviceClassModel;
        const lamp = { id: 'urn:infai:ses:device-class:lamp', name: 'Lamp' } as DeviceTypeDeviceClassModel;
        const setTemperature = { ...fn('urn:infai:ses:controlling-function:set-temperature', 'Set-Temperature'), rdf_type: CONTROLLING };
        const setColor = { ...fn('urn:infai:ses:controlling-function:set-color', 'Set-Color'), rdf_type: CONTROLLING };

        const label = (index: number): string | undefined =>
            fixture.nativeElement.querySelectorAll('mtx-select')[index]?.querySelector('.ng-value-label')?.textContent?.trim();
        const hints = (): string[] => Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('mat-hint')).map((h) => h.textContent?.trim() ?? '');
        async function settle() {
            fixture.detectChanges();
            await fixture.whenStable();
            fixture.detectChanges();
        }

        describe('measuring', () => {
            beforeEach(async () => {
                init(measuringSelection({ function: luminescence, aspect: air }), { [air.id]: [temperature, humidity], [water.id]: [pressure] });
                await settle();
            });

            it('opens with the function selected, marked and explained', () => {
                expect(component.functionFormControl.value).toBe(luminescence);
                expect(functionIds()).toEqual([temperature.id, humidity.id, luminescence.id]);
                expect(label(1)).toBe('Get Luminiscence (no longer offered for this aspect)');
                expect(hints()).toEqual(['A deployment will probably find no devices for this combination.']);
            });

            it('writes the stored function back unchanged', () => {
                expect(savedResult().function).toBe(luminescence);
            });

            it('drops the marked entry once another function is picked', async () => {
                component.functionFormControl.setValue(humidity);
                await settle();
                expect(functionIds()).toEqual([temperature.id, humidity.id]);
                expect(hints()).toEqual([]);
                expect(label(1)).toBe('Get Humidity');
                expect(savedResult().function).toBe(humidity);
            });

            it('resets the function when the aspect changes and does not offer the marked entry again', async () => {
                component.aspectFormControl.setValue([water.id]);
                await settle();
                expect(component.functionFormControl.value).toBe('');
                expect(functionIds()).toEqual([pressure.id]);
                component.aspectFormControl.setValue([air.id]);
                await settle();
                expect(functionIds()).toEqual([temperature.id, humidity.id]);
                expect(hints()).toEqual([]);
            });
        });

        it('adds no marked entry when the stored function is listed, even under an old name', async () => {
            init(measuringSelection({ function: { ...temperature, name: 'Old Name' }, aspect: air }), { [air.id]: [temperature, humidity] });
            await settle();
            expect(functionIds()).toEqual([temperature.id, humidity.id]);
            expect(component.unlistedFunction).toBeNull();
            expect(label(1)).toBe('Get Temperature');
            expect(hints()).toEqual([]);
        });

        it('adds no marked entry to a new task', async () => {
            init(null, { [air.id]: [temperature] });
            selectMeasuring([air.id]);
            await settle();
            expect(functionIds()).toEqual([temperature.id]);
            expect(component.unlistedFunction).toBeNull();
        });

        describe('controlling', () => {
            it('marks a stored function its device class no longer offers', async () => {
                init(
                    measuringSelection({ function: { ...setColor, rdf_type: CONTROLLING }, device_class: heater }),
                    {},
                    [air, water],
                    [heater],
                    [setTemperature],
                );
                await settle();
                expect(component.functionFormControl.value.id).toBe(setColor.id);
                expect(functionIds()).toEqual([setTemperature.id, setColor.id]);
                //the aspect select sits between device class and function
                expect(label(2)).toBe('Set-Color (no longer offered for this device class)');
                expect(hints()).toEqual(['A deployment will probably find no devices for this combination.']);
                expect(savedResult().function.id).toBe(setColor.id);
            });

            it('marks a stored device class the listing no longer offers and keeps its functions', async () => {
                init(measuringSelection({ function: setTemperature, device_class: lamp }), {}, [air, water], [heater], [setTemperature]);
                await settle();
                expect(component.deviceClasses.map((c) => c.id)).toEqual([heater.id, lamp.id]);
                expect(label(0)).toBe('Lamp (no longer offered)');
                expect(hints()).toEqual(['A deployment will probably find no devices for this device class.']);
                expect(savedResult().device_class).toBe(lamp);
            });

            it('drops the marked device class and its function once another device class is picked', async () => {
                init(measuringSelection({ function: setColor, device_class: lamp }), {}, [air, water], [heater], [setTemperature]);
                await settle();
                //the aspect select sits between device class and function
                expect(label(2)).toBe('Set-Color (no longer offered for this device class)');
                component.deviceClassFormControl.setValue(heater);
                await settle();
                expect(component.deviceClasses.map((c) => c.id)).toEqual([heater.id]);
                expect(component.functionFormControl.value).toBe('');
                expect(functionIds()).toEqual([setTemperature.id]);
                expect(hints()).toEqual([]);
            });
        });
    });

    describe('aspect-class collision', () => {
        const saveButton = (): HTMLButtonElement =>
            fixture.nativeElement.querySelector('mat-dialog-actions button[color="accent"]');
        const renderedErrors = (): string[] =>
            Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('mat-error')).map((e) => e.textContent?.trim() ?? '');

        function selectCollidingAspects() {
            init(null, { [air.id]: [temperature], [water.id]: [temperature] }, [classifiedAir, classifiedWater]);
            selectMeasuring([air.id, water.id]);
            component.functionFormControl.setValue(temperature);
            fixture.detectChanges();
        }

        it('blocks Save for two aspects of one class and shows why, without the user touching the select', () => {
            selectCollidingAspects();
            expect(component.aspectFormControl.invalid).toBeTrue();
            expect(saveButton().disabled).toBeTrue();
            expect(renderedErrors()).toContain('Only one aspect per aspect class is allowed: Air, Water');
            component.save();
            expect(dialogRef.close).not.toHaveBeenCalled();
        });

        it('saves again once one of the aspects is removed', () => {
            selectCollidingAspects();
            component.aspectFormControl.setValue([air.id]);
            component.functionFormControl.setValue(temperature);
            fixture.detectChanges();
            expect(saveButton().disabled).toBeFalse();
            expect(renderedErrors()).not.toContain('Only one aspect per aspect class is allowed: Air, Water');
            expect(savedResult().aspects).toEqual([classifiedAir]);
        });

        it('blocks Save for a stored selection that already collides', () => {
            init(measuringSelection({ aspect: classifiedAir, aspects: [classifiedAir, classifiedWater] }), { [air.id]: [temperature], [water.id]: [temperature] }, [
                classifiedAir,
                classifiedWater,
            ]);
            fixture.detectChanges();
            expect(saveButton().disabled).toBeTrue();
            expect(renderedErrors()).toContain('Only one aspect per aspect class is allowed: Air, Water');
        });

        it('accepts aspects without a class, as before', () => {
            init(null, { [air.id]: [temperature], [water.id]: [temperature] });
            selectMeasuring([air.id, water.id]);
            component.functionFormControl.setValue(temperature);
            fixture.detectChanges();
            expect(saveButton().disabled).toBeFalse();
        });

        it('hands the aspect_class_id of the node on to the task payload, where the process-deployment reads it as part of its aspect node', () => {
            init(null, { [air.id]: [temperature] }, [classifiedAir]);
            selectMeasuring([air.id]);
            component.functionFormControl.setValue(temperature);
            const result = savedResult();
            expect(result.aspects[0].aspect_class_id).toBe(environmentClass);
            expect(result.aspect.aspect_class_id).toBe(environmentClass);
        });
    });
});
