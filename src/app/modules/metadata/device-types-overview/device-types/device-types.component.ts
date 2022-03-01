/*
 * Copyright 2021 InfAI (CC SES)
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

import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {
    Attribute,
    DeviceTypeAspectModel,
    DeviceTypeCharacteristicsModel,
    DeviceTypeContentModel,
    DeviceTypeContentTreeModel,
    DeviceTypeContentVariableModel,
    DeviceTypeDeviceClassModel,
    DeviceTypeFunctionModel,
    DeviceTypeFunctionType,
    DeviceTypeInteractionEnum,
    DeviceTypeModel,
    DeviceTypeProtocolModel,
    DeviceTypeProtocolSegmentModel,
    DeviceTypeServiceGroupModel,
    DeviceTypeServiceModel,
    functionTypes,
} from '../shared/device-type.model';
import {AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DeviceTypeService} from '../shared/device-type.service';
import {ActivatedRoute, Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {forkJoin, Observable, of} from 'rxjs';
import {DeviceTypeHelperService} from './shared/device-type-helper.service';
import {NestedTreeControl} from '@angular/cdk/tree';
import {MatTreeNestedDataSource} from '@angular/material/tree';
import {DeviceTypesContentVariableDialogComponent} from './dialogs/device-types-content-variable-dialog.component';
import {MatOption} from '@angular/material/core';
import {ConceptsService} from '../../concepts/shared/concepts.service';
import {ConceptsCharacteristicsModel} from '../../concepts/shared/concepts-characteristics.model';
import {environment} from '../../../../../environments/environment';
import {debounceTime, map, mergeAll} from 'rxjs/internal/operators';
import {util} from 'jointjs';
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import uuid = util.uuid;

interface DeviceTypeContentEditModel extends DeviceTypeContentModel {
    tree?: NestedTreeControl<DeviceTypeContentVariableModel>;
    dataSource?: MatTreeNestedDataSource<DeviceTypeContentVariableModel>;
}

@Component({
    selector: 'senergy-device-types',
    templateUrl: './device-types.component.html',
    styleUrls: ['./device-types.component.css'],
})
export class DeviceTypesComponent implements OnInit {
    deviceTypeDeviceClasses: DeviceTypeDeviceClassModel[] = [];
    protocols: DeviceTypeProtocolModel[] = [];
    interactionList: string[] = Object.values(DeviceTypeInteractionEnum);

    firstFormGroup!: FormGroup;
    secondFormGroup: FormGroup = new FormGroup({services: new FormArray([])});
    attrFormGroup: FormGroup = new FormGroup({attributes: new FormArray([])});
    serviceGroupsAndUngroupedServices: ({ key: string; title: string; isGroup: boolean; serviceAndIndices: { service: AbstractControl; index: number }[] }[]) = [];
    editable = false;
    deviceTypeFunctionType = functionTypes;
    measuringFunctions: DeviceTypeFunctionModel[] = [];
    controllingFunctions: DeviceTypeFunctionModel[] = [];
    aspectList: DeviceTypeAspectModel[] = [];
    serializations: string[] = ['json', 'xml', 'plain-text'];
    id = '';
    queryParamFunction = '';
    leafCharacteristics: DeviceTypeCharacteristicsModel[] = [];
    concepts: ConceptsCharacteristicsModel[] = [];
    equivalentProtocolSegments: string[][] = [[]];
    ready = false;

    constructor(
        private _formBuilder: FormBuilder,
        private deviceTypeService: DeviceTypeService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar,
        private route: ActivatedRoute,
        private deviceTypeHelperService: DeviceTypeHelperService,
        private conceptsService: ConceptsService,
        private router: Router,
        private changeDetectorRef: ChangeDetectorRef,
    ) {
        try {
            this.equivalentProtocolSegments = JSON.parse(environment.equivalentProtocolSegments);
        } catch (e) {
            console.error('Could not parse environment.equivalentProtocolSegments', environment.equivalentProtocolSegments);
        }
        this.getRouterParams();
    }

    ngOnInit() {
        this.initFormControls();
        this.loadData().subscribe((_) => {
            this.updateServiceGroups();
            this.ready = true;
            this.changeDetectorRef.detectChanges();
        });
    }

    hasChild = (_: number, node: DeviceTypeContentVariableModel) => !!node.sub_content_variables;

    close(): void {
    }

    save(): void {
        this.cleanUpServices();

        const newDeviceType: DeviceTypeModel = {
            id: this.firstFormGroup.getRawValue().id, // use getRawValue because control is disabled
            name: this.firstFormGroup.value.name,
            description: this.firstFormGroup.value.description,
            attributes: this.attrFormGroup.getRawValue().attributes,
            services: this.secondFormGroup.getRawValue().services,
            service_groups: this.secondFormGroup.getRawValue().serviceGroups,
            device_class_id: this.firstFormGroup.value.device_class_id,
        };

        this.saveDeviceType(newDeviceType);
    }

    addService(key: string) {
        const formArray = this.secondFormGroup.controls['services'] as FormArray;
        formArray.push(this.createServiceFormGroup({service_group_key: key} as DeviceTypeServiceModel));
        const formGroup = formArray.controls[formArray.length - 1] as FormGroup;
        this.initProtocolIdChangeListener(formGroup);
        formGroup.controls['functionType'].valueChanges.subscribe(() => {
            if (formGroup.controls['functionType'].invalid) {
                formGroup.controls['function_ids'].disable();
            } else {
                formGroup.controls['function_ids'].enable();
            }

            formGroup.controls['function_ids'].setValue([]);
        });
        this.updateServiceGroups();
    }

    addServiceGroup(): FormGroup {
        const formArray = this.secondFormGroup.controls['serviceGroups'] as FormArray;
        const group = this.createServiceGroupFormGroup(undefined);
        formArray.push(group);
        this.updateServiceGroups();
        return group;
    }

    addContentVariable(isInput: boolean, inOut: DeviceTypeContentTreeModel, indices: number[]): void {
        const disabled = !this.editable;
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            contentVariable: {} as DeviceTypeContentVariableModel,
            functions: isInput ? this.controllingFunctions : this.measuringFunctions,
            disabled,
            concepts: this.concepts,
            aspects: this.aspectList,
            allowVoid: isInput,
        };
        this.dialog
            .open(DeviceTypesContentVariableDialogComponent, dialogConfig)
            .afterClosed()
            .subscribe((resp: DeviceTypeContentVariableModel | undefined) => {
                if (resp) {
                    this.refreshTree(inOut, this.deviceTypeHelperService.addTreeData(inOut.dataSource.data, resp, indices));
                }
            });
    }

    deleteContentVariable(inOut: DeviceTypeContentTreeModel, indices: number[]): void {
        this.refreshTree(inOut, this.deviceTypeHelperService.deleteTreeData(inOut.dataSource.data, indices));
    }

    editContent(isInput: boolean, node: DeviceTypeContentVariableModel, inOut: DeviceTypeContentTreeModel): void {
        const disabled = !this.editable;
        const dialogConfig = new MatDialogConfig();
        dialogConfig.autoFocus = true;
        dialogConfig.data = {
            contentVariable: node,
            functions: isInput ? this.controllingFunctions : this.measuringFunctions,
            disabled,
            concepts: this.concepts,
            aspects: this.aspectList,
            allowVoid: isInput,
        };
        this.dialog
            .open(DeviceTypesContentVariableDialogComponent, dialogConfig)
            .afterClosed()
            .subscribe((resp: DeviceTypeContentVariableModel | undefined) => {
                if (resp && resp.indices) {
                    this.refreshTree(inOut, this.deviceTypeHelperService.updateTreeData(inOut.dataSource.data, resp, resp.indices));
                }
            });
    }

    cloneService(index: number): FormGroup {
        const control = this.secondFormGroup.controls['services'] as FormArray;

        const deviceTypeService = control.at(index).value as DeviceTypeServiceModel;
        const clone: DeviceTypeServiceModel = {
            id: '',
            inputs: [],
            outputs: [],
            service_group_key: deviceTypeService.service_group_key,
            name: deviceTypeService.name,
            description: deviceTypeService.description,
            attributes: JSON.parse(JSON.stringify(deviceTypeService.attributes)),
            interaction: deviceTypeService.interaction,
            protocol_id: deviceTypeService.protocol_id,
            local_id: deviceTypeService.local_id,
        };
        const copyContent = (x: DeviceTypeContentModel, input: boolean) => {
            const xTree = x as DeviceTypeContentTreeModel;
            const content: DeviceTypeContentModel = {
                id: '',
                name: x.name,
                content_variable: xTree.dataSource.data.length > 0 ? JSON.parse(JSON.stringify(xTree.dataSource.data[0])) : undefined,
                protocol_segment_id: x.protocol_segment_id,
                content_variable_raw: x.content_variable_raw,
                show: x.show,
                serialization: x.serialization,
            };
            if (input) {
                clone.inputs.push(content);
            } else {
                clone.outputs.push(content);
            }
        };
        deviceTypeService.inputs.forEach(x => copyContent(x, true));
        deviceTypeService.outputs.forEach(x => copyContent(x, false));

        clone.inputs.forEach(x => {
            this.removeContentVariableIds(x.content_variable);
        });
        clone.outputs.forEach(x => {
            this.removeContentVariableIds(x.content_variable);
        });
        const group = this.createServiceFormGroup(clone);
        control.push(group);
        this.updateServiceGroups();
        return group;
    }

    deleteService(deviceTypeService: DeviceTypeServiceModel) {
        const control = this.secondFormGroup.controls['services'] as FormArray;
        control.removeAt(this.secondFormGroup.value.services.indexOf(deviceTypeService));
        this.updateServiceGroups();
    }

    cloneServiceGroup(group: { key: string; title: string; isGroup: boolean; serviceAndIndices: { service: AbstractControl; index: number }[] }) {
        const newServiceFormGroup = this.addServiceGroup();
        newServiceFormGroup.patchValue({name: this.getServiceGroup(group.key).get('name')?.value});
        const key = newServiceFormGroup.get('key')?.value;
        group.serviceAndIndices.forEach(s => {
            const clonedServiceGroup = this.cloneService(s.index);
            clonedServiceGroup.patchValue({service_group_key: key});
        });
        this.updateServiceGroups();
    }

    deleteServiceGroup(key: string) {
        const i = this.serviceGroups.controls.findIndex(g => g.get('key')?.value === key);
        if (i !== -1) {
            this.serviceGroups.removeAt(i);
            this.updateServiceGroups();
        }
    }

    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id && a.name === b.name;
    }

    expand(serviceFormGroup: AbstractControl, formControlName: string, index: number): void {
        const inOut = this.inputOutput(serviceFormGroup, formControlName, index);
        inOut.patchValue({show: !inOut.value.show});
    }

    trackByIndex(index: any) {
        return index;
    }

    trackById(_: number, element: any) {
        return element.id;
    }

    trackByKey(_: number, element: any) {
        return element.key;
    }


    functionType(serviceFormGroup: AbstractControl): DeviceTypeFunctionType {
        return DeviceTypesComponent.getServiceFormControl(serviceFormGroup, 'functionType').value;
    }

    functionIds(serviceFormGroup: AbstractControl): string[] {
        return DeviceTypesComponent.getServiceFormControl(serviceFormGroup, 'function_ids').value;
    }

    aspectIds(serviceFormGroup: AbstractControl): string[] {
        return DeviceTypesComponent.getServiceFormControl(serviceFormGroup, 'aspect_ids').value;
    }

    inputOutputArray(serviceFormGroup: AbstractControl, formControlName: string): DeviceTypeContentTreeModel[] {
        return DeviceTypesComponent.getServiceFormArray(serviceFormGroup, formControlName).value;
    }

    serviceAttributeArray(serviceFormGroup: AbstractControl): FormArray {
        return DeviceTypesComponent.getServiceFormArray(serviceFormGroup, 'attributes');
    }

    inputOutput(serviceFormGroup: AbstractControl, formControlName: string, index: number): FormControl {
        return DeviceTypesComponent.getServiceFormArray(serviceFormGroup, formControlName).get([index]) as FormControl;
    }

    serviceControl(serviceIndex: number): FormGroup {
        return this.services.at(serviceIndex) as FormGroup;
    }

    getFunctionName(functionId: string, functionTypeText: string): string {
        let funcName = '';
        if (functionTypeText === 'Controlling') {
            this.controllingFunctions.forEach((controllFunc: DeviceTypeFunctionModel) => {
                if (controllFunc.id === functionId) {
                    funcName = controllFunc.name;
                }
            });
        }
        if (functionTypeText === 'Measuring') {
            this.measuringFunctions.forEach((measuringFunc: DeviceTypeFunctionModel) => {
                if (measuringFunc.id === functionId) {
                    funcName = measuringFunc.name;
                }
            });
        }
        return funcName;
    }

    getAspectName(aspectId: string): string {
        let aspectName = '';
        this.aspectList.forEach((aspect: DeviceTypeAspectModel) => {
            if (aspect.id === aspectId) {
                aspectName = aspect.name;
            }
        });
        return aspectName;
    }

    getCustomTriggerFunction(service: AbstractControl): (options: MatOption | MatOption[]) => string {
        return (options) => {
            if (options === undefined) {
                return '';
            }
            if (!Array.isArray(options)) {
                return options.viewValue;
            }
            if (options.length > 0) {
                let text = this.getFunctionName(this.functionIds(service)[0], this.functionType(service).text);
                if (options.length > 1) {
                    text += ' (+' + (options.length - 1) + (options.length === 2 ? ' other)' : ' others)');
                }
                return text;
            }
            return '';
        };
    }

    getCustomTriggerAspect(service: AbstractControl): (options: MatOption | MatOption[]) => string {
        return (options) => {
            if (options === undefined) {
                return '';
            }
            if (!Array.isArray(options)) {
                return options.viewValue;
            }
            if (options.length > 0) {
                let text = this.getAspectName(this.aspectIds(service)[0]);
                if (options.length > 1) {
                    text += ' (+' + (options.length - 1) + (options.length === 2 ? ' other)' : ' others)');
                }
                return text;
            }
            return '';
        };
    }

    private cleanUpServices() {
        const services = this.secondFormGroup.controls['services'] as FormArray;

        for (let i = 0; i < services.length; i++) {
            const formGroup = services.controls[i] as FormGroup;
            this.cleanUpInputOutputs(formGroup.controls['inputs'] as FormArray);
            this.cleanUpInputOutputs(formGroup.controls['outputs'] as FormArray);
        }
    }

    private cleanUpInputOutputs(formArray: FormArray) {
        // loop from highest Index! Otherwise it could cause index problems
        for (let j = formArray.length - 1; j >= 0; j--) {
            const inOutControl: FormGroup = formArray.controls[j] as FormGroup;
            const inOutContent: DeviceTypeContentTreeModel = inOutControl.value;
            if (!this.deviceTypeHelperService.checkIfContentExists(inOutContent.dataSource.data, inOutContent.serialization)) {
                formArray.removeAt(j);
            } else {
                this.deviceTypeHelperService.removeField(inOutContent.dataSource.data[0], 'indices');
                inOutControl.addControl('content_variable', new FormControl(inOutContent.dataSource.data[0]));
                inOutControl.removeControl('dataSource');
                inOutControl.removeControl('tree');
            }
        }
    }

    private initFormControls() {
        this.initFirstFormGroup({} as DeviceTypeModel);
        this.initSecondFormGroup({} as DeviceTypeModel);
        this.initAttrFormGroup({} as DeviceTypeModel);
    }

    private loadDataIfIdExists(): Observable<any> {
        if (this.id !== '') {
            return this.deviceTypeService.getDeviceType(this.id).pipe(
                map((deviceType: DeviceTypeModel | null) => {
                    if (deviceType !== null) {
                        this.initFirstFormGroup(deviceType);
                        this.initSecondFormGroup(deviceType);
                        this.initAttrFormGroup(deviceType);
                    }

                    // after loading data and init first and second form group
                    // delete ids if function is copy

                    if (this.queryParamFunction === 'copy') {
                        this.deleteIds();
                    }
                }),
            );
        }
        return of(null);
    }

    private initProtocolIdChangeListener(formGroup: FormGroup) {
        formGroup.controls['protocol_id'].valueChanges.subscribe((protocolId: string) => {
            formGroup.setControl('inputs', this.createContent(protocolId, formGroup.get('inputs')?.value, true));
            formGroup.setControl('outputs', this.createContent(protocolId, formGroup.get('outputs')?.value, true));
        });
    }

    private initSecondFormGroup(deviceType: DeviceTypeModel) {
        this.secondFormGroup = this._formBuilder.group({
            services: this._formBuilder.array(
                deviceType.services ? deviceType.services.map((elem: DeviceTypeServiceModel) => this.createServiceFormGroup(elem)) : [],
                Validators.required,
            ),
            serviceGroups: this._formBuilder.array(
                deviceType.service_groups ? deviceType.service_groups.map((elem: DeviceTypeServiceGroupModel) => this.createServiceGroupFormGroup(elem)) : [],
            ),
        });
        const formArray = this.secondFormGroup.controls['services'] as FormArray;
        formArray.controls.forEach((control: AbstractControl) => {
            const formGroup = control as FormGroup;
            this.initProtocolIdChangeListener(formGroup);
        });
    }

    private initAttrFormGroup(deviceType: DeviceTypeModel) {
        this.attrFormGroup = this._formBuilder.group({
            attributes: this._formBuilder.array(
                deviceType.attributes ? deviceType.attributes.map((elem: Attribute) => this.createAttrGroup(elem)) : [],
                Validators.required,
            ),
        });
    }

    private initFirstFormGroup(deviceType: DeviceTypeModel) {
        const disabled = !this.editable;
        if (disabled) {
            this.firstFormGroup = this._formBuilder.group({
                id: [{value: deviceType.id, disabled: true}],
                name: [{disabled: true, value: deviceType.name}, Validators.required],
                description: [{disabled: true, value: deviceType.description}],
                device_class_id: [{disabled: true, value: deviceType.device_class_id}, Validators.required],
            });
        } else {
            this.firstFormGroup = this._formBuilder.group({
                id: [{value: deviceType.id, disabled: true}],
                name: [deviceType.name, Validators.required],
                description: [deviceType.description],
                device_class_id: [deviceType.device_class_id, Validators.required],
            });
        }
    }

    private createServiceFormGroup(deviceTypeService: DeviceTypeServiceModel): FormGroup {
        const disabled = !this.editable;
        if (disabled) {
            return this._formBuilder.group({
                id: [{value: deviceTypeService.id, disabled: true}],
                local_id: [{disabled: true, value: deviceTypeService.local_id}],
                service_group_key: [deviceTypeService.service_group_key],
                name: [{disabled: true, value: deviceTypeService.name}, Validators.required],
                description: [{disabled: true, value: deviceTypeService.description}],
                protocol_id: [{disabled: true, value: deviceTypeService.protocol_id}, Validators.required],
                interaction: [{disabled: true, value: deviceTypeService.interaction}, Validators.required],
                inputs: deviceTypeService.inputs
                    ? this.createContent(deviceTypeService.protocol_id, deviceTypeService.inputs)
                    : this._formBuilder.array([]),
                outputs: deviceTypeService.outputs
                    ? this.createContent(deviceTypeService.protocol_id, deviceTypeService.outputs)
                    : this._formBuilder.array([]),
                attributes: this._formBuilder.array(
                    deviceTypeService.attributes ? deviceTypeService.attributes.map((elem: Attribute) => this.createAttrGroup(elem)) : []
                )
            });
        } else {
            return this._formBuilder.group({
                id: [{value: deviceTypeService.id, disabled: true}],
                local_id: [deviceTypeService.local_id],
                service_group_key: [deviceTypeService.service_group_key],
                name: [deviceTypeService.name, Validators.required],
                description: [deviceTypeService.description],
                protocol_id: [deviceTypeService.protocol_id, Validators.required],
                interaction: [deviceTypeService.interaction, Validators.required],
                inputs: deviceTypeService.inputs
                    ? this.createContent(deviceTypeService.protocol_id, deviceTypeService.inputs)
                    : this._formBuilder.array([]),
                outputs: deviceTypeService.outputs
                    ? this.createContent(deviceTypeService.protocol_id, deviceTypeService.outputs)
                    : this._formBuilder.array([]),
                attributes: this._formBuilder.array(
                    deviceTypeService.attributes ? deviceTypeService.attributes.map((elem: Attribute) => this.createAttrGroup(elem)) : []
                )
            });
        }
    }

    private createServiceGroupFormGroup(deviceTypeServiceGroup?: DeviceTypeServiceGroupModel): FormGroup {
        const disabled = !this.editable;
        let group: FormGroup;
        if (disabled) {
            group = this._formBuilder.group({
                key: [{value: deviceTypeServiceGroup?.key || uuid(), disabled: true}],
                name: [{value: deviceTypeServiceGroup?.name || '', disabled: true}],
                description: [{value: deviceTypeServiceGroup?.description || '', disabled: true}],
            });
        } else {
            group = this._formBuilder.group({
                key: [deviceTypeServiceGroup?.key || uuid(), Validators.required],
                name: [deviceTypeServiceGroup?.name || '', Validators.required],
                description: [deviceTypeServiceGroup?.description || ''],
            });
        }
        group.get('name')?.valueChanges.pipe(debounceTime(300)).subscribe(() => this.updateServiceGroups());
        return group;
    }

    private createAttrGroup(attribute: Attribute): FormGroup {
        const disabled = !this.editable;
        if (disabled) {
            return this._formBuilder.group({
                key: [{value: attribute.key, disabled: true}],
                value: [{value: attribute.value, disabled: true}],
                origin: [{value: attribute.origin, disabled: true}],
            });
        } else {
            return this._formBuilder.group({
                key: [attribute.key],
                value: [attribute.value],
                origin: [attribute.origin],
            });
        }
    }

    private createContent(protocolId: string, content: DeviceTypeContentEditModel[] | undefined, useEquivalents = false): FormArray {
        const array: FormGroup[] = [];
        const protocolIndex = this.protocols.findIndex((protocol) => protocol.id === protocolId);
        if (protocolIndex === -1) {
            console.error('Can\'t find matching protocol index');
        } else {
            this.protocols[protocolIndex].protocol_segments.forEach((protocolSegment: DeviceTypeProtocolSegmentModel) => {
                if (content !== undefined) {
                    let itemMatch = false;
                    const equivalentSegmentIds = this.equivalentProtocolSegments.find((equivalents) =>
                        equivalents.find((segmentId) => segmentId === protocolSegment.id),
                    );
                    content.forEach((cont: DeviceTypeContentModel) => {
                        const equivalentIndex = equivalentSegmentIds?.findIndex((segmentId) => segmentId === cont.protocol_segment_id);
                        const isEquivalent = equivalentIndex !== undefined && equivalentIndex !== -1;
                        if (cont.protocol_segment_id === protocolSegment.id || (useEquivalents && isEquivalent)) {
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
        }

        return this._formBuilder.array(array);
    }

    private createContentGroup(content: DeviceTypeContentEditModel, protocolSegment: DeviceTypeProtocolSegmentModel): FormGroup {
        const dataSource = content.dataSource || new MatTreeNestedDataSource<DeviceTypeContentVariableModel>();

        if (content.content_variable) {
            this.deviceTypeHelperService.setIndices(content.content_variable);
            dataSource.data = [content.content_variable];
        }
        const disabled = !this.editable;
        const g = this._formBuilder.group({
            id: [content.id],
            name: [protocolSegment.name],
            serialization: disabled ? [{disabled: true, value: content.serialization}] : [content.serialization],
            protocol_segment_id: [protocolSegment.id],
            show: [!!content.protocol_segment_id],
            dataSource,
            tree: content.tree ? content.tree : new NestedTreeControl<DeviceTypeContentVariableModel>((node) => node.sub_content_variables),
        });
        return g;
    }

    private saveDeviceType(deviceType: DeviceTypeModel) {
        if (deviceType.id === '' || deviceType.id === undefined) {
            this.deviceTypeService.createDeviceType(deviceType).subscribe((deviceTypeSaved: DeviceTypeModel | null) => {
                this.showMessage(deviceTypeSaved);
                this.reload(deviceTypeSaved);
            });
        } else {
            this.deviceTypeService.updateDeviceType(deviceType).subscribe((deviceTypeSaved: DeviceTypeModel | null) => {
                this.showMessage(deviceTypeSaved);
                this.reload(deviceTypeSaved);
            });
        }
    }

    private reload(deviceType: DeviceTypeModel | null) {
        if (deviceType) {
            this.router.routeReuseStrategy.shouldReuseRoute = function() {
                return false;
            };
            this.router.onSameUrlNavigation = 'reload';
            this.router.navigate(['metadata/devicetypesoverview/devicetypes/' + deviceType.id], {
                queryParams: {function: 'edit'},
            });
        }
    }

    private showMessage(deviceTypeSaved: DeviceTypeModel | null) {
        if (deviceTypeSaved) {
            this.snackBar.open('Device type saved successfully.', undefined, {duration: 2000});
        } else {
            this.snackBar.open('Error while saving the device type!', undefined, {duration: 2000});
        }
    }

    private loadData(): Observable<any> {
        const observables: Observable<any>[] = [];

        const array: Observable<DeviceTypeCharacteristicsModel[] | DeviceTypeProtocolModel[]>[] = [];
        array.push(this.deviceTypeService.getLeafCharacteristics());
        array.push(this.deviceTypeService.getProtocols(9999, 0, 'name', 'asc'));
        observables.push(
            forkJoin(array).pipe(
                map((resp) => {
                    this.leafCharacteristics = resp[0] as DeviceTypeCharacteristicsModel[];
                    this.protocols = resp[1] as DeviceTypeProtocolModel[];
                    return this.loadDataIfIdExists();
                }),
                mergeAll(),
            ),
        );

        observables.push(
            this.deviceTypeService.getDeviceClasses().pipe(
                map((deviceTypeDeviceClasses: DeviceTypeDeviceClassModel[]) => {
                    this.deviceTypeDeviceClasses = deviceTypeDeviceClasses;
                }),
            ),
        );

        observables.push(
            this.deviceTypeService.getControllingFunctions().pipe(
                map((resp: DeviceTypeFunctionModel[]) => {
                    this.controllingFunctions = resp;
                }),
            ),
        );

        observables.push(
            this.deviceTypeService.getMeasuringFunctions().pipe(
                map((resp: DeviceTypeFunctionModel[]) => {
                    this.measuringFunctions = resp;
                }),
            ),
        );

        observables.push(
            this.deviceTypeService.getAspects().pipe(
                map((aspects: DeviceTypeAspectModel[]) => {
                    this.aspectList = aspects;
                }),
            ),
        );

        observables.push(
            this.conceptsService.getConceptsWithCharacteristics().pipe(
                map((concepts) => {
                    this.concepts = concepts;
                }),
            ),
        );

        return forkJoin(observables);
    }

    private getRouterParams(): void {
        this.id = this.route.snapshot.paramMap.get('id') || '';
        this.queryParamFunction = this.route.snapshot.queryParamMap.get('function') || '';
        this.editable = this.deviceTypeHelperService.isEditable(this.queryParamFunction);
    }

    private deleteIds(): void {
        const emptyId = {id: ''};
        this.firstFormGroup.patchValue(emptyId);
        const services = this.secondFormGroup.controls['services'] as FormArray;
        services.controls.forEach((service) => {
            service.patchValue(emptyId);
            const outputs = service.get('outputs') as FormArray;
            const inputs = service.get('inputs') as FormArray;
            this.clearContent(inputs);
            this.clearContent(outputs);
        });
    }

    private clearContent(contents: FormArray) {
        if (contents) {
            contents.controls.forEach((content) => {
                const contentFormGroup = content;
                contentFormGroup.patchValue({id: ''});
                const dataSourceControl = contentFormGroup.get('dataSource');
                if (dataSourceControl) {
                    if (dataSourceControl.value && dataSourceControl.value.data.length === 1) {
                        this.deviceTypeHelperService.removeField(dataSourceControl.value.data[0], 'id');
                    }
                }
            });
        }
    }

    private refreshTree(inOut: DeviceTypeContentTreeModel, contentVariable: DeviceTypeContentVariableModel[]): void {
        if (contentVariable[0]) {
            this.deviceTypeHelperService.setIndices(contentVariable[0]);
            inOut.dataSource.data = [contentVariable[0]];
            inOut.tree.dataNodes = inOut.dataSource.data;
            inOut.tree.expandAll();
        } else {
            inOut.dataSource.data = [];
        }
    }

    get services(): FormArray {
        return this.secondFormGroup.get('services') as FormArray;
    }

    get serviceGroups(): FormArray {
        return this.secondFormGroup.get('serviceGroups') as FormArray;
    }

    private static getServiceFormControl(serviceFormGroup: AbstractControl, formControlName: string): FormControl {
        return serviceFormGroup.get(formControlName) as FormControl;
    }

    private static getServiceFormArray(serviceFormGroup: AbstractControl, formControlName: string): FormArray {
        return serviceFormGroup.get(formControlName) as FormArray;
    }

    get deviceTypeAttributes(): FormArray {
        return this.attrFormGroup.get('attributes') as FormArray;
    }

    removeDeviceTypeAttr(i: number) {
        const formArray = this.attrFormGroup.controls['attributes'] as FormArray;
        formArray.removeAt(i);
    }

    addDeviceTypeAttr() {
        const formArray = this.attrFormGroup.controls['attributes'] as FormArray;
        formArray.push(this.createAttrGroup({origin: 'web-ui'} as Attribute));
    }

    removeServiceAttr(service: AbstractControl, i: number) {
        const formArray = (<FormGroup>service).controls['attributes'] as FormArray;
        formArray.removeAt(i);
    }

    addServiceAttr(service: AbstractControl) {
        const formArray = (<FormGroup>service).controls['attributes'] as FormArray;
        formArray.push(this.createAttrGroup({origin: 'web-ui'} as Attribute));
    }

    private updateServiceGroups() {
        this.serviceGroupsAndUngroupedServices = [];

        const m = new Map<string, { key: string; title: string; isGroup: boolean; serviceAndIndices: { service: AbstractControl; index: number }[] }>();
        this.serviceGroups.controls.forEach(group => {
            m.set(group.get('key')?.value, {
                key: group.get('key')?.value,
                title: 'Group: ' + group.get('name')?.value,
                isGroup: true,
                serviceAndIndices: []
            });
        });
        m.set('', {key: '', title: 'Ungrouped Services', isGroup: false, serviceAndIndices: []});
        this.services.controls.forEach((service, index) => {
            let key = (service as FormGroup).getRawValue().service_group_key;
            if (key === undefined || key === null || key === '') {
                key = '';
            }
            m.get(key)?.serviceAndIndices.push({service, index});
        });

        m.forEach(group => this.serviceGroupsAndUngroupedServices.push(group));
    }

    getServiceGroup(key: string) {
        return this.serviceGroups.controls.find(g => g.get('key')?.value === key) as FormGroup;
    }

    moveServiceToGroup($event: CdkDragDrop<any, any>, key: string) {
        const idx = Number($event.item.element.nativeElement.id);
        this.services.at(idx).patchValue({service_group_key: key});
        this.updateServiceGroups();
    }

    private removeContentVariableIds(c?: DeviceTypeContentVariableModel) {
        if (c === undefined) {
            return;
        }
        c.id = undefined;
        c.sub_content_variables?.forEach(sub => this.removeContentVariableIds(sub));
    }
}
