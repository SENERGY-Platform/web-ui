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
import {MatInput} from '@angular/material/input';

export function useProperty(property: string): ((option: any) => string) {
    const properties = property.split('.');
    return option => {
        let obj = option;
        for (property of properties) {
            if (Object.keys(obj).indexOf(property) === -1) {
                return 'undefined';
            }
            obj = obj[property];
        }
        return obj;
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
    get value(): any {
        if (this.select?.value !== undefined) {
            return this.select.value;
        }
        if (this.queuedWriteValue !== undefined) {
            return this.queuedWriteValue;
        }
        return null;
    }

    set value(selection: any | null) {
        this.select.value = selection;
        this.stateChanges.next();
    }

    get empty() {
        if (this.select?.empty !== undefined) {
            return this.select.empty;
        }
        return this.queuedWriteValue === undefined;
    }

    get shouldLabelFloat() {
        return this.select?.shouldLabelFloat || false;
    }

    @Input()
    get disabled() {
        return this._disabled;
    }

    set disabled(dis) {
        this._disabled = dis;
        if (this.select) {
            this.select.disabled = coerceBooleanProperty(dis);
        }
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

    @Input() set options(value: any[] | Map<string, any[]>) {
        this._options = value;
        this.withGroups = !Array.isArray(this.options);
        if (!Array.isArray(this.options)) {
            this.optionsGroups = this.getOptionsGroup('');
            this.searchControl.valueChanges.subscribe((val: string) => this.optionsGroups = this.getOptionsGroup(val));
        }
        this.selectSingleElement();
    }

    get options(): any[] | Map<string, any[]> {
        return this._options;
    }

    get autoSelectSingleElement(): boolean {
        return this._autoSelectSingleElement;
    }

    @Input() set autoSelectSingleElement(value: boolean) {
        this._autoSelectSingleElement = value;
        this.selectSingleElement();
    }

    static nextId = 0;
    _disabled = false;

    @Input() required = false;
    @Input() multiple = false;

    _autoSelectSingleElement = false;

    @ViewChild(MatSelect, {static: false}) select!: MatSelect;

    _options: any[] | Map<string, any[]> = [];

    withGroups = false;
    @Input() noneView = '';

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
    @Input() getTriggerValue: ((options: MatOption | MatOption[]) => string) | undefined = undefined;

    optionsGroups: Map<string, any> = new Map();

    @ViewChild('searchInput', {static: false}) searchInput!: MatInput;

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
        if (this.ngControl) {
            this.select.ngControl = this.ngControl;
        }
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
        this.open();
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
                return;
            }
            let filtered: any[] = [];
            if (Array.isArray(this.options) && this.options.find) {
                filtered = this.options.filter(option =>
                    this.getOptionViewValue(option).toLowerCase().indexOf(this.searchControl.value.toLowerCase()) !== -1);

                // append selected options if not already included
                const addOptionByValue = (optionValue: any) => {
                    if (!Array.isArray(this.options)) {
                        console.error('Cant do that');
                        return;
                    }
                    const option = this.options.find(optionC => this.getOptionValue(optionC) === optionValue);
                    if (option === undefined) {
                        // Option got removed
                        return;
                    }
                    if (filtered.indexOf(option) === -1) {
                        filtered.push(option);
                    }
                };
                if (this.select?.selected) {
                    if (Array.isArray(this.select.selected)) {
                        this.select.selected?.forEach(sel => addOptionByValue(sel.value));
                    } else {
                        addOptionByValue(this.select.selected.value);
                    }
                }
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
        this.select?.setDisabledState(isDisabled);
        this.disabled = isDisabled;
    }

    writeValue(obj: any): void {
        if (this.select !== undefined) {
            this.select.writeValue(obj);
            this.queuedWriteValue = undefined;
        } else {
            this.queuedWriteValue = obj;
        }
    }

    setDescribedByIds(ids: string[]) {
        this.describedBy = ids.join(' ');
        this.select?.setDescribedByIds(ids);
    }

    openChanged($event: boolean) {
        if ($event && !this.select.selected) {
            this.searchInput.focus();
        }
        this.openedChange.emit($event);
    }

    close() {
        this.select?.close();
    }

    focus(options: FocusOptions) {
        this.select?.focus(options);
    }

    open() {
        if (!this.select?.panelOpen) {
            this.select.open();
            this.openChanged(true);
        }
    }

    toggle() {
        this.select?.toggle();
    }

    updateErrorState() {
        this.select?.updateErrorState();
    }

    getOptionsGroup(search: string): Map<string, any> {
        if (Array.isArray(this.options)) {
            return new Map();
        }
        if (this.options?.forEach && search.length > 0) {
            const r = new Map();
            this.options.forEach((v, k) => {
                const filtered = v.filter(option => {
                    if (Array.isArray(this.select.selected)) {
                        if (this.select.selected.find(sel => sel.value === this.getOptionValue(option)) !== undefined) {
                            return true;
                        }
                    } else if (this.select.selected?.value === this.getOptionValue(option)) {
                        return true;
                    }
                    return this.getOptionViewValue(option).toLowerCase().indexOf(search.toLowerCase()) !== -1;
                });
                if (filtered.length > 0) {
                    r.set(k, filtered);
                }
            });
            return r;
        } else {
            return this.options;
        }
    }

    toArray(v: any): any[] {
        return Array.isArray(v) ? v : [];
    }

    private selectSingleElement() {
        if (!this.empty || !this.autoSelectSingleElement) {
            return;
        }
        let toWrite: any;
        if (!Array.isArray(this.options)) {
            const optionsGroups = this.getOptionsGroup('');
            let singleValue: any;
            let moreFound = false;
            optionsGroups.forEach((v: any[]) => {
                if (v.length > 1) {
                    moreFound = true;
                } else if (v.length === 1) {
                    if (singleValue !== undefined) {
                        moreFound = true;
                    } else {
                        singleValue = v[0];
                    }
                }
            });
            if (singleValue !== undefined && !moreFound) {
                toWrite = singleValue;
            }

        } else if (this.options.length === 1) {
            toWrite = this.options[0];
        }
        if (toWrite !== undefined) {
            toWrite = this.getOptionValue(toWrite);
            this.value = toWrite;
            this.selectionChanged({source: this.select, value: toWrite});
            this.ngControl?.reset(this.value);
        }
    }
}
