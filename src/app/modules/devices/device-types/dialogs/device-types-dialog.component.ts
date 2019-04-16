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
import {AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
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
import {DeviceTypeResponseModel} from '../shared/device-type-response.model';

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

const buttonChangeTime = 500;

@Component({
    templateUrl: './device-types-dialog.component.html',
    styleUrls: ['./device-types-dialog.component.css'],
})
export class DeviceTypesDialogComponent implements OnInit {

    deviceType: DeviceTypeModel;
    deviceTypeClasses: DeviceTypeClassModel[] = [];
    deviceTypeVendors: DeviceTypeVendorModel[] = [];
    deviceTypeProtocols: DeviceTypeProtocolModel[] = [];
    deviceTypeValueTypes: ValueTypesModel[] = [];
    deviceTypeServiceTypes = serviceTypeData;
    deviceTypeFormats = formatData;

    firstFormGroup!: FormGroup;
    secondFormGroup: FormGroup = new FormGroup({services: this._formBuilder.array([])});
    deviceClassInputFormControl = new FormControl('');
    vendorInputFormControl = new FormControl('');
    hideAddDeviceClass = false;
    hideAddVendor = false;
    deviceClassInputFocus = false;
    vendorInputFocus = false;
    disableSave = false;
    editable = false;

    constructor(private dialogRef: MatDialogRef<DeviceTypesDialogComponent>,
                private _formBuilder: FormBuilder,
                private deviceTypeService: DeviceTypeService,
                private valueTypesService: ValueTypesService,
                @Inject(MAT_DIALOG_DATA) data: { deviceType: DeviceTypeModel, editable: boolean }) {
        this.deviceType = data.deviceType;
        this.editable = data.editable;
    }

    ngOnInit() {
        this.initFormControls();
        this.loadData();
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.cleanUpServices();

        const newDeviceType: DeviceTypeModel = {
            vendor: this.firstFormGroup.value.vendorCtrl,
            device_class: this.firstFormGroup.value.classCtrl,
            img: this.firstFormGroup.value.imgCtrl,
            description: this.firstFormGroup.value.descCtrl,
            name: this.firstFormGroup.value.nameCtrl,
            config_parameter: this.firstFormGroup.value.configParameterCtrl,
            generated: this.firstFormGroup.value.generatedCtrl,
            id: this.firstFormGroup.value.idCtrl,
            maintenance: this.firstFormGroup.value.maintenanceCtrl,
            services: this.secondFormGroup.value.services,
        };
        this.dialogRef.close(newDeviceType);
    }


    addService() {
        const formArray = <FormArray>this.secondFormGroup.controls['services'];
        formArray.push(this._formBuilder.group({
            id: [],
            name: [, Validators.required],
            description: [, Validators.required],
            url: [, Validators.required],
            service_type: [, Validators.required],
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

    hideDeviceClass(input: boolean): void {
        if (input) {
            this.deviceClassInputFormControl.setValue('');
        }
        this.hideAddDeviceClass = input;
    }

    hideVendor(input: boolean): void {
        if (input) {
            this.vendorInputFormControl.setValue('');
        }
        this.hideAddVendor = input;
    }

    addDeviceClass(): void {
        this.deviceTypeService.createDeviceClass(this.deviceClassInputFormControl.value).subscribe((resp: DeviceTypeResponseModel | null) => {
            if (resp) {
                const newTypeClass: DeviceTypeClassModel = {id: resp.created_id, name: this.deviceClassInputFormControl.value};
                this.firstFormGroup.patchValue({'classCtrl': newTypeClass});
                this.deviceTypeClasses.push(newTypeClass);
            }
            this.deviceClassInputFormControl.setValue('');
            this.hideDeviceClass(false);
        });
    }

    addVendor(): void {
        this.deviceTypeService.createVendor(this.vendorInputFormControl.value).subscribe((resp: DeviceTypeResponseModel | null) => {
            if (resp) {
                const newVendor: DeviceTypeVendorModel = {id: resp.created_id, name: this.vendorInputFormControl.value};
                this.firstFormGroup.patchValue({'vendorCtrl': newVendor});
                this.deviceTypeVendors.push(newVendor);
            }
            this.vendorInputFormControl.setValue('');
            this.hideVendor(false);
        });
    }

    focusDeviceClass(input: boolean): void {
        if (!input) {
            /** timeout needed that user can click add button */
            setTimeout(() => {
                this.deviceClassInputFocus = input;
            }, buttonChangeTime);
        } else {
            this.deviceClassInputFocus = input;
        }
    }

    focusVendor(input: boolean): void {
        if (!input) {
            /** timeout needed that user can click add button */
            setTimeout(() => {
                this.vendorInputFocus = input;
            }, buttonChangeTime);
        } else {
            this.vendorInputFocus = input;
        }
    }

    checkIfAssignmentExists(input: DeviceTypeAssignmentModel): boolean {
        if ((input.name === null || input.name === '') &&
            (input.format === null || input.format === undefined) &&
            (input.type === null || input.type === undefined)) {
            return false;
        } else {
            return true;
        }
    }

    private cleanUpServices() {
        this.secondFormGroup.value.services.forEach((service: DeviceTypeServiceModel) => {
            const deleteIndexInput: DeviceTypeAssignmentModel[] = [];
            const deleteIndexOutput: DeviceTypeAssignmentModel[] = [];
            service.input.forEach((item: DeviceTypeAssignmentModel) => {
                if (!this.checkIfAssignmentExists(item)) {
                    deleteIndexInput.push(item);
                }
            });
            service.output.forEach((item: DeviceTypeAssignmentModel) => {
                if (!this.checkIfAssignmentExists(item)) {
                    deleteIndexOutput.push(item);
                }
            });
            deleteIndexInput.forEach((item: DeviceTypeAssignmentModel) => {
                service.input.splice(service.input.indexOf(item), 1);
            });
            deleteIndexOutput.forEach((item: DeviceTypeAssignmentModel) => {
                service.output.splice(service.output.indexOf(item), 1);
            });
        });
    }


    private initFormControls() {
        this.firstFormGroup = this._formBuilder.group({
            idCtrl: [this.deviceType.id],
            configParameterCtrl: [this.deviceType.config_parameter || []],
            maintenanceCtrl: [this.deviceType.maintenance || []],
            nameCtrl: [this.deviceType.name, Validators.required],
            descCtrl: [this.deviceType.description, Validators.required],
            imgCtrl: [this.deviceType.img],
            classCtrl: [this.deviceType.device_class, Validators.required],
            vendorCtrl: [this.deviceType.vendor, Validators.required],
            generatedCtrl: [this.deviceType.generated || false],
        });
        this.disableSaveButton(this.firstFormGroup.status);

        this.secondFormGroup = this._formBuilder.group({
            services: this._formBuilder.array(this.deviceType.services ?
                this.deviceType.services.map((elem: DeviceTypeServiceModel) => this.createServiceGroup(elem)) :
                [])
        });

        if (!this.editable) {
            this.firstFormGroup.disable();
            this.secondFormGroup.disable();
        }

        if (this.deviceType.generated) {
            this.firstFormGroup.controls['classCtrl'].disable();
            this.firstFormGroup.controls['vendorCtrl'].disable();
            this.secondFormGroup.disable();
        }

        const formArray = <FormArray>this.secondFormGroup.controls['services'];
        formArray.controls.forEach((secondFormGroupService: AbstractControl) => {
            const formGroup = <FormGroup>secondFormGroupService;
            formGroup.controls['protocol'].valueChanges.subscribe((protocol: DeviceTypeProtocolModel) => {
                formGroup.setControl('input', this.createAssignments(protocol, undefined));
                formGroup.setControl('output', this.createAssignments(protocol, undefined));
            });
        });
        this.watchFormGroupStatusChanges();
    }

    private watchFormGroupStatusChanges() {
        this.firstFormGroup.statusChanges.subscribe((status: string) => {
            this.disableSaveButton(status);
        });
        this.secondFormGroup.statusChanges.subscribe((status: string) => {
            this.disableSaveButton(status);
        });
    }

    private disableSaveButton(status: string): void {
        if (status === 'VALID') {
            this.disableSave = false;
        } else {
            this.disableSave = true;
        }
    }

    private createServiceGroup(deviceTypeService: DeviceTypeServiceModel): FormGroup {
        return this._formBuilder.group({
            id: [deviceTypeService.id],
            name: [deviceTypeService.name, Validators.required],
            description: [deviceTypeService.description, Validators.required],
            url: [deviceTypeService.url, Validators.required],
            service_type: [deviceTypeService.service_type, Validators.required],
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
