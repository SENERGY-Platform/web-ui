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

import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {DeviceTypeCharacteristicsModel} from '../../../device-types-overview/shared/device-type.model';
import {FormBuilder} from '@angular/forms';
import {NestedTreeControl} from '@angular/cdk/tree';
import {MatTreeNestedDataSource} from '@angular/material/tree';


@Component({
    selector: 'senergy-characteristic-element',
    templateUrl: './characteristic-element.component.html',
    styleUrls: ['./characteristic-element.component.css']
})
export class CharacteristicElementComponent implements OnInit {

    constructor(private fb: FormBuilder) {
    }

    @Input() data: DeviceTypeCharacteristicsModel | undefined;
    @Input() nested = false;
    @Output() valueChange = new EventEmitter<DeviceTypeCharacteristicsModel>();

    treeControl = new NestedTreeControl<DeviceTypeCharacteristicsModel>(node => node.sub_characteristics || []);
    dataSource = new MatTreeNestedDataSource<DeviceTypeCharacteristicsModel>();


    types: { type: string, typeShort: string }[] = [];
    form = this.fb.group({
        id: undefined,
        name: '',
        type: '',
        rdf_type: 'https://senergy.infai.org/ontology/Characteristic',
        min_value: undefined,
        max_value: undefined,
        value: undefined,
        sub_characteristics: [],
    });
    private static compareCharacteristics = (a: DeviceTypeCharacteristicsModel, b: DeviceTypeCharacteristicsModel): boolean => {
        if (a.type === b.type && a.max_value === b.max_value && a.min_value === b.min_value && a.name === b.name) {
            if (a.id === null || a.id === undefined) {
                if (!(b.id === null || b.id === undefined)) {
                    return false;
                }
            } else if (a.id !== b.id) {
                return false;
            }
            return true;
        }
        return false;
    }

    private static takeValues(source: DeviceTypeCharacteristicsModel, target: DeviceTypeCharacteristicsModel) {
        target.id = source.id;
        target.name = source.name;
        target.type = source.type;
        target.rdf_type = source.rdf_type;
        target.min_value = source.min_value;
        target.max_value = source.max_value;
        target.value = source.value;
        target.sub_characteristics = JSON.parse(JSON.stringify(source.sub_characteristics));
    }

    ngOnInit() {
        this.patch(this.data);
        this.initTypesList();
        this.form.valueChanges.subscribe(value => {
            switch (this.form.get('type')?.value) {
                case 'https://schema.org/Integer':
                    value.min_value = value.min_value ? parseInt(value.min_value, undefined) : undefined;
                    value.max_value = value.max_value ? parseInt(value.max_value, undefined) : undefined;
                    value.value = value.value ? parseInt(value.value, undefined) : undefined;
                    break;
                case 'https://schema.org/Float':
                    value.min_value = value.min_value ? parseFloat(value.min_value) : undefined;
                    value.max_value = value.max_value ? parseFloat(value.max_value) : undefined;
                    value.value = value.value ? parseFloat(value.value) : undefined;
                    break;
                case 'https://schema.org/Boolean':
                    value.value = value.value ? value.value === 'true' : undefined;
                    break;
            }
            this.valueChange.emit(value);
        });
        this.form.get('type')?.valueChanges.subscribe(_ => {
            if (this.isNumeric()) {
                this.form.get('sub_characteristics')?.setValue([]);
            }
            if (this.isStructureOrList()) {
                this.form.patchValue({
                    min_value: undefined,
                    max_value: undefined,
                    value: undefined,
                });
            }
        });
    }

    addSubCharacteristic() {
        const newModel = {
            name: '',
            type: '',
            rdf_type: 'https://senergy.infai.org/ontology/Characteristic',
            min_value: undefined,
            max_value: undefined,
            value: undefined,
            sub_characteristics: [],
            valid: false,
        } as DeviceTypeCharacteristicsModel;
        (this.form.get('sub_characteristics')?.value as DeviceTypeCharacteristicsModel[]).push(newModel);
        this.updateTree();
        this.treeControl.expand(newModel);
    }

    getSubCharacteristics(): DeviceTypeCharacteristicsModel[] {
        return this.form.get('sub_characteristics')?.value || [];
    }

    patch(characteristic: DeviceTypeCharacteristicsModel | undefined) {
        if (characteristic !== undefined) {
            this.form.patchValue(characteristic);
        }
        if (characteristic?.sub_characteristics !== null && characteristic?.sub_characteristics !== undefined) {
            this.form.get('sub_characteristics')?.setValue(characteristic.sub_characteristics);
        } else {
            this.form.get('sub_characteristics')?.setValue([]);
        }
        this.updateTree();
    }

    updateSubCharacteristic(value: DeviceTypeCharacteristicsModel, node: DeviceTypeCharacteristicsModel) {
        const subs = this.getSubCharacteristics();
        const index = subs.findIndex(o => CharacteristicElementComponent.compareCharacteristics(o, node));

        if (index !== -1) {
            subs[index] = value;
            this.setSubCharacteristics(subs);
            CharacteristicElementComponent.takeValues(value, node);
        } else {
            console.error('CharacteristicElementComponent: Could not update sub characteristic: not found', value, node, subs);
        }
    }

    isStructureOrList(): boolean {
        return this.form.get('type')?.value === 'https://schema.org/StructuredValue' || this.form.get('type')?.value === 'https://schema.org/ItemList';
    }

    isNumeric(): boolean {
        return this.form.get('type')?.value === 'https://schema.org/Integer' || this.form.get('type')?.value === 'https://schema.org/Float';
    }

    isValid(): boolean {
        return this.isCharacteristicValid(this.form.value);
    }

    getType(): string {
        if (this.isNumeric()) {
            return 'number';
        }
        return 'text';
    }

    showValue() {
        return this.form.get('type')?.value.length > 0 && !this.isStructureOrList();
    }

    deleteSubCharacteristic(node: DeviceTypeCharacteristicsModel) {
        const subs = this.getSubCharacteristics();
        const index = subs.indexOf(node);
        if (index !== -1) {
            subs.splice(index, 1);
            this.setSubCharacteristics(subs);
            this.updateTree();
        } else {
            console.error('CharacteristicElementComponent: Could not update sub characteristic: not found', node, subs);
        }
    }

    private isCharacteristicValid(c: DeviceTypeCharacteristicsModel): boolean {
        if (c.name.length === 0 || c.type.length === 0) {
            return false;
        }
        if (c.sub_characteristics !== undefined && c.sub_characteristics !== null) {
            for (let i = 0; i < c.sub_characteristics.length; i++) {
                if (!this.isCharacteristicValid(c.sub_characteristics[i])) {
                    return false;
                }
            }
        }
        return true;
    }

    private updateTree() {
        this.dataSource.data = this.getSubCharacteristics();
    }

    private initTypesList(): void {
        this.types.push({type: 'https://schema.org/Text', typeShort: 'string'});
        this.types.push({type: 'https://schema.org/Integer', typeShort: 'int'});
        this.types.push({type: 'https://schema.org/Float', typeShort: 'float'});
        this.types.push({type: 'https://schema.org/Boolean', typeShort: 'bool'});
        this.types.push({type: 'https://schema.org/StructuredValue', typeShort: 'Structure'});
        this.types.push({type: 'https://schema.org/ItemList', typeShort: 'List'});
    }

    private setSubCharacteristics(subs: DeviceTypeCharacteristicsModel[]) {
        this.form.get('sub_characteristics')?.setValue(subs);
    }
}
