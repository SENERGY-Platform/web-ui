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

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideFormFieldDefaults } from './form-field-defaults';

@Component({
    template: '<mat-form-field><mat-label>Name</mat-label><input matInput></mat-form-field>',
    imports: [MatFormFieldModule, MatInputModule],
    changeDetection: ChangeDetectionStrategy.Eager,
})
class PlainFieldComponent {}

describe('provideFormFieldDefaults', () => {
    it('makes a field without attributes outlined, with a fixed subscript line', () => {
        TestBed.configureTestingModule({ imports: [PlainFieldComponent, NoopAnimationsModule], providers: [provideFormFieldDefaults()] });
        const fixture = TestBed.createComponent(PlainFieldComponent);
        fixture.detectChanges();

        const field = fixture.debugElement.query((el) => el.componentInstance instanceof MatFormField).componentInstance as MatFormField;
        expect(field.appearance).toBe('outline');
        expect(field.subscriptSizing).toBe('fixed');
        expect(fixture.nativeElement.querySelector('.mdc-text-field--outlined')).not.toBeNull();
    });
});
