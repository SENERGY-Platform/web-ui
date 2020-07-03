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


    addTreeData(oldData: DeviceTypeContentVariableModel[], newData: DeviceTypeContentVariableModel, level: number): DeviceTypeContentVariableModel[] {
        const dataDeepCopy: DeviceTypeContentVariableModel[] = JSON.parse(JSON.stringify(oldData));
        this.manipulateElement(dataDeepCopy, newData, 'add', level, -1);
        return dataDeepCopy;
    }

    deleteTreeData(oldData: DeviceTypeContentVariableModel[], level: number, index: number): DeviceTypeContentVariableModel[] {
        const dataDeepCopy: DeviceTypeContentVariableModel[] = JSON.parse(JSON.stringify(oldData));
        this.manipulateElement(dataDeepCopy, {} as DeviceTypeContentVariableModel, 'delete', level, index);
        return dataDeepCopy;
    }

    updateTreeData(oldData: DeviceTypeContentVariableModel[], newData: DeviceTypeContentVariableModel, level: number, index: number): DeviceTypeContentVariableModel[] {
        const dataDeepCopy: DeviceTypeContentVariableModel[] = JSON.parse(JSON.stringify(oldData));
        this.manipulateElement(dataDeepCopy, newData, 'update', level, index);
        return dataDeepCopy;
    }

    private manipulateElement(element: DeviceTypeContentVariableModel[], newData: DeviceTypeContentVariableModel, option: string, level: number, index: number): void {
        if (level === 0) {
            switch (option) {
                case 'add': {
                    element.push(newData || {} as DeviceTypeContentVariableModel);
                    break;
                }
                case 'update': {
                    element[index] = newData;
                    break;
                }
                case 'delete': {
                    element.splice(index, 1);
                }
            }
        } else {
            this.manipulateElement(element[0].sub_content_variables || [], newData, option, level - 1, index);
        }

    }
}
