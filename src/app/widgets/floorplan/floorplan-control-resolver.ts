/*
 * Copyright 2025 InfAI (CC SES)
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

import { DeviceGroupCriteriaModel } from 'src/app/modules/devices/device-groups/shared/device-groups.model';
import { DeviceTypeAspectNodeModel, DeviceTypeCharacteristicsModel, DeviceTypeDeviceClassModel, DeviceTypeFunctionModel } from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import {
  aspectDistance,
  controlIcon,
  controlState,
  DeviceGroupCriteriaWithValueModel,
  DeviceGroupWithValueModel,
  findStateSource,
  FloorplanControlInput,
  FloorplanControlModel,
  FloorplanWidgetCapabilityModel,
  fpCriteriaConnectionStatus,
  impliedControllingCriteria,
  isControllingFunction,
  mergeVoidToggles,
  resolveControlInput,
  ServiceGroupFunctionModel,
  StateSourceContextModel,
  VoidTogglePair,
} from './shared/floorplan.model';

/** The widget state the resolver reads; the component owns and reassigns these, so they are read on every call. */
export interface FloorplanControlResolverHost {
  deviceGroups: DeviceGroupWithValueModel[];
  aspects: DeviceTypeAspectNodeModel[];
  functions: DeviceTypeFunctionModel[];
  deviceClasses: DeviceTypeDeviceClassModel[];
  functionIdToCharacteristic: Map<string, DeviceTypeCharacteristicsModel | undefined>;
  deviceGroupServiceGroups: Map<string, ServiceGroupFunctionModel[][]>;
  reportedAmbiguities: Set<string>;
  voidTogglePairs: VoidTogglePair[];
}

export class FloorplanControlResolver {
  constructor(private host: FloorplanControlResolverHost) {}

  compareCriteria(a: DeviceGroupCriteriaModel, b: DeviceGroupCriteriaModel): boolean {
    return this.compareCriteriaWithoutInteraction(a, b) &&
      a.interaction === b.interaction;
  }

  compareCriteriaWithoutInteraction(a: DeviceGroupCriteriaModel, b: DeviceGroupCriteriaModel): boolean {
    return a.function_id === b.function_id &&
      a.device_class_id === b.device_class_id &&
      a.aspect_id === b.aspect_id;
  }

  /** Names a function by its display name, falling back to its name before showing the raw id */
  describeFunction(functionId: string): string {
    const f = this.host.functions.find(f2 => f2.id === functionId);
    return f?.display_name || f?.name || functionId;
  }

  /** Names a criteria by its function, narrowed down by whichever of device class and aspect it carries */
  describeCriteria(criteria: DeviceGroupCriteriaModel | null): string {
    if (criteria == null) {
      return '';
    }
    return [
      this.describeFunction(criteria.function_id),
      criteria.device_class_id === '' ? '' : this.host.deviceClasses.find(dc => dc.id === criteria.device_class_id)?.name || '',
      criteria.aspect_id === '' ? '' : this.host.aspects.find(a => a.id === criteria.aspect_id)?.name || '',
    ].filter(part => part !== '').join(' ');
  }

  /** The measuring criteria a placement displays, in the order the tooltip lists them */
  displayedCriteria(placement: FloorplanWidgetCapabilityModel): DeviceGroupCriteriaWithValueModel[] {
    return [placement.criteria, ...(placement.tooltipCriteria || [])]
      .filter(c => !isControllingFunction(c.function_id))
      .filter((c, i, a) => a.findIndex(c2 => this.compareCriteriaWithoutInteraction(c, c2)) === i);
  }

  /** The controlling criteria selected for a placement on their own */
  selectedControllingCriteria(placement: FloorplanWidgetCapabilityModel, deviceGroup: DeviceGroupWithValueModel): DeviceGroupCriteriaModel[] {
    return (placement.tooltipCriteria || [])
      .filter(c => isControllingFunction(c.function_id))
      // a criteria the group lost, e.g. because a device left it, can no longer be executed
      .filter(c => (deviceGroup.criteria || []).some(c2 => this.compareCriteriaWithoutInteraction(c, c2)))
      .filter((c, i, a) => a.findIndex(c2 => this.compareCriteriaWithoutInteraction(c, c2)) === i);
  }

  /**
   * The controls of a placement. A displayed measurement that has a controlling counterpart is operated
   * through its own value, so it brings its control along; the remaining controls are the ones selected
   * on their own.
   */
  resolveControls(placement: FloorplanWidgetCapabilityModel): FloorplanControlModel[] {
    const deviceGroup = this.host.deviceGroups.find(dg => dg.id === placement.deviceGroupId);
    if (deviceGroup === undefined) {
      return [];
    }
    const controls: FloorplanControlModel[] = [];
    this.displayedCriteria(placement).forEach(measuring => {
      const control = this.controlVia(placement, deviceGroup, measuring);
      if (control !== undefined) {
        controls.push(control);
      }
    });
    const covered = (criteria: DeviceGroupCriteriaModel) => controls.some(c =>
      this.compareCriteriaWithoutInteraction(c.criteria, criteria) ||
      (c.offCriteria !== undefined && this.compareCriteriaWithoutInteraction(c.offCriteria, criteria)));
    const standalone = this.selectedControllingCriteria(placement, deviceGroup).filter(c => !covered(c));
    return [
      ...controls,
      ...mergeVoidToggles(standalone.map(c => this.newControl(placement, deviceGroup, c)), this.host.voidTogglePairs),
    ];
  }

  /** The control a displayed measurement gives access to, operated through the value shown for it */
  private controlVia(placement: FloorplanWidgetCapabilityModel, deviceGroup: DeviceGroupWithValueModel, measuring: DeviceGroupCriteriaWithValueModel): FloorplanControlModel | undefined {
    if (measuring.function_id === fpCriteriaConnectionStatus) {
      return {
        criteria: { function_id: fpCriteriaConnectionStatus, interaction: '', aspect_id: '', device_class_id: '' },
        label: 'Connection Status', icon: 'history', input: FloorplanControlInput.Action, via: measuring,
      };
    }
    const implied = impliedControllingCriteria(measuring, this.stateSourceContext(placement, deviceGroup), this.host.voidTogglePairs);
    if (implied.length === 0) {
      return undefined;
    }
    // the value shown for the measurement is the state of its control, so both always agree
    const value = measuring.value?.status_code === 200 ? measuring.value.message : undefined;
    const pair = this.host.voidTogglePairs.find(p => p.state === measuring.function_id);
    const on = pair === undefined ? undefined : implied.find(c => c.function_id === pair.on);
    const off = pair === undefined ? undefined : implied.find(c => c.function_id === pair.off);
    if (on !== undefined && off !== undefined) {
      return {
        criteria: on, offCriteria: off, label: this.describeCriteria(measuring),
        icon: controlIcon(FloorplanControlInput.Toggle), input: FloorplanControlInput.Toggle,
        via: measuring, state: controlState(value, FloorplanControlInput.Toggle),
      };
    }
    const criteria = implied[0];
    const characteristic = this.host.functionIdToCharacteristic.get(criteria.function_id);
    const input = resolveControlInput(characteristic);
    return {
      criteria,
      label: this.describeCriteria(criteria),
      icon: controlIcon(input),
      input,
      characteristic,
      via: measuring,
      state: controlState(value, input),
    };
  }

  private newControl(placement: FloorplanWidgetCapabilityModel, deviceGroup: DeviceGroupWithValueModel, criteria: DeviceGroupCriteriaModel): FloorplanControlModel {
    if (criteria.function_id === fpCriteriaConnectionStatus) {
      return { criteria, label: 'Connection Status', icon: 'history', input: FloorplanControlInput.Action };
    }
    const characteristic = this.host.functionIdToCharacteristic.get(criteria.function_id);
    const input = resolveControlInput(characteristic);
    const source = this.stateSourceOf(placement, deviceGroup, criteria) as DeviceGroupCriteriaWithValueModel | undefined;
    return {
      criteria,
      label: this.describeCriteria(criteria),
      icon: controlIcon(input),
      input,
      characteristic,
      state: source?.value?.status_code === 200 ? controlState(source.value.message, input) : undefined,
    };
  }

  /** The measuring criteria of the device group reporting what the control currently is set to */
  stateSourceOf(placement: FloorplanWidgetCapabilityModel, deviceGroup: DeviceGroupWithValueModel, criteria: DeviceGroupCriteriaModel): DeviceGroupCriteriaModel | undefined {
    const pair = this.host.voidTogglePairs.find(p => p.on === criteria.function_id || p.off === criteria.function_id);
    if (pair !== undefined) {
      // functions without input have no concept to pair them up, the semantic keys name their state
      return (deviceGroup.criteria || []).find(c => c.function_id === pair.state &&
        aspectDistance(c.aspect_id, criteria.aspect_id, this.host.aspects) !== undefined);
    }
    return findStateSource(criteria, this.stateSourceContext(placement, deviceGroup));
  }

  stateSourceContext(placement: FloorplanWidgetCapabilityModel, deviceGroup: DeviceGroupWithValueModel): StateSourceContextModel {
    return {
      criteria: deviceGroup.criteria || [],
      configured: [placement.criteria, ...(placement.tooltipCriteria || [])],
      aspects: this.host.aspects,
      conceptOf: (functionId: string) => this.host.functions.find(f => f.id === functionId)?.concept_id,
      serviceGroups: this.host.deviceGroupServiceGroups.get(deviceGroup.id) || [],
      serviceGroupsLoaded: this.host.deviceGroupServiceGroups.has(deviceGroup.id),
      describe: c => this.describeCriteria(c),
      reportedAmbiguities: this.host.reportedAmbiguities,
    };
  }
}
