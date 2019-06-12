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

import {Component, OnInit} from '@angular/core';
import {
    DeviceTypeAssignmentModel,
    DeviceTypeClassModel,
    DeviceTypeModel,
    DeviceTypeMsgStructureModel,
    DeviceTypeProtocolModel,
    DeviceTypeServiceModel,
    DeviceTypeSensorActuatorModel, DeviceTypeSensorModel,
    SystemType
} from '../shared/device-type.model';
import {ValueTypesModel} from '../../value-types/shared/value-types.model';
import {AbstractControl, FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {DeviceTypeResponseModel} from '../shared/device-type-response.model';
import {MatDialog, MatDialogConfig, MatSnackBar} from '@angular/material';
import {DeviceTypeService} from '../shared/device-type.service';
import {ValueTypesService} from '../../value-types/shared/value-types.service';
import {DeviceTypesNewDeviceClassDialogComponent} from './dialogs/device-types-new-device-class-dialog.component';
import {DeviceTypesNewSensorActuatorDialogComponent} from './dialogs/device-types-new-sensor-actuator-dialog.component';

interface FormatStructure {
    id: string;
    name: string;
}

const formatData: FormatStructure[] = [
    {id: 'http://www.sepl.wifa.uni-leipzig.de/ontlogies/device-repo#PlainText', name: 'Plain Text'},
    {id: 'http://www.sepl.wifa.uni-leipzig.de/ontlogies/device-repo#json', name: 'JSON'},
    {id: 'http://www.sepl.wifa.uni-leipzig.de/ontlogies/device-repo#xml', name: 'XML'},
];

const buttonChangeTime = 500;

@Component({
    selector: 'senergy-device-types',
    templateUrl: './device-types.component.html',
    styleUrls: ['./device-types.component.css']
})
export class DeviceTypesComponent implements OnInit {

    deviceType: DeviceTypeModel;
    deviceTypeClasses: DeviceTypeClassModel[] = [];
    deviceTypeProtocols: DeviceTypeProtocolModel[] = [];
    deviceTypeValueTypes: ValueTypesModel[] = [];
    deviceTypeFormats = formatData;
    sensorActuatorGroup: { name: string, array: DeviceTypeSensorModel[] }[] = [
        {
            name: 'Sensor', array: []
        },
        {
            name: 'Actuator', array: []
        }

    ];

    firstFormGroup!: FormGroup;
    secondFormGroup: FormGroup = new FormGroup({services: this._formBuilder.array([])});
    disableSave = false;
    editable = false;

    constructor(private _formBuilder: FormBuilder,
                private deviceTypeService: DeviceTypeService,
                private valueTypesService: ValueTypesService,
                private dialog: MatDialog,
                private snackBar: MatSnackBar) {
        this.deviceType = {} as DeviceTypeModel;
        this.editable = true;
    }

    ngOnInit() {
        this.initFormControls();
        this.loadData();
    }

    save(): void {
        this.cleanUpServices();

        const newDeviceType: DeviceTypeModel = {
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
        // this.dialogRef.close(newDeviceType);
    }


    addService() {
        const formArray = <FormArray>this.secondFormGroup.controls['services'];
        formArray.push(this._formBuilder.group({
            id: [],
            name: [, Validators.required],
            description: [, Validators.required],
            url: [, Validators.required],
            service_type: [, Validators.required],
            sensor_actuator: [, Validators.required],
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

    compareUri(a: any, b: any): boolean {
        if (b === null) {
            return false;
        }
        return a.uri === b.uri;
    }

    expand(control: FormGroup): void {
        control.patchValue({'show': !control.value.show});
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

    newDeviceClass() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(DeviceTypesNewDeviceClassDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((label: string) => {
            if (label !== undefined) {
                this.deviceTypeService.createDeviceClass(label).subscribe((resp: DeviceTypeResponseModel | null) => {
                    if (resp) {
                        const newTypeClass: DeviceTypeClassModel = {uri: resp.uri, label: label};
                        this.firstFormGroup.patchValue({'classCtrl': newTypeClass});
                        this.deviceTypeClasses.push(newTypeClass);
                    }
                });
            }
        });
    }

    newSensorActuator(serviceIndex: number) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(DeviceTypesNewSensorActuatorDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((response: DeviceTypeSensorActuatorModel) => {
            if (response !== undefined) {
                if (response.type === SystemType.Sensor) {
                    this.deviceTypeService.createSensor({
                            label: response.label,
                            feature_of_interest_uri: response.featureOfInterest.uri,
                            observable_property_uri: response.property.uri
                        }
                    ).subscribe((sensor: DeviceTypeResponseModel | null) => {
                        if (sensor === null) {
                            this.snackBar.open('Error while creating the Sensor!', undefined, {duration: 2000});
                        } else {
                            this.sensorActuatorGroup[0].array.push({uri: sensor.uri, label: response.label});
                            this.setSensorActuatorValue(serviceIndex, sensor.uri);
                            this.snackBar.open('Sensor created successfully.', undefined, {duration: 2000});
                        }
                    });
                }
            }
        });
    }


    private setSensorActuatorValue(serviceIndex: number, uri: string) {
        const formArray = <FormArray>this.secondFormGroup.controls['services'];
        const formGroup = <FormGroup>formArray.controls[serviceIndex];
        formGroup.controls['sensor_actuator'].setValue(uri);
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
        this.deviceTypeService.getDeviceClasses(9999, 0).subscribe(
            (deviceTypeClasses: DeviceTypeClassModel[]) => {
                this.deviceTypeClasses = deviceTypeClasses;
            });
        this.deviceTypeService.getDeviceTypeProtocols('', 9999, 0).subscribe(
            (deviceTypeProtocols: DeviceTypeProtocolModel[]) => {
                this.deviceTypeProtocols = deviceTypeProtocols;
            }
        );
        this.deviceTypeService.getDeviceTypeSensors(9999, 0).subscribe(
            (sensors: DeviceTypeSensorModel[]) => {
                this.sensorActuatorGroup[0].array = sensors;
            }
        );
        this.valueTypesService.getValuetypes('', 9999, 0, 'name', 'asc').subscribe(
            (deviceTypeValueTypes: ValueTypesModel[]) => {
                this.deviceTypeValueTypes = deviceTypeValueTypes;
            });
    }

}
