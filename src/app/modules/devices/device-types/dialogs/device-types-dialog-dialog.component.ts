/*
 *
 *  Copyright 2019 InfAI (CC SES)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import {AbstractControl, FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {
    DeviceTypeAssignmentModel,
    DeviceTypeClassModel,
    DeviceTypeModel, DeviceTypeMsgStructureModel,
    DeviceTypeProtocolModel,
    DeviceTypeServiceModel,
    DeviceTypeVendorModel
} from '../shared/device-type.model';
import {DeviceTypeService} from '../shared/device-type.service';
import {ValueTypesService} from '../../value-types/shared/value-types.service';
import {ValueTypesModel} from '../../value-types/shared/value-types.model';

interface ServiceTypeDataStructure {
    url: string;
    shortText: string;
}

interface FormatStructure {
    id: string;
    name: string;
}

const serviceTypeData: ServiceTypeDataStructure[] = [
    {url: 'http://www.sepl.wifa.uni-leipzig.de/ontlogies/device-repo#Actuator', shortText: 'Actuator'},
    {url: 'http://www.sepl.wifa.uni-leipzig.de/ontlogies/device-repo#Sensor', shortText: 'Sensor'},
    {url: 'http://www.sepl.wifa.uni-leipzig.de/ontlogies/device-repo#Tag', shortText: 'Tag'},
];

const formatData: FormatStructure[] = [
    {id: 'http://www.sepl.wifa.uni-leipzig.de/ontlogies/device-repo#PlainText', name: 'Plain Text'},
    {id: 'http://www.sepl.wifa.uni-leipzig.de/ontlogies/device-repo#json', name: 'JSON'},
    {id: 'http://www.sepl.wifa.uni-leipzig.de/ontlogies/device-repo#xml', name: 'XML'},
];

@Component({
    templateUrl: './device-types-dialog.component.html',
    styleUrls: ['./device-types-dialog.component.css'],
})
export class DeviceTypesDialogDialogComponent implements OnInit {

    deviceType: DeviceTypeModel;
    deviceTypeClasses: DeviceTypeClassModel[] = [];
    deviceTypeVendors: DeviceTypeVendorModel[] = [];
    deviceTypeProtocols: DeviceTypeProtocolModel[] = [];
    deviceTypeValueTypes: ValueTypesModel[] = [];
    deviceTypeServiceTypes = serviceTypeData;
    deviceTypeFormats = formatData;

    firstFormGroup!: FormGroup;
    secondFormGroup!: FormGroup;
    previewText = 'asdsasa';

    constructor(private dialogRef: MatDialogRef<DeviceTypesDialogDialogComponent>,
                private _formBuilder: FormBuilder,
                private deviceTypeService: DeviceTypeService,
                private valueTypesService: ValueTypesService,
                @Inject(MAT_DIALOG_DATA) data: { deviceType: DeviceTypeModel }) {
        this.deviceType = data.deviceType;
    }

    ngOnInit() {
        this.initFormControls();
        this.loadData();
    }

    close(): void {
        this.dialogRef.close();
    }

    addService() {
        const formArray = <FormArray>this.secondFormGroup.controls['services'];
        formArray.push(this._formBuilder.group({
            id: [],
            name: [, Validators.required],
            description: [, Validators.required],
            url: [, Validators.required],
            serviceType: [, Validators.required],
            protocol: ['', Validators.required],
            input: [],
            output: [],
        }));
        const formGroup = <FormGroup>formArray.controls[formArray.length - 1];
        formGroup.controls['protocol'].valueChanges.subscribe((protocol: DeviceTypeProtocolModel) => {
            formGroup.setControl('input', this.createAssignments(protocol, undefined));
            formGroup.setControl('output', this.createAssignments(protocol, undefined));
        });
    }

    deleteService(deviceTypeService: DeviceTypeServiceModel) {
        const control = <FormArray>this.secondFormGroup.controls['services'];
        control.removeAt(this.secondFormGroup.value.services.indexOf(deviceTypeService));
    }

    compareId(a: any, b: any): boolean {
        if (b === null) {
            return false;
        }
        return a.id === b.id;
    }

    expand(control: FormGroup): void {
        control.patchValue({'show': !control.value.show});
    }

    private initFormControls() {
        this.firstFormGroup = this._formBuilder.group({
            nameCtrl: [this.deviceType.name, Validators.required],
            descCtrl: [this.deviceType.description, Validators.required],
            imgCtrl: [this.deviceType.img, Validators.required],
            classCtrl: [this.deviceType.device_class, Validators.required],
            vendorCtrl: [this.deviceType.vendor, Validators.required],
        });
        this.secondFormGroup = this._formBuilder.group({
            services: this._formBuilder.array(this.deviceType.services.map((elem: DeviceTypeServiceModel) => this.createServiceGroup(elem)))
        });

        const formArray = <FormArray>this.secondFormGroup.controls['services'];
        formArray.controls.forEach((secondFormGroupService: AbstractControl) => {
            const formGroup = <FormGroup>secondFormGroupService;
            formGroup.controls['protocol'].valueChanges.subscribe((protocol: DeviceTypeProtocolModel) => {
                formGroup.setControl('input', this.createAssignments(protocol, undefined));
                formGroup.setControl('output', this.createAssignments(protocol, undefined));
            });
        });

    }

    createServiceGroup(deviceTypeService: DeviceTypeServiceModel): FormGroup {
        return this._formBuilder.group({
            id: [deviceTypeService.id],
            name: [deviceTypeService.name, Validators.required],
            description: [deviceTypeService.description, Validators.required],
            url: [deviceTypeService.url, Validators.required],
            serviceType: [deviceTypeService.service_type, Validators.required],
            protocol: [deviceTypeService.protocol, Validators.required],
            input: this.createAssignments(deviceTypeService.protocol, deviceTypeService.input),
            output: this.createAssignments(deviceTypeService.protocol, deviceTypeService.output),
        });
    }

    private createAssignments(protocol: DeviceTypeProtocolModel, assignments: (DeviceTypeAssignmentModel[] | undefined)): FormArray {

        const array: FormGroup[] = [];
        protocol.msg_structure.forEach((msg_structure_item: DeviceTypeMsgStructureModel) => {
            if (assignments !== undefined) {
                let itemMatch = false;
                assignments.forEach((assignment: DeviceTypeAssignmentModel) => {
                    if (assignment.msg_segment.id === msg_structure_item.id) {
                        array.push(this.createAssignmentGroup(assignment));
                        itemMatch = true;
                    }
                });
                if (!itemMatch) {
                    array.push(this.createInitialAssignmentGroup(msg_structure_item));
                }
            } else {
                array.push(this.createInitialAssignmentGroup(msg_structure_item));
            }
        });

        return this._formBuilder.array(array);
    }

    private createAssignmentGroup(assignmentModel: DeviceTypeAssignmentModel): FormGroup {
        return this._formBuilder.group({
            id: [assignmentModel.id],
            name: [assignmentModel.name],
            msg_segment: [assignmentModel.msg_segment],
            type: [assignmentModel.type],
            format: [assignmentModel.format],
            additional_formatinfo: [assignmentModel.additional_formatinfo],
            show: [true],
        });
    }

    private createInitialAssignmentGroup(msg_structure: DeviceTypeMsgStructureModel): FormGroup {
        return this._formBuilder.group({
            id: [],
            name: [],
            msg_segment: [msg_structure],
            type: [],
            format: [],
            additional_formatinfo: [],
            show: [false],
        });
        // }
    }

    private loadData(): void {
        this.deviceTypeService.getDeviceTypeClasses('', 9999, 0).subscribe(
            (deviceTypeClasses: DeviceTypeClassModel[]) => {
                this.deviceTypeClasses = deviceTypeClasses;
            });
        this.deviceTypeService.getDeviceTypeVendors('', 9999, 0).subscribe(
            (deviceTypeVendors: DeviceTypeVendorModel[]) => {
                this.deviceTypeVendors = deviceTypeVendors;
            });
        this.deviceTypeService.getDeviceTypeProtocols('', 9999, 0).subscribe(
            (deviceTypeProtocols: DeviceTypeProtocolModel[]) => {
                this.deviceTypeProtocols = deviceTypeProtocols;
            }
        );
        this.valueTypesService.getValuetypes('', 9999, 0, 'name', 'asc').subscribe(
            (deviceTypeValueTypes: ValueTypesModel[]) => {
                this.deviceTypeValueTypes = deviceTypeValueTypes;
            });
    }
}
