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

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DeviceTypeCharacteristicsModel } from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import {
  characteristicStep,
  characteristicTypeList,
  characteristicTypeStructure,
  FloorplanControlInput,
  isNumericCharacteristic,
  resolveControlInput,
  roundTo,
} from '../floorplan.model';

/**
 * Collects a value in the shape of a characteristic. Structures and lists are rendered by nesting this
 * component into itself, so every leaf gets the input its own type asks for.
 */
@Component({
  selector: 'senergy-characteristic-input',
  templateUrl: './characteristic-input.component.html',
  styleUrl: './characteristic-input.component.css'
})
export class CharacteristicInputComponent implements OnInit {
  @Input() characteristic: DeviceTypeCharacteristicsModel | undefined;
  @Input() value: any;
  @Input() label = '';
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<any>();
  /** the user finished a change, e.g. released the slider or picked an option */
  @Output() commit = new EventEmitter<any>();

  input = FloorplanControlInput.Text;
  step = 1;
  inputs = FloorplanControlInput;

  ngOnInit(): void {
    this.input = resolveControlInput(this.characteristic);
    this.step = characteristicStep(this.characteristic);
    if (this.value === undefined || this.value === null) {
      this.value = this.defaultValue();
    }
  }

  get min(): number {
    return this.boundMin ?? 0;
  }

  get max(): number {
    return this.boundMax ?? 100;
  }

  /**
   * Both a number field and a slider count their steps from min, so a fractional bound like -273.15
   * would offset every reachable value by that fraction - stepping 17 down would land on 16.85. The
   * bounds are moved onto the step grid, inwards, so every reachable value stays allowed.
   */
  get boundMin(): number | null {
    const min = this.characteristic?.min_value;
    return min === undefined || min === null ? null : roundTo(Math.ceil(min / this.step) * this.step, 6);
  }

  get boundMax(): number | null {
    const max = this.characteristic?.max_value;
    return max === undefined || max === null ? null : roundTo(Math.floor(max / this.step) * this.step, 6);
  }

  get allowedValues(): any[] {
    return this.characteristic?.allowed_values || [];
  }

  get isStructure(): boolean {
    return this.characteristic?.type === characteristicTypeStructure;
  }

  get isList(): boolean {
    return this.characteristic?.type === characteristicTypeList;
  }

  get subCharacteristics(): DeviceTypeCharacteristicsModel[] {
    return this.characteristic?.sub_characteristics || [];
  }

  /** a list describes the type of its entries with a single sub characteristic */
  get entryCharacteristic(): DeviceTypeCharacteristicsModel | undefined {
    return this.subCharacteristics[0];
  }

  get entries(): any[] {
    return Array.isArray(this.value) ? this.value : [];
  }

  setValue(value: any): void {
    this.value = value;
    this.valueChange.emit(value);
  }

  /**
   * Sends the value on. Every commit is passed through, including one that repeats the value: a device
   * that did not carry out the last command has to be able to receive it again.
   */
  commitValue(value: any): void {
    this.setValue(value);
    this.commit.emit(value);
  }

  childValue(name: string): any {
    return (this.value || {})[name];
  }

  setChild(name: string, value: any): void {
    this.setValue({ ...(this.value || {}), [name]: value });
  }

  setEntry(index: number, value: any): void {
    const entries = [...this.entries];
    entries[index] = value;
    this.setValue(entries);
  }

  addEntry(): void {
    this.setValue([...this.entries, defaultCharacteristicValue(this.entryCharacteristic)]);
  }

  removeEntry(index: number): void {
    const entries = [...this.entries];
    entries.splice(index, 1);
    this.setValue(entries);
  }

  /** keeps the inputs of a list from being recreated on every keystroke */
  trackByIndex(index: number): number {
    return index;
  }

  private defaultValue(): any {
    if (this.isStructure || this.isList) {
      return defaultCharacteristicValue(this.characteristic);
    }
    if (isNumericCharacteristic(this.characteristic)) {
      return this.boundMin ?? 0;
    }
    if (this.input === FloorplanControlInput.Switch) {
      return false;
    }
    return this.allowedValues[0] ?? '';
  }
}

/** Builds an empty value in the shape of the characteristic, so nested inputs start out complete */
export function defaultCharacteristicValue(characteristic?: DeviceTypeCharacteristicsModel): any {
  if (characteristic === undefined) {
    return undefined;
  }
  if (characteristic.type === characteristicTypeList) {
    return [];
  }
  if (characteristic.type === characteristicTypeStructure) {
    const structure: any = {};
    (characteristic.sub_characteristics || []).forEach(sub => structure[sub.name] = defaultCharacteristicValue(sub));
    return structure;
  }
  if (isNumericCharacteristic(characteristic)) {
    return characteristic.min_value ?? 0;
  }
  if (resolveControlInput(characteristic) === FloorplanControlInput.Switch) {
    return false;
  }
  return (characteristic.allowed_values || [])[0] ?? '';
}
