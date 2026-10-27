/*
 * Copyright 2020 InfAI (CC SES)
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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SearchbarComponent } from './searchbar.component';
import { MatInputModule } from '@angular/material/input';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { SearchbarService } from './shared/searchbar.service';

@Component({ template: '' })
class EmptyComponent {}

describe('SearchbarComponent', () => {
    let component: SearchbarComponent;
    let fixture: ComponentFixture<SearchbarComponent>;

    beforeEach(
        waitForAsync(() => {
            TestBed.configureTestingModule({
                schemas: [NO_ERRORS_SCHEMA],
                imports: [BrowserAnimationsModule, MatInputModule, ReactiveFormsModule, SearchbarComponent],
                providers: [provideRouter([{ path: 'list', component: EmptyComponent }])],
            }).compileComponents();
        }),
    );

    beforeEach(() => {
        fixture = TestBed.createComponent(SearchbarComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('keeps the label and long placeholder unless compact', () => {
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('mat-label')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('input').getAttribute('placeholder')).toBe('Please insert search text');
    });

    it('emits refresh from the refresh button', () => {
        let count = 0;
        fixture.detectChanges();
        component.refresh.subscribe(() => count++);
        (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

        expect(count).toBe(1);
    });

    it('re-sends the search text on refresh unless compact', () => {
        fixture.detectChanges();
        const send = spyOn(TestBed.inject(SearchbarService), 'changeMessage');
        component.onRefresh();

        expect(send).toHaveBeenCalledTimes(1);
    });

    it('only emits refresh in compact mode, without re-sending the search text', () => {
        fixture.detectChanges();
        const send = spyOn(TestBed.inject(SearchbarService), 'changeMessage');
        let emitted = 0;
        component.refresh.subscribe(() => emitted++);
        component.compact = true;
        component.onRefresh();

        expect(emitted).toBe(1);
        expect(send).not.toHaveBeenCalled();
    });

    it('takes the search from the URL and passes it on', async () => {
        await TestBed.inject(Router).navigateByUrl('/list?search=pump');
        fixture.detectChanges();
        expect(component.formControl.value).toBe('pump');
        expect(TestBed.inject(SearchbarService).searchText.value).toBe('pump');
    });

    it('writes the typed search into the URL', async () => {
        const router = TestBed.inject(Router);
        await router.navigateByUrl('/list?page=2');
        fixture.detectChanges();
        component.formControl.setValue('pump');
        await new Promise((resolve) => setTimeout(resolve, 350));
        expect(router.url).toBe('/list?page=2&search=pump');

        component.resetSearchtext();
        await new Promise((resolve) => setTimeout(resolve, 350));
        expect(router.url).toBe('/list?page=2');
    });

    it('stops writing the search once destroyed', async () => {
        const router = TestBed.inject(Router);
        await router.navigateByUrl('/list');
        fixture.detectChanges();
        component.formControl.setValue('pump');
        fixture.destroy();
        await new Promise((resolve) => setTimeout(resolve, 350));
        expect(router.url).toBe('/list');
    });
});
