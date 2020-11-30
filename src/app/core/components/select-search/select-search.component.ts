/*
 * Copyright 2020 InfAI (CC SES)
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
    AfterViewInit,
    Component,
    EventEmitter,
    HostBinding,
    Input,
    OnDestroy,
    OnInit,
    Optional,
    Output,
    Self,
    ViewChild
} from '@angular/core';
import {MatSelect, MatSelectChange} from '@angular/material/select';
import {MatFormFieldControl} from '@angular/material/form-field';
import {Observable, Subject} from 'rxjs';
import {ControlValueAccessor, FormControl, NgControl} from '@angular/forms';
import {coerceBooleanProperty} from '@angular/cdk/coercion';
import {ErrorStateMatcher, MatOption} from '@angular/material/core';

export function useProperty(property: string): ((option: any) => string) {
    return option => {
        if (Object.keys(option).indexOf(property) === -1) {
            return 'undefined';
        }
        return option[property];
    };
}

@Component({
    selector: 'senergy-select-search',
    templateUrl: './select-search.component.html',
    styleUrls: ['./select-search.component.css'],
    providers: [{provide: MatFormFieldControl, useExisting: SelectSearchComponent}],
})
export class SelectSearchComponent implements MatFormFieldControl<any>, ControlValueAccessor, OnDestroy, AfterViewInit, OnInit {

    constructor(@Optional() @Self() public ngControl: NgControl,
    ) {
        if (this.ngControl != null) {
            this.ngControl.valueAccessor = this;
        }

    }


    @Input()
    get value(): any | null {
        return this.select?.value || null;
    }

    set value(selection: any | null) {
        this.select.value = selection;
        this.stateChanges.next();
    }

    get empty() {
        return this.select?.empty || true;
    }

    get shouldLabelFloat() {
        return this.select?.shouldLabelFloat || false;
    }

    @Input()
    get required() {
        return this.select?.required || false;
    }

    set required(req) {
        this.select.required = coerceBooleanProperty(req);
    }

    @Input()
    get disabled() {
        return this.select?.disabled || false;
    }

    set disabled(dis) {
        this.select.disabled = coerceBooleanProperty(dis);
    }

    get customTrigger() {
        return this.select?.customTrigger;
    }

    set customTrigger(dis) {
        this.select.customTrigger = dis;

    }


    get optionGroups() {
        return this.select?.optionGroups;
    }

    set optionGroups(dis) {
        this.select.optionGroups = dis;
    }

    get optionSelectionChanges() {
        return this.select?.optionSelectionChanges;
    }

    get overlayDir() {
        return this.select?.overlayDir;
    }

    set overlayDir(dis) {
        this.select.overlayDir = dis;

    }

    get panel() {
        return this.select?.panel;
    }

    set panel(dis) {
        this.select.panel = dis;
    }

    get panelOpen() {
        return this.select?.panelOpen;
    }

    get selected() {
        return this.select?.selected;
    }


    @Input() multiple = false;


    static nextId = 0;
    @ViewChild(MatSelect, {static: false}) select!: MatSelect;

    @Input() options: any[] = [];

    readonly controlType: string = 'select-autocomplete';
    readonly errorState: boolean = this.select?.errorState || false;
    readonly focused: boolean = this.select?.focused;

    readonly stateChanges = new Subject<void>();
    @HostBinding() id = `my-tel-input-${SelectSearchComponent.nextId++}`;

    @Output() selectionChange: EventEmitter<MatSelectChange> = new EventEmitter<MatSelectChange>();
    searchControl = new FormControl('');


    @HostBinding('attr.aria-describedby') describedBy = '';

    @Input() compareWith: (o1: any, o2: any) => boolean = this.select?.compareWith || ((o1, o2) => o1 === o2);
    @Input() disableOptionCentering: boolean = this.select?.disableOptionCentering;
    @Input() disableRipple: boolean = this.select?.disableRipple;
    @Input() errorStateMatcher: ErrorStateMatcher = this.select?.errorStateMatcher;
    @Input()
    panelClass: string | string[] | Set<string> | { [key: string]: any; } = this.select?.panelClass;
    @Input()
    placeholder: string = this.select?.placeholder;
    @Input()
    sortComparator: (a: MatOption, b: MatOption, options: MatOption[]) => number = this.select?.sortComparator;
    @Output()
    openedChange: EventEmitter<boolean> = new EventEmitter<boolean>();
    @Input('aria-label') ariaLabel: string = this.select?.ariaLabel;
    @Input('aria-labelledby') ariaLabelledby: string = this.select?.ariaLabelledby;

    queuedOnChange: any[] = [];

    queuedOnTouched: any[] = [];

    queuedWriteValue: any = undefined;
    @Input() useOptionViewProperty: string | undefined = undefined;
    @Input() useOptionValueProperty: string | undefined = undefined;

    ngOnInit() {
        if (this.useOptionViewProperty !== undefined) {
            this.getOptionViewValue = useProperty(this.useOptionViewProperty);
        }
        if (this.useOptionValueProperty !== undefined) {
            this.getOptionValue = useProperty(this.useOptionValueProperty);
        }
    }


    ngAfterViewInit() {
        this.select.stateChanges.asObservable().subscribe(() => this.stateChanges.next());
        if (this.queuedWriteValue) {
            this.writeValue(this.queuedWriteValue);
        }
        if (this.queuedOnChange.length > 0) {
            this.queuedOnChange.forEach(fn => this.registerOnChange(fn));
            this.queuedOnChange = [];
        }
        if (this.queuedOnTouched.length > 0) {
            this.queuedOnTouched.forEach(fn => this.registerOnTouched(fn));
            this.queuedOnTouched = [];
        }
    }

    ngOnDestroy() {
        this.stateChanges.complete();
    }


    @Input() getOptionValue: ((option: any) => any) = a => a;
    @Input() getOptionViewValue: ((option: any) => string) = a => a as string;


    onContainerClick(_: MouseEvent): void {
        if (!this.select?.panelOpen) {
            this.select.open();
            this.openChanged(true);
        }
    }

    resetSearch() {
        this.searchControl.patchValue('');
        this.stateChanges.next();
    }

    getOptions(): Observable<any> {
        return new Observable<any>(obs => {
            if (!this.options) {
                obs.next(this.options);
                obs.complete();
            }
            const filtered = this.options.filter(option =>
                this.getOptionViewValue(option).toLowerCase().indexOf(this.searchControl.value.toLowerCase()) !== -1);

            // append selected options if not already included
            if (this.multiple && this.select?.value) {
                (this.select.value as any[])?.forEach((optionValue: any) => {
                    const option = this.options.find(optionC => this.getOptionValue(optionC) === optionValue);
                    if (option === undefined) {
                        console.error('Could no longer find option');
                        return;
                    }
                    if (filtered.indexOf(option) === -1) {
                        filtered.push(option);
                    }
                });
            }
            obs.next(filtered);
            obs.complete();
        });
    }

    selectionChanged($event: MatSelectChange) {
        this.selectionChange.emit($event);
    }

    registerOnChange(fn: any): void {
        if (this.select) {
            this.select?.registerOnChange(fn);
        } else {
            this.queuedOnChange.push(fn);
        }

    }

    registerOnTouched(fn: any): void {
        if (this.select) {
            this.select?.registerOnTouched(fn);
        } else {
            this.queuedOnTouched.push(fn);
        }
    }

    setDisabledState(isDisabled: boolean): void {
        this.select.setDisabledState(isDisabled);
    }

    writeValue(obj: any): void {
        if (this.select) {
            this.select?.writeValue(obj);
            this.queuedWriteValue = undefined;
        } else {
            this.queuedWriteValue = obj;
        }
    }

    setDescribedByIds(ids: string[]) {
        this.describedBy = ids.join(' ');
    }


    openChanged($event: boolean) {
        this.openedChange.emit($event);
    }

    close() {
        this.select?.close();
    }

    focus(options: FocusOptions) {
        this.select?.focus(options);
    }

    open() {
        this.select?.open();
    }

    toggle() {
        this.select?.toggle();
    }

    updateErrorState() {
        this.select?.updateErrorState();
    }


}
