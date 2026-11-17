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

import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { AbstractControl, FormBuilder, FormControl, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { forkJoin, Observable, Subscription } from 'rxjs';
import {
    compareAspectIds,
    DeviceTypeAspectModel,
    DeviceTypeAspectNodeModel,
    DeviceTypeCharacteristicsModel,
    DeviceTypeDeviceClassModel,
    DeviceTypeFunctionModel,
    DeviceTypeFunctionType,
    functionTypes,
} from '../../../../metadata/device-types-overview/shared/device-type.model';
import {
    DeviceTypeSelectionRefModel,
    DeviceTypeSelectionResultModel,
} from '../../../../metadata/device-types-overview/shared/device-type-selection.model';
import { DeviceTypeService } from '../../../../metadata/device-types-overview/shared/device-type.service';
import { ConceptsService } from '../../../../metadata/concepts/shared/concepts.service';
import { ConceptsCharacteristicsModel } from '../../../../metadata/concepts/shared/concepts-characteristics.model';
import { rangeValidator } from '../../../../../core/validators/range.validator';
import {
    AspectClassification,
    aspectTreeFromAspectNodes,
    classifyAspects,
    collidingAspectNames,
} from '../../../../../core/components/aspect-select/aspect-select.model';
import { selectedAspectNodes } from '../../bpmn-js/properties-provider/aspects';
import {
    additionalFunctionNameError,
    AdditionalFunctionModel,
    StoredAdditionalFunctionModel,
} from '../../shared/additional-functions';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatRadioGroup, MatRadioButton } from '@angular/material/radio';
import { MatFormField, MatLabel, MatHint, MatError } from '@angular/material/form-field';
import { MtxSelect, MtxSelectLabelTemplate, MtxSelectOptionTemplate } from '@ng-matero/extensions/select';
import { MatErrorMessagesDirective } from '../../../../../core/directives/matError.directive';
import { AspectSelectComponent } from '../../../../../core/components/aspect-select/aspect-select.component';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton } from '@angular/material/button';

/** One additional function of the form: its controls, and what its listings and characteristic are. */
interface AdditionalFunctionEditor {
    name: FormControl<string | null>;
    function: FormControl<DeviceTypeFunctionModel | '' | null>;
    aspects: FormControl<string[] | null>;
    functions: DeviceTypeFunctionModel[];
    /** The stored function while the listing leaves it out; marked as no longer offered, as the primary function is. */
    unlistedFunction: DeviceTypeFunctionModel | null;
    /** The function the dialog opened with, until the user changes its aspects or device class. */
    stored: DeviceTypeFunctionModel | null;
    characteristic: DeviceTypeCharacteristicsModel;
    loading: boolean;
    listing?: Subscription;
    concept?: Subscription;
    subscriptions: Subscription;
}

/** The functions every listing offers, in the order of the first listing. */
function commonFunctions(lists: DeviceTypeFunctionModel[][]): DeviceTypeFunctionModel[] {
    const [first, ...rest] = lists;
    return first.filter((f) => rest.every((list) => list.some((other) => other.id === f.id)));
}

/** The base characteristic of a concept; undefined, with a console error, when the concept does not hold it. */
function baseCharacteristicOf(concept: ConceptsCharacteristicsModel | null): DeviceTypeCharacteristicsModel | undefined {
    if (!concept) {
        console.error('unknown concept');
        return undefined;
    }
    if (!concept.base_characteristic_id) {
        console.error('missing concept base characteristic');
        return undefined;
    }
    const found = concept.characteristics.find((char) => char.id === concept.base_characteristic_id);
    if (!found) {
        console.error('base characteristic ' + concept.base_characteristic_id + ' is not characteristic of the concept');
    }
    return found;
}

@Component({
    templateUrl: './task-config-dialog.component.html',
    styleUrls: ['./task-config-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, MatRadioGroup, FormsModule, ReactiveFormsModule, MatRadioButton, MatFormField, MatLabel, MtxSelect, MtxSelectLabelTemplate, MtxSelectOptionTemplate, MatHint, MatError, MatErrorMessagesDirective, AspectSelectComponent, MatInput, MatCheckbox, MatTooltip, MatDialogActions, MatButton]
})
export class TaskConfigDialogComponent implements OnInit {
    private dialogRef = inject<MatDialogRef<TaskConfigDialogComponent>>(MatDialogRef);
    private dtService = inject(DeviceTypeService);
    private _formBuilder = inject(FormBuilder);
    private deviceTypeService = inject(DeviceTypeService);
    private conceptsService = inject(ConceptsService);
    private destroyRef = inject(DestroyRef);
    private data = inject<{
        selection: DeviceTypeSelectionRefModel | null;
    }>(MAT_DIALOG_DATA);

    optionsFormControl = new FormControl<string | null>('');
    deviceClassFormControl = new FormControl<DeviceTypeDeviceClassModel | '' | null>('');
    aspectFormControl = new FormControl<string[] | null>([]);
    functionFormControl = new FormControl<DeviceTypeFunctionModel | '' | null>({ value: '', disabled: true });
    completionStrategyFormControl = new FormControl<string | null>('');
    retriesFormControl = new FormControl<number | null>({ value: 0, disabled: true }, [rangeValidator(-1, 100)]);
    preferEventsFormControl = new FormControl<boolean | null>({ value: false, disabled: true });
    /** Empty leaves it to the engine; the engine rejects anything but a positive integer at deploy. */
    groupConcurrencyFormControl = new FormControl<number | string | null>({ value: null, disabled: true },
        [Validators.min(1), Validators.pattern(/^\d+$/)]);

    /** The additional functions of a controlling task, sent beside the function in the same message. */
    additionalFunctions: AdditionalFunctionEditor[] = [];

    deviceClasses: DeviceTypeDeviceClassModel[] = [];
    aspects: DeviceTypeAspectModel[] = [];
    functions: DeviceTypeFunctionModel[] = [];
    /**
     * The stored device class or function while the listing leaves it out. It is appended to the options, marked
     * as no longer offered, and dropped again once another one is picked; it is never offered for a new selection.
     */
    unlistedDeviceClass: DeviceTypeDeviceClassModel | null = null;
    unlistedFunction: DeviceTypeFunctionModel | null = null;
    characteristic: DeviceTypeCharacteristicsModel = {} as DeviceTypeCharacteristicsModel;
    limit = 20;

    result!: DeviceTypeSelectionResultModel;
    selection: DeviceTypeSelectionRefModel | null;
    functionTypes: DeviceTypeFunctionType[] = functionTypes;

    /** Aspect nodes by id: the nodes of the initial selection the listings may miss, and both listings. */
    private aspectNodes = new Map<string, DeviceTypeAspectNodeModel>();
    private selectionAspectIds: string[] = [];
    /** The aspect node ids each function type offers; the aspect select shows those of the selected type. */
    private listedAspectIds: { [functionType: string]: string[] } = { Measuring: [], Controlling: [] };
    private classified = new Map<string, AspectClassification>();
    private functionsSubscription?: Subscription;
    /**
     * The function a device class or aspect change cleared, with its loaded characteristic. The next listing that
     * answers selects it again if it offers it; a function the user picks meanwhile replaces it.
     */
    private kept: { func: DeviceTypeFunctionModel; characteristic: DeviceTypeCharacteristicsModel } | null = null;

    constructor() {
        this.selection = this.data.selection;
    }

    ngOnInit() {
        this.initSelection();
        this.initOptions();
        this.getDeviceClasses();
        this.getAspects();
        this.initFunctions();
        this.initCompletionStrategy();
        this.initAdditionalFunctions();
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        if (this.aspectClassCollision || this.additionalFunctionsInvalid) {
            return;
        }
        const aspects = this.selectedAspectIds()
            .map((id) => this.aspectNodes.get(id))
            .filter((node): node is DeviceTypeAspectNodeModel => node !== undefined)
            .sort((a, b) => compareAspectIds(a.id, b.id));
        this.result = {
            aspect: (aspects[0] || null) as DeviceTypeAspectModel,
            aspects,
            function: this.functionFormControl.value as DeviceTypeFunctionModel,
            device_class: (this.deviceClassFormControl.value || null) as DeviceTypeDeviceClassModel,
            characteristic: this.characteristic,
            completionStrategy: this.completionStrategyFormControl.value as string,
            retries: this.retriesFormControl.value as number,
            prefer_events: this.preferEventsFormControl.value as boolean,
            groupConcurrency: this.groupConcurrency(),
            additionalFunctions: this.additionalFunctionsOffered ? this.additionalFunctionResults() : [],
        };
        this.dialogRef.close(this.result);
    }

    /**
     * Additional functions are offered for a controlling function only: the engine takes them beside a controlling
     * primary function and rejects them with any other.
     */
    get additionalFunctionsOffered(): boolean {
        return this.optionsFormControl.value === 'Controlling' && !!this.functionFormControl.value;
    }

    /** Save stays disabled while an entry is incomplete: a name, a function with its characteristic, and no aspect clash. */
    get additionalFunctionsInvalid(): boolean {
        return this.additionalFunctionsOffered && this.additionalFunctions.some((entry) =>
            entry.name.invalid || entry.loading || !entry.function.value || !entry.characteristic.id || this.entryAspectCollision(entry));
    }

    addAdditionalFunction(): void {
        const entry = this.createAdditionalFunction('', [...this.selectedAspectIds()], null);
        this.additionalFunctions.push(entry);
        this.reloadAdditionalFunctions(entry);
    }

    removeAdditionalFunction(index: number): void {
        const [removed] = this.additionalFunctions.splice(index, 1);
        removed.subscriptions.unsubscribe();
        this.revalidateAdditionalNames();
    }

    entryAspectCollision(entry: AdditionalFunctionEditor): boolean {
        return collidingAspectNames(this.classified, entry.aspects.value || []).length > 0;
    }

    private additionalFunctionResults(): AdditionalFunctionModel[] {
        return this.additionalFunctions.map((entry) => ({
            name: (entry.name.value ?? '').trim(),
            function: entry.function.value as DeviceTypeFunctionModel,
            characteristic: entry.characteristic,
            aspects: (entry.aspects.value || [])
                .map((id) => this.aspectNodes.get(id))
                .filter((node): node is DeviceTypeAspectNodeModel => node !== undefined)
                .sort((a, b) => compareAspectIds(a.id, b.id)),
            characteristic_id: entry.characteristic.id ?? '',
        }));
    }

    /** Names are judged against the other entries; a changed name re-judges all of them. */
    private additionalNameValidator = (control: AbstractControl): ValidationErrors | null => {
        const others = this.additionalFunctions.filter((entry) => entry.name !== control).map((entry) => entry.name.value ?? '');
        const error = additionalFunctionNameError(control.value ?? '', others);
        return error ? { [error]: true } : null;
    };

    private revalidateAdditionalNames(): void {
        this.additionalFunctions.forEach((entry) => entry.name.updateValueAndValidity({ emitEvent: false }));
    }

    /** Stored entries open with their function, aspects and characteristic; the form loads their listings. */
    private initAdditionalFunctions(): void {
        const stored: StoredAdditionalFunctionModel[] = this.selection?.additionalFunctions ?? [];
        stored.forEach((entry) => entry.aspects.forEach((node) => this.aspectNodes.set(node.id, node)));
        this.additionalFunctions = stored.map((entry) =>
            this.createAdditionalFunction(entry.name, entry.aspects.map((node) => node.id), entry.function));
        this.additionalFunctions.forEach((entry) => this.reloadAdditionalFunctions(entry));
        this.setAspects();
    }

    private createAdditionalFunction(name: string, aspectIds: string[], stored: DeviceTypeFunctionModel | null): AdditionalFunctionEditor {
        const entry: AdditionalFunctionEditor = {
            name: new FormControl<string | null>(name, [this.additionalNameValidator]),
            function: new FormControl<DeviceTypeFunctionModel | '' | null>({ value: stored ?? '', disabled: true }),
            aspects: new FormControl<string[] | null>(aspectIds),
            functions: [],
            unlistedFunction: null,
            stored,
            characteristic: {} as DeviceTypeCharacteristicsModel,
            loading: false,
            subscriptions: new Subscription(),
        };
        entry.subscriptions.add(entry.name.valueChanges.subscribe(() => this.revalidateAdditionalNames()));
        entry.subscriptions.add(entry.aspects.valueChanges.subscribe(() => this.additionalFunctionChanged(entry)));
        entry.subscriptions.add(entry.function.valueChanges.subscribe((func) => this.getAdditionalCharacteristic(entry, func)));
        if (stored) {
            this.getAdditionalCharacteristic(entry, stored);
        }
        return entry;
    }

    /** A changed aspect or device class drops the stored function, which then keeps only if the new listing offers it. */
    private additionalFunctionChanged(entry: AdditionalFunctionEditor): void {
        entry.stored = null;
        this.reloadAdditionalFunctions(entry);
    }

    /**
     * Lists the controlling functions of the device class and the entry's aspects, as the primary function is listed.
     * The function stays selected while the listing loads, and Save waits for it.
     */
    private reloadAdditionalFunctions(entry: AdditionalFunctionEditor): void {
        entry.listing?.unsubscribe();
        const requests = this.controllingFunctionRequests(this.deviceClassFormControl.value || null, entry.aspects.value || []);
        if (requests.length === 0) {
            entry.functions = [];
            entry.unlistedFunction = null;
            entry.loading = false;
            entry.function.setValue('');
            entry.function.disable();
            return;
        }
        entry.function.enable({ emitEvent: false });
        entry.loading = true;
        entry.listing = forkJoin(requests).subscribe((functionLists: DeviceTypeFunctionModel[][]) => {
            entry.loading = false;
            entry.functions = commonFunctions(functionLists);
            entry.unlistedFunction = null;
            const current = entry.function.value || null;
            if (current && entry.functions.some((f) => f.id === current.id)) {
                entry.function.setValue(entry.functions.find((f) => f.id === current.id) as DeviceTypeFunctionModel, { emitEvent: false });
            } else if (current && current === entry.stored) {
                entry.unlistedFunction = current;
                entry.functions = [...entry.functions, current];
            } else {
                entry.function.setValue('');
            }
        });
        entry.subscriptions.add(entry.listing);
    }

    /** The characteristic of an additional function, from its concept as for the primary function. */
    private getAdditionalCharacteristic(entry: AdditionalFunctionEditor, func: DeviceTypeFunctionModel | '' | null): void {
        entry.concept?.unsubscribe();
        entry.characteristic = {} as DeviceTypeCharacteristicsModel;
        if (func && func.concept_id !== '') {
            entry.concept = this.conceptsService.getConceptWithCharacteristics(func.concept_id).subscribe((concept: ConceptsCharacteristicsModel | null) => {
                entry.characteristic = baseCharacteristicOf(concept) ?? entry.characteristic;
            });
            entry.subscriptions.add(entry.concept);
        }
    }

    /** The controlling listings a function must match: its device class, and each of the aspects. */
    private controllingFunctionRequests(deviceClass: DeviceTypeDeviceClassModel | null, aspectIds: string[]): Observable<DeviceTypeFunctionModel[]>[] {
        const requests: Observable<DeviceTypeFunctionModel[]>[] = [];
        if (deviceClass) {
            requests.push(this.deviceTypeService.getDeviceClassesControllingFunctions(deviceClass.id));
        }
        aspectIds.forEach((id) => requests.push(this.deviceTypeService.getAspectsControllingFunctions(id)));
        return requests;
    }

    /** Only a pessimistic task waits for answers; an optimistic one sends to every device at once. */
    private groupConcurrency(): number | null {
        const value = this.groupConcurrencyFormControl.value;
        if (this.groupConcurrencyFormControl.disabled || value === null || value === '') {
            return null;
        }
        return Number(value);
    }

    /**
     * Judged here, not read from the select's control: the select sits behind an ngIf, so its control
     * is not yet validated when the Save button is bound for the first time.
     */
    get aspectClassCollision(): boolean {
        return collidingAspectNames(this.classified, this.selectedAspectIds()).length > 0;
    }

    /** What the function was chosen for, as the marker of an unlisted function names it. */
    get unlistedFor(): string {
        if (this.optionsFormControl.value !== 'Controlling') {
            return 'aspect';
        }
        const hasDeviceClass = !!this.deviceClassFormControl.value;
        const hasAspects = this.selectedAspectIds().length > 0;
        if (hasDeviceClass && hasAspects) {
            return 'device class and aspect';
        }
        return hasAspects ? 'aspect' : 'device class';
    }

    /** By id only: functions and device classes get renamed while their ids stay, and stored selections carry the old name. */
    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id;
    }

    /**
     * Swaps a stored selection for the current object of the same id once the options are loaded, so a save
     * writes the current name. Silent: a device class change would otherwise reset the function.
     */
    private refreshSelected<T extends { id: string }>(control: FormControl<T | '' | null>, options: T[]): void {
        const selected = control.value || null;
        const current = selected?.id ? options.find((o) => o.id === selected.id) : undefined;
        if (current && current !== selected) {
            control.setValue(current, { emitEvent: false });
        }
    }

    /** The stored selection if the control still holds it although the options leave it out. */
    private unlistedOf<T extends { id: string }>(control: { readonly value: unknown }, stored: T | null | undefined, options: T[]): T | null {
        return stored && control.value === stored && !options.some((o) => o.id === stored.id) ? stored : null;
    }

    private offerStoredFunction(): void {
        this.unlistedFunction = this.unlistedOf(this.functionFormControl, this.selection?.function, this.functions);
        if (this.unlistedFunction) {
            this.functions = [...this.functions, this.unlistedFunction];
        }
    }

    private initOptions(): void {
        this.optionsFormControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((options) => {
            this.deviceClassFormControl.setValue('');
            this.aspectFormControl.setValue([]);
            this.functionFormControl.setValue('');
            this.functionFormControl.disable();
            if (options === 'Measuring') {
                this.completionStrategyFormControl.patchValue('pessimistic');
                this.completionStrategyFormControl.disable();
            }
            if (options === 'Controlling') {
                this.completionStrategyFormControl.patchValue('optimistic');
                this.completionStrategyFormControl.enable();
            }
            this.setAspects();
        });
    }

    private initCompletionStrategy(): void {
        this.completionStrategyFormControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((completionStrategy) => {
            if (completionStrategy === 'optimistic') {
                this.retriesFormControl.patchValue(0);
                this.retriesFormControl.disable();
                this.preferEventsFormControl.patchValue(false);
                this.preferEventsFormControl.disable();
                this.groupConcurrencyFormControl.patchValue(null);
                this.groupConcurrencyFormControl.disable();
            }
            if (completionStrategy === 'pessimistic') {
                this.retriesFormControl.enable();
                this.preferEventsFormControl.enable();
                this.groupConcurrencyFormControl.enable();
                this.retriesFormControl.patchValue(-1);
            }
        });
    }

    private getDeviceClasses(): void {
        this.deviceTypeService
            .getDeviceClassesWithControllingFunction()
            .subscribe((deviceTypeDeviceClasses: DeviceTypeDeviceClassModel[]) => {
                this.deviceClasses = deviceTypeDeviceClasses;
                this.refreshSelected(this.deviceClassFormControl, this.deviceClasses);
                this.unlistedDeviceClass = this.unlistedOf(this.deviceClassFormControl, this.selection?.device_class, this.deviceClasses);
                if (this.unlistedDeviceClass) {
                    this.deviceClasses = [...this.deviceClasses, this.unlistedDeviceClass];
                }
            });
    }

    /**
     * A controlling function is combined with aspects like a measuring one, so both get an aspect select. Each
     * offers the aspects used with its function type; the stored selection is offered under either.
     */
    private getAspects(): void {
        const listings: { [functionType: string]: Observable<DeviceTypeAspectNodeModel[]> } = {
            Measuring: this.deviceTypeService.getAspectNodesWithMeasuringFunctionOfDevicesOnly(),
            Controlling: this.deviceTypeService.getAspectNodesWithControllingFunction(),
        };
        Object.entries(listings).forEach(([functionType, listing]) => {
            listing.subscribe((nodes: DeviceTypeAspectNodeModel[]) => {
                nodes.forEach((node) => this.aspectNodes.set(node.id, node));
                this.listedAspectIds[functionType] = nodes.map((node) => node.id);
                this.setAspects();
            });
        });
    }

    private setAspects(): void {
        const offered = new Set([
            ...(this.listedAspectIds[this.optionsFormControl.value ?? ''] || []),
            ...this.selectionAspectIds,
            ...this.additionalFunctions.flatMap((entry) => entry.aspects.value || []),
        ]);
        const nodes = [...offered]
            .map((id) => this.aspectNodes.get(id))
            .filter((node): node is DeviceTypeAspectNodeModel => node !== undefined);
        this.aspects = aspectTreeFromAspectNodes(nodes);
        this.classified = classifyAspects(this.aspects);
    }

    private initFunctions(): void {
        this.functionFormControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((func) => {
            if (func) {
                this.kept = null;
            }
            this.getBaseCharacteristics(func);
            if (this.unlistedFunction && func !== this.unlistedFunction) {
                this.functions = this.functions.filter((f) => f !== this.unlistedFunction);
                this.unlistedFunction = null;
            }
        });
        this.deviceClassFormControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((deviceClass) => {
            if (this.unlistedDeviceClass && deviceClass !== this.unlistedDeviceClass) {
                this.deviceClasses = this.deviceClasses.filter((c) => c !== this.unlistedDeviceClass);
                this.unlistedDeviceClass = null;
            }
            this.reloadFunctions();
            this.additionalFunctions.forEach((entry) => this.additionalFunctionChanged(entry));
        });

        this.aspectFormControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.reloadFunctions());
    }

    /**
     * A changed device class or aspect selection keeps the selected function if the new selection offers it too.
     * The function is cleared while the new listing loads, so Save cannot write a function the selection may not offer.
     */
    private reloadFunctions(): void {
        if (this.functionFormControl.value) {
            this.kept = { func: this.functionFormControl.value, characteristic: this.characteristic };
        }
        this.resetFunctions();
        this.getFunctions();
    }

    /**
     * Everything selected in one criteria is an AND, so only a function offered for every selected aspect, and
     * for the device class of a controlling task, can match. A measuring task needs an aspect; a controlling task
     * needs a device class, an aspect, or both. A newer selection cancels the requests of the previous one, which
     * could otherwise answer last and overwrite its function list.
     */
    private getFunctions() {
        this.functionsSubscription?.unsubscribe();
        const aspectIds = this.selectedAspectIds();
        const requests: Observable<DeviceTypeFunctionModel[]>[] =
            this.optionsFormControl.value === 'Controlling'
                ? this.controllingFunctionRequests(this.deviceClassFormControl.value || null, aspectIds)
                : aspectIds.map((id) => this.deviceTypeService.getAspectsMeasuringFunctions(id));
        if (requests.length === 0) {
            this.functions = [];
            this.functionFormControl.disable();
            return;
        }
        this.functionsSubscription = forkJoin(requests).subscribe((functionLists: DeviceTypeFunctionModel[][]) => {
            this.functions = commonFunctions(functionLists);
            this.refreshSelected(this.functionFormControl, this.functions);
            this.offerStoredFunction();
            this.selectKept();
        });
    }

    /**
     * Silent, so the characteristic is not loaded anew: Save would otherwise be enabled while it is still empty. One
     * that was not loaded yet when the function was cleared arrives from the request still running for it.
     */
    private selectKept(): void {
        const kept = this.kept;
        this.kept = null;
        const listed = kept ? this.functions.find((f) => f.id === kept.func.id) : undefined;
        if (kept && listed) {
            this.functionFormControl.setValue(listed, { emitEvent: false });
            if (kept.characteristic.id) {
                this.characteristic = kept.characteristic;
            }
        }
    }

    private selectedAspectIds(): string[] {
        return this.aspectFormControl.value || [];
    }

    private resetFunctions() {
        this.functions = [];
        this.functionFormControl.setValue('');
        this.functionFormControl.enable();
    }

    private getBaseCharacteristics(func: DeviceTypeFunctionModel | '' | null): void {
        if (func && func.concept_id !== '') {
            this.conceptsService
                .getConceptWithCharacteristics(func.concept_id)
                .subscribe((concept: ConceptsCharacteristicsModel | null) => {
                    const characteristic = baseCharacteristicOf(concept);
                    if (characteristic) {
                        this.characteristic = characteristic;
                    }
                });
        } else {
            this.characteristic = {} as DeviceTypeCharacteristicsModel;
        }
    }

    private initSelection() {
        if (this.selection !== null) {
            this.deviceClassFormControl.setValue(this.selection.device_class);
            this.functionFormControl.setValue(this.selection.function);
            const selectedNodes = selectedAspectNodes(this.selection) as DeviceTypeAspectNodeModel[];
            selectedNodes.forEach((node) => this.aspectNodes.set(node.id, node));
            this.selectionAspectIds = selectedNodes.map((node) => node.id);
            this.aspectFormControl.setValue(this.selectionAspectIds);
            this.functionTypes.forEach((functionType: DeviceTypeFunctionType) => {
                if (this.selection !== null && functionType.rdf_type === this.selection.function.rdf_type) {
                    this.optionsFormControl.setValue(functionType.text);
                    if (functionType.text === 'Measuring') {
                        this.completionStrategyFormControl.disable();
                    }
                    this.getFunctions();
                }
            });
            this.setAspects();
            this.functionFormControl.enable();
            this.getBaseCharacteristics(this.selection.function);
            this.completionStrategyFormControl.setValue(this.selection.completionStrategy);
            this.retriesFormControl.setValue(this.selection.retries || 0);
            this.preferEventsFormControl.setValue(this.selection.prefer_events || false);
            this.groupConcurrencyFormControl.setValue(this.selection.groupConcurrency ?? null);
            if (this.selection.completionStrategy === 'optimistic') {
                this.retriesFormControl.disable();
                this.preferEventsFormControl.disable();
                this.groupConcurrencyFormControl.disable();
            }
            if (this.selection.completionStrategy === 'pessimistic') {
                this.retriesFormControl.enable();
                this.preferEventsFormControl.enable();
                this.groupConcurrencyFormControl.enable();
            }
        } else {
            this.optionsFormControl.setValue('Controlling');
            this.completionStrategyFormControl.setValue('optimistic');
        }
    }
}
