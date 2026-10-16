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
import { provideRouter } from '@angular/router';

import { PageHeaderComponent } from './page-header.component';

describe('PageHeaderComponent', () => {
    let fixture: ComponentFixture<PageHeaderComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [PageHeaderComponent], providers: [provideRouter([])] });
        fixture = TestBed.createComponent(PageHeaderComponent);
        fixture.componentRef.setInput('title', 'Things');
    });

    it('shows no back link by default', () => {
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.page-back')).toBeNull();
    });

    it('shows a back link to the given route above the title', () => {
        fixture.componentRef.setInput('backLabel', 'All things');
        fixture.componentRef.setInput('backLink', '/things');
        fixture.detectChanges();

        const link = fixture.nativeElement.querySelector('.page-back') as HTMLAnchorElement;
        expect(link.textContent).toContain('All things');
        expect(link.getAttribute('href')).toBe('/things');
    });
});
