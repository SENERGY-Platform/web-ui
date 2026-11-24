/*
 * Copyright 2024 InfAI (CC SES)
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
import { FormBuilder, FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogConfig, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { Attribute, DeviceFilterCriteriaModel, DeviceInstanceModel, DeviceSelectablesModel } from '../../shared/device-instances.model';
import { DeviceInstancesService } from '../../shared/device-instances.service';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { DatePipe } from '@angular/common';
import { catchError, concatMap, EMPTY, finalize, forkJoin, map, Observable, of, tap, throwError } from 'rxjs';
import { DeviceGroupsService } from '../../../device-groups/shared/device-groups.service';
import { DeviceGroupModel } from '../../../device-groups/shared/device-groups.model';
import {
  criteriaAspectFields,
  criteriaAspectIds,
  DeviceTypeInteractionEnum,
  DeviceTypeModel,
} from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from 'src/app/modules/metadata/device-types-overview/shared/device-type.service';
import { PipelineRegistryService } from 'src/app/modules/data/pipeline-registry/shared/pipeline-registry.service';
import { DeviceGroupsPipelineHelperDialogComponent } from '../../../device-groups/edit/device-groups-pipeline-helper-dialog/device-groups-pipeline-helper-dialog.component';
import { SmartServiceInstanceService } from 'src/app/modules/smart-services/instances/shared/instances.service';
import { SmartServiceReleasesService } from 'src/app/modules/smart-services/releases/shared/release.service';
import { NetworksService } from '../../../networks/shared/networks.service';
import { DeploymentsService } from 'src/app/modules/processes/deployments/shared/deployments.service';
import {
  V2DeploymentsPreparedFilterCriteriaModel,
  V2DeploymentsPreparedModel,
} from 'src/app/modules/processes/deployments/shared/deployments-prepared-v2.model';
import { PipelineModel } from 'src/app/modules/data/pipeline-registry/shared/pipeline.model';
import { PipelineInputSelectionModel } from 'src/app/modules/data/flow-repo/deploy-flow/shared/pipeline-request.model';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CloseMtxSelectOnScrollDirective } from '../../../../../core/directives/close-mtx-select-on-scroll.directive';
import { MatRadioGroup, MatRadioButton } from '@angular/material/radio';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatErrorMessagesDirective } from '../../../../../core/directives/matError.directive';
import { MtxSelect, MtxOption } from '@ng-matero/extensions/select';
import { MatButton } from '@angular/material/button';
import { MatHint } from '@angular/material/form-field';
import { ThingsService } from '../../../things/shared/things.service';
import { OpenMeterLink, ThingDeviceLinkSwapModel, openMeterLinks, parseFactor, parseReadingValue } from '../../../things/shared/things.model';
import { MeterColumn, ReadingRow, meterColumnsOf, readingRowsError, rowsFor, toReadings, toUntilValues } from '../../../things/shared/meter-columns';
import { ThingReadingsEditorComponent } from '../../../things/shared/thing-readings-editor.component';
import { toLocalDateTimeInput, toRfc3339Seconds } from '../../../../environments/shared/environments-datetime';
import { ReplaceChoice, ReplacePath, decideReplacePath, markOldInactive, renameOldLocalId, replaceChoiceError } from './replace-decision';

/** The device-selection criteria of a pipeline input: its aspects as the union of both spellings, written in both. */
export function pipelineInputCriteria(input: PipelineInputSelectionModel): DeviceFilterCriteriaModel {
  return {
    ...criteriaAspectFields(criteriaAspectIds({ aspect_id: input.aspectId, aspect_ids: input.aspectIds ?? undefined })),
    function_id: input.functionId,
  };
}

/** The device-selection criteria of a process deployment element, with its aspects handled as in pipelineInputCriteria. */
export function deploymentElementCriteria(filterCriteria: V2DeploymentsPreparedFilterCriteriaModel, interaction: string): DeviceFilterCriteriaModel {
  return {
    interaction,
    function_id: filterCriteria.function_id || undefined,
    ...criteriaAspectFields(criteriaAspectIds({ aspect_id: filterCriteria.aspect_id, aspect_ids: filterCriteria.aspect_ids ?? undefined })),
    device_class_id: filterCriteria.device_class_id || undefined,
  };
}

@Component({
    selector: 'app-device-instances-replace-dialog',
    templateUrl: './device-instances-replace-dialog.component.html',
    styleUrls: ['./device-instances-replace-dialog.component.css'],
    providers: [DatePipe],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatDialogTitle, CdkScrollable, MatDialogContent, CloseMtxSelectOnScrollDirective, FormsModule, ReactiveFormsModule, MatRadioGroup, MatRadioButton, MatFormField, MatLabel, MatInput, MatError, MatErrorMessagesDirective, MtxSelect, MtxOption, MatDialogActions, MatButton, MatHint, ThingReadingsEditorComponent]
})
export class DeviceInstancesReplaceDialogComponent implements OnInit {
  private dialogRef = inject<MatDialogRef<DeviceInstancesReplaceDialogComponent>>(MatDialogRef);
  private fb = inject(FormBuilder);
  private deviceInstancesService = inject(DeviceInstancesService);
  private deviceGroupsService = inject(DeviceGroupsService);
  private errorHandlerService = inject(ErrorHandlerService);
  private datePipe = inject(DatePipe);
  private deviceTypeService = inject(DeviceTypeService);
  private pipelineRegistryService = inject(PipelineRegistryService);
  private dialog = inject(MatDialog);
  private smartServiceInstanceService = inject(SmartServiceInstanceService);
  private smartServiceReleasesService = inject(SmartServiceReleasesService);
  private networksService = inject(NetworksService);
  private deploymentsService = inject(DeploymentsService);
  private thingsService = inject(ThingsService);
  private destroyRef = inject(DestroyRef);
  private data = inject<{
      device: DeviceInstanceModel;
  }>(MAT_DIALOG_DATA);

  DeviceInstancesReplaceDialogComponent = DeviceInstancesReplaceDialogComponent;
  static modeClone = 1;
  static modeExisting = 2;

  groupAddAll = 1;
  groupAddGenerated = 2;
  groupAddNone = 3;

  form = this.fb.group({
    date: [toLocalDateTimeInput(new Date().toISOString()), Validators.required],
    mode: [DeviceInstancesReplaceDialogComponent.modeClone, Validators.required],
    groupAddition: [this.groupAddAll, Validators.required],
    clone: this.fb.group({ // default --> set validators
      name: [this.data.device.display_name || this.data.device.name],
    }),
    existing: this.fb.group({
      deviceType: [''],
      device: new FormControl<DeviceInstanceModel | null>(null),
    }),
  });

  /**
   * What the things say about the device: `done` with `path` legacy when it is on no meter thing. It starts as done so
   * that a dialog that did not ask (a test) behaves as before; ngOnInit asks.
   */
  lookup: 'pending' | 'done' | 'failed' = 'done';
  path: ReplacePath = { kind: 'legacy' };
  removalRows: ReadingRow[] = [];
  installationRows: ReadingRow[] = [];
  installationColumns: MeterColumn[] = [];
  /** The energy columns of the new device are known; otherwise service and column are entered by hand. */
  installationFixed = false;
  factor = '';
  submitted = false;
  saving = false;
  private oldUpdated = false;
  /** The old device as the dialog found it; a refused swap puts it back. */
  private before = JSON.parse(JSON.stringify({ local_id: this.data.device.local_id, attributes: this.data.device.attributes })) as Pick<DeviceInstanceModel, 'local_id' | 'attributes'>;
  private createdDevice: DeviceInstanceModel | undefined;
  private installationLoad = 0;

  deviceTypes: DeviceTypeModel[] = [];
  filteredDeviceTypes: DeviceTypeModel[] = [];
  deviceInstancesByType = new Map<string, DeviceInstanceModel[]>();
  allDeviceGroups: DeviceGroupModel[] | undefined;

  ngOnInit(): void {
    this.lookup = 'pending';
    this.thingsService.getThingsByDevices([this.data.device.id]).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(things => {
      if (things === undefined) {
        this.lookup = 'failed'; // not "on no thing": the date suffix would then double count a measuring point
        return;
      }
      this.path = decideReplacePath(openMeterLinks(things, this.data.device.id));
      this.removalRows = this.path.kind === 'swap' ? rowsFor(this.path.target.link.readings ?? []) : [];
      this.lookup = 'done';
      this.loadInstallationColumns();
    });
    this.form.get('existing.device')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadInstallationColumns());
    this.form.get('mode')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadInstallationColumns());
    const limit = 9999;
    let offset = 0;
    const f = () => {
      this.deviceTypeService.getDeviceTypes('', limit, offset, 'name', 'asc').subscribe(dt => {
        this.deviceTypes.push(...dt.result);
        offset += dt.result.length;
        if (this.deviceTypes.length < dt.total) {
          f();
        }
      });
    };
    f();

    this.form.get('mode')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(mode => {
      if (mode === DeviceInstancesReplaceDialogComponent.modeExisting) {
        if (this.form.get('groupAddition')?.value === this.groupAddNone) { // no groups are added --> all devices can be used
          this.filteredDeviceTypes = this.deviceTypes;
        } else {
          this.filterDeviceTypes();
        }
      }
    });
    this.form.get('groupAddition')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(groupAddition => {
      if (this.form.get('mode')?.value === DeviceInstancesReplaceDialogComponent.modeExisting) {
        if (groupAddition === this.groupAddNone) { // no groups are added --> all devices can be used
          this.filteredDeviceTypes = this.deviceTypes;
        } else {
          this.filterDeviceTypes();
        }
      }
    });
    this.form.get('existing.deviceType')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(deviceType => {
      if (deviceType !== null) {
        this.loadDeviceInstancesByType(deviceType).subscribe();
      }
    });
  }

  get swapTarget(): OpenMeterLink | undefined {
    return this.path.kind === 'swap' ? this.path.target : undefined;
  }

  private choice(): ReplaceChoice {
    const clone = this.form.get('mode')?.value === DeviceInstancesReplaceDialogComponent.modeClone;
    const existing = this.form.get('existing.device')?.value;
    return { path: this.path, clone, sameDevice: !clone && !!existing && existing.id === this.data.device.id };
  }

  /** Why the replacement cannot be saved as it stands, or null; shown once the user tried to save. */
  choiceError(): string | null {
    return replaceChoiceError(this.choice());
  }

  /** The swap's own fields: the date after the start of the link, the factor and every reading. */
  swapError(): string | null {
    const target = this.swapTarget;
    if (!target) {
      return null;
    }
    const date = this.form.get('date')?.value;
    if (!date || isNaN(new Date(date).getTime())) {
      return 'Enter the date of the replacement.';
    }
    if (new Date(date).getTime() <= new Date(target.link.from).getTime()) {
      return 'The date has to be after the start of the current link (' + new Date(target.link.from).toLocaleString() + ').';
    }
    if (parseFactor(this.factor) === null) {
      return 'The factor has to be a number greater than 0.';
    }
    return readingRowsError(this.removalRows, parseReadingValue) ?? readingRowsError(this.installationRows, parseReadingValue);
  }

  /** The energy columns of the new device: a clone has the type of the old one, an existing device its own. */
  private loadInstallationColumns() {
    const target = this.swapTarget;
    if (!target) {
      return;
    }
    const clone = this.form.get('mode')?.value === DeviceInstancesReplaceDialogComponent.modeClone;
    const typeId = clone ? this.data.device.device_type_id : this.form.get('existing.device')?.value?.device_type_id;
    const run = ++this.installationLoad;
    const show = (columns: MeterColumn[]) => {
      if (run !== this.installationLoad) {
        return; // a later choice is on its way
      }
      this.installationColumns = columns;
      this.installationFixed = columns.length > 0;
      this.installationRows = this.installationFixed ? rowsFor(columns) : rowsFor(target.link.readings ?? []);
      if (this.installationRows.length === 0) {
        this.installationRows = [{ service_id: '', column: '', from: '', until: '' }];
      }
    };
    if (!typeId) {
      show([]);
      return;
    }
    this.deviceTypeService.getDeviceType(typeId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(deviceType =>
      show(meterColumnsOf(deviceType, o => this.deviceTypeService.getValuePathsAndContentVariables(o.content_variable))));
  }

  saveDisabled(): boolean {
    return this.form.invalid || this.lookup !== 'done' || this.saving;
  }

  save() {
    if (this.lookup !== 'done' || this.saving) {
      return;
    }
    const choice = this.choice();
    const choiceError = replaceChoiceError(choice);
    if (choiceError !== null) {
      this.errorHandlerService.showErrorInSnackBar(choiceError);
      return;
    }
    this.submitted = true;
    if (this.swapError() !== null) {
      return;
    }
    const target = this.swapTarget;
    let newDevice: Observable<DeviceInstanceModel>; // every 'mode' option needs to fill this
    switch (this.form.get('mode')?.value) {
      case DeviceInstancesReplaceDialogComponent.modeClone:
        const clone = JSON.parse(JSON.stringify(this.data.device)) as DeviceInstanceModel;
        clone.attributes = clone.attributes?.filter((value) => value.key !== 'shared/nickname');
        clone.name = this.form.get('clone.name')?.value || this.data.device.name;
        clone.id = ''; // set by API
        newDevice = this.deviceInstancesService.saveDeviceInstance(clone).pipe(
          concatMap(d => d === null ? throwError(() => 'device is null') : of(d)),
          tap(d => this.createdDevice = d));
        break;
      case DeviceInstancesReplaceDialogComponent.modeExisting:
        const device = this.form.get('existing.device')?.value;
        if (device === undefined || device === null) {
          this.errorHandlerService.showErrorInSnackBar('Error Saving: Devcie null');
          return;
        }
        newDevice = of(device);
        break;
      default:
        this.errorHandlerService.showErrorInSnackBar('Error Saving: Unknown Mode');
        return;
    }
    // edit old device is the same for all 'mode' options, except where the old device stays in use
    if (renameOldLocalId(choice)) {
      // from the id as the dialog found it, so that a second attempt does not add the suffix twice
      const dateValue = this.form.get('date')?.value;
      this.data.device.local_id = this.before.local_id + '_' + this.datePipe.transform(dateValue ? new Date(dateValue) : new Date(), 'yy_MM_dd');
    }
    if (markOldInactive(choice)) {
      this.markInactive();
    }
    const oldDevice$: Observable<DeviceInstanceModel | null> = !markOldInactive(choice) || this.oldUpdated
      ? of(this.data.device)
      : this.deviceInstancesService.updateDeviceInstance(this.data.device).pipe(tap(updated => this.oldUpdated = updated !== null));
    this.saving = true;
    let deviceGroups: DeviceGroupModel[] = [];
    this.getDeviceGroupsToUpdate().pipe(
      map(dgs => deviceGroups = dgs), // remember device groups
      concatMap(_ => oldDevice$),
      concatMap(updated => {
        if (updated === null) { // nothing may be moved to the new device while the old one is not marked inactive
          this.errorHandlerService.showErrorInSnackBar('Error Saving: the replaced device could not be updated');
          return EMPTY;
        }
        return newDevice; // materialize new device
      }),
      concatMap(d => { // the measuring point follows the device, in one write at the date of the replacement
        if (target === undefined) {
          return of(d);
        }
        return this.thingsService.swapDeviceLink(target.thing.id, target.link.id, this.swapBody(d.id)).pipe(
          // the service has shown why; what this dialog wrote is taken back and the dialog stays open
          concatMap(thing => thing === null ? this.compensate().pipe(concatMap(() => EMPTY)) : of(d)));
      }),
      concatMap(d => { // put new device in relevant groups
        const obs: Observable<unknown>[] = [of(null)];
        const pipelinesToBeUpdated: PipelineModel[] = [];
        deviceGroups.forEach(deviceGroup => {
          if (deviceGroup.device_ids.findIndex(id => id === d.id) === -1) { // not yet in group
            deviceGroup.device_ids.push(d.id);
            obs.push(this.deviceGroupsService.updateDeviceGroup(deviceGroup).pipe(
              concatMap(_ => this.pipelineRegistryService.getPipelinesWithSelectable(deviceGroup.id)),
              concatMap(pipelines => {
                pipelinesToBeUpdated.push(...pipelines);           
                return of(null);
              })));
          }
        });
        return forkJoin(obs).pipe(map(_ => pipelinesToBeUpdated));
      }),
      concatMap(pipelinesToBeUpdated => {
        if (pipelinesToBeUpdated.length > 0) {
          const config: MatDialogConfig = {
            data: pipelinesToBeUpdated,
          };
          return this.dialog.open(DeviceGroupsPipelineHelperDialogComponent, config).afterClosed(); 
        }
        return of(null);
      }),
      map(_ => this.dialogRef.close(true)),
      catchError(this.errorHandlerService.handleErrorWithSnackBar('Error Saving', DeviceInstancesReplaceDialogComponent.name, 'save')),
      finalize(() => this.saving = false),
    ).subscribe();
  }

  /**
   * Takes back what this dialog wrote before a refused swap: first the clone it created (its local id is the old
   * device's original one), then the old device's local id and attributes. Each step is best effort; what could not
   * be taken back is named in the error shown.
   */
  private compensate(): Observable<void> {
    const clone = this.createdDevice;
    const cloneName = clone ? clone.display_name || clone.name || clone.id : '';
    const deleted$: Observable<boolean> = clone ? this.deviceInstancesService.deleteDeviceInstanceChecked(clone.id) : of(true);
    return deleted$.pipe(
      concatMap(deleted => {
        const left: string[] = [];
        if (clone && deleted) {
          this.createdDevice = undefined;
        } else if (clone) {
          left.push('the new device "' + cloneName + '" could not be removed');
        }
        if (!this.oldUpdated) {
          return of(left);
        }
        if (clone && !deleted) { // it holds the old local id, so the old device cannot get it back
          left.push('the replaced device keeps its new local id and is still marked inactive');
          return of(left);
        }
        this.data.device.local_id = this.before.local_id;
        this.data.device.attributes = JSON.parse(JSON.stringify(this.before.attributes ?? [])) as Attribute[];
        if (this.before.attributes === undefined) {
          this.data.device.attributes = undefined;
        }
        return this.deviceInstancesService.updateDeviceInstance(this.data.device).pipe(map(restored => {
          if (restored === null) {
            left.push('the replaced device could not be restored (local id and inactive flag)');
          } else {
            this.oldUpdated = false;
          }
          return left;
        }));
      }),
      catchError(() => of(['the replacement could not be taken back'])),
      map(left => {
        if (left.length > 0) {
          this.errorHandlerService.showErrorInSnackBar('Replacement not carried out. Left over: ' + left.join('; ') + '.');
        }
      }),
    );
  }

  private markInactive() {
    const inactiveAttr = this.data.device.attributes?.find(a => a.key === 'inactive');
    if (inactiveAttr !== undefined) {
      inactiveAttr.value = 'true';
      if (inactiveAttr.origin === this.deviceInstancesService.defaultOrigin) {
        inactiveAttr.origin = 'web-ui'; // account defaults are not saved with the device
      }
    } else {
      const attr: Attribute = {
        key: 'inactive',
        value: 'true',
        origin: 'web-ui',
      };
      if (this.data.device.attributes === undefined) {
        this.data.device.attributes = [attr];
      } else {
        this.data.device.attributes.push(attr);
      }
    }
  }

  private swapBody(deviceId: string): ThingDeviceLinkSwapModel {
    const body: ThingDeviceLinkSwapModel = { at: toRfc3339Seconds(this.form.get('date')?.value as string), device_id: deviceId };
    const untilValues = toUntilValues(this.removalRows, parseReadingValue);
    if (untilValues.length > 0) {
      body.until_values = untilValues;
    }
    const readings = toReadings(this.installationRows, parseReadingValue, false);
    if (readings.length > 0) {
      body.readings = readings;
    }
    const factor = parseFactor(this.factor);
    if (typeof factor === 'number') {
      body.factor = factor;
    }
    return body;
  }

  close() {
    this.dialogRef.close(false);
  }

  private getDeviceGroupsToUpdate(): Observable<DeviceGroupModel[]> {
    const deviceGroups: DeviceGroupModel[] = [];

    switch (this.form.get('groupAddition')?.value) {
      case this.groupAddNone:
        return of([]);
      case this.groupAddGenerated:
        return this.deviceGroupsService.getGeneratedDeviceGroupOfDevice(this.data.device.id).pipe(map(dg => {
          if (dg !== null) {
            deviceGroups.push(dg);
          }
        })).pipe(map(_ => deviceGroups));
      case this.groupAddAll:
        if (this.allDeviceGroups !== undefined) {
          return of(this.allDeviceGroups);
        }
        return new Observable<DeviceGroupModel[]>(o => {
          let offset = 0;
          const limit = 9999;
          const f = () => { // recursively collect device groups and return them as one list
            this.deviceGroupsService.getDeviceGroups('', limit, offset, '', '', false).subscribe(dg => {
              deviceGroups.push(...dg.result.filter(group => group.device_ids.includes(this.data.device.id)));
              offset += dg.result.length;
              if (dg.result.length < limit) {
                this.allDeviceGroups = deviceGroups;
                o.next(deviceGroups);
                o.complete();
              } else {
                f();
              }
            });
          };
          f(); // initialize recursion
        });
      default:
        return throwError(() => 'not implemented');
    }
  }

  getDeviceName = (device: DeviceInstanceModel) => device.display_name || device.name;

  private filterDeviceTypes() {
    const deviceGroups: DeviceGroupModel[] = [];
    const criteria: DeviceFilterCriteriaModel[] = []; // build criteria list
    let deviceGroupIds: string[];
    this.getDeviceGroupsToUpdate().pipe(
      map(dg => deviceGroups.push(...dg)),
      map(_ => deviceGroupIds = deviceGroups.map(dg => dg.id)), // prep for multiple steps)
      // criteria for analytics pipelines
      concatMap(_ => {
        const obs: Observable<unknown>[] = [of(null)];
        deviceGroups.forEach(dg => {
          obs.push(this.pipelineRegistryService.getPipelinesWithSelectable(dg.id).pipe(map(pipelines =>
            pipelines.forEach(pipeline => pipeline.operators.forEach(operator => operator.inputSelections?.forEach(input => criteria.push(pipelineInputCriteria(input)))))
          )));
        });
        return forkJoin(obs);
      }),
      // criteria for smart services
      concatMap(_ => this.smartServiceInstanceService.getAllInstances()),
      map(smartServiceInstances => {
        const smartServiceReleaseParameters = new Map<string, string[]>(); // release to paramaterId, need to fetch release and build criteria out of paramater
        smartServiceInstances.forEach(smartServiceInstance => smartServiceInstance.parameters.forEach(parameter => {
          try {
            const value = JSON.parse(parameter.value);
            if (Object.keys(value).includes('device_group_selection') && deviceGroupIds.includes(value.device_group_selection.id)) {
              const parameterIdList = smartServiceReleaseParameters.get(smartServiceInstance.release_id) || [];
              if (!parameterIdList.includes(parameter.id)) {
                parameterIdList.push(parameter.id);
                smartServiceReleaseParameters.set(smartServiceInstance.release_id, parameterIdList);
              }
            }
          } catch { } // no JSON or key not in object --> no criteria
        }));
        return smartServiceReleaseParameters;
      }),
      concatMap(smartServiceReleaseParameters => {
        const obs: Observable<unknown>[] = [of(null)];
        smartServiceReleaseParameters.forEach((parameterIds, releaseId) => {
          obs.push(this.smartServiceReleasesService.getExtendedRelease(releaseId).pipe(map(release => {
            parameterIds.forEach(parameterId => {
              const parameter = release?.parsed_info.parameter_descriptions.find(p => p.id === parameterId);
              if (parameter === undefined || parameter.iot_description === undefined) {
                return;
              }
              parameter.iot_description.criteria.forEach(p => criteria.push(p));
            });
          })));
        });
        return forkJoin(obs);
      }),
      // criteria in processes-deployments
      concatMap(_ => {
        const obs: Observable<V2DeploymentsPreparedModel[]>[] = [of([])];
        obs.push(this.deploymentsService.v3getAllDeployments()); // cloud processes-deployments
        obs.push(this.networksService.listSyncNetworks().pipe(concatMap(networks => { // fog processes-deployments
          const obs2: Observable<V2DeploymentsPreparedModel[]>[] = [of([])];
          networks.forEach(network => obs2.push(this.deploymentsService.getAllNetworkDeployments(network.id)));
          return forkJoin(obs2);
        }), map(obs2 => obs2.flat())));
        return forkJoin(obs);
      }),
      map(arr => arr.flat()),
      map(deployments => deployments.forEach(deployment => deployment.elements.forEach(element => {
        if (element.message_event?.selection.selected_device_group_id !== undefined && element.message_event?.selection.selected_device_group_id !== null && deviceGroupIds.includes(element.message_event.selection.selected_device_group_id)) {
          criteria.push(deploymentElementCriteria(element.message_event.selection.filter_criteria, DeviceTypeInteractionEnum.Event));
        }
        if (element.conditional_event?.selection.selected_device_group_id !== undefined && element.conditional_event?.selection.selected_device_group_id !== null && deviceGroupIds.includes(element.conditional_event.selection.selected_device_group_id)) {
          criteria.push(deploymentElementCriteria(element.conditional_event.selection.filter_criteria, DeviceTypeInteractionEnum.Event));
        }
        if (element.task?.selection.selected_device_group_id !== undefined && element.task?.selection.selected_device_group_id !== null && deviceGroupIds.includes(element.task.selection.selected_device_group_id)) {
          criteria.push(deploymentElementCriteria(element.task.selection.filter_criteria, ''));
        }
      }))),

      // get selectables with criteria list
      concatMap(_ => this.deviceInstancesService.getDeviceSelections(criteria)),
      map((selectables: DeviceSelectablesModel[]) => {
        const devicetypeIds = selectables.map(s => s.device.device_type_id);
        this.filteredDeviceTypes = this.deviceTypes.filter(dt => devicetypeIds.includes(dt.id));
      }),
    ).subscribe();
  }

  private loadDeviceInstancesByType(deviceTypeId: string): Observable<DeviceInstanceModel[]> {
    if (this.deviceInstancesByType.has(deviceTypeId)) {
      return of(this.deviceInstancesByType.get(deviceTypeId) || []);
    }
    return new Observable<DeviceInstanceModel[]>(o => {
      const deviceInstances: DeviceInstanceModel[] = [];
      const limit = 9999;
      let offset = 0;
      const f = () => {
        this.deviceInstancesService.getDeviceInstances({ limit, offset, deviceTypeIds: [deviceTypeId] }).subscribe(devices => {
          deviceInstances.push(...devices.result);
          offset += devices.result.length;
          if (deviceInstances.length < devices.total) {
            f();
          } else {
            this.deviceInstancesByType.set(deviceTypeId, deviceInstances);
            o.next(deviceInstances);
            o.complete();
          }
        });
      };
      f();
    });
  }
}
