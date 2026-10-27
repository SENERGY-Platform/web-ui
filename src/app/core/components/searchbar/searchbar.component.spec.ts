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
            TestBed.configureTestingModule({schemas: [NO_ERRORS_SCHEMA],
                imports: [BrowserAnimationsModule, MatInputModule, ReactiveFormsModule],
                declarations: [SearchbarComponent],
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
});
