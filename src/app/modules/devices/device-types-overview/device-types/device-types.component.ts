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
    DeviceTypeFunctionModel, DeviceTypeFunctionType,
    DeviceTypeModel,
    DeviceTypeProtocolModel,
    DeviceTypeProtocolSegmentModel,
    DeviceTypeServiceModel,
} from '../shared/device-type.model';
import {ValueTypesModel} from '../../value-types/shared/value-types.model';
import {AbstractControl, FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MatDialog, MatDialogConfig, MatSnackBar} from '@angular/material';
import {DeviceTypeService} from '../shared/device-type.service';
import {ValueTypesService} from '../../value-types/shared/value-types.service';
import {DeviceTypesNewDeviceClassDialogComponent} from './dialogs/device-types-new-device-class-dialog.component';
import {DeviceTypesNewFunctionDialogComponent} from './dialogs/device-types-new-function-dialog.component';
import {jsonValidator} from '../../../../core/validators/json.validator';
import {ActivatedRoute} from '@angular/router';
import {DeviceTypesNewAspectDialogComponent} from './dialogs/device-types-new-aspect-dialog.component';


const functionTypes: DeviceTypeFunctionType[] = [
    {text: 'Controlling', rdf_type: 'https://senergy.infai.org/ontology/ControllingFunction'},
    {text: 'Measuring', rdf_type: 'https://senergy.infai.org/ontology/MeasuringFunction'},
];

const controllingIndex = 0;
const measuringIndex = 1;

@Component({
    selector: 'senergy-device-types',
    templateUrl: './device-types.component.html',
    styleUrls: ['./device-types.component.css']
})
export class DeviceTypesComponent implements OnInit {

    deviceTypeDeviceClasses: DeviceTypeDeviceClassModel[] = [];
    protocols: DeviceTypeProtocolModel[] = [];

    firstFormGroup!: FormGroup;
    secondFormGroup: FormGroup = new FormGroup({services: this._formBuilder.array([])});
    disableSave = false;
    editable = false;
    keys = Object.keys;
    deviceTypeFunctionType = functionTypes;
    functions: DeviceTypeFunctionModel[] = [];
    measuringFunctions: DeviceTypeFunctionModel[] = [];
    controllingFunctions: DeviceTypeFunctionModel[] = [];
    aspects: DeviceTypeAspectModel[] = [];
    serializations: string[] = ['json', 'xml'];
    id = '';

    constructor(private _formBuilder: FormBuilder,
                private deviceTypeService: DeviceTypeService,
                private valueTypesService: ValueTypesService,
                private dialog: MatDialog,
                private snackBar: MatSnackBar,
                private route: ActivatedRoute) {
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
            id: this.firstFormGroup.value.id,
            name: this.firstFormGroup.value.name,
            description: this.firstFormGroup.value.description,
            image: this.firstFormGroup.value.image,
            services: this.secondFormGroup.value.services,
            device_class: this.firstFormGroup.value.device_class,
        };

        this.saveDeviceType(newDeviceType);

    }

    addService() {
        const formArray = <FormArray>this.secondFormGroup.controls['services'];
        formArray.push(this.createServiceGroup({} as DeviceTypeServiceModel));
        const formGroup = <FormGroup>formArray.controls[formArray.length - 1];
        this.initProtocolIdChangeListener(formGroup);
        formGroup.controls['functionType'].valueChanges.subscribe(() => {
            if (formGroup.controls['functionType'].invalid) {
                formGroup.controls['functions'].disable();
            } else {
                formGroup.controls['functions'].enable();
            }

            formGroup.controls['functions'].setValue([]);
            this.initFunctions(formGroup);
        });
    }

    deleteService(deviceTypeService: DeviceTypeServiceModel) {
        const control = <FormArray>this.secondFormGroup.controls['services'];
        control.removeAt(this.secondFormGroup.value.services.indexOf(deviceTypeService));
    }

    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id && a.name === b.name;
    }

    expand(control: FormGroup): void {
        control.patchValue({'show': !control.value.show});
    }

    checkIfContentExists(input: DeviceTypeContentModel): boolean {
        if ((input.content_variable_raw === null || input.content_variable_raw === '' || input.content_variable_raw === undefined) &&
            (input.serialization === null || input.serialization === '')) {
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
                    this.snackbarAlreadyExists('Device Class');
                    this.firstFormGroup.patchValue({'device_class': this.deviceTypeDeviceClasses[index]});
                }
            }
        });
    }

    newAspect(serviceIndex: number) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        const editDialogRef = this.dialog.open(DeviceTypesNewAspectDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((name: string) => {
            if (name !== undefined) {
                const aspectIndex = this.checkIfAspectNameExists(name);
                const formArray = <FormArray>this.secondFormGroup.controls['services'];
                const formGroup = <FormGroup>formArray.controls[serviceIndex];
                const aspects = formGroup.controls['aspects'];
                if (aspectIndex === -1) {
                    const newAspect: DeviceTypeAspectModel = {id: '', name: name};
                    aspects.value.push(newAspect);
                    this.aspects.push(newAspect);
                } else {
                    const index = aspects.value.indexOf(this.aspects[aspectIndex]);
                    if (index === -1) {
                        this.snackbarAlreadyExists('Aspect');
                        const array = formGroup.controls['aspects'].value;
                        formGroup.controls['aspects'].setValue([...array, this.aspects[aspectIndex]]);
                    } else {
                        this.snackbarAlreadySelected('Aspect');
                    }
                }
                aspects.updateValueAndValidity();
            }
        });
    }

    openCreateFunctionDialog(serviceIndex: number) {
        const formArray = <FormArray>this.secondFormGroup.controls['services'];
        const formGroup = <FormGroup>formArray.controls[serviceIndex];
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            functionType: formGroup.controls['functionType'].value,
        };
        const editDialogRef = this.dialog.open(DeviceTypesNewFunctionDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((func: DeviceTypeFunctionModel) => {
            if (func !== undefined) {
                if (formGroup.controls['functionType'].value === this.deviceTypeFunctionType[measuringIndex]) {
                    const measureFuncIndex = this.checkIfMeasuringFunctionNameExists(func.name);
                    if (measureFuncIndex === -1) {
                        formGroup.controls['functions'].value.push(func);
                        this.measuringFunctions.push(func);
                    } else {
                        const functionsFormGroup = <FormGroup>formGroup.controls['functions'];
                        const measureFuncFormGroupIndex = this.checkIfMeasuringFunctionIsSelected(functionsFormGroup.value, measureFuncIndex);
                        if (measureFuncFormGroupIndex === -1) {
                            this.snackbarAlreadyExists('Measuring Function');
                            const array = formGroup.controls['functions'].value;
                            formGroup.controls['functions'].setValue([...array, this.measuringFunctions[measureFuncIndex]]);
                        } else {
                            this.snackbarAlreadySelected('Measuring Function');
                        }
                    }
                }
                if (formGroup.controls['functionType'].value === this.deviceTypeFunctionType[controllingIndex]) {
                    const controllFuncIndex = this.checkIfControllingFunctionNameExists(func.name);
                    if (controllFuncIndex === -1) {
                        formGroup.controls['functions'].value.push(func);
                        this.controllingFunctions.push(func);
                    } else {
                        const functionsFormGroup = <FormGroup>formGroup.controls['functions'];
                        const controllFuncFormGroupIndex = this.checkIfControllingFunctionIsSelected(functionsFormGroup.value, controllFuncIndex);
                        if (controllFuncFormGroupIndex === -1) {
                            this.snackbarAlreadyExists('Controlling Function');
                            const array = formGroup.controls['functions'].value;
                            formGroup.controls['functions'].setValue([...array, this.controllingFunctions[controllFuncIndex]]);
                        } else {
                            this.snackbarAlreadySelected('Controlling Function');
                        }
                    }
                }
                formGroup.controls['functions'].updateValueAndValidity();
            }
        });
    }

    private cleanUpServices() {
        this.secondFormGroup.value.services.forEach((service: DeviceTypeServiceModel) => {
            const deleteIndexInput: DeviceTypeContentModel[] = [];
            const deleteIndexOutput: DeviceTypeContentModel[] = [];
            service.inputs.forEach((item: DeviceTypeContentModel) => {
                if (!this.checkIfContentExists(item)) {
                    deleteIndexInput.push(item);
                } else {
                    item.content_variable = JSON.parse(item.content_variable_raw);
                }
            });
            service.outputs.forEach((item: DeviceTypeContentModel) => {
                if (!this.checkIfContentExists(item)) {
                    deleteIndexOutput.push(item);
                } else {
                    item.content_variable = JSON.parse(item.content_variable_raw);
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
        this.initFirstFormGroup({} as DeviceTypeModel);
        this.initSecondFormGroup({} as DeviceTypeModel);
        this.disableSaveButton(this.firstFormGroup.status);
        this.secondFormGroup = this._formBuilder.group({
            services: this._formBuilder.array([])
        });

        this.watchFormGroupStatusChanges();
    }

    private loadDataIfIdExists() {
        this.id = this.route.snapshot.paramMap.get('id') || '';
        if (this.id !== '') {
            this.deviceTypeService.getDeviceType(this.id).subscribe((deviceType: DeviceTypeModel | null) => {
                if (deviceType !== null) {
                    this.initFirstFormGroup(deviceType);
                    this.disableSaveButton(this.firstFormGroup.status);
                    this.initSecondFormGroup(deviceType);

                    if (!this.editable) {
                        this.firstFormGroup.disable();
                        this.secondFormGroup.disable();
                    }
                }
            });
        }
    }

    private initProtocolIdChangeListener(formGroup: FormGroup) {
        formGroup.controls['protocol_id'].valueChanges.subscribe((protocolId: string) => {
            formGroup.setControl('inputs', this.createContent(protocolId, undefined));
            formGroup.setControl('outputs', this.createContent(protocolId, undefined));
        });
    }

    private initSecondFormGroup(deviceType: DeviceTypeModel) {
        this.secondFormGroup = this._formBuilder.group({
            services: this._formBuilder.array(deviceType.services ?
                deviceType.services.map((elem: DeviceTypeServiceModel) => this.createServiceGroup(elem)) :
                [])
        });
        const formArray = <FormArray>this.secondFormGroup.controls['services'];
        formArray.controls.forEach((control: AbstractControl) => {
            const formGroup = <FormGroup>control;
            this.initFunctions(formGroup);
            this.initProtocolIdChangeListener(formGroup);
            formGroup.controls['functionType'].valueChanges.subscribe(() => {
                formGroup.controls['functions'].setValue([]);
                this.initFunctions(formGroup);
            });
        });
    }

    private initFunctions(formGroup: FormGroup) {
        if (formGroup.controls['functionType'].value === this.deviceTypeFunctionType[measuringIndex]) {
            this.functions = this.measuringFunctions;
        }
        if (formGroup.controls['functionType'].value === this.deviceTypeFunctionType[controllingIndex]) {
            this.functions = this.controllingFunctions;
        }
    }

    private initFirstFormGroup(deviceType: DeviceTypeModel) {
        this.firstFormGroup = this._formBuilder.group({
            id: [{value: deviceType.id, disabled: true}],
            name: [deviceType.name, Validators.required],
            description: [deviceType.description],
            image: [deviceType.image],
            device_class: [deviceType.device_class, Validators.required],
        });
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
            id: [{value: deviceTypeService.id, disabled: true}],
            local_id: [deviceTypeService.local_id],
            name: [deviceTypeService.name, Validators.required],
            description: [deviceTypeService.description],
            protocol_id: [deviceTypeService.protocol_id, Validators.required],
            inputs: deviceTypeService.inputs ? this.createContent(deviceTypeService.protocol_id, deviceTypeService.inputs) : [],
            outputs: deviceTypeService.outputs ? this.createContent(deviceTypeService.protocol_id, deviceTypeService.outputs) : [],
            functionType: [deviceTypeService.functions ? this.getFunctionType(deviceTypeService.functions[0].rdf_type) : '', Validators.required],
            functions: [{
                value: deviceTypeService.functions ? deviceTypeService.functions : [],
                disabled: deviceTypeService.functions ? false : true
            }, Validators.required],
            aspects: [deviceTypeService.aspects ? deviceTypeService.aspects : [], Validators.required],
        });
    }

    private getFunctionType(rdfType: string): DeviceTypeFunctionType {
        let index = -1;
        this.deviceTypeFunctionType.forEach((deviceType: DeviceTypeFunctionType, i: number) => {
            if (deviceType.rdf_type === rdfType) {
                index = i;
            }
        });
        return this.deviceTypeFunctionType[index];
    }

    private createContent(protocolId: string, content: (DeviceTypeContentModel[] | undefined)): FormArray {

        const array: FormGroup[] = [];
        let protocolIndex = -1;
        this.protocols.forEach((protocol: DeviceTypeProtocolModel, index: number) => {
            if (protocol.id === protocolId) {
                protocolIndex = index;
            }
        });
        this.protocols[protocolIndex].protocol_segments.forEach((protocolSegment: DeviceTypeProtocolSegmentModel) => {
            if (content !== undefined) {
                let itemMatch = false;
                content.forEach((cont: DeviceTypeContentModel) => {
                    if (cont.protocol_segment_id === protocolSegment.id) {
                        array.push(this.createContentGroup(cont, protocolSegment));
                        itemMatch = true;
                    }
                });
                if (!itemMatch) {
                    array.push(this.createContentGroup({} as DeviceTypeContentModel, protocolSegment));
                }
            } else {
                array.push(this.createContentGroup({} as DeviceTypeContentModel, protocolSegment));
            }
        });

        return this._formBuilder.array(array);
    }

    private createContentGroup(content: DeviceTypeContentModel, protocolSegment: DeviceTypeProtocolSegmentModel): FormGroup {
        return this._formBuilder.group({
            id: [content.id],
            name: [protocolSegment.name],
            serialization: [content.serialization],
            content_variable_raw: [JSON.stringify(content.content_variable), jsonValidator(true)],
            protocol_segment_id: [content.protocol_segment_id],
            show: [content.protocol_segment_id ? true : false],
        });
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

    private checkIfAspectNameExists(name: string): number {
        let index = -1;
        this.aspects.forEach((aspect: DeviceTypeAspectModel, i: number) => {
            if (aspect.name === name) {
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

    private checkIfControllingFunctionIsSelected(functions: DeviceTypeFunctionModel[], inputIndex: number): number {
        let index = -1;
        functions.forEach((func: DeviceTypeFunctionModel, i: number) => {
            if (func.id === this.controllingFunctions[inputIndex].id &&
                func.rdf_type === this.controllingFunctions[inputIndex].rdf_type &&
                func.name === this.controllingFunctions[inputIndex].name) {
                index = i;
            }
        });
        return index;
    }

    private checkIfMeasuringFunctionIsSelected(functions: DeviceTypeFunctionModel[], inputIndex: number): number {
        let index = -1;
        functions.forEach((func: DeviceTypeFunctionModel, i: number) => {
            if (func.id === this.measuringFunctions[inputIndex].id &&
                func.rdf_type === this.measuringFunctions[inputIndex].rdf_type &&
                func.name === this.measuringFunctions[inputIndex].name) {
                index = i;
            }
        });
        return index;
    }

    private saveDeviceType(deviceTypeResp: DeviceTypeModel) {
        this.deviceTypeService.createDeviceType(deviceTypeResp).subscribe((deviceTypeSaved: DeviceTypeModel | null) => {
            if (deviceTypeSaved) {
                this.snackBar.open('Device type saved successfully.', undefined, {duration: 2000});
            } else {
                this.snackBar.open('Error while saving the device type!', undefined, {duration: 2000});
            }
        });
    }

    private snackbarAlreadyExists(type: string) {
        this.snackBar.open(type + ' already exists! ' +  type + ' auto selected!', undefined, {duration: 4000});
    }


    private snackbarAlreadySelected(type: string) {
        this.snackBar.open(type + ' already selected!', undefined, {duration: 4000});
    }

    private loadData(): void {
        this.deviceTypeService.getDeviceClasses().subscribe(
            (deviceTypeDeviceClasses: DeviceTypeDeviceClassModel[]) => {
                this.deviceTypeDeviceClasses = deviceTypeDeviceClasses;
            });

        this.deviceTypeService.getProtocols(9999, 0, 'name', 'asc').subscribe(
            (protocols: DeviceTypeProtocolModel[]) => {
                this.protocols = protocols;
                this.loadDataIfIdExists();
            });

        this.deviceTypeService.getControllingFunctions().subscribe(
            (resp: DeviceTypeFunctionModel[]) => {
                this.controllingFunctions = resp;
            });

        this.deviceTypeService.getMeasuringFunctions().subscribe(
            (resp: DeviceTypeFunctionModel[]) => {
                this.measuringFunctions = resp;
            });

        this.deviceTypeService.getAspects().subscribe(
            (aspects: DeviceTypeAspectModel[]) => {
                this.aspects = aspects;
            });
    }
}
