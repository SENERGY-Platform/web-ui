import {Injectable} from '@angular/core';
import {DeviceTypeCharacteristicsModel, DeviceTypeConceptModel, DeviceTypeContentVariableModel} from '../../shared/device-type.model';
import * as _ from 'lodash';
import {ConceptsCharacteristicsModel} from '../../../concepts/shared/concepts-characteristics.model';

@Injectable({
    providedIn: 'root'
})
export class DeviceTypeHelperService {

    constructor() {
    }

    isEditable(queryParamFunction: string): boolean {
        let editable;
        switch (queryParamFunction) {
            case 'copy': {
                editable = true;
                break;
            }
            case 'edit': {
                editable = true;
                break;
            }
            case 'create': {
                editable = true;
                break;
            }
            case 'details': {
                editable = false;
                break;
            }
            default: {
                editable = false;
            }
        }
        return editable;
    }

    checkIfContentExists(contentVariable: DeviceTypeContentVariableModel[] | null | undefined, serialization: string | null): boolean {
        if ((contentVariable === undefined || contentVariable === null || contentVariable.length === 0) ||
            (serialization === null || serialization === '')) {
            return false;
        } else {
            return true;
        }
    }


    addTreeData(oldData: DeviceTypeContentVariableModel[], newData: DeviceTypeContentVariableModel, indices: number[]): DeviceTypeContentVariableModel[] {
        const dataDeepCopy: DeviceTypeContentVariableModel[] = JSON.parse(JSON.stringify(oldData));
        this.manipulateElement(dataDeepCopy, newData, 'add', indices);
        return dataDeepCopy;
    }

    deleteTreeData(oldData: DeviceTypeContentVariableModel[], indices: number[]): DeviceTypeContentVariableModel[] {
        const dataDeepCopy: DeviceTypeContentVariableModel[] = JSON.parse(JSON.stringify(oldData));
        this.manipulateElement(dataDeepCopy, {} as DeviceTypeContentVariableModel, 'delete', indices);
        return dataDeepCopy;
    }

    updateTreeData(oldData: DeviceTypeContentVariableModel[], newData: DeviceTypeContentVariableModel, indices: number[]): DeviceTypeContentVariableModel[] {
        const dataDeepCopy: DeviceTypeContentVariableModel[] = JSON.parse(JSON.stringify(oldData));
        this.manipulateElement(dataDeepCopy, newData, 'update', indices);
        return dataDeepCopy;
    }


    setIndices(contentVariable: DeviceTypeContentVariableModel | undefined, indexIn: number[] = [0]): void {
        if (contentVariable) {
            contentVariable.indices = indexIn;
            if (contentVariable.sub_content_variables) {
                contentVariable.sub_content_variables.forEach((sub: DeviceTypeContentVariableModel, index: number) => {
                    const array = indexIn.slice();
                    array.push(index);
                    this.setIndices(sub, array);
                });
            }
        }
    }

    removeField(contentVariable: DeviceTypeContentVariableModel, field: string): void {
        switch (field) {
            case 'indices': {
                delete contentVariable['indices'];
                break;
            }
            case 'id': {
                delete contentVariable['id'];
                break;
            }
        }

        if (contentVariable.sub_content_variables) {
            for (let i = 0; i < contentVariable.sub_content_variables.length; i++) {
                this.removeField(contentVariable.sub_content_variables[i], field);
            }
        }
    }

    characteristicsFlatten(characteristics: DeviceTypeCharacteristicsModel, parentName: string = ''): { id: string, name: string }[] {
        if (characteristics.sub_characteristics === undefined || characteristics.sub_characteristics === null) {
            return [{id: characteristics.id, name: parentName + characteristics.name}];
        } else {
            let array: { id: string, name: string }[] = [];
            parentName += characteristics.name + '.';
            characteristics.sub_characteristics.forEach((subCharacteristic: DeviceTypeCharacteristicsModel) => {
                array = array.concat(this.characteristicsFlatten(subCharacteristic, parentName));
            });
            return array;
        }
    }

    private manipulateElement(element: DeviceTypeContentVariableModel[], newData: DeviceTypeContentVariableModel, option: string, indices: number[]): void {
        if (indices.length <= 1) {
            switch (option) {
                case 'add': {
                    if (indices.length === 0) {
                        element.push(newData || {} as DeviceTypeContentVariableModel);
                    } else {
                        const subContentVariables = element[indices[0]].sub_content_variables;
                        if (subContentVariables) {
                            subContentVariables.push(newData || {} as DeviceTypeContentVariableModel);
                        }
                    }
                    break;
                }
                case 'update': {
                    element[indices[0]] = newData;
                    break;
                }
                case 'delete': {
                    element.splice(indices[0], 1);
                    break;
                }
            }
        } else {
            this.manipulateElement(element[indices[0]].sub_content_variables || [], newData, option, indices.slice(1));
        }

    }
}
