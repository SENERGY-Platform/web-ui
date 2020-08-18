import {TestBed} from '@angular/core/testing';

import {DeviceTypeHelperService} from './device-type-helper.service';
import {DeviceTypeCharacteristicsModel, DeviceTypeContentVariableModel} from '../../shared/device-type.model';

describe('DeviceTypeHelperService', () => {
    let service: DeviceTypeHelperService;
    const struct1 = getStruct('struct1');
    const struct2 = getStruct('struct2');
    const struct3 = getStruct('struct3');
    const struct4 = getStruct('struct4');
    const struct5 = getStruct('struct5');
    const struct1WithSubStruct2: DeviceTypeContentVariableModel = JSON.parse(JSON.stringify(struct1));
    struct1WithSubStruct2.sub_content_variables = [struct2];
    const struct1WithTwoSubStructs: DeviceTypeContentVariableModel = JSON.parse(JSON.stringify(struct1));
    struct1WithTwoSubStructs.sub_content_variables = [struct2, struct3];
    const struct1WithTwoSubStructsWithSub: DeviceTypeContentVariableModel = JSON.parse(JSON.stringify(struct1WithTwoSubStructs));
    if (struct1WithTwoSubStructsWithSub.sub_content_variables !== undefined) {
        struct1WithTwoSubStructsWithSub.sub_content_variables[1].sub_content_variables = [struct4];
    }

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
        expect(service.checkIfContentExists([], null)).toBe(false);
        expect(service.checkIfContentExists(null, null)).toBe(false);
        expect(service.checkIfContentExists(undefined, '')).toBe(false);
        expect(service.checkIfContentExists([], '')).toBe(false);
        expect(service.checkIfContentExists(null, '')).toBe(false);
        expect(service.checkIfContentExists([{} as DeviceTypeContentVariableModel], 'x')).toBe(true);
    });

    it('test updateTreeData add', () => {
        expect(service.addTreeData([], struct1, [])).toEqual([struct1]);
        expect(service.addTreeData([struct1], struct2, [])).toEqual([struct1, struct2]);
        expect(service.addTreeData([struct1], struct2, [0])).toEqual([struct1WithSubStruct2]);
        expect(service.addTreeData([struct1WithSubStruct2], struct3, [0, 0])).toEqual([({
            name: 'struct1',
            type: 'struct',
            sub_content_variables: [({
                name: 'struct2',
                type: 'struct',
                sub_content_variables: [struct3] as DeviceTypeContentVariableModel[],
            } as DeviceTypeContentVariableModel)]
        } as DeviceTypeContentVariableModel)]);
    });

    it('test updateTreeData update', () => {
        expect(service.updateTreeData([struct1], struct2, [0])).toEqual([struct2]);
        expect(service.updateTreeData([struct1, struct2], struct3, [1])).toEqual([struct1, struct3]);
        expect(service.updateTreeData([struct1WithSubStruct2], struct3, [0, 0])).toEqual([({
            name: 'struct1',
            type: 'struct',
            sub_content_variables: [({
                name: 'struct3',
                type: 'struct',
                sub_content_variables: [] as DeviceTypeContentVariableModel[],
            } as DeviceTypeContentVariableModel)]
        } as DeviceTypeContentVariableModel)]);
        expect(service.updateTreeData([struct1WithTwoSubStructs], struct4, [0, 1])).toEqual([({
            name: 'struct1',
            type: 'struct',
            sub_content_variables: [({
                name: 'struct2',
                type: 'struct',
                sub_content_variables: [] as DeviceTypeContentVariableModel[],
            } as DeviceTypeContentVariableModel),
                ({
                    name: 'struct4',
                    type: 'struct',
                    sub_content_variables: [] as DeviceTypeContentVariableModel[],
                } as DeviceTypeContentVariableModel),
            ]
        } as DeviceTypeContentVariableModel)]);
        expect(service.updateTreeData([struct1WithTwoSubStructsWithSub], struct5, [0, 1, 0])).toEqual([({
            name: 'struct1',
            type: 'struct',
            sub_content_variables: [({
                name: 'struct2',
                type: 'struct',
                sub_content_variables: [] as DeviceTypeContentVariableModel[],
            } as DeviceTypeContentVariableModel),
                ({
                    name: 'struct3',
                    type: 'struct',
                    sub_content_variables: [{
                        name: 'struct5',
                        type: 'struct',
                        sub_content_variables: [] as DeviceTypeContentVariableModel[]
                    }] as DeviceTypeContentVariableModel[],
                } as DeviceTypeContentVariableModel),
            ]
        } as DeviceTypeContentVariableModel)]);
    });


    it('test updateTreeData delete', () => {
        expect(service.deleteTreeData([struct1], [0])).toEqual([]);
        expect(service.deleteTreeData([struct1WithSubStruct2], [0])).toEqual([]);
        expect(service.deleteTreeData([struct1WithSubStruct2], [0, 0])).toEqual([struct1]);
    });

    function getStruct(name: string): DeviceTypeContentVariableModel {
        return {
            name: name,
            type: 'struct',
            sub_content_variables: [] as DeviceTypeContentVariableModel[],
        } as DeviceTypeContentVariableModel;
    }

    it('test set indices', () => {
        const input1 = undefined;
        const input2 = {} as DeviceTypeContentVariableModel;
        const input3 = {
            name: 'struct1',
            sub_content_variables: [{
                name: 'struct2a',
                sub_content_variables: [{name: 'struct3a', id: 'id47'}, {name: 'struct3b', id: 'id48'}]
            },
                {name: 'struct2b'}]
        } as DeviceTypeContentVariableModel;
        service.setIndices(input1);
        expect(service.setIndices(input1)).toBe(undefined);
        service.setIndices(input2);
        expect(input2).toEqual({indices: [0]} as DeviceTypeContentVariableModel);
        service.setIndices(input3);
        expect(input3).toEqual({
            name: 'struct1', indices: [0], sub_content_variables: [{
                name: 'struct2a',
                indices: [0, 0],
                sub_content_variables: [
                    {
                        name: 'struct3a',
                        id: 'id47',
                        indices: [0, 0, 0]
                    },
                    {
                        name: 'struct3b',
                        id: 'id48',
                        indices: [0, 0, 1]
                    }
                ]
            },
                {
                    name: 'struct2b',
                    indices: [0, 1]
                }]
        } as DeviceTypeContentVariableModel);
    });

    it('test remove indices', () => {
        const withIndices = {
            name: 'struct1', indices: [0], sub_content_variables: [{
                name: 'struct2a',
                indices: [0, 0],
                sub_content_variables: [
                    {
                        name: 'struct3a',
                        id: 'id47',
                        indices: [0, 0, 0]
                    },
                    {
                        name: 'struct3b',
                        id: 'id48',
                        indices: [0, 0, 1]
                    }
                ]
            },
                {
                    name: 'struct2b',
                    indices: [0, 1]
                }]
        } as DeviceTypeContentVariableModel;

        const withoutIndices = {
            name: 'struct1',
            sub_content_variables: [{
                name: 'struct2a',
                sub_content_variables: [{name: 'struct3a', id: 'id47'}, {name: 'struct3b', id: 'id48'}]
            },
                {name: 'struct2b'}]
        } as DeviceTypeContentVariableModel;
        service.removeField(withIndices, 'indices');
        expect(withIndices).toEqual(withoutIndices);
    });

    it('test characteristicIdsFlatten', () => {
        expect(service.characteristicsFlatten({
            id: 'urn:infai:ses:characteristic:64928e9f-98ca-42bb-a1e5-adf2a760a2f9',
            name: 'HSB',
            type: 'https://schema.org/StructuredValue',
            sub_characteristics: [
                {
                    id: 'urn:infai:ses:characteristic:d840607c-c8f9-45d6-b9bd-2c2d444e2899',
                    name: 'b',
                    type: 'https://schema.org/Integer',
                    min_value: 0,
                    max_value: 100,
                    rdf_type: 'https://senergy.infai.org/ontology/Characteristic'
                },
                {
                    id: 'urn:infai:ses:characteristic:a66dc568-c0e0-420f-b513-18e8df405538',
                    name: 's',
                    type: 'https://schema.org/Integer',
                    min_value: 0,
                    max_value: 100,
                    rdf_type: 'https://senergy.infai.org/ontology/Characteristic'
                },
                {
                    id: 'urn:infai:ses:characteristic:6ec70e99-8c6a-4909-8d5a-7cc12af76b9a',
                    name: 'h',
                    type: 'https://schema.org/Integer',
                    min_value: 0,
                    max_value: 360,
                    rdf_type: 'https://senergy.infai.org/ontology/Characteristic'
                }
            ],
            rdf_type: 'https://senergy.infai.org/ontology/Characteristic',
        } as DeviceTypeCharacteristicsModel)).toEqual([
            {
                id: 'urn:infai:ses:characteristic:d840607c-c8f9-45d6-b9bd-2c2d444e2899',
                name: 'HSB.b'
            },
            {
                id: 'urn:infai:ses:characteristic:a66dc568-c0e0-420f-b513-18e8df405538',
                name: 'HSB.s'
            },
            {
                id: 'urn:infai:ses:characteristic:6ec70e99-8c6a-4909-8d5a-7cc12af76b9a',
                name: 'HSB.h'
            }]);
        expect(service.characteristicsFlatten(
            {
                id: 'urn:infai:ses:characteristic:0fc343ce-4627-4c88-b1e0-d3ed29754af8',
                name: 'hex',
                type: 'https://schema.org/Text',
                rdf_type: 'https://senergy.infai.org/ontology/Characteristic'
            },
        )).toEqual([{
            id: 'urn:infai:ses:characteristic:0fc343ce-4627-4c88-b1e0-d3ed29754af8',
            name: 'hex'
        }]);
        expect(service.characteristicsFlatten(
            {
                id: 'id:1',
                name: 'ebene1',
                type: 'https://schema.org/StructuredValue',
                rdf_type: 'https://senergy.infai.org/ontology/Characteristic',
                sub_characteristics: [{
                    id: 'id:2',
                    name: 'ebene2',
                    type: 'https://schema.org/StructuredValue',
                    rdf_type: 'https://senergy.infai.org/ontology/Characteristic',
                    sub_characteristics: [{
                        id: 'id3',
                        name: 'field',
                        type: 'https://schema.org/Float',
                        rdf_type: 'https://senergy.infai.org/ontology/Characteristic'
                    }]
                }]
            },
        )).toEqual([{
            id: 'id3',
            name: 'ebene1.ebene2.field'
        }]);
    });


});

