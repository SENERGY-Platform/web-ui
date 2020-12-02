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

import {Component, OnInit} from '@angular/core';
import {AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {DeviceGroupsService} from '../shared/device-groups.service';
import {ActivatedRoute, Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {forkJoin, Observable} from 'rxjs';
import {NestedTreeControl} from '@angular/cdk/tree';
import {MatTreeNestedDataSource} from '@angular/material/tree';
import {MatOption} from '@angular/material/core';
import {DeviceGroupModel} from '../shared/device-groups.model';

@Component({
    selector: 'senergy-device-groups-edit',
    templateUrl: './device-groups-edit.component.html',
    styleUrls: ['./device-groups-edit.component.css']
})
export class DeviceGroupsEditComponent implements OnInit {

    id = '';

    constructor(private _formBuilder: FormBuilder,
                private deviceGroupService: DeviceGroupsService,
                private snackBar: MatSnackBar,
                private route: ActivatedRoute,
                private router: Router) {
        this.getRouterParams();
    }

    ngOnInit() {
        this.initFormControls();
        this.loadData();
    }

    private getRouterParams(): void {
        this.id = this.route.snapshot.paramMap.get('id') || '';
    }


    close(): void {
    }

    save(): void {
        this.saveDeviceGroup(this.getDeviceGroupFromForm());
    }

    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id && a.name === b.name;
    }

    trackByFn(index: any) {
        return index;
    }

    private initFormControls() {
        this.initFormGroup({} as DeviceGroupModel);
    }

    private initFormGroup(deviceGroup: DeviceGroupModel) {
        console.log(deviceGroup);
        // TODO
        /*
        this.firstFormGroup = this._formBuilder.group({
            id: [{value: deviceGroup.id, disabled: true}],
            name: [deviceGroup.name, Validators.required],
            description: [deviceGroup.description],
            device_class_id: [deviceGroup.device_class_id, Validators.required],
        });
        */
    }


    private saveDeviceGroup(deviceGroup: DeviceGroupModel) {
        if (deviceGroup.id === '' || deviceGroup.id === undefined) {
            this.deviceGroupService.createDeviceGroup(deviceGroup).subscribe((deviceGroupSaved: DeviceGroupModel | null) => {
                this.showMessage(deviceGroupSaved);
                this.reload(deviceGroupSaved);
            });
        } else {
            this.deviceGroupService.updateDeviceGroup(deviceGroup).subscribe((deviceGroupSaved: DeviceGroupModel | null) => {
                this.showMessage(deviceGroupSaved);
                this.reload(deviceGroupSaved);
            });
        }
    }

    private reload(deviceGroup: DeviceGroupModel | null) {
        if (deviceGroup) {
            this.router.routeReuseStrategy.shouldReuseRoute = function () {
                return false;
            };
            this.router.onSameUrlNavigation = 'reload';
            this.router.navigate(['devices/devicegroups/edit/' + deviceGroup.id], {});
        }

    }

    private showMessage(deviceGroupSaved: DeviceGroupModel | null) {
        if (deviceGroupSaved) {
            this.snackBar.open('Device-Group saved successfully.', undefined, {duration: 2000});
        } else {
            this.snackBar.open('Error while saving the device group!', undefined, {duration: 2000});
        }
    }

    private loadData(): void {
        if (this.id !== '') {
            this.deviceGroupService.getDeviceGroup(this.id).subscribe((deviceGroup: DeviceGroupModel | null) => {
                if (deviceGroup !== null) {
                    this.initFormGroup(deviceGroup);
                }
            });
        }
    }


    private getDeviceGroupFromForm(): DeviceGroupModel {
        // TODO
        console.log('not implemented');
        throw new Error('not implemented');
    }
}
