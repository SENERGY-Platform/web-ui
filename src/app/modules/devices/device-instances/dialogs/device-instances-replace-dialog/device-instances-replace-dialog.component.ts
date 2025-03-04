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

import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { Attribute, DeviceFilterCriteriaModel, DeviceInstanceModel, DeviceSelectablesModel } from '../../shared/device-instances.model';
import { DeviceInstancesService } from '../../shared/device-instances.service';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { DatePipe } from '@angular/common';
import { catchError, concatMap, forkJoin, map, Observable, of, throwError } from 'rxjs';
import { DeviceGroupsService } from '../../../device-groups/shared/device-groups.service';
import { DeviceGroupModel } from '../../../device-groups/shared/device-groups.model';
import { DeviceTypeInteractionEnum, DeviceTypeModel } from 'src/app/modules/metadata/device-types-overview/shared/device-type.model';
import { DeviceTypeService } from 'src/app/modules/metadata/device-types-overview/shared/device-type.service';
import { PipelineRegistryService } from 'src/app/modules/data/pipeline-registry/shared/pipeline-registry.service';
import { DeviceGroupsPipelineHelperDialogComponent } from '../../../device-groups/edit/device-groups-pipeline-helper-dialog/device-groups-pipeline-helper-dialog.component';
import { SmartServiceInstanceService } from 'src/app/modules/smart-services/instances/shared/instances.service';
import { SmartServiceReleasesService } from 'src/app/modules/smart-services/releases/shared/release.service';
import { NetworksService } from '../../../networks/shared/networks.service';
import { DeploymentsFogFactory } from 'src/app/modules/processes/deployments/shared/deployments-fog.service';
import { DeploymentsService } from 'src/app/modules/processes/deployments/shared/deployments.service';
import { V2DeploymentsPreparedModel } from 'src/app/modules/processes/deployments/shared/deployments-prepared-v2.model';
import { PipelineModel } from 'src/app/modules/data/pipeline-registry/shared/pipeline.model';

@Component({
  selector: 'app-device-instances-replace-dialog',
  templateUrl: './device-instances-replace-dialog.component.html',
  styleUrls: ['./device-instances-replace-dialog.component.css']
})
export class DeviceInstancesReplaceDialogComponent implements OnInit {
  DeviceInstancesReplaceDialogComponent = DeviceInstancesReplaceDialogComponent;
  static modeClone = 1;
  static modeExisting = 2;

  groupAddAll = 1;
  groupAddGenerated = 2;
  groupAddNone = 3;

  form = this.fb.group({
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

  deviceTypes: DeviceTypeModel[] = [];
  filteredDeviceTypes: DeviceTypeModel[] = [];
  deviceInstancesByType = new Map<string, DeviceInstanceModel[]>();
  allDeviceGroups: DeviceGroupModel[] | undefined;

  constructor(
    private dialogRef: MatDialogRef<DeviceInstancesReplaceDialogComponent>,
    private fb: FormBuilder,
    private deviceInstancesService: DeviceInstancesService,
    private deviceGroupsService: DeviceGroupsService,
    private errorHandlerService: ErrorHandlerService,
    private datePipe: DatePipe,
    private deviceTypeService: DeviceTypeService,
    private pipelineRegistryService: PipelineRegistryService,
    private dialog: MatDialog,
    private smartServiceInstanceService: SmartServiceInstanceService,
    private smartServiceReleasesService: SmartServiceReleasesService,
    private networksService: NetworksService,
    private deploymentsFogFactory: DeploymentsFogFactory,
    private deploymentsService: DeploymentsService,

    @Inject(MAT_DIALOG_DATA) private data: {
      device: DeviceInstanceModel;
    },
  ) {
  }

  ngOnInit(): void {
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

    this.form.get('mode')?.valueChanges.subscribe(mode => {
      if (mode === DeviceInstancesReplaceDialogComponent.modeExisting) {
        if (this.form.get('groupAddition')?.value === this.groupAddNone) { // no groups are added --> all devices can be used
          this.filteredDeviceTypes = this.deviceTypes;
        } else {
          this.filterDeviceTypes();
        }
      }
    });
    this.form.get('groupAddition')?.valueChanges.subscribe(groupAddition => {
      if (this.form.get('mode')?.value === DeviceInstancesReplaceDialogComponent.modeExisting) {
        if (groupAddition === this.groupAddNone) { // no groups are added --> all devices can be used
          this.filteredDeviceTypes = this.deviceTypes;
        } else {
          this.filterDeviceTypes();
        }
      }
    });
    this.form.get('existing.deviceType')?.valueChanges.subscribe(deviceType => {
      if (deviceType !== null) {
        this.loadDeviceInstancesByType(deviceType).subscribe();
      }
    });
  }

  save() {
    let newDevice: Observable<DeviceInstanceModel>; // every 'mode' option needs to fill this
    switch (this.form.get('mode')?.value) {
      case DeviceInstancesReplaceDialogComponent.modeClone:
        const clone = JSON.parse(JSON.stringify(this.data.device)) as DeviceInstanceModel;
        clone.attributes = clone.attributes?.filter((value) => value.key !== 'shared/nickname');
        clone.name = this.form.get('clone.name')?.value || this.data.device.name;
        clone.id = ''; // set by API
        newDevice = this.deviceInstancesService.saveDeviceInstance(clone).pipe(concatMap(d => d === null ? throwError(() => 'device is null') : of(d)));
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
    // edit old device is the same for all 'mode' options
    this.data.device.local_id += '_' + this.datePipe.transform(new Date(), 'yy_MM_dd');
    const attrIndex = this.data.device.attributes?.findIndex(a => a.key === 'inactive') || -1;
    if (attrIndex != -1) {
      this.data.device.attributes![attrIndex].value = 'true'; // just checked
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
    let deviceGroups: DeviceGroupModel[] = [];
    this.getDeviceGroupsToUpdate().pipe(
      map(dgs => deviceGroups = dgs), // remember device groups
      concatMap(_ => this.deviceInstancesService.updateDeviceInstance(this.data.device)),
      concatMap(_ => newDevice), // materialize new device
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
    ).subscribe();
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
            pipelines.forEach(pipeline => pipeline.operators.forEach(operator => operator.inputSelections?.forEach(input => criteria.push({
              aspect_id: input.aspectId,
              function_id: input.functionId,
            }))))
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
          networks.forEach(network => obs2.push(this.deploymentsFogFactory.withHubId(network.id).getAllFogDeployments().pipe(map(deployments => deployments.map(d => d.deployment_model)))));
          return forkJoin(obs2);
        }), map(obs2 => obs2.flat())));
        return forkJoin(obs);
      }),
      map(arr => arr.flat()),
      map(deployments => deployments.forEach(deployment => deployment.elements.forEach(element => {
        if (element.message_event?.selection.selected_device_group_id !== undefined && element.message_event?.selection.selected_device_group_id !== null && deviceGroupIds.includes(element.message_event.selection.selected_device_group_id)) {
          criteria.push({
            interaction: DeviceTypeInteractionEnum.Event,
            function_id: element.message_event.selection.filter_criteria.function_id || undefined,
            aspect_id: element.message_event.selection.filter_criteria.aspect_id || undefined,
            device_class_id: element.message_event.selection.filter_criteria.device_class_id || undefined,
          });
        }
        if (element.conditional_event?.selection.selected_device_group_id !== undefined && element.conditional_event?.selection.selected_device_group_id !== null && deviceGroupIds.includes(element.conditional_event.selection.selected_device_group_id)) {
          criteria.push({
            interaction: DeviceTypeInteractionEnum.Event,
            function_id: element.conditional_event.selection.filter_criteria.function_id || undefined,
            aspect_id: element.conditional_event.selection.filter_criteria.aspect_id || undefined,
            device_class_id: element.conditional_event.selection.filter_criteria.device_class_id || undefined,
          });
        }
        if (element.task?.selection.selected_device_group_id !== undefined && element.task?.selection.selected_device_group_id !== null && deviceGroupIds.includes(element.task.selection.selected_device_group_id)) {
          criteria.push({
            interaction: '',
            function_id: element.task.selection.filter_criteria.function_id || undefined,
            aspect_id: element.task.selection.filter_criteria.aspect_id || undefined,
            device_class_id: element.task.selection.filter_criteria.device_class_id || undefined,
          });
        }
      }))),

      // get selectables with criteria list
      concatMap(_ => this.deviceInstancesService.getDeviceSelections(criteria, false)),
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
