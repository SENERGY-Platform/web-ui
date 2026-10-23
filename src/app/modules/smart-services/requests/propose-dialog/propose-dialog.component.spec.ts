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


import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { MAX_TEST_DESCRIPTION_LENGTH, ProposeDialogComponent, testParametersError } from './propose-dialog.component';
import { ContentReviewService } from '../shared/content-review.service';

describe('ProposeDialogComponent', () => {
    let fixture: ComponentFixture<ProposeDialogComponent>;
    let component: ProposeDialogComponent;
    let propose: jasmine.Spy;
    let close: jasmine.Spy;

    function init(answer: unknown = { id: 'req-1' }) {
        propose = jasmine.createSpy('propose').and.returnValue(of(answer));
        close = jasmine.createSpy('close');
        TestBed.configureTestingModule({
            schemas: [NO_ERRORS_SCHEMA],
            imports: [NoopAnimationsModule, ProposeDialogComponent],
            providers: [
                { provide: ContentReviewService, useValue: { propose } },
                { provide: MatDialogRef, useValue: { close } },
                { provide: MAT_DIALOG_DATA, useValue: { releaseId: 'rel-1', name: 'Heating' } },
                { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
            ],
        });
        fixture = TestBed.createComponent(ProposeDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    const proposeButton = (): HTMLButtonElement => fixture.nativeElement.querySelector('mat-dialog-actions button[matButton="filled"]');

    function fill(description: string, parameters = '') {
        component.description = description;
        component.testParameters = parameters;
        fixture.detectChanges();
    }

    it('names the smart service and offers Propose only with a test description', () => {
        init();

        expect(fixture.nativeElement.textContent).toContain('Heating');
        expect(proposeButton().disabled).toBeTrue();

        fill('   ');
        expect(proposeButton().disabled).toBeTrue();

        fill('Check the heating');
        expect(proposeButton().disabled).toBeFalse();
    });

    it('accepts a description of exactly 10000 characters and refuses one more', () => {
        init();

        fill('a'.repeat(MAX_TEST_DESCRIPTION_LENGTH));
        expect(component.canPropose()).toBeTrue();

        fill('a'.repeat(MAX_TEST_DESCRIPTION_LENGTH + 1));
        expect(component.canPropose()).toBeFalse();
        expect(proposeButton().disabled).toBeTrue();
    });

    it('counts characters, not UTF-16 units, as the service does', () => {
        init();

        fill('\u{1F600}'.repeat(MAX_TEST_DESCRIPTION_LENGTH));

        expect(component.descriptionLength).toBe(MAX_TEST_DESCRIPTION_LENGTH);
        expect(component.canPropose()).toBeTrue();
    });

    it('takes empty parameters and a JSON object', () => {
        expect(testParametersError('')).toBeNull();
        expect(testParametersError('  \n ')).toBeNull();
        expect(testParametersError('{}')).toBeNull();
        expect(testParametersError(' {"a": [1, 2], "b": {"c": null}} ')).toBeNull();
    });

    it('refuses anything but an object as parameters', () => {
        expect(testParametersError('[1]')).toContain('JSON object');
        expect(testParametersError('"text"')).toContain('JSON object');
        expect(testParametersError('42')).toContain('JSON object');
        expect(testParametersError('null')).toContain('JSON object');
        expect(testParametersError('{"a":')).toContain('no valid JSON');
        expect(testParametersError('{a: 1}')).toContain('no valid JSON');
    });

    it('shows the parameter error and blocks Propose until the parameters are fixed', () => {
        init();

        fill('Check', '[1]');
        expect(fixture.nativeElement.querySelector('.parameters-error')?.textContent).toContain('JSON object');
        expect(proposeButton().disabled).toBeTrue();

        fill('Check', '{"a":1}');
        expect(fixture.nativeElement.querySelector('.parameters-error')).toBeNull();
        expect(proposeButton().disabled).toBeFalse();
    });

    it('sends the description and the parameters as typed and closes with the new request on a 201', () => {
        init({ id: 'req-1' });
        fill('Check', ' {"big": 12345678901234567890} ');

        component.propose();

        expect(propose).toHaveBeenCalledOnceWith('rel-1', 'Check', '{"big": 12345678901234567890}');
        expect(close).toHaveBeenCalledOnceWith({ id: 'req-1' });
    });

    it('sends no parameters when the editor is empty', () => {
        init();
        fill('Check', '  ');

        component.propose();

        expect(propose).toHaveBeenCalledOnceWith('rel-1', 'Check', undefined);
    });

    it('stays open after a refusal such as a 409 and allows another try', () => {
        init(null);
        fill('Check');

        component.propose();

        expect(propose).toHaveBeenCalledTimes(1);
        expect(close).not.toHaveBeenCalled();
        expect(component.sending).toBeFalse();
        expect(component.canPropose()).toBeTrue();
    });

    it('sends nothing while the input is invalid', () => {
        init();
        fill('', '{}');

        component.propose();

        expect(propose).not.toHaveBeenCalled();
    });

    it('closes without a result on Cancel', () => {
        init();

        component.cancel();

        expect(close).toHaveBeenCalledOnceWith();
    });
});
