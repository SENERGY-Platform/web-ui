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
import { DeviceGroupCriteriaModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';
import { FloorplanControlInput, FloorplanControlModel, isOneClickControl, sendsOnChange } from '../floorplan.model';

export interface CapabilityCommandModel {
  criteria: DeviceGroupCriteriaModel;
  value?: any;
}

/**
 * Operates one controlling function of a device group. Which input is offered follows from the base
 * characteristic of the function's concept, see @link resolveControlInput.
 */
@Component({
  selector: 'senergy-capability-control',
  templateUrl: './capability-control.component.html',
  styleUrl: './capability-control.component.css'
})
export class CapabilityControlComponent implements OnInit {
  @Input() control: FloorplanControlModel = {} as FloorplanControlModel;
  /** renders the control without its label, for the tooltip and the table */
  @Input() compact = false;
  /** hides the label in full mode as well, when the surrounding table already shows it */
  @Input() showLabel = true;
  @Input() disabled = false;
  @Output() run = new EventEmitter<CapabilityCommandModel>();

  inputs = FloorplanControlInput;
  draft: any;
  /** the value the last command asked for, shown until the next refresh confirms it */
  private requested: any;
  private pending = false;

  ngOnInit(): void {
    this.draft = this.control.state;
  }

  /** compact places controls into a table row, where only a single click fits */
  get visible(): boolean {
    return !this.compact || isOneClickControl(this.control.input);
  }

  /** whether changing the input is enough, or the user has to confirm the value */
  get needsConfirmation(): boolean {
    return !sendsOnChange(this.control.input);
  }

  get checked(): boolean {
    return this.pending ? !!this.requested : !!this.control.state;
  }

  /** the toggle is rebuilt by the next refresh, until then it shows what it was switched to */
  get syncing(): boolean {
    return this.pending && this.requested !== this.control.state;
  }

  perform(): void {
    this.send();
  }

  /** switches between the two functions without input the toggle was merged from */
  toggle(on: boolean): void {
    this.requested = on;
    this.pending = true;
    const criteria = on ? this.control.criteria : this.control.offCriteria;
    if (criteria === undefined) {
      return;
    }
    this.run.emit({ criteria });
  }

  /** the input finished a change, which only sends right away when no confirmation is needed */
  commit(value: any): void {
    this.draft = value;
    if (this.needsConfirmation) {
      return;
    }
    this.send(value);
  }

  send(value?: any): void {
    this.requested = value;
    this.pending = value !== undefined;
    this.run.emit({ criteria: this.control.criteria, value });
  }
}
