/*
 * Copyright 2026 InfAI (CC SES)
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

import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule} from '@angular/forms';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {By} from '@angular/platform-browser';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MtxSelectModule} from '@ng-matero/extensions/select';
import {OperatorPortsComponent} from './operator-ports.component';

describe('OperatorPortsComponent', () => {
    let fixture: ComponentFixture<OperatorPortsComponent>;
    let component: OperatorPortsComponent;
    const el = () => fixture.nativeElement as HTMLElement;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatTooltipModule, MtxSelectModule, OperatorPortsComponent],
            providers: [provideNoopAnimations()],
        });
        fixture = TestBed.createComponent(OperatorPortsComponent);
        component = fixture.componentInstance;
        component.title = 'Inputs';
        component.noun = 'input';
    });

    it('shows an empty state, also for a list the backend left out', () => {
        component.ports = undefined;
        fixture.detectChanges();
        expect(el().querySelector('.empty')?.textContent).toContain('No inputs defined.');
        expect(el().querySelectorAll('.port-row').length).toBe(0);
    });

    it('leaves out its heading and add button in a form section, which shows them itself', () => {
        component.ports = [{name: 'a', type: 'float'}];
        component.section = true;
        fixture.detectChanges();
        expect(el().querySelector('.ports-header, .add-button')).toBeNull();
        expect(el().querySelectorAll('.port-row').length).toBe(1);
    });

    it('adds a row to a missing list and tells the owner of the list', () => {
        const emitted: unknown[] = [];
        component.portsChange.subscribe(ports => emitted.push(ports));
        component.ports = undefined;
        fixture.detectChanges();

        (el().querySelector('.add-button') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(emitted.length).toBe(1);
        expect(component.ports as unknown).toEqual([{}]);
        expect(el().querySelectorAll('.port-row').length).toBe(1);
        expect(el().querySelector('.empty')).toBeNull();
    });

    it('removes a row', () => {
        component.ports = [{name: 'a', type: 'float'}, {name: 'b', type: 'string'}];
        fixture.detectChanges();
        (el().querySelector('.remove-button') as HTMLButtonElement).click();
        fixture.detectChanges();
        expect(component.ports.map(port => port.name)).toEqual(['b']);
    });

    it('marks the rows that repeat a name and says why', async () => {
        component.ports = [{name: 'a', type: 'float'}, {name: 'b', type: 'float'}, {name: 'a', type: 'float'}];
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const fields = fixture.debugElement.queryAll(By.css('mat-form-field.port-name'));
        expect(fields.map(field => field.nativeElement.classList.contains('mat-form-field-invalid'))).toEqual([true, false, true]);
        expect(el().textContent).toContain('Name is used more than once');
    });

    it('shows no error without a duplicate', () => {
        component.ports = [{name: 'a', type: 'float'}, {name: 'b', type: 'float'}];
        fixture.detectChanges();
        expect(component.isDuplicate(component.ports[0])).toBeFalse();
        expect(el().textContent).not.toContain('Name is used more than once');
    });

    it('shows the rows as text without editors when read only', () => {
        component.readonly = true;
        component.hint = 'Changed through versions';
        component.ports = [{name: 'a', type: 'float'}];
        fixture.detectChanges();
        expect(el().querySelector('.readonly-row')?.textContent).toContain('a');
        expect(el().querySelector('input')).toBeNull();
        expect(el().querySelector('.add-button')).toBeNull();
        expect(el().querySelector('.hint')?.textContent).toBe('Changed through versions');
    });

    describe('rows that are not allowed', () => {
        async function render() {
            fixture.detectChanges();
            await fixture.whenStable();
            fixture.detectChanges();
        }

        it('asks for a name and a type on an empty row', async () => {
            component.ports = [{} as any];
            await render();
            expect(component.nameError(component.ports[0])).toBe('Name required');
            expect(el().querySelector('mat-error')?.textContent).toContain('Name required');
            expect(el().querySelector('.type-required')?.textContent).toContain('Type required');
        });

        it('only warns about a duplicate that is in the stored list already', async () => {
            const stored = [{name: 'a', type: 'float'}, {name: 'a', type: 'float'}];
            component.before = stored;
            component.ports = stored.map(port => ({...port}));
            await render();
            expect(component.nameError(component.ports[0])).toBe('');
            expect(component.nameWarning(component.ports[0])).toContain('already stored');
            expect(el().querySelector('.name-warning')?.textContent).toContain('already stored');
            expect(el().querySelector('mat-form-field.mat-form-field-invalid')).toBeNull();
        });

        it('flags a duplicate the edit introduced as an error', async () => {
            component.before = [{name: 'a', type: 'float'}];
            component.ports = [{name: 'a', type: 'float'}, {name: 'a', type: 'float'}];
            await render();
            expect(component.nameError(component.ports[1])).toBe('Name is used more than once');
            expect(component.nameWarning(component.ports[1])).toBe('');
        });

        it('warns about names that differ only in spaces, without an error', async () => {
            component.ports = [{name: 'a', type: 'float'}, {name: 'a ', type: 'float'}];
            await render();
            expect(component.nameError(component.ports[0])).toBe('');
            expect(component.nameWarning(component.ports[1])).toContain('only in spaces');
        });

        it('only hints at a stored row without a type or name, and blocks it once it is edited', async () => {
            component.before = [{name: 'a'} as any, {type: 'float'} as any];
            component.ports = [{name: 'a'} as any, {type: 'float'} as any];
            await render();
            expect(component.typeError(component.ports[0])).toBe('');
            expect(component.typeWarning(component.ports[0])).toBe('Type missing (already stored)');
            expect(component.nameError(component.ports[1])).toBe('');
            expect(component.nameWarning(component.ports[1])).toBe('Name missing (already stored)');
            expect(el().querySelector('.type-required')).toBeNull();
            expect(el().querySelector('mat-form-field.mat-form-field-invalid')).toBeNull();

            component.ports[0].name = 'b';
            await render();
            expect(component.typeError(component.ports[0])).toBe('Type required');
            expect(component.typeWarning(component.ports[0])).toBe('');
        });
    });
});
