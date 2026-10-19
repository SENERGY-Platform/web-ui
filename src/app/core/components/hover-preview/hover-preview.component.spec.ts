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

import { HoverPreviewComponent } from './hover-preview.component';

describe('HoverPreviewComponent', () => {
    let fixture: ComponentFixture<HoverPreviewComponent>;

    const small = () => fixture.nativeElement.querySelector('img.svg-preview') as HTMLImageElement;
    const enlarged = () => document.querySelector('.cdk-overlay-container img.svg-preview-large') as HTMLImageElement | null;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [HoverPreviewComponent] });
        fixture = TestBed.createComponent(HoverPreviewComponent);
        fixture.componentRef.setInput('src', 'data:image/svg+xml;base64,PHN2Zy8+');
        fixture.componentRef.setInput('alt', 'Preview of x');
        fixture.detectChanges();
    });

    it('draws the small image from the source and shows no enlarged copy yet', () => {
        expect(small().getAttribute('src')).toBe('data:image/svg+xml;base64,PHN2Zy8+');
        expect(small().alt).toBe('Preview of x');
        expect(enlarged()).toBeNull();
    });

    it('opens one enlarged copy on hover and removes it when the pointer leaves', () => {
        small().dispatchEvent(new Event('mouseenter'));
        small().dispatchEvent(new Event('mouseenter'));
        fixture.detectChanges();

        expect(document.querySelectorAll('.cdk-overlay-container img.svg-preview-large').length).toBe(1);
        expect(enlarged()?.getAttribute('src')).toBe('data:image/svg+xml;base64,PHN2Zy8+');

        small().dispatchEvent(new Event('mouseleave'));

        expect(enlarged()).toBeNull();
    });

    it('removes the enlarged copy when the component is destroyed while hovered', () => {
        small().dispatchEvent(new Event('mouseenter'));
        fixture.detectChanges();
        expect(enlarged()).not.toBeNull();

        fixture.destroy();

        expect(enlarged()).toBeNull();
    });

    it('draws on white only when asked to', () => {
        expect(small().classList).not.toContain('on-white');

        fixture.componentRef.setInput('onWhite', true);
        fixture.detectChanges();

        expect(small().classList).toContain('on-white');
    });
});
