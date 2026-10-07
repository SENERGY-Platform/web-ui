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

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MtxSelect, MtxSelectModule } from '@ng-matero/extensions/select';
import { provideOverlayDefaults } from './overlay-defaults';

@Component({
    template: '<p>dialog</p>',
    changeDetection: ChangeDetectionStrategy.Eager,
})
class DialogContentComponent {}

@Component({
    template: '<mtx-select [items]="items"></mtx-select>',
    imports: [MtxSelectModule],
    changeDetection: ChangeDetectionStrategy.Eager,
})
class SelectHostComponent {
    items = ['a', 'b'];
}

describe('provideOverlayDefaults', () => {
    it('opens dialogs outside the top layer, so body-anchored select panels can stack above them', () => {
        TestBed.configureTestingModule({ imports: [MatDialogModule, NoopAnimationsModule], providers: [provideOverlayDefaults()] });
        const ref = TestBed.inject(MatDialog).open(DialogContentComponent);

        const pane = document.querySelector('.cdk-overlay-pane') as HTMLElement;
        expect(pane).toBeTruthy();
        expect(pane.closest('[popover]')).toBeNull();
        ref.close();
    });

    it('keeps mtx-select panels out of the top layer and appends them to the body by default', () => {
        TestBed.configureTestingModule({ imports: [SelectHostComponent, NoopAnimationsModule], providers: [provideOverlayDefaults()] });
        const fixture = TestBed.createComponent(SelectHostComponent);
        fixture.detectChanges();

        const select = fixture.debugElement.query((el) => el.componentInstance instanceof MtxSelect).componentInstance as MtxSelect;
        expect(select.usePopover).toBeFalse();
        expect(select.appendTo).toBe('body');
    });
});
