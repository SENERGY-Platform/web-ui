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

import { Component, Injector, Input, OnChanges, OnInit, SimpleChanges, forwardRef } from '@angular/core';
import {
    AbstractControl,
    ControlValueAccessor,
    NG_VALIDATORS,
    NG_VALUE_ACCESSOR,
    NgControl,
    UntypedFormControl,
    ValidationErrors,
    Validator,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { AspectClassesService } from '../../../modules/metadata/aspects/shared/aspect-classes.service';
import { DeviceTypeAspectClassModel, DeviceTypeAspectModel } from '../../../modules/metadata/device-types-overview/shared/device-type.model';
import {
    AspectClassification,
    AspectSelectOption,
    aspectClassCollisionMessage,
    classifyAspects,
    collidingAspectNames,
} from './aspect-select.model';

/**
 * Multi-aspect picker, used wherever a content variable or criteria selects one or more aspects.
 * Value is always string[] of aspect ids, never null. `aspects` takes the tree(s) to offer, grouped
 * and labelled by aspect class; a flat DeviceTypeAspectNodeModel[] source (device-instance/deployment
 * pickers) is converted to that shape first with aspectTreeFromAspectNodes. Aspect classes are loaded
 * via AspectClassesService unless the caller already has them and passes aspectClasses; a user
 * without the right to read them gets the aspects without class names.
 */
@Component({
    selector: 'senergy-aspect-select',
    templateUrl: './aspect-select.component.html',
    styleUrls: ['./aspect-select.component.css'],
    providers: [
        { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AspectSelectComponent), multi: true },
        { provide: NG_VALIDATORS, useExisting: forwardRef(() => AspectSelectComponent), multi: true },
    ],
    standalone: false
})
export class AspectSelectComponent implements OnChanges, OnInit, ControlValueAccessor, Validator {
    @Input() aspects: DeviceTypeAspectModel[] = [];
    /** Skips the AspectClassesService call when the caller already fetched the classes itself. */
    @Input() aspectClasses?: DeviceTypeAspectClassModel[];
    /** Excludes aspects that have sub-aspects, for callers where only a leaf aspect makes sense. */
    @Input() leafOnly = false;
    @Input() label = 'Aspects';
    /**
     * Renders a collision without waiting for the control to be touched, for dialogs that block Save on it:
     * a stored collision would otherwise leave a disabled Save without any visible reason.
     */
    @Input() showCollisionUntouched = false;
    @Input() appendTo = '.ng-select-anchor';

    aspectOptions: AspectSelectOption[] = [];
    control = new UntypedFormControl([]);

    private classified: Map<string, AspectClassification> = new Map();
    private aspectClassNames = new Map<string, string>();
    private onChange: (value: string[]) => void = () => {};
    private onTouched: () => void = () => {};
    private onValidatorChange: () => void = () => {};
    // undefined until first looked up; injected lazily because NgControl depends on the NG_VALIDATORS provided above.
    private outerNgControl?: NgControl | null;

    /** The inner control is never touched by a parent form, so the error state follows the outer control instead. */
    errorStateMatcher: ErrorStateMatcher = {
        isErrorState: (inner, form) => {
            const control = this.outerControl() ?? inner;
            return (this.showCollisionUntouched && control?.hasError('aspectClassCollision') === true) || this.defaultErrorStateMatcher.isErrorState(control, form);
        },
    };

    constructor(
        private aspectClassesService: AspectClassesService,
        private injector: Injector,
        private defaultErrorStateMatcher: ErrorStateMatcher,
    ) {
        this.control.setValidators(() => this.validate(this.control));
        this.control.valueChanges.subscribe((value: string[]) => this.onChange(value || []));
    }

    ngOnInit(): void {
        if (this.aspectClasses === undefined && this.aspectClassesService.userHasReadAuthorization()) {
            this.aspectClassesService.getAspectClasses(9999, 0).subscribe((classes) => {
                this.aspectClassNames = new Map(classes.map((c) => [c.id, c.name]));
                this.rebuildOptions();
            });
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['aspectClasses'] && this.aspectClasses !== undefined) {
            this.aspectClassNames = new Map(this.aspectClasses.map((c) => [c.id, c.name]));
        }
        if (changes['aspects'] || changes['leafOnly'] || changes['aspectClasses']) {
            this.rebuildOptions();
        }
    }

    writeValue(value: string[] | null): void {
        this.control.setValue(value || [], { emitEvent: false });
    }

    registerOnChange(fn: (value: string[]) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    registerOnValidatorChange(fn: () => void): void {
        this.onValidatorChange = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        if (isDisabled) {
            this.control.disable({ emitEvent: false });
        } else {
            this.control.enable({ emitEvent: false });
        }
    }

    validate(control: AbstractControl): ValidationErrors | null {
        const colliding = collidingAspectNames(this.classified, control.value);
        return colliding.length === 0 ? null : { aspectClassCollision: { aspects: colliding } };
    }

    /** Read from the outer control, which also carries errors of validators the parent adds. */
    get collidingAspects(): string[] {
        return (this.outerControl() ?? this.control).errors?.['aspectClassCollision']?.aspects ?? [];
    }

    get collisionMessage(): string {
        return aspectClassCollisionMessage(this.collidingAspects);
    }

    /** The class an aspect belongs to, if any -- lets a caller judge a stored value on its own, without waiting on this control. */
    aspectClass(aspectId: string): AspectClassification | undefined {
        return this.classified.get(aspectId);
    }

    /** ng-select renders no header for an undefined group, which is what an aspect without a class needs. */
    aspectClassGroup = (option: AspectSelectOption): string | undefined => option.aspect_class_name;

    onBlur(): void {
        this.onTouched();
    }

    private rebuildOptions(): void {
        this.classified = classifyAspects(this.aspects);
        let options: AspectSelectOption[] = [];
        this.aspects.forEach((a) => options.push(...this.flatten(a, '')));
        if (this.leafOnly) {
            options = options.filter((a) => this.isLeaf(a));
        }
        options.forEach((option) => {
            const classId = this.classified.get(option.id)?.classId;
            option.aspect_class_name = classId === undefined ? undefined : this.aspectClassNames.get(classId);
        });
        // Aspects without a class keep the order of the tree and render without a header; the class
        // groups follow them, so every header stands directly above the aspects it covers.
        options.sort((a, b) => (a.aspect_class_name || '').localeCompare(b.aspect_class_name || ''));
        this.aspectOptions = options;
        this.control.updateValueAndValidity({ emitEvent: false });
        this.onValidatorChange();
    }

    private outerControl(): AbstractControl | null {
        if (this.outerNgControl === undefined) {
            this.outerNgControl = this.injector.get(NgControl, null, { self: true, optional: true });
        }
        return this.outerNgControl?.control ?? null;
    }

    private isLeaf(aspect: DeviceTypeAspectModel): boolean {
        return aspect.sub_aspects === null || aspect.sub_aspects === undefined || aspect.sub_aspects.length === 0;
    }

    private flatten(aspect: DeviceTypeAspectModel, prefix: string): AspectSelectOption[] {
        const name = prefix + aspect.name;
        const option: AspectSelectOption = { id: aspect.id, name, sub_aspects: aspect.sub_aspects };
        const children = aspect.sub_aspects ?? [];
        return [option, ...children.flatMap((sub) => this.flatten(sub, name + '.'))];
    }
}
