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

import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogHeaderComponent } from './dialog-header.component';

describe('DialogHeaderComponent', () => {
    function create() {
        TestBed.configureTestingModule({ providers: [{ provide: MatDialogRef, useValue: {} }] });
        const fixture = TestBed.createComponent(DialogHeaderComponent);
        fixture.componentRef.setInput('title', 'Delete');
        fixture.detectChanges();
        return fixture;
    }

    it('shows the title and a labelled close button that emits closed', () => {
        const fixture = create();
        const closed = jasmine.createSpy('closed');
        fixture.componentInstance.closed.subscribe(closed);
        const el: HTMLElement = fixture.nativeElement;
        const button = el.querySelector('button.close') as HTMLButtonElement;

        expect(el.querySelector('h2')?.textContent).toBe('Delete');
        expect(button.getAttribute('aria-label')).toBe('Close');
        button.click();
        expect(closed).toHaveBeenCalledTimes(1);
    });
});
