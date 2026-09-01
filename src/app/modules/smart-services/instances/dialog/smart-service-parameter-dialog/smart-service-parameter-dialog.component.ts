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

import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, Subscription } from 'rxjs';
import { SmartServiceExtendedParameterModel, SmartServiceParameterOptionModel } from '../../../releases/shared/release.model';
import { SmartServiceParameterModel } from '../../shared/instances.model';
import {
    ParameterInput,
    initParameterValues,
    isFreeInputList,
    parameterInput,
    parameterSatisfied,
    parameterTypeFloat,
    parameterTypeInteger,
    parametersSatisfied,
    pruneInvalidValues,
    toSmartServiceParameters,
    visibleOptions,
} from '../../shared/parameters';

export interface SmartServiceParameterDialogData {
    title: string;
    submitLabel: string;
    /** the release the parameters belong to, shown as the heading of the form */
    releaseName: string;
    releaseDescription: string;
    /** whether the dialog also asks for the name and description of the instance */
    collectInfo: boolean;
    name: string;
    description: string;
    /**
     * The parameters, still on their way. Resolving the criteria of an iot parameter costs the
     * repository a round trip per criterion, so the dialog opens on the spot and fills itself in when
     * they arrive; null means they could not be loaded and whoever provided them has said so.
     */
    parameters: Observable<SmartServiceExtendedParameterModel[] | null>;
    /** shown above the form, for what the user should know before submitting */
    note?: string;
}

export interface SmartServiceParameterDialogResult {
    name: string;
    description: string;
    parameters: SmartServiceParameterModel[];
}

/**
 * Everything the template needs to draw one parameter, worked out once up front.
 *
 * A method call in a template runs on every change detection pass, and one that handed a select a
 * freshly built array made it rebuild its entire option list on every keystroke anywhere in the
 * dialog - which is felt as soon as a parameter resolves to a few hundred devices.
 */
export interface ParameterView {
    param: SmartServiceExtendedParameterModel;
    input: ParameterInput;
    /** the options that currently apply, as a reference that changes only when the set does */
    options: SmartServiceParameterOptionModel[];
    /** '' while the options do not say what group they are in, or the select shows an empty heading */
    groupBy: string;
    step: string;
    isList: boolean;
    isNumber: boolean;
    /** a long list is scrolled virtually, or opening the dropdown lays out thousands of rows */
    virtualScroll: boolean;
    /** whether another parameter's value decides which of its options apply */
    dependent: boolean;
}

/** From this many options on, the dropdown renders only the rows on screen */
const virtualScrollFrom = 50;

/**
 * Collects the parameters a smart service release asks for, when launching a new instance of it and
 * when editing or upgrading an existing one. Unlike the mobile app, which asks for the parameters and
 * then pops up a second dialog for the name, this collects both at once - there is room for it here.
 */
@Component({
    selector: 'senergy-smart-service-parameter-dialog',
    templateUrl: './smart-service-parameter-dialog.component.html',
    styleUrls: ['./smart-service-parameter-dialog.component.css'],
})
export class SmartServiceParameterDialogComponent implements OnInit, OnDestroy {
    name: string;
    description: string;
    parameters: SmartServiceExtendedParameterModel[] = [];
    views: ParameterView[] = [];
    /** false while the parameters are still being fetched */
    ready = false;
    inputs = ParameterInput;

    private sub = new Subscription();

    constructor(
        private dialogRef: MatDialogRef<SmartServiceParameterDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: SmartServiceParameterDialogData,
    ) {
        this.name = data.name;
        this.description = data.description;
    }

    ngOnInit(): void {
        this.sub.add(
            this.data.parameters.subscribe((parameters) => {
                if (parameters === null) {
                    // there is nothing to fill in and the failure has already been reported
                    this.dialogRef.close();
                    return;
                }
                // the caller merges the values of an instance in; this fills in whatever is still unset
                this.parameters = initParameterValues(parameters).parameters;
                // an instance can carry a value whose device has been deleted since; the user has to
                // re-pick rather than have a value the release cannot resolve submitted back unseen
                pruneInvalidValues(this.parameters);
                this.views = this.parameters.map((param) => this.viewOf(param));
                this.ready = true;
            }),
        );
    }

    ngOnDestroy(): void {
        this.sub.unsubscribe();
    }

    private viewOf(param: SmartServiceExtendedParameterModel): ParameterView {
        const options = param.options || [];
        return {
            param,
            input: parameterInput(param),
            options: visibleOptions(param, this.parameters),
            groupBy: options.some((option) => !!option.kind) ? 'kind' : '',
            step: param.type === parameterTypeInteger ? '1' : 'any',
            isList: isFreeInputList(param),
            isNumber: param.type === parameterTypeInteger || param.type === parameterTypeFloat,
            virtualScroll: options.length >= virtualScrollFrom,
            dependent: options.some((option) => !!option.needs_same_entity_id_in_parameter),
        };
    }

    entriesOf(param: SmartServiceExtendedParameterModel): any[] {
        return Array.isArray(param.value) ? param.value : [];
    }

    /** keeps the rows of a list from being recreated on every keystroke */
    trackByIndex(index: number): number {
        return index;
    }

    trackByParameter(_index: number, view: ParameterView): string {
        return view.param.id;
    }

    addEntry(param: SmartServiceExtendedParameterModel): void {
        param.value = [...this.entriesOf(param), null];
    }

    removeEntry(param: SmartServiceExtendedParameterModel, index: number): void {
        const entries = [...this.entriesOf(param)];
        entries.splice(index, 1);
        param.value = entries;
    }

    setEntry(param: SmartServiceExtendedParameterModel, index: number, value: any): void {
        const entries = [...this.entriesOf(param)];
        entries[index] = value;
        param.value = entries;
    }

    /**
     * A pick further up can invalidate what was picked below it, so every change is followed by a
     * sweep. Only a parameter whose options name another one can change its set, and its array is
     * replaced only when the set really differs: handing a select the same options in a new array
     * would make it rebuild the list for nothing.
     */
    valueChanged(): void {
        pruneInvalidValues(this.parameters);
        this.views.forEach((view) => {
            if (!view.dependent) {
                return;
            }
            const next = visibleOptions(view.param, this.parameters);
            if (!sameOptions(view.options, next)) {
                view.options = next;
            }
        });
    }

    /**
     * Why the value the parameter carries is refused, or '' while there is nothing to say. A parameter
     * the user has not filled in yet stays quiet - the submit button being shut says that much - but a
     * value that is there and still not accepted has to give a reason.
     */
    problemOf(view: ParameterView): string {
        const param = view.param;
        if (param.has_no_valid_option || parameterSatisfied(param)) {
            return '';
        }
        const value = param.value;
        const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
        if (empty) {
            return '';
        }
        if (param.type === parameterTypeInteger) {
            return 'Whole numbers only.';
        }
        if (param.multiple) {
            return 'Every entry needs a value.';
        }
        return 'Not a valid value.';
    }

    get valid(): boolean {
        // an empty parameter list satisfies itself, so submitting has to stay shut until they are in
        if (!this.ready) {
            return false;
        }
        if (this.data.collectInfo && this.name.trim().length === 0) {
            return false;
        }
        return parametersSatisfied(this.parameters);
    }

    cancel(): void {
        this.dialogRef.close();
    }

    submit(): void {
        if (!this.valid) {
            return;
        }
        const result: SmartServiceParameterDialogResult = {
            name: this.name.trim(),
            description: this.description,
            parameters: toSmartServiceParameters(this.parameters),
        };
        this.dialogRef.close(result);
    }
}

/** Every option comes out of the same array the release delivered, so comparing by reference is enough */
function sameOptions(a: SmartServiceParameterOptionModel[], b: SmartServiceParameterOptionModel[]): boolean {
    return a.length === b.length && a.every((option, i) => option === b[i]);
}
