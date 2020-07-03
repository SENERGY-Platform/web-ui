import {TestBed} from '@angular/core/testing';

import {DeviceTypeHelperService} from './device-type-helper.service';
import {DeviceTypeContentVariableModel} from '../../shared/device-type.model';

describe('DeviceTypeHelperService', () => {
    let service: DeviceTypeHelperService;
    const struct1 = getStruct('struct1');
    const struct2 = getStruct('struct2');
    const struct3 = getStruct('struct3');
    const struct1WithSubStruct2: DeviceTypeContentVariableModel = JSON.parse(JSON.stringify(struct1));
    struct1WithSubStruct2.sub_content_variables = [struct2];

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(DeviceTypeHelperService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('test isEditable', () => {
        expect(service.isEditable('')).toBe(false);
        expect(service.isEditable('xxx')).toBe(false);
        expect(service.isEditable('create')).toBe(true);
        expect(service.isEditable('copy')).toBe(true);
        expect(service.isEditable('edit')).toBe(true);
        expect(service.isEditable('details')).toBe(false);
    });

    it('test checkIfContentExists', () => {
        expect(service.checkIfContentExists(undefined, null)).toBe(false);
        expect(service.checkIfContentExists('', null)).toBe(false);
        expect(service.checkIfContentExists(null, null)).toBe(false);
        expect(service.checkIfContentExists(undefined, '')).toBe(false);
        expect(service.checkIfContentExists('', '')).toBe(false);
        expect(service.checkIfContentExists(null, '')).toBe(false);
        expect(service.checkIfContentExists('x', 'x')).toBe(true);
    });

    fit('test updateTreeData add', () => {
        expect(service.addTreeData([], struct1, 0)).toEqual([struct1]);
        expect(service.addTreeData([struct1], struct2, 0)).toEqual([struct1, struct2]);
        expect(service.addTreeData([struct1], struct2, 1)).toEqual([struct1WithSubStruct2]);
        expect(service.addTreeData([struct1WithSubStruct2], struct3, 2)).toEqual([({
            name: 'struct1',
            type: 'struct',
            sub_content_variables: [({
                name: 'struct2',
                type: 'struct',
                sub_content_variables: [struct3] as DeviceTypeContentVariableModel[],
            } as DeviceTypeContentVariableModel)]
        } as DeviceTypeContentVariableModel)]);
    });

    fit('test updateTreeData update', () => {
        expect(service.updateTreeData([struct1], struct2, 0, 0)).toEqual([struct2]);
        expect(service.updateTreeData([struct1, struct2], struct3, 0, 1)).toEqual([struct1, struct3]);
        expect(service.updateTreeData([struct1WithSubStruct2], struct3, 1, 0)).toEqual([({
            name: 'struct1',
            type: 'struct',
            sub_content_variables: [({
                name: 'struct3',
                type: 'struct',
                sub_content_variables: [] as DeviceTypeContentVariableModel[],
            } as DeviceTypeContentVariableModel)]
        } as DeviceTypeContentVariableModel)]);
    });

    fit('test updateTreeData delete', () => {
        expect(service.deleteTreeData([struct1], 0, 0)).toEqual([]);
        expect(service.deleteTreeData([struct1WithSubStruct2], 0, 0)).toEqual([]);
        expect(service.deleteTreeData([struct1WithSubStruct2], 1, 0)).toEqual([struct1]);
    });

    function getStruct(name: string): DeviceTypeContentVariableModel {
        return {
            name: name,
            type: 'struct',
            sub_content_variables: [] as DeviceTypeContentVariableModel[],
        } as DeviceTypeContentVariableModel;
    }


});

