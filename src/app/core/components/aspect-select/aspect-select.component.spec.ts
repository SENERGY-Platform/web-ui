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

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { createSpyFromClass, Spy } from 'jasmine-auto-spies';
import { of } from 'rxjs';
import { AspectSelectComponent } from './aspect-select.component';
import { CoreModule } from '../../core.module';
import { AspectClassesService } from '../../../modules/metadata/aspects/shared/aspect-classes.service';
import { DeviceTypeAspectClassModel, DeviceTypeAspectModel } from '../../../modules/metadata/device-types-overview/shared/device-type.model';

describe('AspectSelectComponent', () => {
    let component: AspectSelectComponent;
    let fixture: ComponentFixture<AspectSelectComponent>;
    const aspectClassesServiceSpy: Spy<AspectClassesService> = createSpyFromClass<AspectClassesService>(AspectClassesService);

    const classifiedAspects: DeviceTypeAspectModel[] = [
        {
            id: 'urn:infai:ses:aspect:air',
            name: 'air',
            aspect_class_id: 'urn:infai:ses:aspect-class:environment',
            sub_aspects: [
                { id: 'urn:infai:ses:aspect:inside_air', name: 'inside_air', sub_aspects: [] },
                { id: 'urn:infai:ses:aspect:outside_air', name: 'outside_air', sub_aspects: [] },
            ],
        },
        { id: 'urn:infai:ses:aspect:device', name: 'device', sub_aspects: [] },
    ];
    const environmentClass: DeviceTypeAspectClassModel[] = [
        { id: 'urn:infai:ses:aspect-class:environment', name: 'Environment' },
    ];

    beforeEach(async () => {
        aspectClassesServiceSpy.getAspectClasses.calls.reset();
        aspectClassesServiceSpy.userHasReadAuthorization.and.returnValue(true);
        aspectClassesServiceSpy.getAspectClasses.and.returnValue(of(environmentClass));
        await TestBed.configureTestingModule({
            imports: [CoreModule, ReactiveFormsModule, NoopAnimationsModule],
            providers: [{ provide: AspectClassesService, useValue: aspectClassesServiceSpy }],
        }).compileComponents();
        fixture = TestBed.createComponent(AspectSelectComponent);
        component = fixture.componentInstance;
    });

    /** Assigns the inputs and drives ngOnChanges the way a real parent binding would, since a direct
     *  property assignment on a fixture created without a host template does not. */
    function applyInputs(aspects: DeviceTypeAspectModel[], aspectClasses?: DeviceTypeAspectClassModel[], leafOnly = false): void {
        component.aspects = aspects;
        component.aspectClasses = aspectClasses;
        component.leafOnly = leafOnly;
        component.ngOnChanges({
            aspects: { currentValue: aspects, previousValue: undefined, firstChange: true, isFirstChange: () => true },
            aspectClasses: { currentValue: aspectClasses, previousValue: undefined, firstChange: true, isFirstChange: () => true },
            leafOnly: { currentValue: leafOnly, previousValue: undefined, firstChange: true, isFirstChange: () => true },
        });
    }

    it('writes an empty array, never null, when nothing is selected', () => {
        component.writeValue(null);
        expect(component.control.value).toEqual([]);
    });

    it('writes a given value through to the internal control', () => {
        component.writeValue(['urn:infai:ses:aspect:device']);
        expect(component.control.value).toEqual(['urn:infai:ses:aspect:device']);
    });

    it('reports a value the user picks through registerOnChange', () => {
        const onChange = jasmine.createSpy('onChange');
        component.registerOnChange(onChange);
        component.control.setValue(['urn:infai:ses:aspect:device']);
        expect(onChange).toHaveBeenCalledWith(['urn:infai:ses:aspect:device']);
    });

    it('offers only the leaves when leafOnly is set', () => {
        applyInputs(classifiedAspects, environmentClass, true);

        expect(component.aspectOptions.map((a) => a.id)).toEqual([
            'urn:infai:ses:aspect:device',
            'urn:infai:ses:aspect:inside_air',
            'urn:infai:ses:aspect:outside_air',
        ]);
    });

    it('offers every aspect, including ones with sub-aspects, when leafOnly is unset', () => {
        applyInputs(classifiedAspects, environmentClass);

        expect(component.aspectOptions.map((a) => a.id)).toEqual([
            'urn:infai:ses:aspect:device',
            'urn:infai:ses:aspect:air',
            'urn:infai:ses:aspect:inside_air',
            'urn:infai:ses:aspect:outside_air',
        ]);
    });

    it('groups by aspect class, dot-prefixes sub-aspect names, and sorts the unclassified aspects first', () => {
        applyInputs(classifiedAspects, environmentClass);

        expect(component.aspectOptions.map((a) => [a.name, a.aspect_class_name])).toEqual([
            ['device', undefined],
            ['air', 'Environment'],
            ['air.inside_air', 'Environment'],
            ['air.outside_air', 'Environment'],
        ]);
        expect(component.aspectClassGroup(component.aspectOptions[0])).toBeUndefined();
        expect(component.aspectClassGroup(component.aspectOptions[1])).toBe('Environment');
        expect(aspectClassesServiceSpy.getAspectClasses).not.toHaveBeenCalled();
    });

    it('loads the aspect classes itself when the caller does not supply them', () => {
        applyInputs(classifiedAspects, undefined);
        component.ngOnInit();

        expect(aspectClassesServiceSpy.getAspectClasses).toHaveBeenCalled();
        const airOption = component.aspectOptions.find((a) => a.id === 'urn:infai:ses:aspect:air');
        expect(airOption?.aspect_class_name).toBe('Environment');
    });

    it('does not request the aspect classes without the right to read them, and offers the aspects without class names', () => {
        aspectClassesServiceSpy.userHasReadAuthorization.and.returnValue(false);
        applyInputs(classifiedAspects, undefined);
        component.ngOnInit();

        expect(aspectClassesServiceSpy.getAspectClasses).not.toHaveBeenCalled();
        expect(component.aspectOptions.map((a) => a.aspect_class_name)).toEqual([undefined, undefined, undefined, undefined]);
    });

    it('skips the aspect-classes call when the caller already supplied them', () => {
        applyInputs(classifiedAspects, environmentClass);
        component.ngOnInit();

        expect(aspectClassesServiceSpy.getAspectClasses).not.toHaveBeenCalled();
    });

    it('reports an aspectClassCollision error for two aspects of one classified hierarchy, and none for aspects of different hierarchies', () => {
        applyInputs(classifiedAspects, environmentClass);

        component.writeValue(['urn:infai:ses:aspect:inside_air', 'urn:infai:ses:aspect:outside_air']);
        expect(component.validate(component.control)?.['aspectClassCollision'].aspects)
            .toEqual(['inside_air', 'outside_air']);

        component.writeValue(['urn:infai:ses:aspect:inside_air', 'urn:infai:ses:aspect:device']);
        expect(component.validate(component.control)).toBeNull();
    });

    it('exposes the class of a given aspect', () => {
        applyInputs(classifiedAspects, environmentClass);

        expect(component.aspectClass('urn:infai:ses:aspect:inside_air')?.classId).toBe('urn:infai:ses:aspect-class:environment');
        expect(component.aspectClass('urn:infai:ses:aspect:device')).toBeUndefined();
    });

    describe('inside a parent form', () => {
        const inside = 'urn:infai:ses:aspect:inside_air';
        const outside = 'urn:infai:ses:aspect:outside_air';

        @Component({
    template: `<form [formGroup]="form">
                <senergy-aspect-select formControlName="aspect_ids" [aspects]="aspects" [aspectClasses]="classes"
                    [showCollisionUntouched]="showCollisionUntouched"></senergy-aspect-select>
            </form>`,
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
        class HostComponent {
            form = new FormGroup({ aspect_ids: new FormControl<string[]>([inside, outside]) });
            aspects: DeviceTypeAspectModel[] = classifiedAspects;
            classes: DeviceTypeAspectClassModel[] = environmentClass;
            showCollisionUntouched = false;
        }

        let host: ComponentFixture<HostComponent>;

        beforeEach(() => {
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                imports: [CoreModule, ReactiveFormsModule, NoopAnimationsModule],
                declarations: [HostComponent],
                providers: [{ provide: AspectClassesService, useValue: aspectClassesServiceSpy }],
            });
            host = TestBed.createComponent(HostComponent);
        });

        const render = () => {
            host.detectChanges();
            host.detectChanges();
        };
        const renderedErrors = (): string[] =>
            Array.from<HTMLElement>(host.nativeElement.querySelectorAll('mat-error')).map((e) => e.textContent?.trim() ?? '');
        const outer = () => host.componentInstance.form.controls.aspect_ids;

        it('renders no mat-error for a collision while the outer control is untouched', () => {
            render();

            expect(outer().invalid).toBeTrue();
            expect(renderedErrors()).toEqual([]);
        });

        it('renders the collision of an untouched control when showCollisionUntouched is set', () => {
            host.componentInstance.showCollisionUntouched = true;
            render();

            expect(outer().touched).toBeFalse();
            expect(renderedErrors()).toEqual(['Only one aspect per aspect class is allowed: inside_air, outside_air']);
        });

        it('renders nothing for an untouched control without a collision when showCollisionUntouched is set', () => {
            host.componentInstance.showCollisionUntouched = true;
            outer().setValue([inside]);
            render();

            expect(renderedErrors()).toEqual([]);
        });

        it('renders the collision as soon as the outer control is marked touched', () => {
            render();
            outer().markAsTouched();
            render();

            expect(renderedErrors()).toEqual(['Only one aspect per aspect class is allowed: inside_air, outside_air']);
        });

        it('renders the collision when the parent form marks all its controls touched', () => {
            render();
            host.componentInstance.form.markAllAsTouched();
            render();

            expect(renderedErrors()).toEqual(['Only one aspect per aspect class is allowed: inside_air, outside_air']);
        });

        it('renders no mat-error for a touched outer control without a collision', () => {
            outer().setValue([inside]);
            render();
            outer().markAsTouched();
            render();

            expect(renderedErrors()).toEqual([]);
        });

        it('re-validates the outer control when the classified aspects arrive after the value', () => {
            host.componentInstance.aspects = [];
            render();
            expect(outer().valid).toBeTrue();

            host.componentInstance.aspects = classifiedAspects;
            render();

            expect(outer().errors?.['aspectClassCollision'].aspects).toEqual(['inside_air', 'outside_air']);
        });
    });
});
