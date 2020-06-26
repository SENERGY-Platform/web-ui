import {Injectable} from '@angular/core';

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
}
