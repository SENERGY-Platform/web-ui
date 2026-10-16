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

import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
    let fixture: ComponentFixture<EmptyStateComponent>;

    const text = (selector: string) => (fixture.nativeElement.querySelector(selector)?.textContent || '').trim();

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [EmptyStateComponent] });
        fixture = TestBed.createComponent(EmptyStateComponent);
    });

    it('renders icon, title and text from the inputs', () => {
        fixture.componentRef.setInput('icon', 'lock');
        fixture.componentRef.setInput('title', 'No access');
        fixture.componentRef.setInput('text', 'You may not view this.');
        fixture.detectChanges();

        expect(text('.empty-icon')).toBe('lock');
        expect(text('.empty-title')).toBe('No access');
        expect(text('.empty-text')).toBe('You may not view this.');
    });

    it('omits the text line when no text is given', () => {
        fixture.componentRef.setInput('title', 'Nothing here');
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.empty-text')).toBeNull();
    });
});
