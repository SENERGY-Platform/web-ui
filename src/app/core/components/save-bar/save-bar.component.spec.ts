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
import { SaveBarComponent } from './save-bar.component';

@Component({
    imports: [SaveBarComponent],
    template: '<senergy-save-bar><input saveBarExtra class="extra"></senergy-save-bar>',
})
class ExtraHostComponent {}

describe('SaveBarComponent', () => {
    function create(inputs: Partial<Pick<SaveBarComponent, 'status' | 'saveDisabled'>> = {}) {
        const fixture = TestBed.createComponent(SaveBarComponent);
        Object.entries(inputs).forEach(([key, value]) => fixture.componentRef.setInput(key, value));
        fixture.detectChanges();
        return fixture;
    }

    it('shows the status and emits save and discard', () => {
        const fixture = create({ status: 'Unsaved changes' });
        const saved = jasmine.createSpy('save');
        const discarded = jasmine.createSpy('discard');
        fixture.componentInstance.save.subscribe(saved);
        fixture.componentInstance.discard.subscribe(discarded);
        const el: HTMLElement = fixture.nativeElement;

        expect(el.querySelector('.status')?.textContent).toBe('Unsaved changes');
        (el.querySelector('button.save') as HTMLButtonElement).click();
        (el.querySelector('button.discard') as HTMLButtonElement).click();
        expect(saved).toHaveBeenCalledTimes(1);
        expect(discarded).toHaveBeenCalledTimes(1);
    });

    it('disables only save while saving is blocked', () => {
        const el: HTMLElement = create({ saveDisabled: true }).nativeElement;

        expect((el.querySelector('button.save') as HTMLButtonElement).disabled).toBeTrue();
        expect((el.querySelector('button.discard') as HTMLButtonElement).disabled).toBeFalse();
    });

    const order = (bar: Element) => Array.from(bar.children).map(child =>
        ['status', 'extra', 'discard', 'save'].find(name => child.classList.contains(name)));

    it('shows only the status and the two buttons without extra content', () => {
        expect(order(create().nativeElement)).toEqual(['status', 'discard', 'save']);
    });

    it('puts the extra content between the status and the buttons', () => {
        const fixture = TestBed.createComponent(ExtraHostComponent);
        fixture.detectChanges();

        expect(order(fixture.nativeElement.querySelector('senergy-save-bar'))).toEqual(['status', 'extra', 'discard', 'save']);
    });

    it('disables discard on request and leaves save alone', () => {
        const fixture = create();
        fixture.componentRef.setInput('discardDisabled', true);
        fixture.detectChanges();
        const el: HTMLElement = fixture.nativeElement;

        expect((el.querySelector('button.discard') as HTMLButtonElement).disabled).toBeTrue();
        expect((el.querySelector('button.save') as HTMLButtonElement).disabled).toBeFalse();
    });
});
