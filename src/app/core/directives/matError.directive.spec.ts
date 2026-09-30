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

import { Component, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MtxSelectModule } from '@ng-matero/extensions/select';
import { MatErrorMessagesDirective } from './matError.directive';

@Component({
    template: `
        <mat-form-field>
            <mat-label>User</mat-label>
            <mtx-select [formControl]="control" [items]="['a', 'b']"></mtx-select>
            <mat-error senergyError label="User"></mat-error>
        </mat-form-field>`,
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
class ReactiveSelectHostComponent {
    @ViewChild(MatErrorMessagesDirective) error!: MatErrorMessagesDirective;
    control = new FormControl<string | null>(null, Validators.required);
}

@Component({
    template: `
        <mat-form-field>
            <mat-label>Role</mat-label>
            <mtx-select [(ngModel)]="value" [items]="['a', 'b']" required></mtx-select>
            <mat-error senergyError label="Role"></mat-error>
        </mat-form-field>`,
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
class NgModelSelectHostComponent {
    @ViewChild(MatErrorMessagesDirective) error!: MatErrorMessagesDirective;
    value: string | null = null;
}

@Component({
    template: `
        <mat-form-field>
            <mat-label>Name</mat-label>
            <input matInput [formControl]="control">
            <mat-error senergyError label="Name"></mat-error>
        </mat-form-field>`,
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
class ReactiveInputHostComponent {
    @ViewChild(MatErrorMessagesDirective) error!: MatErrorMessagesDirective;
    control = new FormControl<string>('', Validators.required);
}

// SNRGY-4466: the directive reads the control through the form field's MtxSelect, which broke once with a matero update.
describe('MatErrorMessagesDirective', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [MatErrorMessagesDirective, ReactiveSelectHostComponent, NgModelSelectHostComponent, ReactiveInputHostComponent],
            imports: [NoopAnimationsModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MtxSelectModule],
        }).compileComponents();
    });

    // mat-error is only projected while the field shows an error, so the debug tree cannot find it; a view query can.
    function directiveOf(fixture: ComponentFixture<{ error: MatErrorMessagesDirective }>): MatErrorMessagesDirective {
        return fixture.componentInstance.error;
    }

    it('finds the reactive control of an mtx-select and names the missing value', () => {
        const fixture = TestBed.createComponent(ReactiveSelectHostComponent);
        expect(() => fixture.detectChanges()).not.toThrow();
        const directive = directiveOf(fixture);
        expect(directive.formControl).toBe(fixture.componentInstance.control);

        fixture.componentInstance.control.markAsTouched();

        expect(directive.error).toBe('User is required!');
    });

    it('finds the ngModel control of an mtx-select', async () => {
        const fixture = TestBed.createComponent(NgModelSelectHostComponent);
        expect(() => fixture.detectChanges()).not.toThrow();
        await fixture.whenStable();
        const directive = directiveOf(fixture);
        expect(directive.formControl).not.toBeNull();

        directive.formControl.markAsTouched();

        expect(directive.error).toBe('Role is required!');
    });

    it('finds the reactive control of a matInput', () => {
        const fixture = TestBed.createComponent(ReactiveInputHostComponent);
        fixture.detectChanges();
        const directive = directiveOf(fixture);
        expect(directive.formControl).toBe(fixture.componentInstance.control);

        fixture.componentInstance.control.markAsTouched();

        expect(directive.error).toBe('Name is required!');
    });
});
