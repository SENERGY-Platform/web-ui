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

import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormRecord } from '@angular/forms';
import { AddTagFn } from '@ng-matero/extensions/select';
import { forkJoin, map, Observable } from 'rxjs';
import { FilterDialogConfigModel, FilterDialogFieldModel, FilterDialogResultModel } from './shared/filter-dialog.model';

/**
 * Renders the content of a filter dialog based on a list of field descriptions. Is meant to be used as the only
 * content of a dialog component, which translates the emitted result into whatever the filtered list expects.
 */
@Component({
    selector: 'senergy-filter-dialog',
    templateUrl: './filter-dialog.component.html',
    styleUrls: ['./filter-dialog.component.css'],
})
export class FilterDialogComponent implements OnInit {
    @Input() config: FilterDialogConfigModel = { fields: [] };
    @Output() filterEvent = new EventEmitter<FilterDialogResultModel>();
    @Output() cancelEvent = new EventEmitter<void>();

    form = new FormRecord<FormControl<any>>({});
    sections: { title?: string; fields: FilterDialogFieldModel[] }[] = [];
    items: { [key: string]: any[] } = {};
    addTagFns: { [key: string]: boolean | AddTagFn } = {};
    ready = false;

    constructor(private cd: ChangeDetectorRef) {
    }

    ngOnInit(): void {
        this.config.fields.forEach(field => {
            this.form.addControl(field.key, new FormControl<any>(field.value !== undefined ? field.value : this.emptyValue(field)));
            this.items[field.key] = field.items || [];
            this.addTagFns[field.key] = field.allowNewValues ? this.addOptionFn(field) : false;
        });
        this.sections = this.groupBySection(this.config.fields);
        this.loadItems();
    }

    filter(): void {
        const values: { [key: string]: any } = {};
        const labels: { [key: string]: string[] } = {};
        this.config.fields.forEach(field => {
            values[field.key] = this.form.controls[field.key].value;
            if (field.type !== 'checkbox') {
                labels[field.key] = this.labelsOf(field, values[field.key]);
            }
        });
        this.filterEvent.emit({ values, labels });
    }

    close(): void {
        this.cancelEvent.emit();
    }

    resetAllFilters(): void {
        const emptyValues: { [key: string]: any } = {};
        this.config.fields.forEach(field => emptyValues[field.key] = this.emptyValue(field));
        this.form.reset(emptyValues);
    }

    hasActiveFilter(): boolean {
        return this.config.fields.some(field => !this.isEmpty(field, this.form.controls[field.key]?.value));
    }

    private loadItems(): void {
        const loaders: Observable<any>[] = [];
        this.config.fields.forEach(field => {
            if (field.items$ === undefined) {
                return;
            }
            loaders.push(field.items$.pipe(map(items => this.items[field.key] = items || [])));
        });
        if (loaders.length === 0) {
            this.finishLoading();
            return;
        }
        forkJoin(loaders).subscribe({
            next: () => this.finishLoading(),
            error: (err) => {
                console.log(err);
                this.finishLoading();
            }
        });
    }

    private finishLoading(): void {
        // preselected values may not be part of the loaded options, e.g. an attribute no device uses any more
        this.config.fields.filter(field => field.allowNewValues).forEach(field => {
            this.valuesOf(this.form.controls[field.key].value).forEach(value => this.addOption(field, value));
        });
        this.ready = true;
        this.cd.detectChanges();
    }

    private groupBySection(fields: FilterDialogFieldModel[]): { title?: string; fields: FilterDialogFieldModel[] }[] {
        const sections: { title?: string; fields: FilterDialogFieldModel[] }[] = [];
        fields.forEach(field => {
            const section = sections[sections.length - 1];
            if (section !== undefined && section.title === field.section) {
                section.fields.push(field);
            } else {
                sections.push({ title: field.section, fields: [field] });
            }
        });
        return sections;
    }

    private addOptionFn(field: FilterDialogFieldModel): AddTagFn {
        return (text: string) => {
            this.addOption(field, text);
            return text;
        };
    }

    private addOption(field: FilterDialogFieldModel, value: any): void {
        const options = this.items[field.key] || [];
        if (options.includes(value)) {
            return;
        }
        this.items[field.key] = [...options, value].sort((a, b) => String(a).toLowerCase().localeCompare(String(b).toLowerCase()));
    }

    private labelsOf(field: FilterDialogFieldModel, value: any): string[] {
        return this.valuesOf(value).map(v => this.labelOf(field, v));
    }

    private labelOf(field: FilterDialogFieldModel, value: any): string {
        if (field.bindValue === undefined) {
            return String(value);
        }
        const option = (this.items[field.key] || []).find(item => item[field.bindValue!] === value);
        if (option === undefined) {
            return String(value);
        }
        return String(field.bindLabel !== undefined ? option[field.bindLabel] : option);
    }

    private valuesOf(value: any): any[] {
        if (Array.isArray(value)) {
            return value;
        }
        return value === undefined || value === null ? [] : [value];
    }

    private isEmpty(field: FilterDialogFieldModel, value: any): boolean {
        const emptyValue = this.emptyValue(field);
        if (Array.isArray(value) || Array.isArray(emptyValue)) {
            return !value || value.length === 0;
        }
        return value === undefined || value === null || value === '' || value === emptyValue;
    }

    private emptyValue(field: FilterDialogFieldModel): any {
        if (field.emptyValue !== undefined) {
            return field.emptyValue;
        }
        switch (field.type) {
            case 'multiselect':
                return [];
            case 'checkbox':
                return false;
            default:
                return undefined;
        }
    }
}
