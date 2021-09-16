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
import { typeValueValidator } from './type-value-validator';
import { FormControl, FormGroup } from '@angular/forms';

describe('ImportTypesCreateEditComponent', () => {
    const STRING = 'https://schema.org/Text';
    const INTEGER = 'https://schema.org/Integer';
    const FLOAT = 'https://schema.org/Float';
    const BOOLEAN = 'https://schema.org/Boolean';
    const STRUCTURE = 'https://schema.org/StructuredValue';
    const LIST = 'https://schema.org/ItemList';

    it('should allow empty configurations', () => {
        const validator = typeValueValidator('type', 'value', true);
        const group = new FormGroup({ type: new FormControl(STRING), value: new FormControl('') }, validator);
        expect(group.valid).toBeTrue();
    });

    it('should not allow empty configurations', () => {
        const validator = typeValueValidator('type', 'value', false);
        const group = new FormGroup({ type: new FormControl(STRING), value: new FormControl('') }, validator);
        expect(group.invalid).toBeTrue();
    });

    it('should detect invalid integer', () => {
        const validator = typeValueValidator('type', 'value', false);
        const group = new FormGroup({ type: new FormControl(INTEGER), value: new FormControl('12.3') }, validator);
        expect(group.invalid).toBeTrue();
    });

    it('should allow valid integer', () => {
        const validator = typeValueValidator('type', 'value', false);
        const group = new FormGroup({ type: new FormControl(INTEGER), value: new FormControl('13') }, validator);
        expect(group.valid).toBeTrue();
    });

    it('should detect invalid float', () => {
        const validator = typeValueValidator('type', 'value', false);
        const group = new FormGroup({ type: new FormControl(FLOAT), value: new FormControl('1a3') }, validator);
        expect(group.invalid).toBeTrue();
    });

    it('should allow valid float', () => {
        const validator = typeValueValidator('type', 'value', false);
        const group = new FormGroup({ type: new FormControl(FLOAT), value: new FormControl('13.3') }, validator);
        expect(group.valid).toBeTrue();
    });

    it('should allow valid float with \',\'', () => {
        const validator = typeValueValidator('type', 'value', false);
        const group = new FormGroup({ type: new FormControl(FLOAT), value: new FormControl('13,3') }, validator);
        expect(group.valid).toBeTrue();
    });

    it('should detect invalid bool', () => {
        const validator = typeValueValidator('type', 'value', false);
        const group = new FormGroup({ type: new FormControl(BOOLEAN), value: new FormControl('1a3') }, validator);
        expect(group.invalid).toBeTrue();
    });

    it('should allow valid bool', () => {
        const validator = typeValueValidator('type', 'value', false);
        const group = new FormGroup({ type: new FormControl(BOOLEAN), value: new FormControl('true') }, validator);
        expect(group.valid).toBeTrue();
    });

    it('should detect invalid structure', () => {
        const validator = typeValueValidator('type', 'value', false);
        const group = new FormGroup({ type: new FormControl(STRUCTURE), value: new FormControl('1a3') }, validator);
        expect(group.invalid).toBeTrue();
    });

    it('should allow valid structure', () => {
        const validator = typeValueValidator('type', 'value', false);
        const group = new FormGroup(
            {
                type: new FormControl(STRUCTURE),
                value: new FormControl('{"abc": "def"}'),
            },
            validator,
        );
        expect(group.valid).toBeTrue();
    });

    it('should detect invalid list', () => {
        const validator = typeValueValidator('type', 'value', false);
        const group = new FormGroup({ type: new FormControl(LIST), value: new FormControl('1a3') }, validator);
        expect(group.invalid).toBeTrue();
    });

    it('should allow valid list', () => {
        const validator = typeValueValidator('type', 'value', false);
        const group = new FormGroup({ type: new FormControl(LIST), value: new FormControl('[13.3]') }, validator);
        expect(group.valid).toBeTrue();
    });

    it('should detect invalid type', () => {
        const validator = typeValueValidator('type', 'value', false);
        const group = new FormGroup({ type: new FormControl('abc'), value: new FormControl('1a3') }, validator);
        expect(group.invalid).toBeTrue();
    });
});
