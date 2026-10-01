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

import { ApplicationInitStatus, ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { provideIconFontSet } from './icon-font-set';

@Component({
    template: '<mat-icon>home</mat-icon>',
    imports: [MatIconModule],
    changeDetection: ChangeDetectionStrategy.Eager,
})
class IconHostComponent {}

describe('provideIconFontSet', () => {
    // The app loads this family from assets/fonts/google-icons.css, which makes Material infer material-symbols-outlined.
    const symbols = new FontFace('Material Symbols Outlined', 'local(none)');

    beforeEach(() => document.fonts.add(symbols));
    afterEach(() => document.fonts.delete(symbols));

    it('keeps mat-icon on the material-icons class while Material Symbols is loaded', async () => {
        TestBed.configureTestingModule({ imports: [IconHostComponent], providers: [provideIconFontSet()] });
        await TestBed.inject(ApplicationInitStatus).donePromise;
        const fixture = TestBed.createComponent(IconHostComponent);
        fixture.detectChanges();

        const icon: HTMLElement = fixture.nativeElement.querySelector('mat-icon');
        expect(icon.classList).toContain('material-icons');
        expect(icon.classList).not.toContain('material-symbols-outlined');
    });
});
