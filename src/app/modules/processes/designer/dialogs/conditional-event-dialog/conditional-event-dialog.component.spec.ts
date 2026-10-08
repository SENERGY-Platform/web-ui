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
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { By } from '@angular/platform-browser';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { ConditionalEventDialogComponent } from './conditional-event-dialog.component';
import { CoreModule } from '../../../../../core/core.module';
import { AspectSelectComponent } from '../../../../../core/components/aspect-select/aspect-select.component';
import { DeviceTypeService } from '../../../../metadata/device-types-overview/shared/device-type.service';
import { ConceptsService } from '../../../../metadata/concepts/shared/concepts.service';
import { DeviceTypeAspectNodeModel, DeviceTypeFunctionModel } from '../../../../metadata/device-types-overview/shared/device-type.model';
import { ConditionalEventEditModel } from '../../shared/designer-dialog.model';

const MEASURING = 'https://senergy.infai.org/ontology/MeasuringFunction';

const node = (id: string, name: string): DeviceTypeAspectNodeModel => ({
    id,
    name,
    root_id: id,
    parent_id: '',
    child_ids: [],
    ancestor_ids: [],
    descendent_ids: [],
});

const air = node('urn:infai:ses:aspect:air', 'Air');
const water = node('urn:infai:ses:aspect:water', 'Water');
const environmentClass = 'urn:infai:ses:aspect-class:environment';
const classifiedAir = { ...air, aspect_class_id: environmentClass };
const classifiedWater = { ...water, aspect_class_id: environmentClass };
const fn = (id: string, name: string): DeviceTypeFunctionModel => ({ id, name, rdf_type: MEASURING, concept_id: 'urn:infai:ses:concept:c' }) as DeviceTypeFunctionModel;
const temperature = fn('urn:infai:ses:measuring-function:temperature', 'Get Temperature');
const humidity = fn('urn:infai:ses:measuring-function:humidity', 'Get Humidity');
// offered for an aspect only through an import type, which getMeasuringFunctionsPerAspectWithImports adds
const imported = fn('urn:infai:ses:measuring-function:imported', 'Imported');

describe('ConditionalEventDialogComponent', () => {
    let fixture: ComponentFixture<ConditionalEventDialogComponent>;
    let component: ConditionalEventDialogComponent;
    let dialogRef: Spy<MatDialogRef<ConditionalEventDialogComponent>>;
    let deviceTypeService: Spy<DeviceTypeService>;

    function init(
        msg: Partial<ConditionalEventEditModel> | null,
        functionsByAspect: { [id: string]: DeviceTypeFunctionModel[] | Observable<DeviceTypeFunctionModel[]> },
        listing: DeviceTypeAspectNodeModel[] = [air, water],
    ) {
        dialogRef = createSpyFromClass<MatDialogRef<ConditionalEventDialogComponent>>(MatDialogRef);
        deviceTypeService = createSpyFromClass(DeviceTypeService);
        deviceTypeService.getAspectNodesWithMeasuringFunction.and.returnValue(of(listing));
        deviceTypeService.getMeasuringFunctionsPerAspectWithImports.and.callFake((ids: string[]) =>
            forkJoin(
                ids.map((id) => {
                    const functions = functionsByAspect[id] || [];
                    return Array.isArray(functions) ? of(functions) : functions;
                }),
            ),
        );
        const conceptsService = createSpyFromClass(ConceptsService);
        conceptsService.getConceptWithCharacteristics.and.returnValue(
            of({ id: 'urn:infai:ses:concept:c', name: 'c', base_characteristic_id: 'celsius', characteristic_ids: [], characteristics: [{ id: 'celsius', name: 'Celsius' }] } as any),
        );

        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [CoreModule, MatDialogModule, FormsModule, ReactiveFormsModule, MatInputModule, MtxSelectModule, NoopAnimationsModule, ConditionalEventDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { msg } },
                { provide: DeviceTypeService, useValue: deviceTypeService },
                { provide: ConceptsService, useValue: conceptsService },
                provideHttpClient(withXhr(), withInterceptorsFromDi()),
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(ConditionalEventDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    const existing = (overrides: Partial<ConditionalEventEditModel>): Partial<ConditionalEventEditModel> => ({
        aspect: '',
        iotfunction: temperature.id,
        characteristic: 'celsius',
        script: 'value > 20',
        valueVariableName: 'value',
        variables: '',
        qos: '0',
        label: '',
        ...overrides,
    });

    const functionIds = () => component.functions.map((f) => f.id);
    const savedResult = (): ConditionalEventEditModel => {
        component.save();
        return dialogRef.close.calls.mostRecent().args[0];
    };

    it('uses the shared aspect select, offering aspects with sub-aspects too', () => {
        init(null, {});
        const select: AspectSelectComponent = fixture.debugElement.query(By.directive(AspectSelectComponent)).componentInstance;
        expect(select.leafOnly).toBe(false);
        expect(select.aspectOptions.map((o) => o.id)).toEqual([air.id, water.id]);
    });

    it('offers only the functions every selected aspect offers, import-derived ones included', () => {
        init(null, { [air.id]: [temperature, imported, humidity], [water.id]: [imported, temperature] });
        component.aspectFormControl.setValue([air.id, water.id]);
        expect(deviceTypeService.getMeasuringFunctionsPerAspectWithImports).toHaveBeenCalledOnceWith([air.id, water.id]);
        expect(functionIds()).toEqual([temperature.id, imported.id]);
    });

    it('offers no function and disables the function field without an aspect', () => {
        init(null, { [air.id]: [temperature] });
        component.aspectFormControl.setValue([air.id]);
        component.aspectFormControl.setValue([]);
        expect(functionIds()).toEqual([]);
        expect(component.functionFormControl.disabled).toBe(true);
    });

    it('ignores the answer for a selection that has since been replaced', () => {
        const slowAir = new Subject<DeviceTypeFunctionModel[]>();
        init(null, { [air.id]: slowAir, [water.id]: [humidity] });
        component.aspectFormControl.setValue([air.id]);
        component.aspectFormControl.setValue([water.id]);
        slowAir.next([temperature]);
        slowAir.complete();
        expect(functionIds()).toEqual([humidity.id]);
    });

    it('matches the function select by id, so a renamed function stays selected', () => {
        init(null, {});
        expect(component.compare({ ...temperature, name: 'Old Name' }, temperature)).toBeTrue();
        expect(component.compare(humidity, temperature)).toBeFalse();
    });

    it('opens an element written before the list with its single aspect and its function selected', () => {
        init(existing({ aspect: air.id }), { [air.id]: [temperature, humidity] });
        expect(component.aspectFormControl.value).toEqual([air.id]);
        expect(component.functionFormControl.value).toEqual(temperature);
    });

    it('opens an element with every aspect of its list selected', () => {
        init(existing({ aspect: air.id, aspects: [water.id, air.id] }), { [air.id]: [temperature, humidity], [water.id]: [temperature] });
        expect(component.aspectFormControl.value).toEqual([water.id, air.id]);
        expect(functionIds()).toEqual([temperature.id]);
        expect(component.functionFormControl.value).toEqual(temperature);
    });

    it('opens empty when the element names an aspect that is no longer offered', () => {
        init(existing({ aspect: air.id, aspects: [air.id, 'urn:infai:ses:aspect:gone'] }), { [air.id]: [temperature] });
        expect(component.aspectFormControl.value).toEqual([]);
        expect(deviceTypeService.getMeasuringFunctionsPerAspectWithImports).not.toHaveBeenCalled();
    });

    it('returns the selected ids sorted and the first of them as the deprecated aspect', () => {
        init(null, { [air.id]: [temperature], [water.id]: [temperature] });
        component.aspectFormControl.setValue([water.id, air.id]);
        component.functionFormControl.setValue(temperature);
        const result = savedResult();
        expect(result.aspects).toEqual([air.id, water.id]);
        expect(result.aspect).toBe(air.id);
        expect(result.iotfunction).toBe(temperature.id);
        expect(result.characteristic).toBe('celsius');
    });

    it('returns a single aspect in both fields', () => {
        init(null, { [water.id]: [temperature] });
        component.aspectFormControl.setValue([water.id]);
        component.functionFormControl.setValue(temperature);
        const result = savedResult();
        expect(result.aspects).toEqual([water.id]);
        expect(result.aspect).toBe(water.id);
    });

    it('returns an empty list and no deprecated aspect for an empty selection', () => {
        init(existing({ aspect: air.id, aspects: [air.id] }), { [air.id]: [temperature] });
        component.aspectFormControl.setValue([]);
        component.functionFormControl.setValue(temperature);
        const result = savedResult();
        expect(result.aspects).toEqual([]);
        expect(result.aspect).toBe('');
    });

    describe('aspect-class collision', () => {
        const saveButton = (): HTMLButtonElement =>
            fixture.nativeElement.querySelector('mat-dialog-actions button[color="accent"]');
        const renderedErrors = (): string[] =>
            Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('mat-error')).map((e) => e.textContent?.trim() ?? '');

        function selectCollidingAspects() {
            init(null, { [air.id]: [temperature], [water.id]: [temperature] }, [classifiedAir, classifiedWater]);
            component.aspectFormControl.setValue([air.id, water.id]);
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
            expect(savedResult().aspects).toEqual([air.id]);
        });

        it('blocks Save for a stored element whose aspects collide', () => {
            init(existing({ aspect: air.id, aspects: [air.id, water.id] }), { [air.id]: [temperature], [water.id]: [temperature] }, [classifiedAir, classifiedWater]);
            fixture.detectChanges();
            expect(saveButton().disabled).toBeTrue();
            expect(renderedErrors()).toContain('Only one aspect per aspect class is allowed: Air, Water');
        });

        it('accepts aspects without a class, as before', () => {
            init(null, { [air.id]: [temperature], [water.id]: [temperature] });
            component.aspectFormControl.setValue([air.id, water.id]);
            component.functionFormControl.setValue(temperature);
            fixture.detectChanges();
            expect(saveButton().disabled).toBeFalse();
        });
    });
});
