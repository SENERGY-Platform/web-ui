import {Injectable} from '@angular/core';
import {DeviceTypeContentVariableModel} from '../../shared/device-type.model';

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

    checkIfContentExists(contentVariableRaw: (string | null | undefined), serialization: string | null): boolean {
        if ((contentVariableRaw === null || contentVariableRaw === '' || contentVariableRaw === undefined) &&
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

    private manipulateElement(element: DeviceTypeContentVariableModel[], newData: DeviceTypeContentVariableModel, option: string, indices: number[]): void {
        if (indices.length === 1) {
            switch (option) {
                case 'add': {
                    element.push(newData || {} as DeviceTypeContentVariableModel);
                    break;
                }
                case 'update': {
                    element[indices[0]] = newData;
                    break;
                }
                case 'delete': {
                    element.splice(indices[0], 1);
                }
            }
        } else {
            this.manipulateElement(element[indices[0]].sub_content_variables || [], newData, option, indices.slice(1));
        }

    }
}
