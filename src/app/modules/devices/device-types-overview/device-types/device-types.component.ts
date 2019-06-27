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
    DeviceTypeClassModel,
    DeviceTypeModel,
    DeviceTypeProtocolModel,
    DeviceTypeServiceModel,
    DeviceTypeSensorActuatorModel, DeviceTypeSensorModel,
    SystemType, DeviceTypeContentModel, DeviceTypeProtocolSegmentModel, DeviceTypeFunctionTypeEnum
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
    keys = Object.keys;
    deviceTypeFunctionType = DeviceTypeFunctionTypeEnum;
    functionDummyList: string[] = ['airQualityMeasuring', 'motionDetection', 'temperatureMeasuring', 'electricConsumptionMeasuring'];

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
            id: this.firstFormGroup.value.idCtrl,
            name: this.firstFormGroup.value.nameCtrl,
            description: this.firstFormGroup.value.descCtrl,
            image: this.firstFormGroup.value.imageCtrl,
            services: this.secondFormGroup.value.services,
            device_class: this.firstFormGroup.value.classCtrl,
        };
        // this.dialogRef.close(newDeviceType);
    }


    addService() {
        const formArray = <FormArray>this.secondFormGroup.controls['services'];
        formArray.push(this._formBuilder.group({
            id: [{value: '', disabled: true}],
            local_id: [, Validators.required],
            name: [, Validators.required],
            description: [, Validators.required],
            protocol: ['', Validators.required],
            input: [],
            output: [],
            functionType: ['', Validators.required],
            functions: [{value: [], disabled: true}, Validators.required],
        }));
        const formGroup = <FormGroup>formArray.controls[formArray.length - 1];
        formGroup.controls['protocol'].valueChanges.subscribe((protocol: DeviceTypeProtocolModel) => {
            formGroup.setControl('input', this.createAssignments(protocol, undefined));
            formGroup.setControl('output', this.createAssignments(protocol, undefined));
        });
        formGroup.controls['functionType'].valueChanges.subscribe(() => {
            if (formGroup.controls['functionType'].invalid) {
                formGroup.controls['functions'].disable();
            } else {
                formGroup.controls['functions'].enable();
            }
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

    checkIfAssignmentExists(input: DeviceTypeContentModel): boolean {
        // if ((input.name === null || input.name === '') &&
        //     (input.format === null || input.format === undefined) &&
        //     (input.type === null || input.type === undefined))
        if (input.id === null)
        {
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
                    this.deviceTypeService.createSensor({label: response.label, property: response.property}
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
                if (response.type === SystemType.Actuator) {
                    this.deviceTypeService.createActuator({label: response.label, property: response.property}
                    ).subscribe((actuator: DeviceTypeResponseModel | null) => {
                        if (actuator === null) {
                            this.snackBar.open('Error while creating the Actuator!', undefined, {duration: 2000});
                        } else {
                            this.sensorActuatorGroup[1].array.push({uri: actuator.uri, label: response.label});
                            this.setSensorActuatorValue(serviceIndex, actuator.uri);
                            this.snackBar.open('Actuator created successfully.', undefined, {duration: 2000});
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
            const deleteIndexInput: DeviceTypeContentModel[] = [];
            const deleteIndexOutput: DeviceTypeContentModel[] = [];
            service.inputs.forEach((item: DeviceTypeContentModel) => {
                if (!this.checkIfAssignmentExists(item)) {
                    deleteIndexInput.push(item);
                }
            });
            service.outputs.forEach((item: DeviceTypeContentModel) => {
                if (!this.checkIfAssignmentExists(item)) {
                    deleteIndexOutput.push(item);
                }
            });
            deleteIndexInput.forEach((item: DeviceTypeContentModel) => {
                service.inputs.splice(service.inputs.indexOf(item), 1);
            });
            deleteIndexOutput.forEach((item: DeviceTypeContentModel) => {
                service.outputs.splice(service.outputs.indexOf(item), 1);
            });
        });
    }


    private initFormControls() {
        this.firstFormGroup = this._formBuilder.group({
            idCtrl: [{value: this.deviceType.id, disabled: true}],
            nameCtrl: [this.deviceType.name, Validators.required],
            descCtrl: [this.deviceType.description, Validators.required],
            imageCtrl: [this.deviceType.image],
            classCtrl: [this.deviceType.device_class, Validators.required],
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
            local_id: [deviceTypeService.local_id],
            name: [deviceTypeService.name, Validators.required],
            description: [deviceTypeService.description, Validators.required],
            aspects: [deviceTypeService.aspects],
            protocol: [deviceTypeService.protocol, Validators.required],
            inputs: this.createAssignments(deviceTypeService.protocol, deviceTypeService.inputs),
            outputs: this.createAssignments(deviceTypeService.protocol, deviceTypeService.outputs),
        });
    }

    private createAssignments(protocol: DeviceTypeProtocolModel, assignments: (DeviceTypeContentModel[] | undefined)): FormArray {

        const array: FormGroup[] = [];
        protocol.protocol_segment.forEach((mgSegmentElement: DeviceTypeProtocolSegmentModel) => {
            if (assignments !== undefined) {
                let itemMatch = false;
                assignments.forEach((assignment: DeviceTypeContentModel) => {
                    if (assignment.protocol_segment.id === mgSegmentElement.id) {
                        array.push(this.createAssignmentGroup(assignment));
                        itemMatch = true;
                    }
                });
                if (!itemMatch) {
                    array.push(this.createInitialAssignmentGroup(mgSegmentElement));
                }
            } else {
                array.push(this.createInitialAssignmentGroup(mgSegmentElement));
            }
        });

        return this._formBuilder.array(array);
    }

    private createAssignmentGroup(assignmentModel: DeviceTypeContentModel): FormGroup {
        return this._formBuilder.group({
            id: [assignmentModel.id],
            // msg_segment: [assignmentModel.msg_segment],
            // type: [assignmentModel.type],
            // format: [assignmentModel.format],
            // additional_formatinfo: [assignmentModel.additional_formatinfo],
            show: [true],
        });
    }

    private createInitialAssignmentGroup(msg_structure: DeviceTypeProtocolSegmentModel): FormGroup {
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
        this.deviceTypeService.getDeviceTypeProtocols(9999, 0).subscribe(
            (deviceTypeProtocols: DeviceTypeProtocolModel[]) => {
                this.deviceTypeProtocols = deviceTypeProtocols;
            }
        );
        this.deviceTypeService.getDeviceTypeSensors(9999, 0).subscribe(
            (sensors: DeviceTypeSensorModel[]) => {
                this.sensorActuatorGroup[0].array = sensors;
            }
        );
        this.deviceTypeService.getDeviceTypeActuators(9999, 0).subscribe(
            (sensors: DeviceTypeSensorModel[]) => {
                this.sensorActuatorGroup[1].array = sensors;
            }
        );

        this.valueTypesService.getValuetypes('', 9999, 0, 'name', 'asc').subscribe(
            (deviceTypeValueTypes: ValueTypesModel[]) => {
                this.deviceTypeValueTypes = deviceTypeValueTypes;
            });
    }

}
