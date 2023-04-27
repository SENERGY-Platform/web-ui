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
import {ChangeDetectorRef, Component, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {FormArray, FormGroup, UntypedFormBuilder, Validators} from '@angular/forms';
import {
    ImportTypeConfigModel,
    ImportTypeContentVariableModel,
    ImportTypeModel
} from '../import-types/shared/import-types.model';
import {ImportTypesService} from '../import-types/shared/import-types.service';
import {AspectsService} from '../../metadata/aspects/shared/aspects.service';
import {MatLegacyDialog as MatDialog, MatLegacyDialogConfig as MatDialogConfig} from '@angular/material/legacy-dialog';
import {ContentVariableDialogComponent} from './content-variable-dialog/content-variable-dialog.component';
import {environment} from '../../../../environments/environment';
import {MatTree, MatTreeNestedDataSource} from '@angular/material/tree';
import {NestedTreeControl} from '@angular/cdk/tree';
import {Observable} from 'rxjs';
import {MatLegacySnackBar as MatSnackBar} from '@angular/material/legacy-snack-bar';
import {convertPunctuation, typeValueValidator} from '../validators/type-value-validator';
import {ConceptsService} from '../../metadata/concepts/shared/concepts.service';
import {
    DeviceTypeAspectModel,
    DeviceTypeCharacteristicsModel,
    DeviceTypeFunctionModel
} from '../../metadata/device-types-overview/shared/device-type.model';
import {DeviceTypeService} from '../../metadata/device-types-overview/shared/device-type.service';

@Component({
    selector: 'senergy-import-types-create-edit',
    templateUrl: './import-types-create-edit.component.html',
    styleUrls: ['./import-types-create-edit.component.css'],
})
export class ImportTypesCreateEditComponent implements OnInit {
    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private fb: UntypedFormBuilder,
        private importTypesService: ImportTypesService,
        private aspectsService: AspectsService,
        private conceptsService: ConceptsService,
        private dialog: MatDialog,
        private changeDetectorRef: ChangeDetectorRef,
        private snackBar: MatSnackBar,
        private deviceTypeService: DeviceTypeService,
    ) {}

    static STRING = 'https://schema.org/Text';
    static INTEGER = 'https://schema.org/Integer';
    static FLOAT = 'https://schema.org/Float';
    static BOOLEAN = 'https://schema.org/Boolean';
    static STRUCTURE = 'https://schema.org/StructuredValue';
    static LIST = 'https://schema.org/ItemList';

    ready = false;
    id: string | null = null;
    editMode = false;
    detailsMode = false;
    functions: DeviceTypeFunctionModel[] = [];
    aspects: DeviceTypeAspectModel[] = [];
    typeConceptCharacteristics: Map<string, Map<string, DeviceTypeCharacteristicsModel[]>> = new Map();
    characteristics: Map<string, DeviceTypeCharacteristicsModel> = new Map();

    types: { id: string; name: string }[] = [
        { id: ImportTypesCreateEditComponent.STRING, name: 'string' },
        { id: ImportTypesCreateEditComponent.INTEGER, name: 'int' },
        { id: ImportTypesCreateEditComponent.FLOAT, name: 'float' },
        { id: ImportTypesCreateEditComponent.BOOLEAN, name: 'bool' },
        { id: ImportTypesCreateEditComponent.STRUCTURE, name: 'Structure' },
        { id: ImportTypesCreateEditComponent.LIST, name: 'List' },
    ];

    form = this.fb.group({
        id: '',
        name: [undefined, Validators.required],
        description: '',
        image: [undefined, Validators.required],
        default_restart: true,
        configs: this.fb.array([]),
        owner: '',
    });

    timeAspect = this.fb.control(null);

    usesDefaultOutput = true;
    defaultOutput: ImportTypeContentVariableModel = {
        name: 'root',
        type: ImportTypesCreateEditComponent.STRUCTURE,
        characteristic_id: '',
        use_as_tag: false,
        sub_content_variables: [
            {
                name: 'import_id',
                type: ImportTypesCreateEditComponent.STRING,
                sub_content_variables: [],
                characteristic_id: '',
                use_as_tag: false,
            },
            {
                name: 'time',
                type: ImportTypesCreateEditComponent.STRING,
                sub_content_variables: [],
                characteristic_id: environment.timeStampCharacteristicId,
                function_id: environment.getTimestampFunctionId,
                use_as_tag: false,
            },
            {
                name: 'value',
                type: ImportTypesCreateEditComponent.STRUCTURE,
                sub_content_variables: [],
                characteristic_id: '',
                use_as_tag: false,
            },
        ],
    };

    treeControl = new NestedTreeControl<ImportTypeContentVariableModel>((node) => node.sub_content_variables);
    dataSource = new MatTreeNestedDataSource<ImportTypeContentVariableModel>();

    @ViewChild(MatTree, { static: false }) tree!: MatTree<ImportTypeContentVariableModel>;
    hasChild = (_: number, node: ImportTypeContentVariableModel) => !!node.sub_content_variables && node.sub_content_variables.length > 0;

    ngOnInit(): void {
        this.route.url.subscribe((url) => {
            if (url[url.length - 1]?.toString() === 'new') {
                this.editMode = false;
                if (this.defaultOutput.sub_content_variables !== null) {
                    this.dataSource.data = this.defaultOutput.sub_content_variables[2].sub_content_variables || [];
                }
                this.ready = true;
            } else {
                this.id = this.route.snapshot.paramMap.get('id');
                if (this.id === null || !this.id.startsWith('urn:infai:ses:import-type:')) {
                    console.error('edit mode opened with invalid id', this.id);
                }
                if (url[url.length - 2]?.toString() === 'details') {
                    this.detailsMode = true;
                    this.form.disable();
                } else if (url[url.length - 2]?.toString() === 'edit') {
                    this.editMode = true;
                }
                this.importTypesService.getImportType(this.id || '').subscribe(
                    (type) => {
                        this.form.patchValue(type);
                        type.configs.forEach((config) => this.addConfig(config));
                        const value = type.output.sub_content_variables?.find(
                            (sub) => sub.name === 'value' && sub.type === ImportTypesCreateEditComponent.STRUCTURE,
                        );
                        if (type.output.name === 'root' && type.output.sub_content_variables?.length === 3 && value !== undefined) {
                            this.dataSource.data = value.sub_content_variables || [];
                            this.timeAspect.setValue(type.output.sub_content_variables[1].aspect_id);
                        } else {
                            this.usesDefaultOutput = false;
                            this.dataSource.data = [type.output];
                        }

                        this.ready = true;
                    },
                    (err) => {
                        console.log(err);
                        this.snackBar.open('Error loading import type', 'close', { panelClass: 'snack-bar-error' });
                        this.navigateToList();
                    },
                );
            }
        });
        this.deviceTypeService.getMeasuringFunctions().subscribe(
            (functions) => {
                this.functions = functions;
            },
            (err) => {
                console.log(err);
                this.snackBar.open('Error loading functions', 'close', { panelClass: 'snack-bar-error' });
                this.navigateToList();
            },
        );
        this.deviceTypeService.getAspects().subscribe(
            (aspects) => (this.aspects = aspects),
            (err) => {
                console.log(err);
                this.snackBar.open('Error loading aspects', 'close', { panelClass: 'snack-bar-error' });
                this.navigateToList();
            },
        );
        this.types.forEach((type) => this.typeConceptCharacteristics.set(type.id, new Map()));
        this.conceptsService.getConceptsWithCharacteristics().subscribe(
            (concepts) =>
                concepts.forEach((concept) => {
                    concept.characteristics.forEach((characteristic) => {
                        this.saveFlattenedCharacteristics(characteristic);
                        const m = this.typeConceptCharacteristics.get(characteristic.type);
                        let arr = m?.get(concept.name);
                        if (arr === undefined) {
                            m?.set(concept.name, []);
                            arr = m?.get(concept.name);
                        }
                        arr?.push(characteristic);
                    });
                }),
            (err) => {
                console.log(err);
                this.snackBar.open('Error loading characteristics', 'close', { panelClass: 'snack-bar-error' });
                this.navigateToList();
            },
        );
    }

    save() {
        this.ready = false;
        const val: ImportTypeModel = this.form.getRawValue();
        val.configs.forEach((config: ImportTypeConfigModel) => {
            if (config.type !== ImportTypesCreateEditComponent.STRING) {
                let toParse = config.default_value;
                if (config.type === ImportTypesCreateEditComponent.FLOAT) {
                    toParse = convertPunctuation(toParse);
                }
                config.default_value = JSON.parse(toParse);
            }
        });
        if (this.usesDefaultOutput) {
            if (this.defaultOutput.sub_content_variables === null || this.defaultOutput.sub_content_variables.length !== 3) {
                console.error('invalid default output');
                return;
            }
            this.defaultOutput.sub_content_variables[2].sub_content_variables = this.dataSource.data;
            this.defaultOutput.sub_content_variables[1].aspect_id = this.timeAspect.value;
            this.defaultOutput.sub_content_variables[1].function_id = environment.getTimestampFunctionId;
            val.output = this.defaultOutput;
        } else {
            val.output = this.dataSource.data[0];
        }
        this.importTypesService.saveImportType(val).subscribe(
            () => this.navigateToList(),
            (err: any) => {
                console.error(err);
                this.snackBar.open('Error saving: ' + err.error, 'close', { panelClass: 'snack-bar-error' });
                this.ready = true;
            },
        );
    }

    navigateToList(): boolean {
        this.router.navigateByUrl('imports/types/list');
        return false;
    }

    addConfig(config: ImportTypeConfigModel | undefined) {
        const group = this.fb.group(
            {
                name: [undefined, Validators.required],
                description: '',
                type: [undefined, Validators.required],
                default_value: '',
            },
            { validators: typeValueValidator('type', 'default_value') },
        );
        if (this.detailsMode) {
            group.disable();
        }
        if (config !== undefined) {
            group.patchValue({ name: config.name, description: config.description, type: config.type });
            if (config.type !== ImportTypesCreateEditComponent.STRING) {
                group.patchValue({ default_value: JSON.stringify(config.default_value) });
            } else {
                group.patchValue({ default_value: config.default_value });
            }
        }

        this.getConfigsFormArray().push(group);
    }

    getConfigsFormArray(): FormArray {
        return this.form.get('configs') as FormArray;
    }

    getConfigsFormArrayGroups(): FormGroup[] {
        return this.getConfigsFormArray().controls as FormGroup[];
    }

    deleteConfig(index: number) {
        this.getConfigsFormArray().controls.splice(index, 1);
    }

    editContentVariable(sub: ImportTypeContentVariableModel) {
        this.openDialog(sub, false, !this.isTopLevel(sub)).subscribe((val) => {
            if (val !== undefined) {
                if (!this.isComplex(val)) {
                    val.sub_content_variables?.forEach((child) => this.deleteContentVariable(child));
                    val.sub_content_variables = [];
                }
                this.autoFillContent(val);
                sub = val;
                const data = this.dataSource.data;
                this.dataSource.data = [];
                this.dataSource.data = data; // forces redraw
            }
        });
    }

    addSubContentVariable(sub: ImportTypeContentVariableModel) {
        this.openDialog(undefined).subscribe((val) => {
            if (val !== undefined) {
                this.autoFillContent(val);
                if (sub.sub_content_variables === null || sub.sub_content_variables === undefined) {
                    sub.sub_content_variables = [val];
                } else {
                    sub.sub_content_variables.push(val);
                }
                const data = this.dataSource.data;
                this.dataSource.data = [];
                this.dataSource.data = data; // forces redraw
            }
        });
    }

    addOutput() {
        this.openDialog(undefined, false, false).subscribe((val) => {
            if (val !== undefined) {
                this.autoFillContent(val);
                const data = this.dataSource.data;
                data.push(val);
                this.dataSource.data = data; // forces redraw
            }
        });
    }

    private openDialog(
        content: ImportTypeContentVariableModel | undefined,
        infoOnly = false,
        nameTimeAllowed = true,
    ): Observable<ImportTypeContentVariableModel | undefined> {
        const config: MatDialogConfig = {
            data: {
                typeConceptCharacteristics: this.typeConceptCharacteristics,
                content,
                infoOnly,
                nameTimeAllowed,
                aspects: this.aspects,
                functions: this.functions,
            },
            minHeight: '400px',
        };
        return this.dialog.open(ContentVariableDialogComponent, config).afterClosed();
    }

    deleteContentVariable(node: ImportTypeContentVariableModel) {
        this.dataSource.data.forEach((sub, i) => {
            if (sub === node) {
                this.dataSource.data.splice(i, 1);
            } else {
                this.findAndDeleteChild(sub, node);
            }
        });
        const data = this.dataSource.data;
        this.dataSource.data = [];
        this.dataSource.data = data; // forces redraw
    }

    private findAndDeleteChild(data: ImportTypeContentVariableModel, searchElement: ImportTypeContentVariableModel) {
        if (data.sub_content_variables === null || data.sub_content_variables === undefined) {
            return;
        }
        const i = data.sub_content_variables.indexOf(searchElement);
        if (i === -1) {
            data.sub_content_variables.forEach((sub) => this.findAndDeleteChild(sub, searchElement));
        } else {
            data.sub_content_variables.splice(i, 1);
        }
    }

    viewContentVariable(node: ImportTypeContentVariableModel) {
        this.openDialog(node, true);
    }

    isComplex(node: ImportTypeContentVariableModel): boolean {
        return node.type === ImportTypesCreateEditComponent.STRUCTURE || node.type === ImportTypesCreateEditComponent.LIST;
    }

    private isTopLevel(sub: ImportTypeContentVariableModel): boolean {
        return this.dataSource.data.indexOf(sub) !== -1;
    }

    private saveFlattenedCharacteristics(characteristic: DeviceTypeCharacteristicsModel) {
        this.characteristics.set(characteristic.id || '', characteristic);
        characteristic.sub_characteristics?.forEach((sub) => this.saveFlattenedCharacteristics(sub));
    }

    private autoFillContent(content: ImportTypeContentVariableModel, overrideId?: string) {
        if (
            content === undefined ||
            (content.sub_content_variables !== undefined &&
                content.sub_content_variables !== null &&
                content.sub_content_variables?.length > 0) ||
            (content.characteristic_id?.length === 0 && overrideId === undefined)
        ) {
            return;
        }
        content.sub_content_variables = [];
        const characteristic = this.characteristics.get(overrideId || content.characteristic_id || '');
        characteristic?.sub_characteristics?.forEach((subCharacteristic) => {
            const sub: ImportTypeContentVariableModel = {
                name: subCharacteristic.name,
                characteristic_id: '', // can't validate sub-characteristics with id
                type: subCharacteristic.type,
                use_as_tag: false,
                sub_content_variables: [],
            };
            this.autoFillContent(sub, subCharacteristic.id);
            content.sub_content_variables?.push(sub);
        });
    }
}
