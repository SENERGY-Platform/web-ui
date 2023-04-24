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
    ChangeDetectorRef,
    Component,
    EventEmitter,
    HostBinding,
    Input,
    OnDestroy,
    OnInit,
    Optional,
    Output,
    Self,
    ViewChild,
} from '@angular/core';
import {MatLegacySelect as MatSelect, MatLegacySelectChange as MatSelectChange} from '@angular/material/legacy-select';
import {MatLegacyFormFieldControl as MatFormFieldControl} from '@angular/material/legacy-form-field';
import {Observable, Subject} from 'rxjs';
import {ControlValueAccessor, FormControl, NgControl} from '@angular/forms';
import {coerceBooleanProperty} from '@angular/cdk/coercion';
import {ErrorStateMatcher} from '@angular/material/core';
import {MatLegacyOption as MatOption} from '@angular/material/legacy-core';
import {MatLegacyInput as MatInput} from '@angular/material/legacy-input';
import ScrollEvent = JQuery.ScrollEvent;
import MouseUpEvent = JQuery.MouseUpEvent;
import {KeyValue} from '@angular/common';

export function useProperty(property: string): (option: any) => any {
    const properties = property.split('.');
    return (option) => {
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
    constructor(@Optional() @Self() public ngControl: NgControl, private cd: ChangeDetectorRef) {
        if (this.ngControl != null) {
            this.ngControl.valueAccessor = this;
        }
    }

    get errorState() {
        if (!this.select) {
            return false;
        }
        return this.select.ngControl?.errors !== null && !!this.select.ngControl?.touched;
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
        if (this.select === undefined) {
            this.queuedWriteValue = selection;
        } else {
            this.select.value = selection;
        }
        if (this.withGroups) {
            this.updateOptionsGroups(this.searchControl.value || '', true);
        }
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
        if (this.withGroups) {
            this.updateOptionsGroups(this.searchControl.value || '', true);
            this.searchControl.valueChanges.subscribe((val: string) => (this.updateOptionsGroups(val, false)));
        }
        this.resetSearchIfNoResults();
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

    _required = false;

    @Input()
    get required() {
        return this._required;
    }

    set required(dis) {
        this._required = dis;
        if (this.select) {
            this.select.required = coerceBooleanProperty(dis);
        }
    }

    @Input() multiple = false;

    _autoSelectSingleElement = false;

    @ViewChild(MatSelect, {static: false}) select!: MatSelect;

    _options: any[] | Map<string, any[]> = [];

    withGroups = false;
    @Input() noneView = '';

    readonly controlType: string = 'select-autocomplete';
    //readonly errorState: boolean = this.select?.errorState || false;
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
    panelClass: string | string[] | Set<string> | { [key: string]: any } = this.select?.panelClass;
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
    @Input() useOptionClassProperty: string | undefined = undefined;
    @Input() useOptionDisabledProperty: string | undefined = undefined;
    @Input() getTriggerValue: ((options: MatOption | MatOption[]) => string) | undefined = undefined;

    /**
     * Percentage of the scrollbar that will trigger a window change.
     */
    @Input() scrollPercentage = 25;
    /**
     * How many elements will be rendered at a time
     */
    @Input() scrollWindowSize = 20;
    /**
     * scrollWindowSize / scrollWindowMoveDivisor = number of elements that will be removed/added to the sliding window
     */
    @Input() scrollWindowMoveDivisor = 20;
    scrollLowerOffset = 0;
    lastScrollLowerOffset = 0;
    lastScrollPercentage = 0;
    maxElements = 0;

    optionsGroups: Map<string, any> = new Map();

    @ViewChild('searchInput', {static: false}) searchInput!: MatInput;
    private lastSearch: string | undefined;

    ngOnInit() {
        if (this.useOptionViewProperty !== undefined) {
            this.getOptionViewValue = useProperty(this.useOptionViewProperty);
        }
        if (this.useOptionValueProperty !== undefined) {
            this.getOptionValue = useProperty(this.useOptionValueProperty);
        }
        if (this.useOptionClassProperty !== undefined) {
            this.getOptionClass = useProperty(this.useOptionClassProperty);
        }
        if (this.useOptionDisabledProperty !== undefined) {
            this.getOptionDisabled = useProperty(this.useOptionDisabledProperty);
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
            this.queuedOnChange.forEach((fn) => this.registerOnChange(fn));
            this.queuedOnChange = [];
        }
        if (this.queuedOnTouched.length > 0) {
            this.queuedOnTouched.forEach((fn) => this.registerOnTouched(fn));
            this.queuedOnTouched = [];
        }
        this.select.openedChange.subscribe((opened) => {
            if (opened) {
                this.select.panel?.nativeElement?.addEventListener('scroll', ($event: ScrollEvent) => this.updateScrollOffset($event, this.select.panel?.nativeElement));
                this.select.panel?.nativeElement?.addEventListener('mouseup', ($event: MouseUpEvent) => this.fixPowerScroll($event, this.select.panel?.nativeElement)); // see explanation in handleMouseUp
            }
        });
    }

    updateScrollOffset($event: ScrollEvent, panelNativeElement: any) {
        const scrollBottom = $event.target.scrollTop + $event.target.offsetHeight;
        const lowerScrollPercentage = (scrollBottom / $event.target.scrollHeight) * 100; // percentage scrolled bottom of the scrollbar
        const upperScrollPercentage = ($event.target.scrollTop / $event.target.scrollHeight) * 100; // percentage scrolled top of the scrollbar
        if (lowerScrollPercentage > this.lastScrollPercentage) { // scrolling down
            if (100 - lowerScrollPercentage < this.scrollPercentage) {
                if (this.scrollLowerOffset + (this.scrollWindowSize / this.scrollWindowMoveDivisor) < this.maxElements - this.scrollWindowSize) {
                    this.scrollLowerOffset = this.scrollLowerOffset + (this.scrollWindowSize / this.scrollWindowMoveDivisor);
                    this.fixPowerScroll($event, panelNativeElement);
                } else {
                    this.scrollLowerOffset = this.maxElements - this.scrollWindowSize;
                }
                this.updateOptionsGroups(this.searchControl.value, false);

            }
        } else { // scrolling up
            if (upperScrollPercentage < this.scrollPercentage) {
                if (this.scrollLowerOffset - (this.scrollWindowSize / this.scrollWindowMoveDivisor) > 0) {
                    this.scrollLowerOffset = this.scrollLowerOffset - (this.scrollWindowSize / this.scrollWindowMoveDivisor);
                    this.fixPowerScroll($event, panelNativeElement);
                } else {
                    this.scrollLowerOffset = 0;
                }
                this.updateOptionsGroups(this.searchControl.value, false);
            }
        }
        this.lastScrollPercentage = lowerScrollPercentage;
    }

    fixPowerScroll($event: MouseUpEvent | ScrollEvent, panelNativeElement: any) {
        /*  If manually grabbing the scroll element and pulling it to the end of the scrollbar or scrolling really fast
            can prevent loading new elements.
            If a user scrolled to the top or bottom, but more elements may be loaded, forcing the scroll element
            a bit up or down allows for new scroll events to fire.
         */
        if ($event.target.scrollTop === 0 && this.scrollLowerOffset > 0) {
            panelNativeElement.scroll(0, $event.target.scrollTop + 84);
        }
        if ($event.target.scrollTop + $event.target.offsetHeight === $event.target.scrollHeight && this.scrollLowerOffset + this.scrollWindowSize < this.maxElements) {
            panelNativeElement.scroll(0, $event.target.scrollTop - 84);
        }
    }

    ngOnDestroy() {
        this.stateChanges.complete();
    }

    @Input() getOptionValue: (option: any) => any = (a) => a;
    @Input() getOptionClass: (option: any) => string = (_) => '';
    @Input() getOptionViewValue: (option: any) => string = (a) => {
        if (typeof a === 'string') {
            return a;
        }
        return 'undefined';
    };
    @Input() getOptionDisabled: (option: any) => boolean = (_) => false;

    onContainerClick(_: MouseEvent): void {
        this.open();
    }

    resetSearch() {
        this.searchControl.patchValue('');
        this.stateChanges.next();
    }

    getOptions(): Observable<any> {
        return new Observable<any>((obs) => {
            if (!this.options) {
                obs.next(this.options);
                obs.complete();
                return;
            }
            let filtered: any[] = [];
            if (Array.isArray(this.options) && this.options.find) {
                filtered = this.options.filter((option) => {
                    if (this.getOptionViewValue(option) === null) {
                        return false;
                    }
                    return this.getOptionViewValue(option).toLowerCase().indexOf(this.searchControl.value.toLowerCase()) !== -1;
                });

                const initialFilteredLength = filtered.length;
                filtered = filtered.slice(this.scrollLowerOffset, this.scrollLowerOffset + this.scrollWindowSize);
                // append selected options if not already included
                const selected: any[] = [];
                const addOptionByValue = (optionValue: any) => {
                    if (!Array.isArray(this.options)) {
                        console.error('Cant do that');
                        return;
                    }
                    const option = this.options.find((optionC) => this.compareWith(this.getOptionValue(optionC), optionValue));
                    if (option === undefined) {
                        // Option got removed
                        return;
                    }
                    if (filtered.indexOf(option) === -1) {
                        selected.push(option);
                    }
                };
                if (this.value !== undefined) {
                    if (Array.isArray(this.value)) {
                        this.value.forEach((sel) => addOptionByValue(sel));
                    } else {
                        addOptionByValue(this.value);
                    }
                }
                this.maxElements = initialFilteredLength + selected.length;
                filtered.push(...selected);
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
            if (this.withGroups) {
                this.updateOptionsGroups(this.searchControl.value || '', true);
            }
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
        if (!$event) {
            this.resetSearchIfNoResults();
        }
        this.openedChange.emit($event);
    }

    close() {
        this.resetSearchIfNoResults();
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

    updateOptionsGroups(search: string, force: boolean): void {
        if (!force && this.lastSearch === search && this.scrollLowerOffset === this.lastScrollLowerOffset) {
            return;
        }
        this.lastSearch = search;
        this.lastScrollLowerOffset = this.scrollLowerOffset;
        if (this.select === undefined) {
            setTimeout(() => this.updateOptionsGroups(search, force), 10);
            return;
        }
        if (Array.isArray(this.options)) {
            return;
        }
        const r = new Map();
        let selected = new Map();
        this.maxElements = 0;
        if (this.options?.forEach) {
            this.options.forEach((v, k) => {
                const filtered = v.filter((option) => {
                    if (Array.isArray(this.value)) {
                        if (this.value.find((sel) => this.compareWith(this.getOptionValue(option), sel)) !== undefined) {
                            selected = this.appendInsertFilterMap(selected, k, option).m;
                            return true;
                        }
                    } else if (this.compareWith(this.getOptionValue(option), this.value)) {
                        selected = this.appendInsertFilterMap(selected, k, option).m;
                        return true;
                    }
                    if (search.length === 0) {
                        return true;
                    }
                    return (
                        k.toLowerCase().indexOf(search.toLowerCase()) !== -1 ||
                        this.getOptionViewValue(option).toLowerCase().indexOf(search.toLowerCase()) !== -1
                    );
                });
                if (filtered.length > 0) {
                    r.set(k, filtered);
                    this.maxElements += filtered.length;
                }
            });
        }
        // Length cutting
        let r2 = new Map();
        let size = 0;
        let skipped = 0;
        for (const [k, v] of r) {
            if (size === this.scrollWindowSize) {
                continue;
            }
            let j = 0;
            const v2 = [];
            while (skipped < this.scrollLowerOffset && j < v.length) {
                skipped++;
                j++;
            }
            while (size < this.scrollWindowSize && j < v.length) {
                v2.push(v[j]);
                j++;
                size++;
            }
            if (v2.length > 0) {
                r2.set(k, v2);
            }
        }
        for (const [k, v] of selected) {
            r2 = this.appendInsertFilterMap(r2, k, v).m;
        }
        this.optionsGroups = r2;
        this.cd.detectChanges();
    }

    toArray(v: any): any[] {
        return Array.isArray(v) ? v : [];
    }

    trackGroupName(s: any) {
        return s;
    }

    stopPropagation($event: Event) {
        $event.stopPropagation();
    }

    private selectSingleElement() {
        if (!this.empty || !this.autoSelectSingleElement) {
            return;
        }
        let toWrite: any;
        if (!Array.isArray(this.options)) {
            this.updateOptionsGroups('', true);
            let singleValue: any;
            let moreFound = false;
            this.optionsGroups.forEach((v: any[]) => {
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
            toWrite = this.multiple ? [toWrite] : toWrite;
            this.value = toWrite;
            this.selectionChanged({source: this.select, value: toWrite});
            this.ngControl?.reset(this.value);
        }
    }

    originalOrder = (_: KeyValue<string, any>, __: KeyValue<string, any>): number => 0;

    private resetSearchIfNoResults() {
        if (this.options === undefined) {
            this.resetSearch();
            return;
        }
        if (this.withGroups && this.optionsGroups?.size === 0) {
            this.resetSearch();
            return;
        }
        if (!this.withGroups) {
            this.getOptions().subscribe((o) => {
                if (Array.isArray(o) && o.length === 0) {
                    this.resetSearch();
                }
            });
        }
    }

    /**
     * Inserts val in m with a key, if the element is not already present for that key. If val is an array, all missing elements will be inserted.
     *
     * @param m
     * @param key
     * @param val
     * @private
     * @return The number of inserted elements
     */
    private appendInsertFilterMap(m: Map<string, any[]>, key: string, val: any | any[]): { i: number; m: Map<string, any[]> } {
        const arr = Array.isArray(val) ? val : [val];
        if (m.has(key)) {
            let i = 0;
            arr.forEach(v => {
                const vals = m.get(key) || [];
                if (!m.get(key)?.some(vKnown => vKnown === v)) {
                    vals.push(v);
                    i++;
                }
                m.set(key, vals);
            });
            return {i, m};
        }
        m.set(key, arr);
        return {i: arr.length, m};
    }
}
