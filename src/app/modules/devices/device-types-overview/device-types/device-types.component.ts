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
    DeviceTypeAspectModel,
    DeviceTypeContentModel,
    DeviceTypeDeviceClassModel,
    DeviceTypeFunctionModel,
    DeviceTypeFunctionTypeEnum,
    DeviceTypeModel,
    DeviceTypeProtocolModel,
    DeviceTypeProtocolSegmentModel,
    DeviceTypeServiceModel, DeviceTypeContentVariableModel,
} from '../shared/device-type.model';
import {ValueTypesModel} from '../../value-types/shared/value-types.model';
import {AbstractControl, FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MatDialog, MatDialogConfig, MatSnackBar} from '@angular/material';
import {DeviceTypeService} from '../shared/device-type.service';
import {ValueTypesService} from '../../value-types/shared/value-types.service';
import {DeviceTypesNewDeviceClassDialogComponent} from './dialogs/device-types-new-device-class-dialog.component';
import {DeviceTypesNewFunctionDialogComponent} from './dialogs/device-types-new-function-dialog.component';
import {jsonValidator} from '../../../../core/validators/json.validator';

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
    deviceTypeDeviceClasses: DeviceTypeDeviceClassModel[] = [];
    protocols: DeviceTypeProtocolModel[] = [];
    deviceTypeValueTypes: ValueTypesModel[] = [];
    deviceTypeFormats = formatData;

    firstFormGroup!: FormGroup;
    secondFormGroup: FormGroup = new FormGroup({services: this._formBuilder.array([])});
    disableSave = false;
    editable = false;
    keys = Object.keys;
    deviceTypeFunctionType = DeviceTypeFunctionTypeEnum;
    functions: DeviceTypeFunctionModel[] = [];
    measuringFunctions: DeviceTypeFunctionModel[] = [];
    controllingFunctions: DeviceTypeFunctionModel[] = [];
    aspects: DeviceTypeAspectModel[] = [];
    serializations: string[] = ['json', 'xml'];

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

    close(): void {
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
            local_id: ['', Validators.required],
            name: ['', Validators.required],
            description: [''],
            protocol: ['', Validators.required],
            input: [],
            output: [],
            functionType: ['', Validators.required],
            functions: [{value: [], disabled: true}, Validators.required],
            aspects: [[], Validators.required],
        }));
        const formGroup = <FormGroup>formArray.controls[formArray.length - 1];
        formGroup.controls['protocol'].valueChanges.subscribe((protocolId: string) => {
            formGroup.setControl('input', this.createContent(protocolId, undefined));
            formGroup.setControl('output', this.createContent(protocolId, undefined));
        });
        formGroup.controls['functionType'].valueChanges.subscribe(() => {
            if (formGroup.controls['functionType'].invalid) {
                formGroup.controls['functions'].disable();
            } else {
                formGroup.controls['functions'].enable();
            }

            formGroup.controls['functions'].setValue([]);
            if (formGroup.controls['functionType'].value === DeviceTypeFunctionTypeEnum.Measuring) {
                this.functions = this.measuringFunctions;
            }
            if (formGroup.controls['functionType'].value === DeviceTypeFunctionTypeEnum.Controlling) {
                this.functions = this.controllingFunctions;
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
        return a.id === b.id && a.name === b.name;
    }

    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id && a.name === b.name;
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
        if (input.id === null) {
            return false;
        } else {
            return true;
        }
    }

    newDeviceClass() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(DeviceTypesNewDeviceClassDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((name: string) => {
            if (name !== undefined) {
                const index = this.checkIfDeviceClassNameExists(name);
                if (index === -1) {
                    const newDeviceClass: DeviceTypeDeviceClassModel = {id: '', name: name};
                    this.firstFormGroup.patchValue({'device_class': newDeviceClass});
                    this.deviceTypeDeviceClasses.push(newDeviceClass);
                } else {
                    this.snackBar.open('Device Class already exists! Name auto selected!', undefined, {duration: 4000});
                    this.firstFormGroup.patchValue({'device_class': this.deviceTypeDeviceClasses[index]});
                }
            }
        });
    }

    openCreateFunctionDialog(serviceIndex: number) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(DeviceTypesNewFunctionDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((functionName: string) => {
            if (functionName !== undefined) {
                const formArray = <FormArray>this.secondFormGroup.controls['services'];
                const formGroup = <FormGroup>formArray.controls[serviceIndex];
                if (formGroup.controls['functionType'].value === DeviceTypeFunctionTypeEnum.Measuring) {
                    const measureFuncIndex = this.checkIfMeasuringFunctionNameExists(functionName);
                    if (measureFuncIndex === -1) {
                        const newFunction: DeviceTypeFunctionModel = {
                            id: '',
                            name: functionName,
                            type: DeviceTypeFunctionTypeEnum.Measuring,
                            concept_ids: [],
                        };
                        formGroup.controls['functions'].value.push(newFunction);
                        this.measuringFunctions.push(newFunction);
                    } else {
                        const functionsFormGroup = <FormGroup>formGroup.controls['functions'];
                        const measureFuncFormGroupIndex = functionsFormGroup.value.indexOf(this.measuringFunctions[measureFuncIndex]);
                        if (measureFuncFormGroupIndex === -1) {
                            this.snackBar.open('Measuring Function already exists! Function auto selected!', undefined, {duration: 4000});
                            const array = formGroup.controls['functions'].value;
                            formGroup.controls['functions'].setValue([...array, this.measuringFunctions[measureFuncIndex]]);
                        } else {
                            this.snackBar.open('Measuring Function already selected!', undefined, {duration: 4000});
                        }
                    }
                }
                if (formGroup.controls['functionType'].value === DeviceTypeFunctionTypeEnum.Controlling) {
                    const controllFuncIndex = this.checkIfControllingFunctionNameExists(functionName);
                    if (controllFuncIndex === -1) {
                        const newFunction: DeviceTypeFunctionModel = {
                            id: '',
                            name: functionName,
                            type: DeviceTypeFunctionTypeEnum.Controlling,
                            concept_ids: [],
                        };
                        formGroup.controls['functions'].value.push(newFunction);
                        this.controllingFunctions.push(newFunction);
                    } else {
                        const functionsFormGroup = <FormGroup>formGroup.controls['functions'];
                        const controllFuncFormGroupIndex = functionsFormGroup.value.indexOf(this.controllingFunctions[controllFuncIndex]);
                        if (controllFuncFormGroupIndex === -1) {
                            this.snackBar.open('Controlling Function already exists! Function auto selected!', undefined, {duration: 4000});
                            const array = formGroup.controls['functions'].value;
                            formGroup.controls['functions'].setValue([...array, this.controllingFunctions[controllFuncIndex]]);
                        } else {
                            this.snackBar.open('Controlling Function already selected!', undefined, {duration: 4000});
                        }
                    }
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
            id: [{value: this.deviceType.id, disabled: true}],
            name: [this.deviceType.name, Validators.required],
            description: [this.deviceType.description],
            image: [this.deviceType.image],
            device_class: [this.deviceType.device_class, Validators.required],
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
            formGroup.controls['protocol'].valueChanges.subscribe((protocol: string) => {
                formGroup.setControl('input', this.createContent(protocol, undefined));
                formGroup.setControl('output', this.createContent(protocol, undefined));
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
            description: [deviceTypeService.description],
            aspects: [deviceTypeService.aspects, Validators.required],
            functions: [deviceTypeService.functions, Validators.required],
            protocol_id: [deviceTypeService.protocol_id, Validators.required],
            inputs: this.createContent(deviceTypeService.protocol_id, deviceTypeService.inputs),
            outputs: this.createContent(deviceTypeService.protocol_id, deviceTypeService.outputs),
        });
    }

    private createContent(protocolId: string, content: (DeviceTypeContentModel[] | undefined)): FormArray {

        const array: FormGroup[] = [];
        let protocolIndex = -1;
        this.protocols.forEach((protocol: DeviceTypeProtocolModel, index: number) => {
            if (protocol.id === protocolId) {
                protocolIndex = index;
            }
        });
        this.protocols[protocolIndex].protocol_segment.forEach((protocolSegment: DeviceTypeProtocolSegmentModel) => {
            if (content !== undefined) {
                let itemMatch = false;
                content.forEach((cont: DeviceTypeContentModel) => {
                    if (cont.protocol_segment_id === protocolSegment.id) {
                        array.push(this.createContentGroup(cont, protocolSegment));
                        itemMatch = true;
                    }
                });
                if (!itemMatch) {
                    array.push(this.createInitialAssignmentGroup(protocolSegment));
                }
            } else {
                array.push(this.createInitialAssignmentGroup(protocolSegment));
            }
        });

        return this._formBuilder.array(array);
    }

    private createContentGroup(content: DeviceTypeContentModel, protocolSegment: DeviceTypeProtocolSegmentModel): FormGroup {
        return this._formBuilder.group({
            id: [content.id],
            name: [protocolSegment.name],
            serialization: [content.serialization],
            content_variable_raw: [content.content_variable, jsonValidator(true)],
            show: [true],
        });
    }

    private createInitialAssignmentGroup(protocolSegment: DeviceTypeProtocolSegmentModel): FormGroup {
        return this._formBuilder.group({
            id: [],
            name: [protocolSegment.name],
            serialization: [''],
            content_variable_raw: ['', jsonValidator(true)],
            show: [false],
        });
        // }
    }

    private checkIfDeviceClassNameExists(name: string): number {
        let index = -1;
        this.deviceTypeDeviceClasses.forEach((deviceClass: DeviceTypeDeviceClassModel, i: number) => {
            if (deviceClass.name === name) {
                index = i;
            }
        });
        return index;
    }

    private checkIfMeasuringFunctionNameExists(name: string): number {
        let index = -1;
        this.measuringFunctions.forEach((func: DeviceTypeFunctionModel, i: number) => {
            if (func.name === name) {
                index = i;
            }
        });
        return index;
    }

    private checkIfControllingFunctionNameExists(name: string): number {
        let index = -1;
        this.controllingFunctions.forEach((func: DeviceTypeFunctionModel, i: number) => {
            if (func.name === name) {
                index = i;
            }
        });
        return index;
    }

    private loadData(): void {
        this.deviceTypeService.getDeviceClasses(9999, 0).subscribe(
            (deviceTypeDeviceClasses: DeviceTypeDeviceClassModel[]) => {
                this.deviceTypeDeviceClasses = deviceTypeDeviceClasses;
            });

        this.valueTypesService.getValuetypes('', 9999, 0, 'name', 'asc').subscribe(
            (deviceTypeValueTypes: ValueTypesModel[]) => {
                this.deviceTypeValueTypes = deviceTypeValueTypes;
            });

        this.controllingFunctions = [
            {
                id: '1',
                name: 'brightnessAdjustment',
                type: DeviceTypeFunctionTypeEnum.Controlling,
                concept_ids: [],
            },
            {
                id: '2',
                name: 'colorFunction',
                type: DeviceTypeFunctionTypeEnum.Controlling,
                concept_ids: [],
            },
            {
                id: '3',
                name: 'onFunction',
                type: DeviceTypeFunctionTypeEnum.Controlling,
                concept_ids: [],
            },
            {
                id: '4',
                name: 'offFunction',
                type: DeviceTypeFunctionTypeEnum.Controlling,
                concept_ids: [],
            },
        ];

        this.measuringFunctions = [
            {
                id: '1a',
                name: 'batteryLevelMeasuring',
                type: DeviceTypeFunctionTypeEnum.Measuring,
                concept_ids: [],
            },
            {
                id: '2a',
                name: 'connectionStatusMeasuring',
                type: DeviceTypeFunctionTypeEnum.Measuring,
                concept_ids: [],
            },
            {
                id: '3a',
                name: 'humidityMeasuring',
                type: DeviceTypeFunctionTypeEnum.Measuring,
                concept_ids: [],
            },
            {
                id: '4a',
                name: 'temperatureMeasuring',
                type: DeviceTypeFunctionTypeEnum.Measuring,
                concept_ids: [],
            },
        ];

        this.aspects = [
            {id: '1aa', name: 'Air'},
            {id: '2aa', name: 'Lightning'},
            {id: '3aa', name: 'Battery'},
            {id: '4aa', name: 'Noise'},
        ];

        this.protocols = [
            {
                id: 'urn:infai:ses:protocol:1',
                name: 'mqtt-connector',
                handler: 'mqtt',
                protocol_segment: [
                    {
                        id: 'urn:infai:ses:protocolsegment:1',
                        name: 'payload'
                    },
                    {
                        id: 'urn:infai:ses:protocolsegment:2',
                        name: 'topic'
                    }
                ]
            },
            {
                id: 'urn:infai:ses:protocol:2',
                name: 'moses',
                handler: 'moses',
                protocol_segment: [
                    {
                        id: 'urn:infai:ses:protocolsegment:3',
                        name: 'payload'
                    },
                ]
            },
            {
                id: 'urn:infai:ses:protocol:3',
                name: 'standard-connector',
                handler: 'connector',
                protocol_segment: [
                    {
                        id: 'urn:infai:ses:protocolsegment:4',
                        name: 'metadata'
                    },
                    {
                        id: 'urn:infai:ses:protocolsegment:5',
                        name: 'data'
                    },
                ]
            },
            {
                id: 'urn:infai:ses:protocol:4',
                name: 'zway-connector',
                handler: 'connector',
                protocol_segment: [
                    {
                        id: 'urn:infai:ses:protocolsegment:6',
                        name: 'metrics'
                    }
                ]
            }
        ];
    }
}
