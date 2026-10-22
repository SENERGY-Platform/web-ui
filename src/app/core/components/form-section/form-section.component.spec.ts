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
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormSectionComponent } from './form-section.component';

@Component({
    imports: [FormSectionComponent],
    template: '<senergy-form-section title="General" hint="Shown below"><input class="field"></senergy-form-section>',
})
class HostComponent {}

describe('FormSectionComponent', () => {
    it('renders its title as the heading and leaves no title attribute on the host, so no browser tooltip shows', () => {
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
        const section: HTMLElement = fixture.nativeElement.querySelector('senergy-form-section');

        expect(section.querySelector('.section-title')?.textContent?.trim()).toBe('General');
        expect(section.querySelector('.section-hint')?.textContent?.trim()).toBe('Shown below');
        expect(section.querySelector('.field')).not.toBeNull();
        expect(section.hasAttribute('title')).toBeFalse();
    });
});
